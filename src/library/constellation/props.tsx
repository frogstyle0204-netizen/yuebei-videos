import React from 'react';
import {clamp01, easeInOut, easeOut, rand} from '../anim';
import {bezier, circle, cut, ellipse, lengths, line, mirror, pathD, place, poly, resample, scatter, type Pt, type Stroke} from './geom';
import {K, KF} from './theme';

/**
 * 星图线描风的实物层：一切都由星点串成、细线连起。核心是 StarShape，其余道具都只是给它喂笔画。
 * 坐标一律是 1920×1080 舞台像素；所有动画由传进来的进度（0–1）或帧号算出。
 */

type Tone = 'bright' | 'dim' | 'paper';
const TONE: Record<Tone, {dot: string; line: string; glow: string | undefined; op: number}> = {
  bright: {dot: K.star, line: K.line, glow: 'drop-shadow(0 0 4px rgba(235,242,255,0.9)) drop-shadow(0 0 10px rgba(200,212,240,0.35))', op: 1},
  dim: {dot: '#a9aaae', line: '#6f7074', glow: 'drop-shadow(0 0 3px rgba(200,205,220,0.45))', op: 0.62},
  paper: {dot: K.paperInk, line: K.paperInk, glow: undefined, op: 1},
};

/**
 * 通用星图形：strokes 每条折线等距串成星点（spacing 像素一颗），再用细线连起来。
 * gather 散点从四周聚拢就位（0 = 还散着 / 看不见，1 = 就位）；draw 连线画出；shatter 碎成星尘飘散。
 * seq 为 true 时笔画一条接一条画，否则同时扫出；f 传了就让星点轻轻闪烁。tone 选 亮 / 配角 / 白纸场的墨黑。
 */
