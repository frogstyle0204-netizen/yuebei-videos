import React from 'react';
import {AbsoluteFill} from 'remotion';
import {clamp01, rand} from '../anim';
import {C, CF} from './theme';

/**
 * 3：尼采权力与意志的道具：发光火柴人、俯视椭圆跑道、合上的书、摊开的本子、断崖。
 * 坐标都是 1920×1080 画面里的绝对像素；所有动画由帧号算出。
 */

const W = 1920;
const H = 1080;
const RAD = Math.PI / 180;

/* ---------------- 发光火柴人 ---------------- */

/** 姿势：躯干前倾角 lean、头相对躯干的低头角 neck；四肢是相对竖直向下的绝对角度（正 = 朝面向的方向） */
export type PoseAngles = {lean: number; neck: number; lt: number; ls: number; rt: number; rs: number; la1: number; la2: number; ra1: number; ra2: number};
export type PoseName = 'stand' | 'slump' | 'walk' | 'run';

/** 姿势表：stand 站直、slump 垂头撑膝（累了 / 想停）、walk 走（t 驱动步态）、run 跑 */
export const pose = (name: PoseName, t = 0): PoseAngles => {
  if (name === 'slump') {
    const b = Math.sin(t / 9) * 2; // 喘气
    return {lean: 58 + b, neck: 26 - b, lt: 9, ls: -4, rt: 3, rs: -8, la1: -22 + b, la2: -30, ra1: -16 + b, ra2: -24};
  }
  if (name === 'walk') {
    const p = (t / 32) * Math.PI * 2;
    const s = Math.sin(p);
    const c = Math.cos(p);
    const lt = 22 * s;
    const rt = -22 * s;
    return {lean: 4, neck: 4, lt, ls: lt - 24 * Math.max(0, c), rt, rs: rt - 24 * Math.max(0, -c), la1: -18 * s, la2: -18 * s + 12, ra1: 18 * s, ra2: 18 * s + 12};
  }
  if (name === 'run') {
    const p = (t / 18) * Math.PI * 2;
    const s = Math.sin(p);
    const c = Math.cos(p);
    const lt = 42 * s + 6;
    const rt = -42 * s + 6;
    return {lean: 15, neck: -4, lt, ls: lt - 78 * Math.max(0, c) - 12, rt, rs: rt - 78 * Math.max(0, -c) - 12, la1: -38 * s, la2: -38 * s + 82, ra1: 38 * s, ra2: 38 * s + 82};
  }
  return {lean: 0, neck: 2, lt: 3, ls: 0, rt: -3, rs: -1, la1: -4, la2: -2, ra1: 5, ra2: 3};
};

/** 两个姿势按 m 插值（站起来、坐下这类过渡用） */
export const mixPose = (a: PoseAngles, b: PoseAngles, m: number): PoseAngles => {
  const k = clamp01(m);
  const o = {} as PoseAngles;
  (Object.keys(a) as (keyof PoseAngles)[]).forEach((key) => {
    o[key] = a[key] + (b[key] - a[key]) * k;
  });
  return o;
};

const L = {thigh: 0.245, shin: 0.245, torso: 0.33, neck: 0.03, head: 0.065, arm1: 0.19, arm2: 0.17, stroke: 0.06};

/** 由姿势算关节位置（单位：身高，原点在脚下中点，y 向下为正）；低的那只脚始终踩在 y = 0 */
export const joints = (p: PoseAngles) => {
  const leg = (t: number, s: number) => ({kx: L.thigh * Math.sin(t * RAD), ky: L.thigh * Math.cos(t * RAD), fx: L.thigh * Math.sin(t * RAD) + L.shin * Math.sin(s * RAD), fy: L.thigh * Math.cos(t * RAD) + L.shin * Math.cos(s * RAD)});
  const l = leg(p.lt, p.ls);
  const r = leg(p.rt, p.rs);
  const hip = {x: 0, y: -Math.max(l.fy, r.fy)};
  const sh = {x: hip.x + L.torso * Math.sin(p.lean * RAD), y: hip.y - L.torso * Math.cos(p.lean * RAD)};
  const na = (p.lean + p.neck) * RAD;
  const head = {x: sh.x + (L.neck + L.head) * Math.sin(na), y: sh.y - (L.neck + L.head) * Math.cos(na)};
  const arm = (a1: number, a2: number) => {
    const ex = sh.x + L.arm1 * Math.sin(a1 * RAD);
    const ey = sh.y + 0.02 + L.arm1 * Math.cos(a1 * RAD);
    return {ex, ey, hx: ex + L.arm2 * Math.sin(a2 * RAD), hy: ey + L.arm2 * Math.cos(a2 * RAD)};
  };
  return {l, r, hip, sh, head, la: arm(p.la1, p.la2), ra: arm(p.ra1, p.ra2), headR: L.head};
};

