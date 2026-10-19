import {describe, expect, it} from 'vitest';
import {circle, cut, lengths, resample, scatter} from '../../src/library/constellation/geom';
import {figureStrokes, wheelStrokes} from '../../src/library/constellation/props';
import {inverted, parseCap} from '../../src/library/constellation/stage';
import {capFade, flashAt, haze, paceLines, reframe, RHYTHM} from '../../src/library/constellation/theme';

describe('3：虚无主义 constellation', () => {
  it('串珠：等距取点，首尾都在线上，u 从 0 到 1', () => {
    const pts = resample([[0, 0], [100, 0]], 10);
    expect(pts.length).toBe(11);
    expect(pts[0].p).toEqual([0, 0]);
    expect(pts[10].p[0]).toBeCloseTo(100, 5);
    expect(pts[10].u).toBe(1);
  });

  it('截断：画到一半时长度正好一半，0 时为空、1 时原样', () => {
    const c = circle(0, 0, 100);
    const total = lengths(c)[c.length - 1];
    const half = cut(c, 0.5);
    expect(lengths(half)[half.length - 1]).toBeCloseTo(total / 2, 3);
    expect(cut(c, 0)).toEqual([]);
    expect(cut(c, 1)).toBe(c);
  });

  it('散点起点是确定性的，且落在半径以内', () => {
    expect(scatter(3, 7, 200)).toEqual(scatter(3, 7, 200));
    for (let i = 0; i < 50; i++) expect(Math.hypot(...scatter(1, i, 200))).toBeLessThanOrEqual(200.0001);
  });

  it('字幕节奏：淡入 7 帧带模糊、淡出 6 帧；paceLines 每句 81 帧且不重叠', () => {
    expect(capFade(0, 10).v).toBe(0);
    expect(capFade(10 + RHYTHM.fadeIn, 10).v).toBe(1);
    expect(capFade(10 + RHYTHM.fadeIn, 10).filter).toBeUndefined();
    expect(capFade(200 + RHYTHM.fadeOut, 10, 200).v).toBe(0);
    const L = paceLines(['一', '二', '三'], 30);
    expect(L.map((l) => l.at)).toEqual([30, 111, 192]);
    for (let i = 1; i < L.length; i++) expect(L[i].at).toBeGreaterThanOrEqual(L[i - 1].out + RHYTHM.fadeOut);
  });

  it('柔入：at 前不可见、结束时清晰无模糊；退场后归零', () => {
    expect(haze(0, 10).v).toBe(0);
    expect(haze(40, 10).filter).toBeUndefined();
    expect(haze(100, 10, 14, 60).v).toBe(0);
  });

  it('白纸反转进快出慢：6 帧就全白，退回夜色要 45 帧', () => {
    expect(inverted(6, 0)).toBe(1);
    expect(inverted(100 + 20, 0, 100)).toBeGreaterThan(0.3);
    expect(inverted(100 + 45, 0, 100)).toBe(0);
  });

  it('冲击白闪前 2 帧纯白，8 帧后退干净；推拉两端保持首尾值', () => {
    expect(flashAt(10, 10)).toBe(1);
    expect(flashAt(11, 10)).toBe(1);
    expect(flashAt(18, 10)).toBe(0);
    expect(reframe(0, 10, 50, 1, 0.7)).toBe(1);
    expect(reframe(80, 10, 50, 1, 0.7)).toBeCloseTo(0.7, 5);
  });

  it('字幕标记：【】提亮、〔〕变金，其余原样', () => {
    expect(parseCap('已经足够〔明亮〕。')).toEqual([
      {s: '已经足够', mark: ''},
      {s: '明亮', mark: 'gold'},
      {s: '。', mark: ''},
    ]);
    expect(parseCap('【同一个位置】').map((p) => p.mark)).toEqual(['hi']);
  });

  it('小人和星轮的笔画齐全（四种姿势都有身体 + 头）', () => {
    for (const pose of ['stand', 'walk', 'point', 'sit'] as const) expect(figureStrokes(pose).length).toBe(2);
    const w = wheelStrokes(0, 0, 100);
    expect(w.rings.length).toBe(3);
    expect(w.spokes.length).toBe(16);
    expect(w.petals.length).toBe(16);
  });
});
