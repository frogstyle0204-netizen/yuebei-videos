"""读一期灯火史话风的 timeline.ts（照 ep28 的写法）：网格常量、CUES、SHOTS、HALF_BEATS。

只解析，不执行 TypeScript：单行的 `export const X = 表达式;` 翻成 Python 求值，
CUES / SHOTS 用正则逐行取。timeline.ts 照 ep28 的格式写就能读。
"""
import math
import re

_JS = [(r'Math\.round', 'round'), (r'Math\.floor', 'math.floor'), (r'Math\.ceil', 'math.ceil')]


def _py(expr: str) -> str:
    for a, b in _JS:
        expr = re.sub(a, b, expr)
    return expr.replace(' as const', '')


def load(path: str) -> dict:
    src = open(path, encoding='utf-8').read()
    env: dict = {'math': math}
    exec(
        'def fr(sec): return round(sec * FPS)\n'
        'def beatSec(b): return BAR0 + BEAT * b\n'
        'def fbt(b): return fr(beatSec(b))\n'
        'def fb(k): return fbt(4 * k)\n',
        env,
    )
    # 单行常量，按出现顺序求值（后面的可以引用前面的）
    for m in re.finditer(r'^export const (\w+)\s*=\s*([^;\n]+);', src, re.M):
        name, expr = m.group(1), m.group(2).strip()
        if name in ('CUES', 'SHOTS', 'SFX'):
            continue
        try:
            env[name] = eval(_py(expr), env)
        except Exception:
            pass
    # 叙述：[拍号, '文字' | null, 另起一屏?], // 注释
    cues = []
    block = src[src.index('export const CUES'):]
    block = block[: block.index('\n];')]
    for m in re.finditer(r"^\s*\[(\d+),\s*(null|'((?:[^'\\]|\\.)*)')(?:,\s*(true|false))?\],?\s*(?://\s*(.*))?$", block, re.M):
        cues.append({'beat': int(m.group(1)), 'text': m.group(3), 'panel': m.group(4) == 'true', 'note': (m.group(5) or '').strip()})
    env['CUES'] = cues
    # 镜头：name: [起, 止], // 注释
    shots = []
    if 'export const SHOTS' in src:
        sb = src[src.index('export const SHOTS'):]
        sb = sb[: sb.index('} as const')]
        for m in re.finditer(r'^\s*(\w+):\s*\[(.+?),\s*(.+?)\],?\s*(?://\s*(.*))?$', sb, re.M):
            shots.append({'name': m.group(1), 'start': eval(_py(m.group(2)), env), 'end': eval(_py(m.group(3)), env), 'note': (m.group(4) or '').strip()})
    env['SHOTS'] = shots
    return env


def ts(frame: int, fps: int = 30) -> str:
    t = frame / fps
    return f'{int(t // 60):02d}:{t % 60:04.1f}'
