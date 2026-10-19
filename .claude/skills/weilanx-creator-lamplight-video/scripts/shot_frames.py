"""列出每个镜头的抽查帧：python3 shot_frames.py src/episodes/<期>/timeline.ts [--at 0.75]

输出「镜头名 帧号」一行一个，直接喂给逐帧渲染循环（一次只渲一帧，并行会内存溢出）：
  python3 shot_frames.py <timeline.ts> > /tmp/<期>/frames.txt
  while read n fr; do npx remotion still src/index.ts <期> /tmp/<期>/$n.jpg --frame=$fr --scale=0.4 --timeout=120000 --log=error; done < /tmp/<期>/frames.txt
"""
import sys

from timeline_lib import load

args = sys.argv[1:]
at = 0.75
if '--at' in args:
    at = float(args[args.index('--at') + 1])
T = load(args[0])
for s in T['SHOTS']:
    print(s['name'], int(s['start'] + (s['end'] - s['start']) * at))