/**
 * 发光火柴人：x 脚下中点、y 地面线、h 身高；p 姿势（pose(...) 或 mixPose 的结果），dir 1 朝右 / -1 朝左。
 * tone 'ink' 米白发光，'red' 影子红；ghost 虚化半透明（放大后当「影子自我」）；bloom 0–1 身上的白色光团。
 */
export const GlowFigure: React.FC<{x: number; y: number; h?: number; p: PoseAngles; dir?: 1 | -1; tone?: 'ink' | 'red'; ghost?: boolean; bloom?: number; opacity?: number}> = ({
  x,
  y,
  h = 300,
  p,
  dir = 1,
  tone = 'ink',
  ghost = false,
  bloom = 0,
  opacity = 1,
}) => {
  const {l, r, hip, sh, head, la, ra} = joints(p);
  const front = tone === 'red' ? C.ghost : C.ink;
  const back = tone === 'red' ? C.ghostDeep : '#bdb3ac';
  const sw = ghost ? L.stroke * 1.3 : L.stroke;
  const box = 1.3;
  const filter = ghost
    ? `blur(${Math.max(2, h * 0.022)}px)`
    : tone === 'red'
      ? `drop-shadow(0 0 ${h * 0.012}px rgba(160,40,30,0.7))`
      : `drop-shadow(0 0 ${h * 0.013}px rgba(255,248,240,0.95)) drop-shadow(0 0 ${h * 0.05}px rgba(255,236,224,0.5))`;
  const limb = (pts: [number, number][], c: string) => <polyline points={pts.map(([a, b]) => `${a},${b}`).join(' ')} fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />;
  return (
    <div style={{position: 'absolute', left: x - (h * box) / 2, top: y - h * 1.08, width: h * box, height: h * 1.15, opacity: ghost ? 0.58 * opacity : opacity, pointerEvents: 'none'}}>
      {bloom > 0 && (
        <div
          style={{
            position: 'absolute',
            left: (h * box) / 2 - h * 0.85,
            top: h * 1.08 - h * 0.55 - h * 0.85,
            width: h * 1.7,
            height: h * 1.7,
            borderRadius: '50%',
            background: `radial-gradient(circle, rgba(255,250,244,${0.85 * bloom}) 0%, rgba(255,240,230,${0.35 * bloom}) 35%, rgba(255,240,230,0) 70%)`,
          }}
        />
      )}
      <svg viewBox={`${-box / 2} -1.08 ${box} 1.15`} width={h * box} height={h * 1.15} style={{position: 'absolute', overflow: 'visible', filter, transform: dir === -1 ? 'scaleX(-1)' : undefined}}>
        {limb([[hip.x, hip.y], [hip.x + l.kx, hip.y + l.ky], [hip.x + l.fx, hip.y + l.fy]], back)}
        {limb([[sh.x, sh.y + 0.02], [la.ex, la.ey], [la.hx, la.hy]], back)}
        {limb([[hip.x, hip.y], [sh.x, sh.y]], front)}
        {limb([[hip.x, hip.y], [hip.x + r.kx, hip.y + r.ky], [hip.x + r.fx, hip.y + r.fy]], front)}
        {limb([[sh.x, sh.y + 0.02], [ra.ex, ra.ey], [ra.hx, ra.hy]], front)}
        <circle cx={head.x} cy={head.y} r={L.head} fill={front} />
      </svg>
    </div>
  );
};

