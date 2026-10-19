import {describe, expect, it} from 'vitest';
import {joints, mixPose, ovalPoint, pose} from '../../src/library/crimson-glow/props';
import {blurIn, vis, withAlpha} from '../../src/library/crimson-glow/theme';

describe('3：尼采与权力意志 crimson-glow', () => {
  it('模糊柔入：at 之前不可见，10 帧后完全清晰；退场后归零', () => {
    expect(blurIn(0, 10).v).toBe(0);
    const done = blurIn(20, 10);
    expect(done.v).toBeCloseTo(1, 5);
    expect(done.filter).toBeUndefined();
    expect(blurIn(15, 10).v).toBeGreaterThan(0.8); // 先快后慢：一半时间已经出来八成以上
    expect(blurIn(100, 10, 10, 60).v).toBe(0);
  });

  it('两头淡入淡出的可见度', () => {
    expect(vis(0, 0, 100)).toBe(0);
    expect(vis(50, 0, 100)).toBe(1);
    expect(vis(100, 0, 100)).toBe(0);
  });

  it('火柴人：每个姿势、步态的每一帧，低的那只脚都踩在地面上，头在最上面', () => {
    const poses = [pose('stand'), pose('slump', 7)];
    for (let t = 0; t < 36; t += 3) poses.push(pose('walk', t), pose('run', t));
    for (const p of poses) {
      const j = joints(p);
      const feet = Math.max(j.hip.y + j.l.fy, j.hip.y + j.r.fy);
      expect(feet).toBeCloseTo(0, 6);
      expect(j.head.y).toBeLessThan(j.hip.y);
    }
    expect(joints(pose('stand')).head.y).toBeLessThan(-0.9); // 站直时身高约等于 h
  });

  it('姿势插值两端等于原姿势', () => {
    const a = pose('slump', 0);
    const b = pose('stand');
    expect(mixPose(a, b, 0)).toEqual(a);
    expect(mixPose(a, b, 1)).toEqual(b);
  });

  it('椭圆跑道上的点：一圈首尾相接、处处连续，0 在下直道左端', () => {
    const [cx, cy, w, h, R] = [960, 430, 820, 320, 137.5];
    const p0 = ovalPoint(cx, cy, w, R, 0, h);
    expect(p0.x).toBeCloseTo(cx - (w - h) / 2, 5);
    expect(p0.y).toBeCloseTo(cy + R, 5);
    const p1 = ovalPoint(cx, cy, w, R, 1, h);
    expect(p1.x).toBeCloseTo(p0.x, 5);
    let prev = p0;
    for (let k = 1; k <= 400; k++) {
      const p = ovalPoint(cx, cy, w, R, k / 400, h);
      expect(Math.hypot(p.x - prev.x, p.y - prev.y)).toBeLessThan(5);
      prev = p;
    }
  });

  it('颜色加透明度', () => {
    expect(withAlpha('#8e2b24', 0.5)).toBe('rgba(142,43,36,0.5)');
    expect(withAlpha('rgba(1,2,3,0.4)', 0.5)).toBe('rgba(1,2,3,0.4)');
  });
});
