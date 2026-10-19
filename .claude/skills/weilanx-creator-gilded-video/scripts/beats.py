#!/usr/bin/env python3
"""
实测一首配乐的卡点数据：起音、BPM、小节线，以及「换气 + 重拍」候选（能量先回落、再突然冲上去的位置）。
高潮要踩在重拍上，换别的音乐时先跑这个脚本。

用法：
  uv run --with numpy python .claude/skills/weilanx-creator-gilded-video/scripts/beats.py public/music/we-never.mp3
  可选：--from 10 --to 40（只在这个时间段里找重拍候选），--top 5
输出：起音秒数、BPM、小节长度、小节线公式、重拍候选（时间、对应小节号、回落深度、冲高幅度），以及每个候选附近 10ms 粒度的能量曲线。
"""
import argparse
import subprocess
import sys

import numpy as np

SR = 22050


def load(path):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32)


def db_frames(x, win):
    n = len(x) // win
    x = x[: n * win].reshape(n, win)
    return 20 * np.log10(np.sqrt((x**2).mean(axis=1)) + 1e-9)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('path')
    ap.add_argument('--from', dest='t0', type=float, default=3.0)
    ap.add_argument('--to', dest='t1', type=float, default=60.0)
    ap.add_argument('--top', type=int, default=5)
    ap.add_argument('--bpm', type=float, nargs=2, default=[90, 150], metavar=('LO', 'HI'), help='BPM 搜索范围，默认 90–150；结果明显是半速 / 1.5 倍时调这里')
    a = ap.parse_args()

    x = load(a.path)
    dur = len(x) / SR
    print(f'时长 {dur:.2f} 秒')

    # 起音：10ms 能量第一次超过 -40 dB
    e10 = db_frames(x, SR // 100)
    onset = float(np.argmax(e10 > -40)) / 100
    print(f'起音 {onset:.2f} 秒')

    # BPM：能量差分（onset strength）自相关，在 --bpm 范围里找峰（范围太宽容易锁到 1.5 倍 / 半速）
    hop = 256
    fps = SR / hop
    le = np.log(np.array([np.sum(x[i * hop:(i + 1) * hop] ** 2) for i in range(len(x) // hop)]) + 1e-9)
    flux = np.maximum(0, np.diff(le))
    seg = flux[int(onset * fps): int(min(dur, onset + 60) * fps)]
    seg = seg - seg.mean()
    ac = np.correlate(seg, seg, 'full')[len(seg) - 1:]
    lags = np.arange(len(ac)) / fps
    m = (lags > 60 / a.bpm[1]) & (lags < 60 / a.bpm[0])
    beat = float(lags[np.argmax(ac * m)])
    bar = beat * 4
    print(f'BPM ≈ {60 / beat:.1f}，一拍 {beat:.3f} 秒，一小节（4 拍）{bar:.3f} 秒')
    print(f'小节线 ≈ {onset:.2f} + {bar:.3f} × k 秒（与重拍对一下，偏了就用重拍反推起点）')

    # 重拍候选：跳变后 150ms 比跳变前 200ms 高出 jump dB；「换气」= 前 1.0–0.5 秒比前 0.3 秒高出 sag dB（能量持续往下走，不是一帧的小坑）
    e50 = db_frames(x, SR // 20)  # 50ms
    cands = []
    for i in range(int(max(a.t0, 1.2) * 20), int(min(a.t1, dur - 1) * 20)):
        dip = e50[i - 4:i].mean()
        jump = e50[i:i + 3].mean() - dip
        sag = e50[i - 20:i - 10].mean() - e50[i - 6:i].mean()
        if jump > 6:
            cands.append((jump + 1.5 * max(0, sag), i / 20, jump, sag))
    picked = []
    for score, t, jump, sag in sorted(cands, reverse=True):
        if all(abs(t - p[1]) > 1.0 for p in picked):
            picked.append((score, t, jump, sag))
        if len(picked) >= a.top:
            break
    # 10ms 精修每个候选：在 ±80ms 里找最大的正跳变
    rows = []
    for score, t, jump, sag in picked:
        lo, hi = int((t - 0.08) * 100), int((t + 0.08) * 100)
        tt = (lo + int(np.argmax(np.diff(e10[lo:hi]))) + 1) / 100
        rows.append((tt, score, jump, sag))
    print('\n重拍候选（按时间排序）：')
    for tt, score, jump, sag in sorted(rows):
        print(f'  {tt:6.2f} 秒（第 {(tt - onset) / bar:5.2f} 小节）  冲高 {jump:4.1f} dB  换气回落 {sag:4.1f} dB  得分 {score:4.1f}  → 帧 {round(tt * 30)}（30fps）')
    hit = max(rows, key=lambda r: r[1])[0]
    # 自相关的 BPM 有 1–2% 误差，几个小节就会漂；起音到重拍之间一定是整数个小节，用它反推精确小节长
    n = max(1, round((hit - onset) / bar))
    bar2 = (hit - onset) / n
    print(f'\n推荐高潮：{hit:.2f} 秒 → 帧 {round(hit * 30)}（30fps）。前面一段能量持续回落、然后冲高最大。')
    print(f'精修小节长：起音 {onset:.2f} 秒到重拍是 {n} 个小节 → 一小节 {bar2:.3f} 秒（≈ {240 / bar2:.1f} BPM）')
    print(f'小节线网格：{onset:.2f} + {bar2:.3f} × k 秒，字幕切换、画面节点都卡这条网格；重拍是第 {n} 小节。')
    print('换气：重拍前 1 秒左右能量开始往下走，画面在重拍前约 0.7 秒起收暗，最后 3 帧静止。')


if __name__ == '__main__':
    sys.exit(main())