/* ---------------- 俯视椭圆跑道 ---------------- */

/** 椭圆跑道上进度 s（0–1，从下直道左端出发、逆时针一圈）的位置；R 是所在那圈的半高 */
export const ovalPoint = (cx: number, cy: number, w: number, R: number, s: number, hOuter: number) => {
  const Ls = w - hOuter;
  const P = 2 * Ls + 2 * Math.PI * R;
  let d = (((s % 1) + 1) % 1) * P;
  if (d < Ls) return {x: cx - Ls / 2 + d, y: cy + R};
  d -= Ls;
  if (d < Math.PI * R) {
    const th = d / R;
    return {x: cx + Ls / 2 + R * Math.sin(th), y: cy + R * Math.cos(th)};
  }
  d -= Math.PI * R;
  if (d < Ls) return {x: cx + Ls / 2 - d, y: cy - R};
  d -= Ls;
  const th = d / R;
  return {x: cx - Ls / 2 - R * Math.sin(th), y: cy - R * Math.cos(th)};
};

/**
 * 俯视椭圆跑道：场心近黑、几圈玫瑰色细线、下直道上白色起终点短线和一行灰色小字。
 * runner 0–1 光点在中间那圈上的位置（不传就没有光点）；lit [a, b] 把上直道 a–b 这一段点亮成发光白条（0 左端、1 右端）；
 * marks 下直道上起终点短线的位置（0–1）。
 */
export const OvalLoop: React.FC<{x?: number; y?: number; w?: number; h?: number; lanes?: number; gap?: number; runner?: number; trail?: number; lit?: [number, number]; marks?: number[]; label?: string; on?: number}> = ({
  x = 960,
  y = 550,
  w = 1480,
  h = 450,
  lanes = 8,
  gap = 10,
  runner,
  trail = 0.035,
  lit,
  marks = [0.3, 0.74],
  label,
  on = 1,
}) => {
  const Ls = w - h;
  const R0 = h / 2;
  const Rin = R0 - (lanes - 1) * gap;
  const Rm = (R0 + Rin) / 2;
  const stadium = (R: number) => `M ${x - Ls / 2} ${y + R} L ${x + Ls / 2} ${y + R} A ${R} ${R} 0 0 0 ${x + Ls / 2} ${y - R} L ${x - Ls / 2} ${y - R} A ${R} ${R} 0 0 0 ${x - Ls / 2} ${y + R} Z`;
  return (
    <AbsoluteFill style={{opacity: on}}>
      <svg width={W} height={H} style={{position: 'absolute'}}>
        <defs>
          <radialGradient id="cg-field" cx="50%" cy="45%" r="60%">
            <stop offset="0" stopColor="#131614" />
            <stop offset="1" stopColor={C.field} />
          </radialGradient>
          <filter id="cg-oval-glow" x="-30%" y="-60%" width="160%" height="220%">
            <feGaussianBlur stdDeviation="8" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="cg-oval-soft" x="-20%" y="-40%" width="140%" height="180%">
            <feGaussianBlur stdDeviation="22" />
          </filter>
        </defs>
        <path d={stadium(R0 + 10)} fill="rgba(120,30,24,0.16)" filter="url(#cg-oval-soft)" />
        <path d={stadium(R0 + 4)} fill="#2a0d0b" />
        <path d={stadium(Rin - 4)} fill="url(#cg-field)" />
        {Array.from({length: lanes}, (_, k) => (
          <path key={k} d={stadium(R0 - k * gap)} fill="none" stroke={C.lane} strokeWidth={k === 0 || k === lanes - 1 ? 2.4 : 1.6} opacity={0.82} />
        ))}
        {marks.map((m, i) => {
          const mx = x - Ls / 2 + m * Ls;
          return <line key={i} x1={mx} x2={mx} y1={y + Rin - 6} y2={y + R0 + 6} stroke="#f4ede6" strokeWidth={3} opacity={0.9} />;
        })}
        {label && (
          <text x={x - Ls / 2 + marks[0] * Ls} y={y + R0 + 34} fill="#77706c" fontSize={20} fontStyle="italic" fontFamily={CF.latin} textAnchor="start" letterSpacing="0.04em">
            {label}
          </text>
        )}
        {lit && lit[1] > lit[0] && (
          <rect x={x - Ls / 2 + lit[0] * Ls} y={y - (R0 + Rin) / 2 - (R0 - Rin) * 0.32} width={(lit[1] - lit[0]) * Ls} height={(R0 - Rin) * 0.64} rx={(R0 - Rin) * 0.32} fill="#fffaf4" filter="url(#cg-oval-glow)" />
        )}
        {runner !== undefined &&
          Array.from({length: 7}, (_, k) => {
            const pt = ovalPoint(x, y, w, Rm, runner - (k * trail) / 6, h);
            return <circle key={k} cx={pt.x} cy={pt.y} r={k === 0 ? 6 : 4.5 - k * 0.5} fill="#fffaf4" opacity={k === 0 ? 1 : 0.35 * (1 - k / 7)} filter={k === 0 ? 'url(#cg-oval-glow)' : undefined} />;
          })}
      </svg>
    </AbsoluteFill>
  );
};

