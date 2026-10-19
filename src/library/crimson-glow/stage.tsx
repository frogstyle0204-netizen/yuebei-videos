import React from 'react';
import {AbsoluteFill} from 'remotion';
import {clamp01, rand} from '../anim';
import {blurIn, C, CF, heroGlow, inkShadow} from './theme';

/**
 * 3：尼采与权力意志的舞台层：暗场、颗粒、观众席光斑、三种地面里的两种（透视跑道、侧视地面）、文案块、概念标签、出处、账号框。
 * 全部按 1920×1080 横屏设计；所有动画由帧号 f 算出。
 */

const W = 1920;
const H = 1080;

/** 暗场：暖黑底 + 左侧红光（red，退缩的声音）+ 右侧冷灰光（cool，往前的声音）+ 暗角 */
export const DarkStage: React.FC<{f: number; red?: number; cool?: number; redAt?: [number, number]; coolAt?: [number, number]}> = ({f, red = 0, cool = 0, redAt = [4, 62], coolAt = [90, 48]}) => {
  const br = 0.92 + 0.08 * Math.sin(f / 46);
  return (
    <AbsoluteFill style={{background: C.bg}}>
      {red > 0 && (
        <AbsoluteFill style={{background: `radial-gradient(ellipse 52% 72% at ${redAt[0]}% ${redAt[1]}%, ${C.redGlow}${0.62 * red * br}) 0%, ${C.redGlow}${0.24 * red}) 42%, rgba(0,0,0,0) 78%)`}} />
      )}
      {cool > 0 && (
        <AbsoluteFill style={{background: `radial-gradient(ellipse 34% 58% at ${coolAt[0]}% ${coolAt[1]}%, ${C.coolGlow}${0.3 * cool * br}) 0%, ${C.coolGlow}${0.1 * cool}) 45%, rgba(0,0,0,0) 80%)`}} />
      )}
    </AbsoluteFill>
  );
};

/** 暗角：盖在地面和人物上面、文字下面，把四周压暗 */
export const Vignette: React.FC<{strength?: number}> = ({strength = 1}) => (
  <AbsoluteFill style={{pointerEvents: 'none', background: `radial-gradient(ellipse 82% 78% at 50% 50%, rgba(0,0,0,0) 52%, rgba(0,0,0,${0.72 * strength}) 100%)`}} />
);

/** 胶片颗粒：很淡的静态噪点，压掉数字画面的干净感 */
export const Grain: React.FC<{opacity?: number}> = ({opacity = 0.07}) => (
  <AbsoluteFill style={{pointerEvents: 'none', mixBlendMode: 'screen', opacity}}>
    <svg width="100%" height="100%">
      <filter id="cg-grain">
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" />
        <feColorMatrix values="0 0 0 0 0.92  0 0 0 0 0.86  0 0 0 0 0.82  0 0 0 0.6 0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#cg-grain)" />
    </svg>
  </AbsoluteFill>
);

/** 观众席光斑：地平线上方一排失焦的灰白圆点，忽明忽暗；y 是这一排的中线，drift 每帧横移像素（跑步场景做视差） */
export const Bokeh: React.FC<{f: number; y?: number; n?: number; on?: number; drift?: number; seed?: number}> = ({f, y = 372, n = 17, on = 1, drift = 0, seed = 3}) => (
  <AbsoluteFill style={{pointerEvents: 'none', opacity: on}}>
    <svg width={W} height={H} style={{position: 'absolute'}}>
      <defs>
        <radialGradient id={`cg-bokeh-${seed}`}>
          <stop offset="0%" stopColor="#ded6d0" stopOpacity="0.95" />
          <stop offset="62%" stopColor="#cfc6c0" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#cfc6c0" stopOpacity="0" />
        </radialGradient>
      </defs>
      {Array.from({length: n}, (_, i) => {
        const s = seed * 50 + i;
        const x = ((i + 0.2 + rand(s) * 0.6) / n) * (W + 160) - 80 - f * drift;
        const xx = ((x % (W + 160)) + W + 160) % (W + 160) - 80;
        const r = 13 + rand(s + 1) * 19;
        const tw = 0.55 + 0.45 * Math.sin(f / (26 + rand(s + 2) * 30) + i * 1.7);
        return <circle key={i} cx={xx} cy={y + (rand(s + 3) - 0.5) * 34} r={r} fill={`url(#cg-bokeh-${seed})`} opacity={(0.3 + rand(s + 4) * 0.34) * tw} />;
      })}
    </svg>
  </AbsoluteFill>
);

