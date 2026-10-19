#!/usr/bin/env python3
"""
把一支参考视频拆成「蒸馏用的拆解包」：基本信息、硬切点和镜头表、每个镜头的关键帧、定时联系表、
主色板、亮度 / 饱和度、每秒运动强度、音频响度和卡点。结果写进 --out 目录（放 materials/ 下，不进 git）。

用法：
  uv run --with numpy --with pillow python .claude/skills/weilanx-creator-distill-video/scripts/analyze.py \
      template/参考.mp4 --out materials/00-公共/风格蒸馏/<风格ID>/<视频名>
可选：--every 3（联系表每几秒一帧）、--cut 0.30（硬切阈值，越小越敏感）
输出：
  report.md   给人和 Agent 读的拆解报告（先读这个）
  data.json   全部数字
  keyframes/  每个镜头中点一张全尺寸帧 shotNN_<秒>.jpg
  sheets/     联系表 sheetNN.jpg（4×3，每格标时间）
  palette.png 主色板
"""
import argparse
import json
import os
import subprocess
import sys

import numpy as np
from PIL import Image, ImageDraw


def sh(args, **kw):
    return subprocess.run(args, capture_output=True, check=True, **kw)


def probe(path):
    out = sh(['ffprobe', '-v', 'error', '-show_entries', 'format=duration:stream=codec_type,width,height,r_frame_rate', '-of', 'json', path]).stdout
    d = json.loads(out)
    v = next((s for s in d['streams'] if s['codec_type'] == 'video'), None)
    a = any(s['codec_type'] == 'audio' for s in d['streams'])
    num, den = (v['r_frame_rate'].split('/') if v else ('30', '1'))
    return {'duration': float(d['format']['duration']), 'width': v['width'], 'height': v['height'], 'fps': round(int(num) / int(den), 3), 'has_audio': a}


def frames(path, fps, w, h, gray=False):
    pix = 'gray' if gray else 'rgb24'
    raw = sh(['ffmpeg', '-v', 'error', '-i', path, '-vf', f'fps={fps},scale={w}:{h}', '-f', 'rawvideo', '-pix_fmt', pix, '-']).stdout
    c = 1 if gray else 3
    n = len(raw) // (w * h * c)
    return np.frombuffer(raw[: n * w * h * c], dtype=np.uint8).reshape(n, h, w, c) if not gray else np.frombuffer(raw[: n * w * h], dtype=np.uint8).reshape(n, h, w)


def grab(path, t, out, width=None):
    vf = ['-vf', f'scale={width}:-2'] if width else []
    sh(['ffmpeg', '-v', 'error', '-y', '-ss', f'{t:.3f}', '-i', path, '-frames:v', '1', *vf, '-q:v', '3', out])


def kmeans(px, k=8, iters=12, seed=0):
    rng = np.random.default_rng(seed)
    c = px[rng.choice(len(px), k, replace=False)].astype(float)
    for _ in range(iters):
        lab = np.argmin(((px[:, None, :] - c[None]) ** 2).sum(-1), axis=1)
        for j in range(k):
            m = px[lab == j]
            if len(m):
                c[j] = m.mean(0)
    counts = np.bincount(lab, minlength=k)
    order = np.argsort(-counts)
    return c[order], counts[order] / counts.sum()


