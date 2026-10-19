#!/usr/bin/env python3
"""量一段配音的「语气」：音高起伏范围（半音）和停顿（≥0.15 秒的次数和平均长度）。

听不到声音时，用它客观比较两版配音：音高范围越大越抑扬顿挫，停顿越多越像在说话而不是念稿。
本技能验证过的自然版：约 61 秒、音高范围约 15–17 个半音、停顿 40 次以上、平均约 0.3 秒。

用法：uv run --with numpy python voice_stats.py a.mp3 [b.wav ...]
"""
import subprocess
import sys

import numpy as np

SR = 16000


def load(path):
    raw = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', path, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'],
                         check=True, capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.float32)


def stats(x):
    hop, win = 160, 640
    f0, en = [], []
    for i in range(0, len(x) - win, hop):
        s = x[i:i + win]
        e = float(np.sqrt((s * s).mean()))
        en.append(e)
        if e < 0.02:
            continue
        s = s - s.mean()
        ac = np.correlate(s, s, 'full')[win - 1:]
        lo, hi = SR // 400, SR // 70
        k = int(np.argmax(ac[lo:hi])) + lo
        if ac[k] > 0.4 * ac[0]:
            f0.append(SR / k)
    f0 = np.array(f0)
    st = 12 * np.log2(f0 / np.median(f0))
    runs, c = [], 0
    for e in en:
        if e < 0.01:
            c += 1
        else:
            if c:
                runs.append(c)
            c = 0
    pauses = [r * hop / SR for r in runs if r * hop / SR >= 0.15]
    return len(x) / SR, float(np.percentile(st, 95) - np.percentile(st, 5)), len(pauses), (float(np.mean(pauses)) if pauses else 0.0)


for p in sys.argv[1:]:
    d, rng, n, avg = stats(load(p))
    print(f'{p}\n  时长 {d:.1f}s · 音高范围 {rng:.1f} 半音 · 停顿 {n} 次，平均 {avg:.2f}s')
