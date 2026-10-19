import {rand} from '../anim';

/**
 * 星图几何：所有形都用折线（点数组）描述，再等距串成星点。全是纯函数，方便测试和按帧计算。
 * 坐标单位就是舞台像素；角度用度，0° 朝右、顺时针（SVG 坐标系）。
 */
export type Pt = [number, number];
export type Stroke = Pt[];

/** 直线两点 */
export const line = (a: Pt, b: Pt): Stroke => [a, b];

/** 折线；closed 时回到起点 */
export const poly = (pts: Pt[], closed = false): Stroke => (closed ? [...pts, pts[0]] : pts.slice());

/** 圆弧：圆心 (cx, cy)、半径 r，从 a0° 到 a1°，steps 段 */
export const arc = (cx: number, cy: number, r: number, a0: number, a1: number, steps?: number): Stroke => {
  const n = steps ?? Math.max(8, Math.ceil((Math.abs(a1 - a0) / 360) * Math.max(24, r / 3)));
  return Array.from({length: n + 1}, (_, i) => {
    const a = ((a0 + ((a1 - a0) * i) / n) * Math.PI) / 180;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r] as Pt;
  });
};

/** 整圆（从 start° 开始画，方便让几个圆从不同位置扫出） */
export const circle = (cx: number, cy: number, r: number, start = -90): Stroke => arc(cx, cy, r, start, start + 360);

/** 椭圆：rot 为整体旋转角 */
export const ellipse = (cx: number, cy: number, rx: number, ry: number, rot = 0, start = 0, steps = 72): Stroke => {
  const c = Math.cos((rot * Math.PI) / 180);
  const s = Math.sin((rot * Math.PI) / 180);
  return Array.from({length: steps + 1}, (_, i) => {
    const a = ((start + (360 * i) / steps) * Math.PI) / 180;
    const x = Math.cos(a) * rx;
    const y = Math.sin(a) * ry;
    return [cx + x * c - y * s, cy + x * s + y * c] as Pt;
  });
};

/** 三次贝塞尔曲线取点 */
export const bezier = (p0: Pt, p1: Pt, p2: Pt, p3: Pt, steps = 24): Stroke =>
  Array.from({length: steps + 1}, (_, i) => {
    const t = i / steps;
    const u = 1 - t;
    return [u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]] as Pt;
  });

/** 累计长度：返回与点数相同长度的数组，最后一项是总长 */
export const lengths = (pts: Stroke) => {
  const out = [0];
  for (let i = 1; i < pts.length; i++) out.push(out[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  return out;
};

/** 沿折线走到总长的 p（0–1）处，返回截断后的折线（用来「画出来」） */
export const cut = (pts: Stroke, p: number): Stroke => {
  if (p <= 0 || pts.length < 2) return [];
  if (p >= 1) return pts;
  const L = lengths(pts);
  const target = L[L.length - 1] * p;
  const res: Stroke = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    if (L[i] <= target) {
      res.push(pts[i]);
      continue;
    }
    const k = (target - L[i - 1]) / Math.max(1e-6, L[i] - L[i - 1]);
    res.push([pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * k, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * k]);
    break;
  }
  return res;
};

/** 沿折线每隔 spacing 像素取一颗星点（含起点）；u 是这颗点在整条线上的位置 0–1 */
export const resample = (pts: Stroke, spacing: number): {p: Pt; u: number}[] => {
  if (pts.length < 2) return pts.map((p) => ({p, u: 0}));
  const L = lengths(pts);
  const total = L[L.length - 1];
  const n = Math.max(1, Math.round(total / spacing));
  const res: {p: Pt; u: number}[] = [];
  let seg = 1;
  for (let k = 0; k <= n; k++) {
    const d = (total * k) / n;
    while (seg < pts.length - 1 && L[seg] < d) seg++;
    const k2 = (d - L[seg - 1]) / Math.max(1e-6, L[seg] - L[seg - 1]);
    res.push({p: [pts[seg - 1][0] + (pts[seg][0] - pts[seg - 1][0]) * k2, pts[seg - 1][1] + (pts[seg][1] - pts[seg - 1][1]) * k2], u: k / n});
  }
  return res;
};

/** 平移 + 缩放 + 旋转一组笔画 */
export const place = (strokes: Stroke[], x: number, y: number, s = 1, rot = 0): Stroke[] => {
  const c = Math.cos((rot * Math.PI) / 180);
  const sn = Math.sin((rot * Math.PI) / 180);
  return strokes.map((st) => st.map(([px, py]) => [x + (px * c - py * sn) * s, y + (px * sn + py * c) * s] as Pt));
};

/** 水平镜像（小人朝左） */
export const mirror = (strokes: Stroke[]): Stroke[] => strokes.map((st) => st.map(([x, y]) => [-x, y] as Pt));

/** 第 i 颗星点的散点起点：在目标点周围 radius 内的确定性随机位置 */
export const scatter = (seed: number, i: number, radius: number): Pt => {
  const a = rand(seed * 977 + i * 13.1) * Math.PI * 2;
  const r = radius * (0.35 + 0.65 * Math.sqrt(rand(seed * 331 + i * 7.7)));
  return [Math.cos(a) * r, Math.sin(a) * r];
};

/** 折线 → SVG path 的 d */
export const pathD = (pts: Stroke) => (pts.length ? 'M' + pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' L') : '');
