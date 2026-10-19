#!/usr/bin/env python3
"""
动效切片：从参考视频的某个时间窗里等间隔取 N 帧，横向拼成一条，用来看清一个入场 / 转场 / 缓动是怎么动的。

用法：
  uv run --with pillow python .claude/skills/weilanx-creator-distill-video/scripts/strip.py \
      template/参考.mp4 --at 16.6 --span 1.2 --n 8 --out materials/00-公共/风格蒸馏/<风格ID>/strips/t16.6.jpg
  可选：--crop x,y,w,h（只看画面某一块，原视频像素坐标）、--width 360（每格宽度）
每格左上角标时间（秒）和相对窗口起点的帧号，方便数「几帧完成入场」「缓动是先快后慢还是匀速」。
"""
import argparse
import subprocess

from PIL import Image, ImageDraw


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('video')
    ap.add_argument('--at', type=float, required=True, help='窗口起点（秒）')
    ap.add_argument('--span', type=float, default=1.0, help='窗口长度（秒）')
    ap.add_argument('--n', type=int, default=8)
    ap.add_argument('--crop', default=None)
    ap.add_argument('--width', type=int, default=360)
    ap.add_argument('--fps', type=float, default=30)
    ap.add_argument('--out', required=True)
    a = ap.parse_args()
    cells = []
    for k in range(a.n):
        t = a.at + a.span * k / max(1, a.n - 1)
        vf = []
        if a.crop:
            x, y, w, h = a.crop.split(',')
            vf.append(f'crop={w}:{h}:{x}:{y}')
        vf.append(f'scale={a.width}:-2')
        p = f'/tmp/_strip_{k}.jpg'
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', f'{t:.3f}', '-i', a.video, '-frames:v', '1', '-vf', ','.join(vf), '-q:v', '3', p], check=True)
        im = Image.open(p).convert('RGB')
        d = ImageDraw.Draw(im)
        d.rectangle([0, 0, 112, 20], fill=(0, 0, 0))
        d.text((4, 4), f'{t:6.2f}s +{round((t - a.at) * a.fps):>3}f', fill=(255, 255, 0))
        cells.append(im)
    w, h = cells[0].size
    out = Image.new('RGB', (w * len(cells), h), (0, 0, 0))
    for k, im in enumerate(cells):
        out.paste(im, (k * w, 0))
    out.save(a.out, quality=85)
    print(f'写入 {a.out}（{len(cells)} 帧，{a.at:.2f}–{a.at + a.span:.2f} 秒）')


if __name__ == '__main__':
    main()