/**
 * 透视跑道：地平线 horizon，消失点 vx；赤红地面越近越暗、带横向明暗条纹，白色分道线从消失点放射出去（远细近粗）。
 * center 0–1 中间两条线的亮度（带光晕）；centerDraw 0–1 中间两条线从近处往远处画出；
 * rungs 中间这条道上横档的数量，rungP 0–1 横档由远到近依次亮起。
 */
export const TrackFloor: React.FC<{horizon?: number; vx?: number; lanes?: number; laneW?: number; center?: number; centerDraw?: number; rungs?: number; rungP?: number}> = ({
  horizon = 440,
  vx = 960,
  lanes = 6,
  laneW = 1300,
  center = 0.6,
  centerDraw = 1,
  rungs = 0,
  rungP = 0,
}) => {
  const depth = H - horizon;
  // 横向条纹：等距地面映射到透视（y = horizon + depth / z）
  const bands: [number, number][] = [];
  for (let k = 0; k < 26; k++) {
    const z0 = Math.pow(1.32, k);
    const z1 = Math.pow(1.32, k + 1);
    bands.push([horizon + depth / z1, horizon + depth / z0]);
  }
  const xAt = (i: number, y: number) => vx + (i * laneW * (y - horizon)) / depth; // 第 i 条线（i 可为小数）在 y 处的横坐标
  const line = (i: number, p = 1) => {
    const yEnd = H - p * depth; // 从近处（底边）往远处画
    const w0 = Math.abs(i) < 1 ? 22 : 14;
    const w1 = 1.8;
    const wEnd = w0 + (w1 - w0) * p;
    const a = xAt(i, H);
    const b = xAt(i, yEnd);
    return `M ${a - w0 / 2} ${H} L ${b - wEnd / 2} ${yEnd} L ${b + wEnd / 2} ${yEnd} L ${a + w0 / 2} ${H} Z`;
  };
  const side: number[] = [];
  for (let i = 1; i <= lanes; i++) side.push(-0.5 - i, 0.5 + i);
  const rungZ = Array.from({length: rungs}, (_, k) => 1.9 * Math.pow(1.55, k)); // 由近到远
  return (
    <AbsoluteFill>
      <svg width={W} height={H} style={{position: 'absolute'}}>
        <defs>
          <linearGradient id="cg-track" x1="0" y1={horizon} x2="0" y2={H} gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#2a0907" />
            <stop offset="0.07" stopColor={C.track} />
            <stop offset="0.55" stopColor="#561814" />
            <stop offset="1" stopColor={C.trackNear} />
          </linearGradient>
          <linearGradient id="cg-sky" x1="0" y1="0" x2="0" y2={horizon} gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#1c0304" />
            <stop offset="0.7" stopColor="#260405" />
            <stop offset="1" stopColor="#330706" />
          </linearGradient>
          <filter id="cg-lane-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="5" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <rect x={0} y={0} width={W} height={horizon} fill="url(#cg-sky)" />
        <rect x={0} y={horizon} width={W} height={depth} fill="url(#cg-track)" />
        {bands.map(([a, b], k) => (
          <rect key={k} x={0} y={a} width={W} height={b - a} fill={k % 2 ? 'rgba(255,220,210,0.025)' : 'rgba(0,0,0,0.07)'} />
        ))}
        {side.map((i) => (
          <path key={i} d={line(i)} fill={C.laneLine} opacity={0.72} />
        ))}
        <g filter="url(#cg-lane-glow)" opacity={0.6 + 0.4 * center}>
          <path d={line(-0.5, centerDraw)} fill="#f5efe8" />
          <path d={line(0.5, centerDraw)} fill="#f5efe8" />
        </g>
        {rungZ.map((z, k) => {
          const y = horizon + depth / z;
          const order = rungs - 1 - k; // 远处先亮
          const v = clamp01(rungP * rungs - order);
          if (v <= 0) return null;
          return <line key={k} x1={xAt(-0.5, y)} x2={xAt(0.5, y)} y1={y} y2={y} stroke="#f2ebe4" strokeWidth={1 + 5 / z} opacity={0.75 * v} filter="url(#cg-lane-glow)" />;
        })}
        {/* 消失点上的一点高光 */}
        <ellipse cx={vx} cy={horizon} rx={60} ry={10} fill="#ffece0" opacity={0.08 + 0.12 * center} filter="url(#cg-lane-glow)" />
      </svg>
    </AbsoluteFill>
  );
};

/**
 * 侧视地面：一条发光白地平线（y），下面是竖条纹赤红地面、往下渐暗；stripe 条纹平均宽度（镜头越远越窄，跑步远景用 70 左右）；
 * scroll 每帧条纹左移的像素（人物原地跑时用），line 0–1 地平线亮度；
 * red / cool 0–1 把暗场的左红光、右冷光也映到地面上（和 DarkStage 的值一起给）。
 */
export const SideFloor: React.FC<{f?: number; y?: number; scroll?: number; line?: number; red?: number; cool?: number; stripe?: number; seed?: number}> = ({f = 0, y = 772, scroll = 0, line = 1, red = 0, cool = 0, stripe = 96, seed = 5}) => {
  const cols: React.ReactNode[] = [];
  const widths = Array.from({length: 10}, (_, k) => stripe * (0.75 + rand(seed * 30 + k) * 0.5));
  const period = widths.reduce((a, b) => a + b, 0); // 10 条一循环，滚动时无缝
  const off = (((f * scroll) % period) + period) % period;
  let x = -off - period;
  let k = 0;
  while (x < W + period) {
    const w = widths[k % 10];
    cols.push(<rect key={k} x={x} y={y} width={w} height={H - y} fill={k % 2 ? 'rgba(255,215,205,0.06)' : 'rgba(0,0,0,0.13)'} />);
    x += w;
    k++;
  }
  return (
    <AbsoluteFill>
      <svg width={W} height={H} style={{position: 'absolute'}}>
        <defs>
          <linearGradient id="cg-floor" x1="0" y1={y} x2="0" y2={H} gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#64231d" />
            <stop offset="0.35" stopColor={C.floor} />
            <stop offset="1" stopColor={C.floorDeep} />
          </linearGradient>
          <linearGradient id="cg-floor-red" x1="0" y1="0" x2={W} y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="rgba(190,60,48,0.42)" />
            <stop offset="0.45" stopColor="rgba(190,60,48,0.12)" />
            <stop offset="0.75" stopColor="rgba(0,0,0,0.12)" />
            <stop offset="1" stopColor="rgba(0,0,0,0.25)" />
          </linearGradient>
          <linearGradient id="cg-floor-cool" x1="0" y1="0" x2={W} y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0.5" stopColor="rgba(170,165,185,0)" />
            <stop offset="1" stopColor="rgba(170,165,185,0.16)" />
          </linearGradient>
          <filter id="cg-hline" x="-5%" y="-400%" width="110%" height="900%">
            <feGaussianBlur stdDeviation="7" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <rect x={0} y={y} width={W} height={H - y} fill="url(#cg-floor)" />
        {cols}
        <rect x={0} y={y + 4} width={W} height={60} fill="rgba(0,0,0,0.18)" />
        {red > 0 && <rect x={0} y={y} width={W} height={H - y} fill="url(#cg-floor-red)" opacity={red} />}
        {cool > 0 && <rect x={0} y={y} width={W} height={H - y} fill="url(#cg-floor-cool)" opacity={cool} />}
        <rect x={0} y={y - 3} width={W} height={6} fill="#f6efe8" opacity={0.35 + 0.65 * line} filter="url(#cg-hline)" />
      </svg>
    </AbsoluteFill>
  );
};

export type Tone = 'ink' | 'rose' | 'hero' | 'voice' | 'call' | 'dim';
export type LineSpec = {t: string; tone?: Tone; at?: number};

/** 把「【词】」拆出来：标记的词在结论行里带红色残影 */
const parseMarks = (s: string) => s.split(/(【[^】]+】)/).filter(Boolean).map((p) => (p.startsWith('【') ? {mark: true, text: p.slice(1, -1)} : {mark: false, text: p}));

/** 红色残影关键词：后面一份影子红、往左错开、虚化的同字，前面是发光白字；e 0–1 残影显现度 */
const EchoWord: React.FC<{text: string; e: number}> = ({text, e}) => (
  <span style={{position: 'relative', display: 'inline-block'}}>
    <span style={{position: 'absolute', left: `${-0.95 - 0.5 * (1 - e)}em`, top: 0, color: '#a3352b', opacity: e, filter: 'blur(2px)', textShadow: 'none', whiteSpace: 'nowrap'}}>{text}</span>
    <span style={{position: 'relative', textShadow: `0 0 12px rgba(255,250,244,0.8), 0 0 30px rgba(255,236,220,0.45), 0 2px 10px rgba(0,0,0,0.85)`}}>{text}</span>
  </span>
);

const toneStyle = (tone: Tone, size: number): React.CSSProperties => {
  switch (tone) {
    case 'rose':
      return {color: C.rose, fontSize: size, ...inkShadow()};
    case 'hero':
      return {...heroGlow(), fontSize: Math.round(size * 1.5), fontWeight: 900, letterSpacing: '0.04em'};
    case 'voice':
      return {color: C.rose, fontSize: size, fontWeight: 600, letterSpacing: '0.42em', textShadow: `0 0 18px rgba(170,50,40,0.75), 0 2px 10px rgba(0,0,0,0.85)`, filter: 'blur(0.4px)'};
    case 'call':
      return {color: C.ink, fontSize: size, fontWeight: 600, letterSpacing: '0.42em', textShadow: `0 0 18px rgba(175,178,205,0.75), 0 2px 10px rgba(0,0,0,0.85)`};
    case 'dim':
      return {color: C.inkDim, fontSize: Math.round(size * 0.52), letterSpacing: '0.12em', ...inkShadow(0.7)};
    default:
      return {color: C.ink, fontSize: size, ...inkShadow()};
  }
};

/**
 * 文案块：每行「透明 + 模糊」柔入 10 帧，行间隔 gap 帧（单行可用 at 覆盖）；out 起整块模糊淡出。
 * 语气 tone：ink 米白正文、rose 玫红强调行、hero 加粗发光结论（【词】带红色残影）、voice 拉开字距的玫红「退缩的声音」、call 拉开字距的米白「往前的声音」、dim 小号灰字。
 * align 决定 x 的含义：left 左边缘、right 右边缘、center 中线。
 */
export const Lines: React.FC<{f: number; at: number; lines: LineSpec[]; x?: number; y?: number; align?: 'left' | 'center' | 'right'; size?: number; gap?: number; out?: number; lineH?: number}> = ({
  f,
  at,
  lines,
  x,
  y = 120,
  align = 'center',
  size = 58,
  gap = 14,
  out,
  lineH = 1.5,
}) => {
  const pos: React.CSSProperties = align === 'center' ? {left: (x ?? 960) - 900, width: 1800, textAlign: 'center'} : align === 'left' ? {left: x ?? 160, textAlign: 'left'} : {right: W - (x ?? 1760), textAlign: 'right'};
  return (
    <div style={{position: 'absolute', top: y, ...pos, fontFamily: CF.cn, lineHeight: lineH, whiteSpace: 'nowrap'}}>
      {lines.map((l, i) => {
        const la = l.at ?? at + i * gap;
        const b = blurIn(f, la, 10, out, 10);
        if (b.v <= 0) return <div key={i} style={{visibility: 'hidden', ...toneStyle(l.tone ?? 'ink', size)}}>{l.t}</div>;
        const e = clamp01((f - la - 6) / 16);
        return (
          <div key={i} style={{...toneStyle(l.tone ?? 'ink', size), opacity: b.opacity, filter: b.filter}}>
            {parseMarks(l.t).map((p, j) => (p.mark ? <EchoWord key={j} text={p.text} e={e} /> : <span key={j}>{p.text}</span>))}
          </div>
        );
      })}
    </div>
  );
};

/** 左上概念标签：【概念】灰色加粗 + 下面一行斜体作者 */
export const ConceptTag: React.FC<{f: number; at: number; name: string; by?: string; out?: number; x?: number; y?: number}> = ({f, at, name, by, out, x = 72, y = 58}) => {
  const b = blurIn(f, at, 12, out);
  if (b.v <= 0) return null;
  return (
    <div style={{position: 'absolute', left: x, top: y, opacity: b.opacity, filter: b.filter, fontFamily: CF.cn, ...inkShadow(0.6)}}>
      <div style={{fontSize: 38, fontWeight: 700, color: C.tag, letterSpacing: '0.1em'}}>【{name}】</div>
      {by && <div style={{fontSize: 22, color: '#6f6a68', fontStyle: 'italic', marginTop: 6, marginLeft: 6, letterSpacing: '0.06em'}}>{by}</div>}
    </div>
  );
};

/** 概念大标题：画面中间柔入，dock 帧起放大模糊淡出，同时左上角概念标签柔入（标题「收进」角标） */
export const ConceptTitle: React.FC<{f: number; at: number; dock: number; name: string; sub?: string; by?: string; x?: number; y?: number}> = ({f, at, dock, name, sub, by, x = 960, y = 470}) => {
  const inn = blurIn(f, at, 14);
  const d = clamp01((f - dock) / 12);
  const v = inn.v * (1 - d);
  return (
    <>
      {v > 0 && (
        <div
          style={{
            position: 'absolute',
            left: x - 900,
            width: 1800,
            top: y,
            textAlign: 'center',
            fontFamily: CF.cn,
            opacity: v,
            filter: `blur(${(1 - inn.v) * 8 + d * 10}px)`,
            transform: `scale(${1 + d * 0.18})`,
          }}
        >
          <div style={{...heroGlow(0.8), fontSize: 110, fontWeight: 900, letterSpacing: '0.14em'}}>{name}</div>
          {sub && <div style={{fontSize: 30, color: C.inkDim, marginTop: 14, letterSpacing: '0.2em', ...inkShadow()}}>{sub}</div>}
        </div>
      )}
      <ConceptTag f={f} at={dock + 2} name={name} by={by} />
    </>
  );
};

/** 右下西文出处：Garamond 斜体、暖灰 */
export const SourceLine: React.FC<{f: number; at: number; text: string; out?: number}> = ({f, at, text, out}) => {
  const b = blurIn(f, at, 14, out);
  if (b.v <= 0) return null;
  return <div style={{position: 'absolute', right: 56, bottom: 30, fontFamily: CF.latin, fontStyle: 'italic', fontSize: 26, color: C.cite, letterSpacing: '0.02em', opacity: b.opacity, filter: b.filter}}>{text}</div>;
};

/** 右上账号框：1px 灰描边的小字框，常驻；写自己的账号名 */
export const BrandTag: React.FC<{text?: string; on?: number}> = ({text = '示例账号', on = 1}) => (
  <div style={{position: 'absolute', right: 56, top: 46, padding: '3px 12px 4px 16px', border: '1.5px solid rgba(150,145,140,0.55)', fontFamily: CF.cn, fontSize: 21, letterSpacing: '0.32em', color: '#8f8a86', opacity: on}}>{text}</div>
);

/** 柔入容器：子元素整体「透明 + 模糊」柔入，可带退场 */
export const Soft: React.FC<{f: number; at: number; out?: number; dur?: number; style?: React.CSSProperties; children: React.ReactNode}> = ({f, at, out, dur = 12, style, children}) => {
  const b = blurIn(f, at, dur, out);
  if (b.v <= 0) return null;
  const base = style?.opacity;
  return <div style={{position: 'absolute', ...style, opacity: b.opacity * (base === undefined ? 1 : Number(base)), filter: b.filter}}>{children}</div>;
};
