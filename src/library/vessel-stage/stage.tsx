import React from 'react';
import {AbsoluteFill} from 'remotion';
import {clamp01, rand} from '../anim';
import {V, VF, charIn, drawP, fadeBlur, parseMarks} from './theme';

/**
 * 金器剧场风的舞台层：三种场景底（暗场 / 黄昏 / 夜海）、顶光光柱、散景、浮尘、颗粒，
 * 以及固定版式：左上主题签、顶部居中字幕、逐字锚词、下划线词。全部按 1920×1080 横屏设计，动画由帧号 f 算出。
 */

/** 暗角：四周压暗，strength 0–1 */
export const Vignette: React.FC<{strength?: number}> = ({strength = 1}) => (
  <AbsoluteFill style={{pointerEvents: 'none', background: `radial-gradient(ellipse 80% 75% at 50% 50%, rgba(0,0,0,0) 45%, rgba(0,0,0,${0.85 * strength}) 100%)`}} />
);

/** 暗场底：近黑偏暖，舞台中下部一团很淡的暖光；floorY 给一条细地平线（不要就传 undefined） */
export const DarkStage: React.FC<{f: number; floorY?: number; warmth?: number}> = ({f, floorY, warmth = 1}) => {
  const a = 0.16 * warmth * (0.9 + 0.1 * Math.sin(f / 60));
  return (
    <AbsoluteFill style={{background: V.bg}}>
      <AbsoluteFill style={{background: `radial-gradient(ellipse 55% 45% at 50% 70%, rgba(110,80,44,${a}) 0%, rgba(40,28,16,${a * 0.5}) 50%, rgba(0,0,0,0) 80%)`}} />
      {floorY !== undefined && (
        <>
          <div style={{position: 'absolute', left: 0, right: 0, top: floorY, height: 1080 - floorY, background: 'linear-gradient(180deg, rgba(14,13,16,0.9), rgba(4,4,5,1))'}} />
          <div style={{position: 'absolute', left: 0, right: 0, top: floorY, height: 2, background: V.horizon}} />
        </>
      )}
      <Vignette />
    </AbsoluteFill>
  );
};

/** 黄昏底：上暗下亮的琥珀天空 + 一轮发虚的白日（sun 太阳中心，百分比）；horizonY 地平线高度（像素） */
export const DuskSky: React.FC<{f: number; sun?: [number, number]; horizonY?: number}> = ({f, sun = [73, 31], horizonY = 645}) => {
  const pulse = 1 + 0.03 * Math.sin(f / 40);
  return (
    <AbsoluteFill style={{background: `linear-gradient(180deg, ${V.duskTop} 0%, ${V.duskMid} ${(horizonY / 1080) * 55}%, ${V.duskLow} ${(horizonY / 1080) * 100}%, ${V.duskLow} 100%)`}}>
      {/* 白日的大光晕 */}
      <AbsoluteFill style={{background: `radial-gradient(circle ${380 * pulse}px at ${sun[0]}% ${sun[1]}%, rgba(255,236,200,0.55) 0%, rgba(255,210,150,0.18) 45%, rgba(0,0,0,0) 100%)`}} />
      {/* 日轮：边缘发虚 */}
      <div
        style={{
          position: 'absolute',
          left: `calc(${sun[0]}% - 85px)`,
          top: `calc(${sun[1]}% - 85px)`,
          width: 170,
          height: 170,
          borderRadius: '50%',
          background: V.sun,
          filter: 'blur(2.5px)',
          boxShadow: '0 0 60px rgba(255,240,215,0.8)',
        }}
      />
      <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 30%)'}} />
    </AbsoluteFill>
  );
};

/** 夜海底：深蓝黑 + 星点（固定种子，缓慢闪烁）+ 一条很淡的地平线；horizonY 像素，stars 星星数 */
export const NightSea: React.FC<{f: number; horizonY?: number; stars?: number}> = ({f, horizonY = 660, stars = 140}) => (
  <AbsoluteFill style={{background: `linear-gradient(180deg, ${V.night} 0%, ${V.nightLow} ${(horizonY / 1080) * 100}%, #070a10 100%)`}}>
    <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
      {Array.from({length: stars}, (_, i) => {
        const x = rand(i * 7 + 1) * 1920;
        const y = rand(i * 13 + 5) * (horizonY - 40);
        const r = 0.6 + rand(i * 3 + 2) * 1.4;
        const tw = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(f / (18 + rand(i) * 30) + i));
        return <circle key={i} cx={x} cy={y} r={r} fill={V.star} opacity={tw * (0.35 + 0.65 * rand(i * 11))} />;
      })}
      <line x1={0} x2={1920} y1={horizonY} y2={horizonY} stroke="rgba(150,170,210,0.22)" strokeWidth={1.5} />
    </svg>
    <Vignette strength={0.8} />
  </AbsoluteFill>
);

/**
 * 顶光光柱：从画面顶部打下来的一道柔光，落在 (x, floorY)。
 * tone 'gray' 冷灰（默认）/ 'gold' 金色（被点到的那一台）；on 0–1 亮度（可做开灯动画）；w 落地宽度。
 */
