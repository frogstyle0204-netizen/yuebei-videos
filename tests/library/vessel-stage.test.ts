import {describe, expect, it} from 'vitest';
import {charIn, drawP, fadeBlur, parseMarks, vis} from '../../src/library/vessel-stage/theme';

describe('金器剧场风 vessel-stage', () => {
  it('模糊柔入：at 之前不可见，结束时完全清晰；淡出后归零', () => {
    expect(fadeBlur(0, 10).v).toBe(0);
    const done = fadeBlur(40, 10);
    expect(done.v).toBeCloseTo(1, 5);
    expect(done.filter).toBeUndefined();
    expect(fadeBlur(100, 10, 12, 60).v).toBe(0);
  });

  it('逐字入场：后面的字晚 gap 帧开始，每个字 dur 帧到位', () => {
    expect(charIn(10, 10, 0)).toBe(0);
    expect(charIn(18, 10, 0)).toBeCloseTo(1, 5);
    expect(charIn(14, 10, 1)).toBe(0); // 第二个字 15 帧才开始
    expect(charIn(23, 10, 1)).toBeCloseTo(1, 5);
    expect(charIn(30, 10, 2, 6, 8)).toBe(1);
  });

  it('线条画出和场的可见度都在 0–1 之间', () => {
    expect(drawP(0, 10)).toBe(0);
    expect(drawP(40, 10)).toBeCloseTo(1, 5);
    expect(vis(0, 0, 100)).toBe(0);
    expect(vis(50, 0, 100)).toBe(1);
    expect(vis(100, 0, 100)).toBe(0);
  });

  it('字幕重点标记：**加粗**、〔金色〕，其余原样', () => {
    expect(parseMarks('喝下的**那杯水**。')).toEqual([{t: '喝下的'}, {t: '那杯水', bold: true}, {t: '。'}]);
    expect(parseMarks('〔邻居的杯子〕更满')).toEqual([{t: '邻居的杯子', bold: true, gold: true}, {t: '更满'}]);
    expect(parseMarks('没有标记')).toEqual([{t: '没有标记'}]);
    // 没配对的标记原样保留
    expect(parseMarks('半个**标记')).toEqual([{t: '半个**标记'}]);
  });
});