/* ---------------- 书 ---------------- */

/** 合上的书（从书口那一面看）：灰白细纸页条纹 + 上下两片暗红封皮 + 地上阴影；x、y 是中心 */
export const ClosedBook: React.FC<{x?: number; y?: number; w?: number; h?: number}> = ({x = 960, y = 400, w = 720, h = 320}) => (
  <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0}}>
    <defs>
      <pattern id="cg-pages" width="8" height="6" patternUnits="userSpaceOnUse">
        <rect width="8" height="6" fill="#7d7670" />
        <rect y="0" width="8" height="3.2" fill="#d9d2cb" />
      </pattern>
      <linearGradient id="cg-pages-shade" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="rgba(0,0,0,0.35)" />
        <stop offset="0.18" stopColor="rgba(0,0,0,0)" />
        <stop offset="0.82" stopColor="rgba(0,0,0,0)" />
        <stop offset="1" stopColor="rgba(0,0,0,0.35)" />
      </linearGradient>
      <filter id="cg-book-shadow" x="-30%" y="-200%" width="160%" height="500%">
        <feGaussianBlur stdDeviation="14" />
      </filter>
    </defs>
    <ellipse cx={x} cy={y + h / 2 + 18} rx={w * 0.62} ry={16} fill="rgba(0,0,0,0.85)" filter="url(#cg-book-shadow)" />
    <rect x={x - w / 2} y={y - h / 2} width={w} height={h} fill="url(#cg-pages)" />
    <rect x={x - w / 2} y={y - h / 2} width={w} height={h} fill="url(#cg-pages-shade)" />
    <rect x={x - w / 2 - 10} y={y - h / 2 - 16} width={w + 20} height={16} rx={3} fill="#4b1511" />
    <rect x={x - w / 2 - 10} y={y - h / 2 - 16} width={w + 20} height={3.5} fill="#7a2a22" />
    <rect x={x - w / 2 - 10} y={y + h / 2} width={w + 20} height={16} rx={3} fill="#3d100d" />
  </svg>
);

/**
 * 摊开的本子：两页米白纸（靠书脊处下陷发暗、页边几层纸叠）、地上阴影。
 * 左页写 head（大字）、sub（小号斜体）和 items 清单（written 写到第几条，其余只剩横线）；右页留白只有横线。x、y 是中心。
 */