export const SpotBeam: React.FC<{x: number; floorY: number; w?: number; tone?: 'gray' | 'gold'; on?: number}> = ({x, floorY, w = 380, tone = 'gray', on = 1}) => {
  const c = tone === 'gold' ? '255,196,110' : '190,190,205';
  const a = (tone === 'gold' ? 0.2 : 0.11) * on;
  const top = w * 0.38;
  return (
    <svg width={1920} height={1080} style={{position: 'absolute', inset: 0, pointerEvents: 'none', mixBlendMode: 'screen'}}>
      <defs>
        <linearGradient id={`vs-beam-${tone}-${Math.round(x)}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={`rgba(${c},${a * 0.4})`} />
          <stop offset="0.7" stopColor={`rgba(${c},${a})`} />
          <stop offset="1" stopColor={`rgba(${c},${a * 1.2})`} />
        </linearGradient>
        <filter id={`vs-beam-blur-${tone}-${Math.round(x)}`} x="-30%" y="-10%" width="160%" height="120%">
          <feGaussianBlur stdDeviation={18} />
        </filter>
      </defs>
      <polygon
        points={`${x - top / 2},-20 ${x + top / 2},-20 ${x + w / 2},${floorY} ${x - w / 2},${floorY}`}
        fill={`url(#vs-beam-${tone}-${Math.round(x)})`}
        filter={`url(#vs-beam-blur-${tone}-${Math.round(x)})`}
      />
      {/* 落地光斑 */}
      <ellipse cx={x} cy={floorY + 8} rx={w * 0.62} ry={w * 0.09} fill={`rgba(${c},${a * 1.6})`} filter={`url(#vs-beam-blur-${tone}-${Math.round(x)})`} />
    </svg>
  );
};

/** 散景光斑：几颗很虚的暖色大光点缓慢漂移，seed 换一组位置，n 数量，opacity 整体浓度 */
export const Bokeh: React.FC<{f: number; seed?: number; n?: number; opacity?: number}> = ({f, seed = 1, n = 9, opacity = 1}) => (
  <AbsoluteFill style={{pointerEvents: 'none', opacity}}>
    {Array.from({length: n}, (_, i) => {
      const s = seed * 100 + i;
      const r = 40 + rand(s * 3) * 90;
      const x = rand(s * 7) * 1920 + Math.sin(f / (120 + i * 13) + i) * 30;
      const y = rand(s * 11) * 620 + Math.cos(f / (140 + i * 9) + i) * 18;
      const a = 0.05 + rand(s * 5) * 0.09;
      return (
        <div
          key={i}
          style={{position: 'absolute', left: x - r, top: y - r, width: r * 2, height: r * 2, borderRadius: '50%', background: `radial-gradient(circle, rgba(220,170,100,${a}) 0%, rgba(220,170,100,${a * 0.6}) 55%, rgba(0,0,0,0) 72%)`}}
        />
      );
    })}
  </AbsoluteFill>
);

/** 浮尘：细小的暖色光点缓慢上飘，n 数量，area [x0, y0, x1, y1] 范围 */
export const Dust: React.FC<{f: number; n?: number; seed?: number; area?: [number, number, number, number]}> = ({f, n = 40, seed = 3, area = [0, 0, 1920, 1080]}) => {
  const [x0, y0, x1, y1] = area;
  const h = y1 - y0;
  return (
    <svg width={1920} height={1080} style={{position: 'absolute', inset: 0, pointerEvents: 'none'}}>
      {Array.from({length: n}, (_, i) => {
        const s = seed * 1000 + i;
        const speed = 0.25 + rand(s) * 0.5;
        const y = y1 - ((rand(s * 3) * h + f * speed) % h);
        const x = x0 + rand(s * 7) * (x1 - x0) + Math.sin(f / 50 + i) * 8;
        const a = 0.25 + 0.5 * rand(s * 5);
        return <circle key={i} cx={x} cy={y} r={0.8 + rand(s * 9) * 1.6} fill={`rgba(255,220,160,${a})`} />;
      })}
    </svg>
  );
};

/** 胶片颗粒：静态噪点，叠在最上层 */
export const Grain: React.FC<{opacity?: number}> = ({opacity = 0.07}) => (
  <AbsoluteFill style={{pointerEvents: 'none', mixBlendMode: 'screen', opacity}}>
    <svg width="100%" height="100%">
      <filter id="vs-grain">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
        <feColorMatrix values="0 0 0 0 0.9  0 0 0 0 0.86  0 0 0 0 0.8  0 0 0 0.5 0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#vs-grain)" />
    </svg>
  </AbsoluteFill>
);

/** 左上主题签：中文粗宋 38px + 下面一行 Garamond 斜体灰小字；整片固定不动，at 起柔入 */
export const TopicTag: React.FC<{f: number; cn: string; en: string; at?: number}> = ({f, cn, en, at = 0}) => {
  const a = fadeBlur(f, at, 16);
  return (
    <div style={{position: 'absolute', left: 64, top: 52, opacity: a.opacity, filter: a.filter}}>
      <div style={{fontFamily: VF.cn, fontWeight: 900, fontSize: 38, letterSpacing: 6, color: V.ink}}>{cn}</div>
      <div style={{fontFamily: VF.latin, fontStyle: 'italic', fontSize: 18, letterSpacing: 3, color: V.tagEn, marginTop: 4}}>{en}</div>
    </div>
  );
};

/**
 * 顶部居中字幕：lines 每行一句，「**加粗**」变粗、「〔金〕」变粗金色；宋体 52px、行距 86。
 * at 起约 12 帧模糊柔入，out 起约 10 帧模糊淡出（换句时上一句先退、新句再进，不要叠）。y 第一行中心高度。
 */
export const TopCaption: React.FC<{f: number; at: number; lines: string[]; out?: number; y?: number; size?: number}> = ({f, at, lines, out, y = 140, size = 52}) => {
  const a = fadeBlur(f, at, 12, out, 10, 8);
  if (a.v <= 0) return null;
  const lh = size * 1.65;
  return (
    <div style={{position: 'absolute', left: 0, right: 0, top: y - lh / 2, textAlign: 'center', opacity: a.opacity, filter: a.filter}}>
      {lines.map((line, li) => (
        <div key={li} style={{fontFamily: VF.cn, fontSize: size, lineHeight: `${lh}px`, letterSpacing: 2, color: V.ink, textShadow: '0 2px 18px rgba(0,0,0,0.85)'}}>
          {parseMarks(line).map((m, i) => (
            <span key={i} style={m.bold ? {fontWeight: 900, color: m.gold ? V.goldText : V.inkBold} : undefined}>
              {m.t}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
};

/**
 * 逐字锚词：大号最粗宋体，每个字从模糊放大里收拢（约 8 帧到位，字间隔 gap 帧），可以压在器物上。
 * at 第一个字开始，out 起整体模糊淡出；y 中心高度；spacing 字距（倍数）。
 */
export const AnchorWord: React.FC<{f: number; at: number; text: string; out?: number; y?: number; size?: number; gap?: number; spacing?: number; color?: string}> = ({
  f,
  at,
  text,
  out,
  y = 560,
  size = 170,
  gap = 5,
  spacing = 0.12,
  color = V.inkBold,
}) => {
  if (f < at) return null;
  const o = out === undefined ? 1 : 1 - clamp01((f - out) / 12);
  if (o <= 0) return null;
  const chars = Array.from(text);
  return (
    <div style={{position: 'absolute', left: 0, right: 0, top: y - size * 0.62, textAlign: 'center', opacity: o, filter: o >= 0.999 ? undefined : `blur(${(1 - o) * 10}px)`}}>
      {chars.map((ch, k) => {
        const p = charIn(f, at, k, gap, 8);
        return (
          <span
            key={k}
            style={{
              display: 'inline-block',
              margin: `0 ${size * spacing * 0.5}px`,
              fontFamily: VF.cn,
              fontWeight: 900,
              fontSize: size,
              color,
              opacity: p,
              transform: `scale(${1.18 - 0.18 * p})`,
              filter: p >= 0.999 ? undefined : `blur(${((1 - p) * 14).toFixed(2)}px)`,
              textShadow: `0 0 30px rgba(255,230,190,${0.35 * p}), 0 4px 30px rgba(0,0,0,0.8)`,
            }}
          >
            {ch}
          </span>
        );
      })}
    </div>
  );
};

/**
 * 下划线词：词柔入后，下面从中间向两边画出一条细线；wordOut 起词淡出，线留下（lineOut 再淡出）。
 * 线留下来正好接下一场的地平线 / 桌面线（元素贯穿式转场）。y 词中心，lineW 线宽。
 */
export const UnderlineWord: React.FC<{f: number; at: number; text: string; wordOut?: number; lineOut?: number; y?: number; size?: number; lineW?: number}> = ({
  f,
  at,
  text,
  wordOut,
  lineOut,
  y = 520,
  size = 120,
  lineW = 300,
}) => {
  const w = fadeBlur(f, at, 14, wordOut, 14);
  const p = drawP(f, at + 10, 16);
  const lo = lineOut === undefined ? 1 : 1 - clamp01((f - lineOut) / 14);
  const lineY = y + size * 0.62;
  return (
    <>
      {w.v > 0 && (
        <div style={{position: 'absolute', left: 0, right: 0, top: y - size * 0.62, textAlign: 'center', opacity: w.opacity, filter: w.filter}}>
          <span style={{fontFamily: VF.cn, fontWeight: 900, fontSize: size, letterSpacing: size * 0.12, color: V.inkBold, textShadow: '0 4px 24px rgba(0,0,0,0.8)'}}>{text}</span>
        </div>
      )}
      {p > 0 && lo > 0 && (
        <div
          style={{
            position: 'absolute',
            left: 960 - (lineW * p) / 2,
            top: lineY,
            width: lineW * p,
            height: 3,
            borderRadius: 2,
            opacity: lo,
            background: 'rgba(245,242,238,0.85)',
            boxShadow: '0 0 12px rgba(255,240,220,0.5)',
          }}
        />
      )}
    </>
  );
};
