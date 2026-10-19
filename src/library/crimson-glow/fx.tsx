import React from 'react';
import {AbsoluteFill} from 'remotion';
import {clamp01, easeIn, easeInOut, easeOut, rand} from '../anim';

/**
 * 3：尼采与权力意志的转场和光效：光环脉冲、白光爆闪、墨团吞没、压缝翻开、透视 → 俯视升机位、推近穿线。
 * 这套风格几乎不硬切，场景之间靠这些「元素贯穿」的动作接起来。
 */

const W = 1920;
const H = 1080;

/** 光环脉冲：白色细环从 (x, y) 扩到半径 r，dur 帧（默认 13）；rings 圈数（同心涟漪，每圈晚 spacing 帧）；flash 中心柔光 + 整个画面亮一下的强度 */
export const RingPulse: React.FC<{f: number; at: number; x: number; y: number; r?: number; dur?: number; rings?: number; spacing?: number; flash?: number; width?: number}> = ({
  f,
  at,
  x,
  y,
  r = 180,
  dur = 13,
  rings = 1,
  spacing = 7,
  flash = 1,
  width = 3,
}) => {
  const t0 = f - at;
  if (t0 < 0 || t0 > dur + spacing * (rings - 1) + 2) return null;
  const pc = clamp01(t0 / (dur * 0.8));
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      {flash > 0 && <AbsoluteFill style={{background: `rgba(255,240,232,${0.1 * flash * (1 - pc)})`}} />}
      {flash > 0 && (
        <div
          style={{
            position: 'absolute',
            left: x - r * 0.9,
            top: y - r * 0.9,
            width: r * 1.8,
            height: r * 1.8,
            borderRadius: '50%',
            background: `radial-gradient(circle, rgba(255,250,244,${0.55 * flash * (1 - pc)}) 0%, rgba(255,240,230,${0.2 * flash * (1 - pc)}) 40%, rgba(255,240,230,0) 70%)`,
          }}
        />
      )}
      <svg width={W} height={H} style={{position: 'absolute'}}>
        {Array.from({length: rings}, (_, k) => {
          const p = clamp01((t0 - k * spacing) / dur);
          if (p <= 0 || p >= 1) return null;
          return <circle key={k} cx={x} cy={y} r={r * (0.12 + 0.88 * easeOut(p))} fill="none" stroke="#fffaf4" strokeWidth={width * (1 - 0.5 * p)} opacity={0.9 * (1 - p)} style={{filter: 'drop-shadow(0 0 6px rgba(255,248,240,0.8))'}} />;
        })}
      </svg>
    </AbsoluteFill>
  );
};

/** 白光爆闪：(x, y) 一团白光 rise 帧冲到最亮（at 那一帧），再 fall 帧散开；最亮那一帧换场景 */
export const Flash: React.FC<{f: number; at: number; x?: number; y?: number; rise?: number; fall?: number; strength?: number}> = ({f, at, x = 960, y = 540, rise = 6, fall = 10, strength = 1}) => {
  const v = f < at ? easeIn(clamp01((f - (at - rise)) / rise)) : 1 - easeOut(clamp01((f - at) / fall));
  if (v <= 0) return null;
  const k = v * strength;
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <AbsoluteFill style={{background: `radial-gradient(circle at ${x}px ${y}px, rgba(255,252,248,${k}) 0%, rgba(255,242,234,${0.75 * k}) 18%, rgba(255,232,222,${0.3 * k}) 42%, rgba(0,0,0,0) 72%)`}} />
      <AbsoluteFill style={{background: `rgba(255,246,240,${0.35 * k * k})`}} />
    </AbsoluteFill>
  );
};

/** 墨团吞没：一团边缘不规则的黑墨从 (x, y) 长大，dur 帧（默认 36）盖满画面；放在要被吞掉的内容上面 */
export const InkSwallow: React.FC<{f: number; at: number; x?: number; y?: number; dur?: number; maxR?: number; seed?: number; color?: string}> = ({f, at, x = 960, y = 470, dur = 36, maxR = 1300, seed = 4, color = '#040203'}) => {
  const p = clamp01((f - at) / dur);
  if (p <= 0) return null;
  const R = maxR * easeInOut(p) * 0.96 + 18 * clamp01(p * 6);
  const ph = [rand(seed) * 6.28, rand(seed + 1) * 6.28, rand(seed + 2) * 6.28, rand(seed + 3) * 6.28];
  const wob = (f - at) * 0.035;
  const pts: string[] = [];
  const N = 140;
  for (let i = 0; i < N; i++) {
    const th = (i / N) * Math.PI * 2;
    const k = 1 + 0.17 * Math.sin(3 * th + ph[0] + wob) + 0.1 * Math.sin(7 * th + ph[1] - wob) + 0.05 * Math.sin(13 * th + ph[2]) + 0.03 * Math.sin(29 * th + ph[3] + wob * 2);
    pts.push(`${(x + Math.cos(th) * R * k * 1.25).toFixed(1)},${(y + Math.sin(th) * R * k).toFixed(1)}`);
  }
  const drops = Array.from({length: 7}, (_, i) => {
    const th = rand(seed * 10 + i) * Math.PI * 2;
    const d = R * (1.08 + rand(seed * 10 + i + 0.5) * 0.18);
    return {cx: x + Math.cos(th) * d * 1.25, cy: y + Math.sin(th) * d, r: R * (0.06 + rand(seed * 10 + i + 0.7) * 0.07)};
  });
  const fid = `cg-ink-${seed}`;
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <svg width={W} height={H} style={{position: 'absolute'}}>
        <defs>
          <filter id={fid} x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves="3" seed={seed} />
            <feDisplacementMap in="SourceGraphic" scale={36} xChannelSelector="R" yChannelSelector="G" />
            <feGaussianBlur stdDeviation="1.2" />
          </filter>
        </defs>
        <g filter={`url(#${fid})`}>
          <polygon points={pts.join(' ')} fill={color} />
          {drops.map((d, i) => (
            <circle key={i} cx={d.cx} cy={d.cy} r={d.r} fill={color} />
          ))}
        </g>
      </svg>
    </AbsoluteFill>
  );
};