export const StarShape: React.FC<{
  strokes: Stroke[];
  gather?: number;
  draw?: number;
  shatter?: number;
  spacing?: number;
  r?: number;
  width?: number;
  tone?: Tone;
  opacity?: number;
  seq?: boolean;
  spread?: number;
  seed?: number;
  f?: number;
  lines?: boolean;
  fill?: string;
}> = ({strokes, gather = 1, draw = 1, shatter = 0, spacing = 9, r = 2, width = 1.2, tone = 'bright', opacity = 1, seq = false, spread = 260, seed = 1, f, lines = true, fill}) => {
  const T = TONE[tone];
  const total = strokes.reduce((s, st) => s + lengths(st)[st.length - 1], 0) || 1;
  let acc = 0;
  const lineEls: React.ReactNode[] = [];
  const dotEls: React.ReactNode[] = [];
  let k = 0;
  const lineOp = 1 - clamp01(shatter * 3);
  strokes.forEach((st, si) => {
    const len = lengths(st)[st.length - 1];
    const p = seq ? clamp01((draw * total - acc) / Math.max(1, len)) : draw;
    acc += len;
    if (lines && p > 0 && lineOp > 0) {
      lineEls.push(<path key={`l${si}`} d={pathD(cut(st, p))} fill="none" stroke={T.line} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" opacity={0.85 * lineOp} />);
    }
    for (const b of resample(st, spacing)) {
      const i = k++;
      const d = rand(seed * 101 + i * 1.37);
      const g = easeInOut(clamp01((gather - d * 0.35) / 0.65));
      const appear = clamp01(gather * 2.6 - d * 1.6); // 星点一颗颗冒出来，不是一下子全亮
      if (appear <= 0) continue;
      const [sx, sy] = scatter(seed, i, spread);
      let x = b.p[0] + sx * (1 - g);
      let y = b.p[1] + sy * (1 - g);
      let o = appear;
      let rr = r * (0.7 + 0.6 * rand(seed * 7 + i * 3.1));
      if (shatter > 0) {
        const [vx, vy] = scatter(seed + 99, i, 1);
        const sp = 90 + 260 * rand(seed * 13 + i);
        const e = easeOut(shatter);
        x += vx * sp * e;
        y += vy * sp * e + 70 * shatter * shatter;
        o *= 1 - clamp01((shatter - d * 0.3) / 0.7);
        rr *= 1 - 0.5 * shatter;
      }
      if (f !== undefined) o *= 0.78 + 0.22 * Math.sin(f / (9 + d * 14) + i);
      if (o <= 0.01) continue;
      dotEls.push(<circle key={`d${i}`} cx={x.toFixed(1)} cy={y.toFixed(1)} r={rr.toFixed(2)} fill={T.dot} opacity={o.toFixed(3)} />);
    }
  });
  return (
    <svg width={1920} height={1080} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', opacity: opacity * T.op}}>
      {fill ? strokes.map((st, i) => <path key={`f${i}`} d={pathD(st)} fill={fill} opacity={lineOp * clamp01(gather)} />) : null}
      <g style={{filter: T.glow}}>
        {lineEls}
        {dotEls}
      </g>
    </svg>
  );
};

/* ---------- 星点小人 ---------- */

/** 小人的姿势（脚底在 y=0，身高约 120，朝右）。全是原创的象形轮廓 */
const POSE: Record<string, {body: Pt[]; head: [number, number, number]}> = {
  stand: {
    head: [0, -106, 11],
    body: [[-7, -93], [-19, -88], [-23, -80], [-24, -52], [-19, -50], [-17, -74], [-15, -74], [-15, -40], [-14, 0], [-5, 0], [-3, -38], [3, -38], [5, 0], [14, 0], [15, -40], [15, -74], [17, -74], [19, -50], [24, -52], [23, -80], [19, -88], [7, -93]],
  },
  walk: {
    head: [2, -106, 11],
    body: [[-6, -93], [-17, -88], [-24, -72], [-31, -54], [-26, -51], [-18, -68], [-15, -62], [-14, -40], [-27, -5], [-19, -1], [-5, -34], [1, -34], [15, -2], [23, -6], [13, -40], [14, -64], [19, -58], [31, -47], [34, -52], [22, -76], [18, -88], [8, -93]],
  },
  point: {
    head: [0, -106, 11],
    body: [[-7, -93], [-19, -88], [-23, -80], [-24, -52], [-19, -50], [-17, -74], [-15, -74], [-15, -40], [-14, 0], [-5, 0], [-3, -38], [3, -38], [5, 0], [14, 0], [15, -40], [15, -75], [50, -80], [50, -88], [19, -89], [7, -93]],
  },
  sit: {
    head: [-2, -78, 11],
    body: [[-8, -65], [-18, -60], [-21, -34], [-18, -6], [-8, 0], [30, 0], [31, -8], [23, -9], [25, -27], [16, -31], [2, -21], [5, -41], [16, -33], [21, -38], [7, -58], [4, -65]],
  },
};

export type FigurePose = keyof typeof POSE;

/** 小人的笔画（局部坐标）；face 为 -1 时朝左 */
export const figureStrokes = (pose: FigurePose = 'stand', face: 1 | -1 = 1): Stroke[] => {
  const P = POSE[pose];
  const s: Stroke[] = [poly(P.body, true), circle(P.head[0], P.head[1], P.head[2], -90)];
  return face === 1 ? s : mirror(s);
};

/**
 * 星点小人：x 是脚底中点、y 是地面，h 身高（默认 120）。pose 站 / 走 / 指 / 坐；dim 变成配角（40% 亮度）；
 * 其余进度参数同 StarShape（gather 聚拢、draw 连线、shatter 碎裂）。
 */
export const Figure: React.FC<{x: number; y: number; h?: number; pose?: FigurePose; face?: 1 | -1; dim?: boolean; paper?: boolean; gather?: number; draw?: number; shatter?: number; f?: number; seed?: number; opacity?: number}> = ({
  x,
  y,
  h = 120,
  pose = 'stand',
  face = 1,
  dim,
  paper,
  gather = 1,
  draw = 1,
  shatter = 0,
  f,
  seed = 3,
  opacity = 1,
}) => {
  const s = h / 120;
  return (
    <StarShape
      strokes={place(figureStrokes(pose, face), x, y, s)}
      gather={gather}
      draw={draw}
      shatter={shatter}
      spacing={4.2 * Math.max(0.7, s)}
      r={1.5 * Math.max(0.8, s)}
      width={1.3}
      tone={paper ? 'paper' : dim ? 'dim' : 'bright'}
      fill={paper ? K.paperInk : undefined}
      spread={120 * s}
      seed={seed}
      f={f}
      opacity={opacity}
    />
  );
};

/** 一排配角小人：从 x0 到 x1 均匀站开、高矮略有不同，gap 留出中间给主角（[gx0, gx1]） */
export const Crowd: React.FC<{x0: number; x1: number; y: number; n: number; h?: number; gap?: [number, number]; gather?: number; paper?: boolean; seed?: number; f?: number}> = ({x0, x1, y, n, h = 96, gap, gather = 1, paper, seed = 11, f}) => (
  <>
    {Array.from({length: n}, (_, i) => {
      const x = x0 + ((x1 - x0) * (i + 0.5)) / n + (rand(seed + i) - 0.5) * 16;
      if (gap && x > gap[0] && x < gap[1]) return null;
      return <Figure key={i} x={x} y={y} h={h * (0.86 + 0.24 * rand(seed * 3 + i))} dim={!paper} paper={paper} gather={clamp01(gather * 1.4 - rand(seed + i * 7) * 0.4)} seed={seed + i} f={f} />;
    })}
  </>
);

/* ---------- 几何星轮 ---------- */

/** 星轮的四组笔画：外圈、辐条、花瓣、外环小圆 */
export const wheelStrokes = (cx: number, cy: number, R: number) => {
  const rings = [circle(cx, cy, R, -90), circle(cx, cy, R * 0.8, 30), circle(cx, cy, R * 0.32, 150)];
  const spokes = Array.from({length: 16}, (_, i) => {
    const a = (i / 16) * Math.PI * 2;
    return line([cx + Math.cos(a) * R * 0.32, cy + Math.sin(a) * R * 0.32], [cx + Math.cos(a) * R * 0.8, cy + Math.sin(a) * R * 0.8]);
  });
  const petals: Stroke[] = [];
  for (let i = 0; i < 8; i++) {
    const a = ((i + 0.5) / 8) * Math.PI * 2;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    const p0: Pt = [cx + ca * R * 0.34, cy + sa * R * 0.34];
    const p3: Pt = [cx + ca * R * 0.78, cy + sa * R * 0.78];
    const w = R * 0.16;
    const m = (k: number, side: number): Pt => [cx + ca * R * k - sa * w * side, cy + sa * R * k + ca * w * side];
    petals.push(bezier(p0, m(0.46, 1), m(0.66, 1), p3, 16), bezier(p0, m(0.46, -1), m(0.66, -1), p3, 16));
  }
  const beads = Array.from({length: 16}, (_, i) => {
    const a = ((i + 0.5) / 16) * 360;
    const ar = (a * Math.PI) / 180;
    return circle(cx + Math.cos(ar) * R * 0.9, cy + Math.sin(ar) * R * 0.9, R * 0.055, a);
  });
  return {rings, spokes, petals, beads};
};

/**
 * 几何星轮（教堂玫瑰窗那一类的「秩序 / 信仰 / 天穹」母题，原创几何）：
 * gather 星点聚拢 → draw 外圈和辐条扫出 → detail 花瓣和外环小圆补齐 → core 中心光点亮（可带 beams 光柱）。
 */
export const StarWheel: React.FC<{cx: number; cy: number; R: number; gather?: number; draw?: number; detail?: number; core?: number; beams?: number; shatter?: number; f?: number; spin?: number}> = ({cx, cy, R, gather = 1, draw = 1, detail = 1, core = 1, beams = 0, shatter = 0, f, spin = 0}) => {
  const W = wheelStrokes(0, 0, R);
  const pl = (s: Stroke[]) => place(s, cx, cy, 1, spin);
  const t = f ?? 0;
  return (
    <>
      {beams > 0 ? (
        <svg width={1920} height={1080} style={{position: 'absolute', left: 0, top: 0, opacity: beams * (1 - shatter)}}>
          <defs>
            <linearGradient id="kw-beam" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#ffffff" stopOpacity={0.32} />
              <stop offset="1" stopColor="#ffffff" stopOpacity={0} />
            </linearGradient>
          </defs>
          {[-2, -1, 0, 1, 2].map((k) => (
            <path key={k} d={`M${cx + k * 14} ${cy} L${cx + k * 150 - 70} ${cy + R * 2.1} L${cx + k * 150 + 70} ${cy + R * 2.1} Z`} fill="url(#kw-beam)" opacity={0.5 + 0.5 * Math.sin(t / 30 + k)} />
          ))}
        </svg>
      ) : null}
      {/* 星轮要「细线 + 稀疏节点」，星点比人物稀得多，否则像串珠项链 */}
      <StarShape strokes={pl(W.rings)} gather={gather} draw={draw} shatter={shatter} spacing={34} r={2.2} seed={21} spread={R * 0.9} f={f} />
      <StarShape strokes={pl(W.spokes)} gather={gather} draw={draw} shatter={shatter} spacing={44} r={2} seed={22} spread={R * 0.9} f={f} />
      <StarShape strokes={pl(W.petals)} gather={detail > 0 ? 1 : 0} draw={detail} shatter={shatter} spacing={40} r={1.5} seed={23} spread={R * 0.4} />
      <StarShape strokes={pl(W.beads)} gather={detail > 0 ? 1 : 0} draw={detail} shatter={shatter} spacing={14} r={1.3} seed={24} spread={R * 0.3} />
      {core > 0 ? (
        <div
          style={{
            position: 'absolute',
            left: cx - R,
            top: cy - R,
            width: R * 2,
            height: R * 2,
            borderRadius: '50%',
            opacity: core * (1 - shatter),
            background: `radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(255,255,255,0.85) 2.5%, rgba(235,240,255,0.35) 9%, rgba(200,210,235,0.12) 30%, rgba(0,0,0,0) 62%)`,
          }}
        />
      ) : null}
    </>
  );
};

/* ---------- 轨道图 ---------- */

/**
 * 轨道图：中心一颗发光天体，几条倾斜的细椭圆轨道依次画出，小星沿轨道走；label 用斜体小字标在轨道外侧。
 * orbits 里 period 是走一圈的帧数；p 控制轨道画出进度。
 */
export const OrbitMap: React.FC<{cx: number; cy: number; orbits: {rx: number; ry: number; period: number; label?: string; phase?: number}[]; tilt?: number; p?: number; f: number; core?: number}> = ({cx, cy, orbits, tilt = -12, p = 1, f, core = 1}) => (
  <>
    {orbits.map((o, i) => {
      const pi = clamp01(p * orbits.length - i);
      const pts = ellipse(cx, cy, o.rx, o.ry, tilt, 180, 96);
      const a = (((o.phase ?? i * 77) + (f / o.period) * 360) * Math.PI) / 180;
      const c = Math.cos((tilt * Math.PI) / 180);
      const s = Math.sin((tilt * Math.PI) / 180);
      const bx = cx + Math.cos(a) * o.rx * c - Math.sin(a) * o.ry * s;
      const by = cy + Math.cos(a) * o.rx * s + Math.sin(a) * o.ry * c;
      return (
        <React.Fragment key={i}>
          <svg width={1920} height={1080} style={{position: 'absolute', left: 0, top: 0}}>
            <path d={pathD(cut(pts, pi))} fill="none" stroke={K.line} strokeWidth={1} opacity={0.55} />
            {pi >= 1 ? <circle cx={bx} cy={by} r={4} fill={K.star} style={{filter: 'drop-shadow(0 0 6px rgba(240,245,255,0.9))'}} /> : null}
          </svg>
          {o.label ? (
            <div style={{position: 'absolute', left: cx + o.rx * 0.62, top: cy - o.ry - 34 + i * 4, fontFamily: KF.latinItalic, fontStyle: 'italic', fontSize: 20, color: K.note, opacity: clamp01(pi * 2 - 1), whiteSpace: 'nowrap'}}>{o.label}</div>
          ) : null}
        </React.Fragment>
      );
    })}
    <div style={{position: 'absolute', left: cx - 90, top: cy - 90, width: 180, height: 180, borderRadius: '50%', opacity: core, background: 'radial-gradient(circle, #fff 0%, rgba(255,255,255,0.9) 6%, rgba(220,230,255,0.25) 22%, rgba(0,0,0,0) 60%)'}} />
  </>
);

/* ---------- 星球 ---------- */

/** 星点星球：外圈 + 几个陨坑圈；rot 让表面跟着转，mark 在表面某个角度插一面小旗（标出「同一面」） */
export const Planet: React.FC<{cx: number; cy: number; r: number; rot?: number; mark?: number; gather?: number; draw?: number; shatter?: number; seed?: number; f?: number; dim?: boolean}> = ({cx, cy, r, rot = 0, mark, gather = 1, draw = 1, shatter = 0, seed = 40, f, dim}) => {
  const craters: Stroke[] = [
    [0.35, -0.3, 0.18],
    [-0.4, 0.15, 0.13],
    [0.1, 0.45, 0.1],
    [-0.15, -0.5, 0.08],
  ].map(([u, v, k]) => circle(u * r, v * r, k * r, rand(seed + u) * 360));
  const flag: Stroke[] = mark === undefined ? [] : [line([r, 0], [r * 1.55, 0]), poly([[r * 1.55, 0], [r * 1.55, -r * 0.34], [r * 1.18, -r * 0.17]], true)];
  return (
    <>
      <StarShape strokes={[circle(cx, cy, r, -90)]} gather={gather} draw={draw} shatter={shatter} spacing={8} seed={seed} spread={r * 1.4} f={f} tone={dim ? 'dim' : 'bright'} />
      <StarShape strokes={place(craters, cx, cy, 1, rot)} gather={gather} draw={draw} shatter={shatter} spacing={7} r={1.3} seed={seed + 1} spread={r} tone="dim" />
      {flag.length ? <StarShape strokes={place(flag, cx, cy, 1, (mark ?? 0) + rot)} gather={gather} draw={draw} shatter={shatter} spacing={6} r={1.6} seed={seed + 2} spread={r * 0.6} /> : null}
    </>
  );
};

/* ---------- 小道具 ---------- */

/** 打开的书：两页轮廓 + 每页几行字线；x, y 是书脊底部，w 整本宽 */
export const OpenBook: React.FC<{x: number; y: number; w?: number; gather?: number; draw?: number; f?: number}> = ({x, y, w = 300, gather = 1, draw = 1, f}) => {
  const h = w * 0.62;
  const hw = w / 2;
  const pages: Stroke[] = [
    poly([[0, 0], [-hw, -12], [-hw, -h - 12], [0, -h], [hw, -h - 12], [hw, -12], [0, 0]]),
    line([0, 0], [0, -h]),
  ];
  const rows: Stroke[] = [];
  for (let i = 0; i < 6; i++) {
    const yy = -h + 26 + i * ((h - 44) / 6);
    rows.push(line([-hw + 22, yy - 9], [-22, yy]), line([22, yy], [hw - 22, yy - 9]));
  }
  return (
    <>
      <StarShape strokes={place(pages, x, y)} gather={gather} draw={draw} spacing={8} seed={51} spread={w * 0.6} f={f} />
      <StarShape strokes={place(rows, x, y)} gather={gather} draw={draw} spacing={10} r={1.3} seed={52} spread={w * 0.4} seq tone="dim" />
    </>
  );
};

/** 台阶：n 级，从 (x, y) 往右上走，每级宽 w、高 h（「一步步」） */
export const Steps: React.FC<{x: number; y: number; n?: number; w?: number; h?: number; draw?: number; gather?: number}> = ({x, y, n = 3, w = 160, h = 70, draw = 1, gather = 1}) => {
  const pts: Pt[] = [[0, 0]];
  for (let i = 0; i < n; i++) {
    pts.push([i * w + w, -i * h], [i * w + w, -(i + 1) * h]);
  }
  pts.push([n * w + w * 0.6, -n * h]);
  return <StarShape strokes={place([pts], x, y)} gather={gather} draw={draw} spacing={9} seed={61} spread={200} seq />;
};

/** 风筝：菱形 + 十字骨架 + 随帧摆动的尾巴；s 缩放 */
export const Kite: React.FC<{x: number; y: number; s?: number; f: number; gather?: number; draw?: number}> = ({x, y, s = 1, f, gather = 1, draw = 1}) => {
  const tail: Pt[] = Array.from({length: 13}, (_, i) => [Math.sin(i * 0.9 + f / 9) * 12 * (i / 12), 92 + i * 13]);
  const body: Stroke[] = [poly([[0, -92], [52, 0], [0, 92], [-52, 0]], true), line([0, -92], [0, 92]), line([-52, 0], [52, 0]), tail];
  return <StarShape strokes={place(body, x, y, s, 4 * Math.sin(f / 23))} gather={gather} draw={draw} spacing={7} r={1.6} seed={71} spread={160} />;
};

/** 纸飞机：三角翼 + 中线，rot 机头方向（度） */
export const PaperPlane: React.FC<{x: number; y: number; s?: number; rot?: number; gather?: number; draw?: number}> = ({x, y, s = 1, rot = -14, gather = 1, draw = 1}) => {
  const body: Stroke[] = [poly([[90, 0], [-70, -34], [-40, 0], [-70, 40]], true), line([90, 0], [-40, 0]), poly([[-40, 0], [-30, 22], [90, 0]])];
  return <StarShape strokes={place(body, x, y, s, rot)} gather={gather} draw={draw} spacing={7} r={1.5} seed={81} spread={140} />;
};

/**
 * 地平线：一条细亮线从一侧（或中间）画到另一侧，两端渐隐；gold 变成结尾的暖金地平线。
 * p 画出进度，from 起笔方向。
 */
export const Horizon: React.FC<{y: number; p?: number; from?: 'left' | 'right' | 'center'; x0?: number; x1?: number; gold?: boolean; paper?: boolean}> = ({y, p = 1, from = 'left', x0 = 0, x1 = 1920, gold, paper}) => {
  const e = easeInOut(clamp01(p));
  const w = x1 - x0;
  const [a, b] = from === 'left' ? [x0, x0 + w * e] : from === 'right' ? [x1 - w * e, x1] : [x0 + (w / 2) * (1 - e), x0 + w / 2 + (w / 2) * e];
  const c = paper ? K.paperLine : gold ? K.goldLine : '#e6e7ea';
  return (
    <div
      style={{
        position: 'absolute',
        left: a,
        top: y - 1,
        width: Math.max(0, b - a),
        height: 2,
        background: `linear-gradient(90deg, rgba(0,0,0,0) 0%, ${c} 12%, ${c} 88%, rgba(0,0,0,0) 100%)`,
        boxShadow: paper ? undefined : gold ? '0 0 10px rgba(250,226,190,0.8)' : '0 0 8px rgba(230,235,255,0.5)',
      }}
    />
  );
};

/**
 * 暖金日出（全片唯一一次彩色）：光晕从地平线下涌上来，半个太阳慢慢升起，细光芒一根根伸出。
 * p 0–1；cx 太阳中心 x，y 地平线高度，r 太阳半径。
 */
export const Sunrise: React.FC<{cx: number; y: number; p: number; r?: number; f?: number}> = ({cx, y, p, r = 120, f = 0}) => {
  const glow = clamp01(p / 0.5);
  const rise = easeOut(clamp01((p - 0.25) / 0.6));
  const rays = clamp01((p - 0.5) / 0.4);
  const sy = y + r * 0.95 - rise * r * 0.95;
  return (
    <>
      <div
        style={{
          position: 'absolute',
          left: cx - 1500,
          top: y - 620,
          width: 3000,
          height: 1240,
          opacity: glow,
          background: `radial-gradient(ellipse 46% 64% at 50% 50%, rgba(255,241,221,0.6) 0%, rgba(170,128,74,0.5) 10%, rgba(65,46,23,0.95) 24%, rgba(40,28,8,0.75) 40%, rgba(24,17,1,0.4) 55%, rgba(0,0,0,0) 72%)`,
          clipPath: `inset(0 0 ${620}px 0)`,
        }}
      />
      <svg width={1920} height={1080} style={{position: 'absolute', left: 0, top: 0}}>
        <defs>
          <clipPath id="ks-above">
            <rect x={0} y={0} width={1920} height={y} />
          </clipPath>
          <radialGradient id="ks-sun" cx="50%" cy="50%" r="50%">
            <stop offset="0" stopColor={K.sun} />
            <stop offset="0.85" stopColor="#f6e2bd" />
            <stop offset="1" stopColor="#e7cc9a" />
          </radialGradient>
        </defs>
        <g clipPath="url(#ks-above)">
          {Array.from({length: 15}, (_, i) => {
            const a = Math.PI + (i / 14) * Math.PI;
            const k = clamp01(rays * 15 - i * 0.6);
            const len = (r * 0.45 + 40 * rand(i + 3)) * k;
            const r0 = r * 1.18;
            return <line key={i} x1={cx + Math.cos(a) * r0} y1={sy + Math.sin(a) * r0} x2={cx + Math.cos(a) * (r0 + len)} y2={sy + Math.sin(a) * (r0 + len)} stroke={K.goldLine} strokeWidth={2} strokeLinecap="round" opacity={0.75 * k * (0.85 + 0.15 * Math.sin(f / 12 + i))} />;
          })}
          <circle cx={cx} cy={sy} r={r} fill="url(#ks-sun)" opacity={clamp01(p / 0.3)} style={{filter: 'drop-shadow(0 0 30px rgba(255,230,190,0.7))'}} />
        </g>
      </svg>
    </>
  );
};

/**
 * 词语长链：同一个词沿一条曲线重复排开、逐字长出（像一条由「规矩」组成的锁链 / 长龙），
 * 每个字跟着曲线切线旋转，一条星点脊线串着；shatter 时字和星点一起碎散。path 是曲线点，p 长出进度。
 */
export const WordTrail: React.FC<{path: Stroke; word: string; p?: number; size?: number; gap?: number; shatter?: number; f?: number; seed?: number}> = ({path, word, p = 1, size = 38, gap = 1.15, shatter = 0, f = 0, seed = 91}) => {
  const L = lengths(path);
  const total = L[L.length - 1];
  const step = size * gap;
  const n = Math.floor(total / step);
  const chars = word.split('');
  const at = (d: number): [number, number, number] => {
    let i = 1;
    while (i < path.length - 1 && L[i] < d) i++;
    const k = (d - L[i - 1]) / Math.max(1e-6, L[i] - L[i - 1]);
    const x = path[i - 1][0] + (path[i][0] - path[i - 1][0]) * k;
    const y = path[i - 1][1] + (path[i][1] - path[i - 1][1]) * k;
    const ang = (Math.atan2(path[i][1] - path[i - 1][1], path[i][0] - path[i - 1][0]) * 180) / Math.PI;
    return [x, y, ang];
  };
  const shown = p * n;
  return (
    <>
      <StarShape strokes={[cut(path, p)]} gather={1} draw={1} shatter={shatter} spacing={11} r={1.6} seed={seed} lines={false} f={f} />
      {Array.from({length: n}, (_, i) => {
        const v = clamp01(shown - i);
        if (v <= 0) return null;
        const [x, y, ang] = at(step * (i + 0.5));
        const [vx, vy] = scatter(seed + 7, i, 1);
        const e = easeOut(shatter);
        const ox = vx * (120 + 200 * rand(seed + i)) * e;
        const oy = vy * (120 + 200 * rand(seed + i * 3)) * e + 80 * shatter * shatter;
        const o = v * (1 - clamp01(shatter * 1.6 - rand(seed * 5 + i) * 0.4));
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x + ox - size / 2,
              top: y + oy - size / 2,
              width: size,
              height: size,
              lineHeight: `${size}px`,
              textAlign: 'center',
              fontFamily: KF.cn,
              fontSize: size * 0.86,
              color: K.ink,
              opacity: o,
              transform: `rotate(${ang + shatter * (rand(seed + i) - 0.5) * 120}deg) scale(${0.6 + 0.4 * v})`,
              textShadow: '0 0 8px rgba(230,236,255,0.7)',
              filter: v < 1 ? `blur(${(1 - v) * 4}px)` : undefined,
            }}
          >
            {chars[i % chars.length]}
          </div>
        );
      })}
    </>
  );
};