def hexc(c):
    return '#%02x%02x%02x' % tuple(int(v) for v in c)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('video')
    ap.add_argument('--out', required=True)
    ap.add_argument('--every', type=float, default=3.0)
    ap.add_argument('--cut', type=float, default=0.30)
    a = ap.parse_args()
    os.makedirs(os.path.join(a.out, 'keyframes'), exist_ok=True)
    os.makedirs(os.path.join(a.out, 'sheets'), exist_ok=True)
    info = probe(a.video)
    dur = info['duration']
    print(f"{info['width']}×{info['height']} {info['fps']}fps {dur:.1f}s audio={info['has_audio']}")

    # 1. 硬切：10fps 灰度小图的直方图差 + 像素差，同时超阈值算一次硬切
    g = frames(a.video, 10, 160, 90, gray=True).astype(np.float32)
    pdiff = np.abs(np.diff(g, axis=0)).mean(axis=(1, 2)) / 255
    hist = np.stack([np.histogram(f, bins=32, range=(0, 255))[0] for f in g]).astype(np.float32)
    hist /= hist.sum(1, keepdims=True)
    hdiff = 0.5 * np.abs(np.diff(hist, axis=0)).sum(1)
    score = hdiff + pdiff
    cuts = []
    for i, s in enumerate(score):
        local = score[max(0, i - 5):i + 6]
        if s > a.cut and s >= local.max() and (not cuts or (i + 1) / 10 - cuts[-1] > 0.4):
            cuts.append(round((i + 1) / 10, 2))
    bounds = [0.0] + cuts + [round(dur, 2)]
    shots = [{'i': k + 1, 'start': bounds[k], 'end': bounds[k + 1], 'len': round(bounds[k + 1] - bounds[k], 2)} for k in range(len(bounds) - 1)]

    # 2. 运动强度：每秒平均帧差（0–1），区分「静止画面里元素进出」和「镜头一直在动」
    per_sec = [float(pdiff[s * 10:(s + 1) * 10].mean()) if s * 10 < len(pdiff) else 0.0 for s in range(int(np.ceil(dur)))]
    for sh_ in shots:
        a0, a1 = int(sh_['start'] * 10), max(int(sh_['start'] * 10) + 1, int(sh_['end'] * 10) - 1)
        sh_['motion'] = round(float(pdiff[a0:a1].mean()) if a1 > a0 else 0.0, 4)

    # 3. 关键帧：每个镜头中点；长镜头（> 8 秒）再按 4 秒补帧
    for sh_ in shots:
        ts = [sh_['start'] + sh_['len'] / 2]
        if sh_['len'] > 8:
            ts = list(np.arange(sh_['start'] + 2, sh_['end'] - 1, 4))
        sh_['keyframes'] = []
        for t in ts:
            name = f"shot{sh_['i']:02d}_{t:06.2f}.jpg"
            grab(a.video, t, os.path.join(a.out, 'keyframes', name), width=1280)
            sh_['keyframes'].append(f'keyframes/{name}')

    # 4. 联系表：每 every 秒一格，4×3 一张，格子左上角写时间
    ts = list(np.arange(0.5, dur - 0.3, a.every))
    cells = []
    for t in ts:
        p = '/tmp/_distill_cell.jpg'
        grab(a.video, t, p, width=480)
        im = Image.open(p).convert('RGB')
        d = ImageDraw.Draw(im)
        d.rectangle([0, 0, 70, 22], fill=(0, 0, 0))
        d.text((6, 4), f'{t:5.1f}s', fill=(255, 255, 0))
        cells.append(im.copy())
    sheets = []
    for k in range(0, len(cells), 12):
        group = cells[k:k + 12]
        cw, ch = group[0].size
        sheet = Image.new('RGB', (cw * 4, ch * 3), (0, 0, 0))
        for j, im in enumerate(group):
            sheet.paste(im, ((j % 4) * cw, (j // 4) * ch))
        name = f'sheets/sheet{k // 12 + 1:02d}.jpg'
        sheet.save(os.path.join(a.out, name), quality=82)
        sheets.append(name)

    # 5. 色彩：1fps 小图取样做 k-means 主色板；亮度、饱和度分布
    rgb = frames(a.video, 1, 96, 54).reshape(-1, 3).astype(float)
    sample = rgb[np.random.default_rng(1).choice(len(rgb), min(40000, len(rgb)), replace=False)]
    cents, ratios = kmeans(sample, k=8)
    mx, mn = rgb.max(1), rgb.min(1)
    lum = (0.2126 * rgb[:, 0] + 0.7152 * rgb[:, 1] + 0.0722 * rgb[:, 2]) / 255
    sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1), 0)
    pal = Image.new('RGB', (800, 120), (0, 0, 0))
    d = ImageDraw.Draw(pal)
    x = 0
    for c, r in zip(cents, ratios):
        w = max(1, int(800 * r))
        d.rectangle([x, 0, x + w, 90], fill=tuple(int(v) for v in c))
        d.text((x + 4, 96), hexc(c), fill=(220, 220, 220))
        x += w
    pal.save(os.path.join(a.out, 'palette.png'))
    # 强调色：只看「有颜色、不太暗」的像素，背景再大也不会把它淹没
    acc_mask = (sat > 0.25) & (lum > 0.25)
    accents = []
    if acc_mask.sum() > 200:
        acc = rgb[acc_mask]
        acc = acc[np.random.default_rng(2).choice(len(acc), min(20000, len(acc)), replace=False)]
        ac, ar = kmeans(acc, k=min(6, len(acc)))
        accents = [{'hex': hexc(c), 'share_of_accent': round(float(r), 3)} for c, r in zip(ac, ar)]
    color = {
        'palette': [{'hex': hexc(c), 'ratio': round(float(r), 3)} for c, r in zip(cents, ratios)],
        'accents': accents,
        'accent_pixel_ratio': round(float(acc_mask.mean()), 4),
        'luma_mean': round(float(lum.mean()), 3),
        'dark_ratio': round(float((lum < 0.12).mean()), 3),
        'bright_ratio': round(float((lum > 0.8).mean()), 3),
        'sat_mean': round(float(sat.mean()), 3),
    }

    # 6. 音频：响度 + 卡点（复用暗金风 skill 的 beats.py）
    audio = None
    if info['has_audio']:
        out = subprocess.run(['ffmpeg', '-i', a.video, '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True).stderr
        lufs = [l.split(':')[1].strip() for l in out.splitlines() if l.strip().startswith('I:')]
        audio = {'integrated': lufs[-1] if lufs else None}
        beats = os.path.join(os.path.dirname(__file__), '..', '..', 'weilanx-creator-gilded-video', 'scripts', 'beats.py')
        if os.path.exists(beats):
            r = subprocess.run([sys.executable, beats, a.video, '--to', str(min(60, dur))], capture_output=True, text=True)
            audio['beats'] = r.stdout.strip()

    data = {'source': a.video, 'info': info, 'cuts': cuts, 'shots': shots, 'motion_per_sec': [round(v, 4) for v in per_sec], 'color': color, 'audio': audio, 'sheets': sheets}
    with open(os.path.join(a.out, 'data.json'), 'w') as fp:
        json.dump(data, fp, ensure_ascii=False, indent=1)

    # 报告
    spark = '▁▂▃▄▅▆▇█'
    mmax = max(per_sec) or 1
    line = ''.join(spark[min(7, int(v / mmax * 7.99))] for v in per_sec)
    L = [f"# 拆解报告：{os.path.basename(a.video)}", '',
         f"- 画幅 {info['width']}×{info['height']}，{info['fps']} fps，{dur:.1f} 秒，{'有' if info['has_audio'] else '无'}音轨",
         f"- 硬切 {len(cuts)} 次，镜头 {len(shots)} 个，平均镜头长 {dur / len(shots):.1f} 秒",
         f"- 平均亮度 {color['luma_mean']}（暗部 < 0.12 占 {color['dark_ratio']:.0%}，亮部 > 0.8 占 {color['bright_ratio']:.0%}），平均饱和度 {color['sat_mean']}",
         '', '## 主色板（按面积）', '', '![](palette.png)', '', '| 色 | 占比 |', '|---|---|']
    L += [f"| `{p['hex']}` | {p['ratio']:.0%} |" for p in color['palette']]
    L += ['', f"## 强调色（饱和度 > 0.25 且亮度 > 0.25 的像素，占画面 {color['accent_pixel_ratio']:.1%}）", '', '| 色 | 占强调色 |', '|---|---|']
    L += [f"| `{p['hex']}` | {p['share_of_accent']:.0%} |" for p in color['accents']] or ['| — | 几乎没有彩色强调 |']
    L += ['', '## 运动强度（每秒一格，越高画面变化越大）', '', f'```\n{line}\n```', '',
          '## 镜头表', '', '| # | 开始 | 结束 | 时长 | 运动 | 关键帧 |', '|---|---|---|---|---|---|']
    L += [f"| {s['i']} | {s['start']:.2f} | {s['end']:.2f} | {s['len']:.2f} | {s['motion']:.3f} | {' '.join(f'[帧]({k})' for k in s['keyframes'])} |" for s in shots]
    L += ['', '## 联系表', ''] + [f'![]({s})' for s in sheets]
    if audio:
        L += ['', '## 音频', '', f"- 整片响度 {audio['integrated']}", '', '```', audio.get('beats', '（没找到 beats.py，跳过卡点分析）'), '```']
    with open(os.path.join(a.out, 'report.md'), 'w') as fp:
        fp.write('\n'.join(L) + '\n')
    print(f"写入 {a.out}/report.md：{len(cuts)} 个硬切、{len(shots)} 个镜头、{len(sheets)} 张联系表")


if __name__ == '__main__':
    main()
