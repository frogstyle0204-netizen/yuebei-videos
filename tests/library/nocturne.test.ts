import {describe, expect, it} from 'vitest';
import {lampSpot} from '../../src/library/nocturne/props';
import {mixHex, splitMarks} from '../../src/library/nocturne/stage';
import {blurIn, charIn, dip, fadeSwap, flash, flyTo, lineStarts, pushIn, readFrames, swing} from '../../src/library/nocturne/theme';

describe('3：悲观主义 nocturne', () => {
  it('字幕重点词：【】拆成重点段，没闭合的当普通字', () => {
    expect(splitMarks('它叫【惯性】。')).toEqual([{text: '它叫'}, {text: '惯性', hi: true}, {text: '。'}]);
    expect(splitMarks('【没闭合')).toEqual([{text: '【没闭合'}]);
    expect(splitMarks('没有重点')).toEqual([{text: '没有重点'}]);
  });

  it('字幕换句：上一句先 8 帧淡出，下一句再 6 帧淡入，两句不叠', () => {
    const starts = [0, 80];
    expect(fadeSwap(0, starts, 0)).toBe(0);
    expect(fadeSwap(6, starts, 0)).toBe(1);
    expect(fadeSwap(72, starts, 0)).toBe(1);
    expect(fadeSwap(80, starts, 0)).toBe(0);
    expect(fadeSwap(79, starts, 1)).toBe(0);
    expect(fadeSwap(86, starts, 1)).toBe(1);
    for (let f = 0; f < 120; f++) expect(fadeSwap(f, starts, 0) > 0 && fadeSwap(f, starts, 1) > 0).toBe(false);
    // 最后一句到 end 淡出
    expect(fadeSwap(140, starts, 1, 140)).toBe(0);
  });

  it('字幕停留：约 2.5 秒一句，最短 2 秒、最长 4 秒；排开始帧不重叠', () => {
    expect(readFrames('明明想改，最后又回到【老样子】。')).toBeGreaterThan(60);
    expect(readFrames('明明想改，最后又回到【老样子】。')).toBeLessThan(100);
    expect(readFrames('好')).toBe(60);
    expect(readFrames('这'.repeat(80))).toBe(120);
    const s = lineStarts(['第一句话', '第二句稍微长一点的话', '三'], 10);
    expect(s[0]).toBe(10);
    expect(s[1]).toBe(10 + readFrames('第一句话'));
    expect(s[2]).toBeGreaterThan(s[1]);
  });

  it('模糊收拢和逐字：起点全透明全模糊，结束清晰', () => {
    expect(blurIn(0, 10).v).toBe(0);
    expect(blurIn(20, 10).v).toBeCloseTo(1, 5);
    expect(blurIn(20, 10).filter).toBeUndefined();
    expect(blurIn(60, 10, 10, 40).v).toBe(0);
    expect(charIn(10, 10, 0).v).toBe(0);
    expect(charIn(10, 10, 0).blur).toBeCloseTo(14, 5);
    // 第 2 个字晚 4 帧开始，8 帧完成
    expect(charIn(14, 10, 1).v).toBe(0);
    expect(charIn(22, 10, 1).v).toBeCloseTo(1, 5);
    expect(charIn(22, 10, 1).scale).toBeCloseTo(1, 5);
  });

  it('钟摆：一个来回 72 帧，摆幅渐入后到 ±amp', () => {
    expect(swing(0, 0)).toBe(0);
    expect(swing(18 + 72, 0)).toBeCloseTo(28, 5);
    expect(swing(54 + 72, 0)).toBeCloseTo(-28, 5);
    expect(swing(36 + 72, 0)).toBeCloseTo(0, 5);
  });

  it('光斑落点：不摆时在正下方，正角度往左', () => {
    const [x0, y0] = lampSpot(960, 0, 300, 0, 400);
    expect(x0).toBeCloseTo(960, 5);
    expect(y0).toBeCloseTo(700, 5);
    const [x1, y1] = lampSpot(960, 0, 300, 30, 400);
    expect(x1).toBeCloseTo(960 - 350, 5);
    expect(y1).toBeCloseTo(700 * Math.cos(Math.PI / 6), 5);
  });

  it('转场：暗场叠化两头为 0，闪白 3 帧冲满再退', () => {
    expect(dip(0, 0, 100)).toBe(0);
    expect(dip(50, 0, 100)).toBe(1);
    expect(dip(120, 0, 100)).toBe(0);
    expect(flash(9, 10)).toBe(0);
    expect(flash(13, 10)).toBe(1);
    expect(flash(16, 10)).toBe(1);
    expect(flash(60, 10)).toBe(0);
  });

  it('飞到角落和慢推的两端值', () => {
    const a = {x: 960, y: 470, size: 4};
    const b = {x: 100, y: 70, size: 1};
    expect(flyTo(0, 10, a, b)).toMatchObject({x: 960, y: 470, size: 4});
    expect(flyTo(40, 10, a, b)).toMatchObject({x: 100, y: 70, size: 1});
    expect(pushIn(0, 0, 150)).toBe(1);
    expect(pushIn(150, 0, 150)).toBeCloseTo(1.06, 5);
  });

  it('颜色混合', () => {
    expect(mixHex('#000000', '#ffffff', 0)).toBe('#000000');
    expect(mixHex('#000000', '#ffffff', 1)).toBe('#ffffff');
    expect(mixHex('#000000', '#ff8000', 0.5)).toBe('#804000');
  });
});