export const OpenBook: React.FC<{x?: number; y?: number; w?: number; h?: number; head: string; sub?: string; items?: string[]; written?: number}> = ({x = 960, y = 460, w = 1260, h = 680, head, sub, items = [], written = items.length}) => {
  const pw = w / 2;
  const top = y - h / 2;
  const bot = y + h / 2;
  const page = (side: -1 | 1, dy = 0, dx = 0) => {
    const e = x + side * (pw + dx);
    return `M ${x} ${top + 34 + dy} C ${x + side * pw * 0.3} ${top - 6 + dy} ${x + side * pw * 0.7} ${top - 12 + dy} ${e} ${top + 4 + dy} L ${e} ${bot - 10 + dy} C ${x + side * pw * 0.7} ${bot - 26 + dy} ${x + side * pw * 0.3} ${bot - 22 + dy} ${x} ${bot + dy} Z`;
  };
  const rules = Array.from({length: 10}, (_, i) => top + 250 + i * 40);
  return (
    <div style={{position: 'absolute', left: 0, top: 0, width: W, height: H}}>
      <svg width={W} height={H} style={{position: 'absolute'}}>
        <defs>
          <linearGradient id="cg-pageL" x1={x - pw} y1="0" x2={x} y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#d2c9be" />
            <stop offset="0.12" stopColor={C.page} />
            <stop offset="0.86" stopColor={C.page} />
            <stop offset="1" stopColor={C.pageShade} />
          </linearGradient>
          <linearGradient id="cg-pageR" x1={x} y1="0" x2={x + pw} y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor={C.pageShade} />
            <stop offset="0.14" stopColor={C.page} />
            <stop offset="0.88" stopColor={C.page} />
            <stop offset="1" stopColor="#d2c9be" />
          </linearGradient>
          <radialGradient id="cg-page-vig" cx="50%" cy="38%" r="70%">
            <stop offset="0.55" stopColor="rgba(40,30,24,0)" />
            <stop offset="1" stopColor="rgba(40,30,24,0.28)" />
          </radialGradient>
          <filter id="cg-open-shadow" x="-20%" y="-20%" width="140%" height="160%">
            <feGaussianBlur stdDeviation="22" />
          </filter>
        </defs>
        <rect x={x - pw - 10} y={top + 30} width={w + 20} height={h} rx={10} fill="rgba(0,0,0,0.9)" filter="url(#cg-open-shadow)" />
        {[3, 2, 1].map((k) => (
          <g key={k} opacity={0.9}>
            <path d={page(-1, k * 3, k * 3)} fill="#a79e93" />
            <path d={page(1, k * 3, k * 3)} fill="#a79e93" />
          </g>
        ))}
        <path d={page(-1)} fill="url(#cg-pageL)" />
        <path d={page(1)} fill="url(#cg-pageR)" />
        <path d={page(-1)} fill="url(#cg-page-vig)" />
        <path d={page(1)} fill="url(#cg-page-vig)" />
        {rules.map((ry, i) => (
          <g key={i} stroke="rgba(90,80,72,0.16)" strokeWidth={1.2}>
            <line x1={x - pw + 60} x2={x - 50} y1={ry} y2={ry} />
            <line x1={x + 60} x2={x + pw - 70} y1={ry - 100} y2={ry - 100} />
          </g>
        ))}
        <line x1={x} x2={x} y1={top + 34} y2={bot} stroke="rgba(60,48,40,0.35)" strokeWidth={2} />
      </svg>
      <div style={{position: 'absolute', left: x - pw + 80, top: top + 70, fontFamily: CF.cn, color: '#2b2522'}}>
        <div style={{fontSize: 78, fontWeight: 800, letterSpacing: '0.04em', lineHeight: 1.1}}>{head}</div>
        {sub && <div style={{fontFamily: CF.latin, fontStyle: 'italic', fontSize: 28, color: '#7b716a', marginTop: 8}}>{sub}</div>}
      </div>
      {items.map((it, i) => (
        <div key={i} style={{position: 'absolute', left: x - pw + 84, top: rules[i] - 36, fontFamily: CF.cn, fontSize: 28, color: '#4a403a', opacity: clamp01(written - i)}}>
          {it}
        </div>
      ))}
    </div>
  );
};

/* ---------------- 断崖 ---------------- */

/**
 * 断崖：两侧赤红崖顶（竖条纹、内侧锯齿崖壁）、中间看不见底的黑；y 崖顶高度，gap [左崖边, 右崖边]。
 * span 0–1 横跨的发光线从左往右画出；steps 线上落脚点的数量，lit 已点亮几个（可为小数，点亮时有一下闪光）。
 */
