"""从 timeline.ts 生成字幕稿：python3 subtitle_doc.py src/episodes/<期>/timeline.ts <素材目录>/字幕稿.md

每句从它的拍点开始、到下一句开始结束；话说一半的句子（HALF_BEATS）结束在收暗帧（DARK_FROM / DARK_FROM2）；
文字为 null 的条目（标题卡、大字、爆点）用同一行的 // 注释当说明。
"""
import re
import sys

from timeline_lib import load, ts

src, out = sys.argv[1], sys.argv[2]
T = load(src)
fps = T.get('FPS', 30)
cues = T['CUES']
half = list(T.get('HALF_BEATS', []))
darks = [T.get('DARK_FROM'), T.get('DARK_FROM2')]
rows = []
for i, c in enumerate(cues):
    a = T['fbt'](c['beat'])
    e = T['fbt'](cues[i + 1]['beat']) if i + 1 < len(cues) else T['DURATION']
    if c['beat'] in half and darks[half.index(c['beat'])] is not None:
        e = darks[half.index(c['beat'])]
    body = re.sub(r'[【】〖〗〔〕]', '', c['text']) if c['text'] is not None else f"【{c['note'] or '画面'}】"
    rows.append(f"| {i + 1} | {ts(a, fps)} – {ts(e, fps)} | {body} |")
title = open(src, encoding='utf-8').read().split('\n')[1].lstrip('/* ').split('（')[0]
hits = '、'.join(ts(T[k], fps) for k in ('HIT', 'HIT2') if k in T)
doc = f"# 字幕稿 · {title}\n\n共 {len(cues)} 条 · 时长 {ts(T['DURATION'], fps)} · 无口播，画面上的叙述即字幕 · 爆点 {hits}\n\n| 序号 | 时间 | 字幕 |\n|---:|:---|:---|\n" + '\n'.join(rows) + '\n'
open(out, 'w', encoding='utf-8').write(doc)
print(f'wrote {out}（{len(cues)} 条，{ts(T["DURATION"], fps)}）')
