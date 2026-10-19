"""抖音创作者后台「作品列表导出」xlsx → 按发布时间列出每条作品的各项「率」，用来复盘选题。

用法：
  python3 .claude/skills/weilanx-creator-fps-video/scripts/stats.py <作品列表导出>.xlsx [--grep fps]

为什么看「率」不看播放量：新发的视频累计时间短，播放量天然少；5 秒完播、2 秒跳出、平均播放时长、
赞 / 藏 / 分享 ÷ 播放 这些比值受发布天数影响小得多，能直接比较选题和开头的好坏。
分享率最重要：它决定推荐流量（ep25 分享率 1.8% → 12 万播放，机制类 0.27% → 五六千）。
"""

import sys
from pathlib import Path

import openpyxl


def num(x):
    try:
        return float(x)
    except (TypeError, ValueError):
        return None


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    path = Path(sys.argv[1]).expanduser()
    grep = sys.argv[sys.argv.index('--grep') + 1].lower() if '--grep' in sys.argv else None
    ws = openpyxl.load_workbook(path, data_only=True).active
    rows = list(ws.iter_rows(values_only=True))
    head = list(rows[0])
    col = {name: i for i, name in enumerate(head)}

    def g(r, name):
        return r[col[name]] if name in col else None

    print('| 发布 | 作品 | 播放 | 5 秒完播 | 2 秒跳出 | 平均看 | 赞率 | 收藏率 | 分享率 | 评论 | 涨粉 |')
    print('|---|---|---|---|---|---|---|---|---|---|---|')
    for r in rows[1:]:
        name = str(g(r, '作品名称') or '')
        if grep and grep not in name.lower():
            continue
        title = name.split('#')[0].replace('vibe知识大赏 | ', '').strip()[:22]
        play = int(num(g(r, '播放量')) or 0)
        c5, skip, avg = num(g(r, '5s完播率')), num(g(r, '2s跳出率')), num(g(r, '平均播放时长'))
        like, fav, share = (int(num(g(r, k)) or 0) for k in ('点赞量', '收藏量', '分享量'))
        cmt, fans = int(num(g(r, '评论量')) or 0), int(num(g(r, '粉丝增量')) or 0)
        rate = (lambda n: f'{n / play * 100:.2f}%') if play else (lambda n: '-')
        print(
            f"| {str(g(r, '发布时间'))[5:16]} | {title} | {play} | {c5 * 100:.1f}% | {skip * 100:.1f}% | {avg:.1f} 秒 | "
            f'{rate(like)} | {rate(fav)} | {rate(share)} | {cmt} | {fans} |'
        )


if __name__ == '__main__':
    main()