export const Chasm: React.FC<{y?: number; gap?: [number, number]; span?: number; steps?: number; lit?: number; on?: number; seed?: number}> = ({y = 600, gap = [560, 1360], span = 1, steps = 0, lit = 0, on = 1, seed = 9}) => {
  const [x0, x1] = gap;
  const edge = (xe: number, side: -1 | 1) => {
    const pts: [number, number][] = [];
    for (let k = 0; k <= 9; k++) {
      const yy = y + ((H - y) * k) / 9;
      pts.push([xe + side * (k === 0 ? 0 : (rand(seed + k * 3 + (side > 0 ? 50 : 0)) - 0.35) * 46 + k * 4), yy]);
    }
    return pts;
  };
  const le = edge(x0, -1);
  const re = edge(x1, 1);
  const leftPoly = [[0, y], ...le, [0, H]].map(([a, b]) => `${a},${b}`).join(' ');
  const rightPoly = [[W, y], ...re, [W, H]].map(([a, b]) => `${a},${b}`).join(' ');
  const xs = x0 + (x1 - x0) * span;
  const planks = Array.from({length: steps}, (_, i) => x0 + ((i + 0.5) / steps) * (x1 - x0));
  return (
    <AbsoluteFill style={{opacity: on}}>
      <svg width={W} height={H} style={{position: 'absolute'}}>
        <defs>
          <linearGradient id="cg-cliff" x1="0" y1={y} x2="0" y2={H} gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#64231d" />
            <stop offset="0.3" stopColor={C.floor} />
            <stop offset="1" stopColor="#2a0b09" />
          </linearGradient>
          <linearGradient id="cg-abyss" x1="0" y1={y} x2="0" y2={H} gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#0b0505" />
            <stop offset="1" stopColor="#020101" />
          </linearGradient>
          <pattern id="cg-cliff-stripe" width="230" height="10" patternUnits="userSpaceOnUse">
            <rect width="104" height="10" fill="rgba(255,215,205,0.04)" />
            <rect x="104" width="126" height="10" fill="rgba(0,0,0,0.08)" />
          </pattern>
          <filter id="cg-span-glow" x="-5%" y="-500%" width="110%" height="1100%">
            <feGaussianBlur stdDeviation="6" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <rect x={x0 - 60} y={y} width={x1 - x0 + 120} height={H - y} fill="url(#cg-abyss)" />
        <polygon points={leftPoly} fill="url(#cg-cliff)" />
        <polygon points={leftPoly} fill="url(#cg-cliff-stripe)" />
        <polygon points={rightPoly} fill="url(#cg-cliff)" />
        <polygon points={rightPoly} fill="url(#cg-cliff-stripe)" />
        <polyline points={le.map(([a, b]) => `${a},${b}`).join(' ')} fill="none" stroke="#2a0a08" strokeWidth={10} opacity={0.8} />
        <polyline points={re.map(([a, b]) => `${a},${b}`).join(' ')} fill="none" stroke="#2a0a08" strokeWidth={10} opacity={0.8} />
        <g filter="url(#cg-span-glow)">
          <rect x={0} y={y - 2} width={x0} height={4} fill="#f6efe8" opacity={0.75} />
          <rect x={x1} y={y - 2} width={W - x1} height={4} fill="#f6efe8" opacity={0.75} />
          {span > 0 && <rect x={x0} y={y - 1.5} width={xs - x0} height={3} fill="#fffaf4" />}
        </g>
        {planks.map((px, i) => {
          const v = clamp01(lit - i);
          const flash = v > 0 && v < 1 ? Math.sin(v * Math.PI) : 0;
          return (
            <g key={i}>
              <rect x={px - 24} y={y + 4} width={48} height={7} rx={2} fill="none" stroke="rgba(236,229,220,0.25)" strokeWidth={1.2} />
              {v > 0 && <rect x={px - 24} y={y + 4} width={48} height={7} rx={2} fill="#fffaf4" opacity={v} filter="url(#cg-span-glow)" />}
              {flash > 0 && <circle cx={px} cy={y + 8} r={30 + 30 * v} fill="none" stroke="#fffaf4" strokeWidth={2} opacity={flash * 0.7} />}
            </g>
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};
