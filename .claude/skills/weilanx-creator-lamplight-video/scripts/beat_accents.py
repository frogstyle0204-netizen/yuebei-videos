"""找配乐里能卡的硬拍：每小节响度 + 每拍「起音跳变」排行。

  uv run --with numpy python beat_accents.py public/music/we-never.mp3            # 默认 we-never 网格
  uv run --with numpy python beat_accents.py <曲子> --bar 2.0 --b0 0.5 --top 40   # 换曲子时给实测网格

输出：
- bars：每小节平均响度（dB），找乐句起点、回落段（连续几小节低 2 dB 以上）
- 硬拍排行：拍号、秒、帧、跳变 dB（起音后 80 ms 比起音前 80 ms 响多少）。跳变 ≥ 10 dB 的是「砸点」，
  适合一拍一个动作（ep28 回落段 11 下 = 11 座驿站）；5–6 dB 的是普通强拍，适合换镜头和关键数字
"""
import argparse
import subprocess

import numpy as np

ap = argparse.ArgumentParser()
ap.add_argument('track')
ap.add_argument('--bar', type=float, default=(102.52 - 17.45) / 40)
ap.add_argument('--b0', type=float, default=None, help='第 0 拍的秒数，默认 we-never 的 17.45 - 8 小节')
ap.add_argument('--top', type=int, default=40)
ap.add_argument('--bars', type=int, default=72)
a = ap.parse_args()
SR = 22050
x = np.frombuffer(subprocess.run(['ffmpeg', '-v', 'error', '-i', a.track, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True).stdout, dtype=np.float32)
BAR = a.bar
B0 = a.b0 if a.b0 is not None else 17.45 - 8 * BAR
BEAT = BAR / 4
dur = len(x) / SR


def r(t0, t1):
    s = x[max(0, int(t0 * SR)) : int(t1 * SR)]
    return 20 * np.log10(np.sqrt((s**2).mean()) + 1e-9) if len(s) else -99


print('bars:', ' '.join(f'{k}:{r(B0 + k * BAR, B0 + (k + 1) * BAR):.0f}' for k in range(a.bars) if B0 + (k + 1) * BAR < dur))
acc = []
b = 0
while B0 + b * BEAT + 0.1 < dur:
    t = B0 + b * BEAT
    acc.append((b, t, r(t, t + 0.08) - r(t - 0.08, t)))
    b += 1
print(f'\n硬拍排行（前 {a.top}，按拍号排）：拍 / 秒 / 帧(30fps) / 跳变')
for b, t, d in sorted(sorted(acc, key=lambda z: -z[2])[: a.top]):
    print(f'{b:4d}  {t:7.2f}s  {round(t * 30):5d}  {d:+5.1f} dB{"  ← 砸点" if d >= 10 else ""}')