/**
 * 压缝翻开：a 先 close 帧压成一条亮灰细缝（ease-in），再 open 帧展开成 b（ease-out）。
 * (x, y) 是物体中心，w 是缝的宽度。at 前只画 a，结束后只画 b。
 */
export const SlitSwap: React.FC<{f: number; at: number; a: React.ReactNode; b: React.ReactNode; x?: number; y?: number; w?: number; close?: number; open?: number}> = ({f, at, a, b, x = 960, y = 400, w = 400, close = 7, open = 8}) => {
  const t = f - at;
  const origin = `${x}px ${y}px`;
  if (t < 0) return <AbsoluteFill>{a}</AbsoluteFill>;
  if (t >= close + open) return <AbsoluteFill>{b}</AbsoluteFill>;
  const closing = t < close;
  const s = closing ? 1 - easeIn(clamp01(t / close)) : easeOut(clamp01((t - close) / open));
  const bar = clamp01(1 - s * 5);
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{transform: `scaleY(${Math.max(0.015, s)})`, transformOrigin: origin}}>{closing ? a : b}</AbsoluteFill>
      {bar > 0 && <div style={{position: 'absolute', left: x - w / 2, top: y - 6, width: w, height: 12, background: '#8f8984', boxShadow: '0 0 14px rgba(230,222,214,0.35)', opacity: bar}} />}
    </AbsoluteFill>
  );
};

/**
 * 升机位：透视画面（from）放大并往上扫出画面，俯视画面（to）从 1.28 倍缩回 1 倍淡入，dur 帧（默认 14）；reverse 反过来（俯视落回透视）。
 */
export const Flyover: React.FC<{f: number; at: number; from: React.ReactNode; to: React.ReactNode; dur?: number; reverse?: boolean}> = ({f, at, from, to, dur = 14, reverse = false}) => {
  const raw = clamp01((f - at) / dur);
  if (raw <= 0) return <AbsoluteFill>{from}</AbsoluteFill>;
  if (raw >= 1) return <AbsoluteFill>{to}</AbsoluteFill>;
  const persp = reverse ? to : from;
  const top = reverse ? from : to;
  const q = reverse ? 1 - raw : raw; // q：透视层离场的程度
  const e = easeIn(q);
  const pOn = clamp01((q - 0.15) / 0.6);
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{transform: `perspective(1400px) rotateX(${e * 30}deg) scale(${1 + 0.85 * e}) translateY(${-280 * e}px)`, transformOrigin: '50% 40%', opacity: 1 - clamp01((q - 0.35) / 0.65), filter: `blur(${e * 4}px)`}}>{persp}</AbsoluteFill>
      <AbsoluteFill style={{transform: `scale(${1.28 - 0.28 * easeOut(pOn)})`, opacity: pOn}}>{top}</AbsoluteFill>
    </AbsoluteFill>
  );
};

/**
 * 推近穿线：镜头朝 (x, y)（通常是一段发光线）推近，dur 帧放大到 zoom 倍，最后几帧白光吃掉画面，接着 next 从白光里淡出来。
 */
export const PushThrough: React.FC<{f: number; at: number; x: number; y: number; children: React.ReactNode; next: React.ReactNode; dur?: number; zoom?: number}> = ({f, at, x, y, children, next, dur = 20, zoom = 7}) => {
  const p = clamp01((f - at) / dur);
  if (p <= 0) return <AbsoluteFill>{children}</AbsoluteFill>;
  const after = f >= at + dur;
  const s = 1 + (zoom - 1) * easeIn(p);
  const nv = clamp01((f - (at + dur - 2)) / 8);
  return (
    <AbsoluteFill>
      {!after && <AbsoluteFill style={{transform: `scale(${s})`, transformOrigin: `${x}px ${y}px`, filter: `blur(${easeIn(p) * 6}px)`}}>{children}</AbsoluteFill>}
      {nv > 0 && <AbsoluteFill style={{opacity: nv}}>{next}</AbsoluteFill>}
      <Flash f={f} at={at + dur} x={960} y={y} rise={7} fall={12} />
    </AbsoluteFill>
  );
};
