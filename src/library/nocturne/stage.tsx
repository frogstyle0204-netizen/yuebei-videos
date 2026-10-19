import React from 'react';
import {AbsoluteFill} from 'remotion';
import {clamp01, rand} from '../anim';
import {blurIn, charIn, dip, fadeSwap, flash, flyTo, N, NF, NS} from './theme';

/**
 * 3：悲观主义的舞台层：暗场底、浮尘、固定版式（左上章节名、右上栏目框、人物名、底部字幕）、
 * 逐字标题 + 纸屑 + 飞到角落、被灯照亮的大字、分屏对照、回忆照片、暗场 / 闪白转场。
 * 全部按 1920×1080 横屏设计；所有动画由帧号 f 算出。
 */

/** 暗场底：近黑 + 一团冷或暖的光晕 + 很重的暗角。glow 光晕中心（百分比），strength 0–1 */
export const NightBg: React.FC<{tone?: 'cool' | 'warm' | 'none'; glow?: [number, number]; strength?: number}> = ({tone = 'cool', glow = [50, 42], strength = 1}) => {
  const c = tone === 'warm' ? '113,86,54' : '70,86,112';
  return (
    <AbsoluteFill style={{background: N.void}}>
      {tone !== 'none' ? <AbsoluteFill style={{background: `radial-gradient(ellipse 55% 50% at ${glow[0]}% ${glow[1]}%, rgba(${c},${0.32 * strength}) 0%, rgba(${c},${0.1 * strength}) 45%, rgba(0,0,0,0) 78%)`}} /> : null}
      <AbsoluteFill style={{background: `radial-gradient(ellipse 80% 75% at 50% 48%, rgba(0,0,0,0) 50%, ${N.voidEdge} 100%)`}} />
    </AbsoluteFill>
  );
};

/** 浮尘：灰白小光点慢慢往下飘、左右轻摆、忽明忽暗，几颗大的失焦；warm 时偏琥珀。光锥里看得最清楚 */
export const Motes: React.FC<{f: number; n?: number; seed?: number; warm?: boolean; opacity?: number}> = ({f, n = 60, seed = 11, warm = false, opacity = 1}) => (
  <AbsoluteFill style={{pointerEvents: 'none', opacity}}>
    <svg width={1920} height={1080} style={{position: 'absolute'}}>
      <defs>
        <filter id={`nm-blur-${seed}`}>
          <feGaussianBlur stdDeviation="2.5" />
        </filter>
      </defs>
      {Array.from({length: n}, (_, i) => {
        const s = seed * 100 + i;
        const big = rand(s + 0.5) > 0.9;
        const x = (rand(s) * 1920 + Math.sin(f / (60 + rand(s + 1) * 50) + i) * 18 + 1920) % 1920;
        const y = (rand(s + 2) * 1080 + f * (0.12 + rand(s + 3) * 0.25)) % 1080;
        const tw = 0.3 + 0.7 * Math.abs(Math.sin(f / (30 + rand(s + 4) * 50) + i * 1.7));
        const r = big ? 3 + rand(s + 5) * 4 : 0.9 + rand(s + 5) * 1.6;
        return <circle key={i} cx={x} cy={y} r={r} fill={warm ? '#f2d3a0' : '#d4dceb'} opacity={(big ? 0.18 : 0.6) * tw} filter={big ? `url(#nm-blur-${seed})` : undefined} />;
      })}
    </svg>
  </AbsoluteFill>
);

/** 左上角章节名：中文粗宋 + 下面一行西文斜体小字。at 不传就直接显示（标题飞过来之后用） */
export const ChapterMark: React.FC<{f: number; cn: string; latin?: string; at?: number; out?: number; x?: number; y?: number}> = ({f, cn, latin, at, out, x = 64, y = 50}) => {
  const s = at === undefined ? {opacity: 1, filter: undefined} : blurIn(f, at, 12, out, 12, 8);
  return (
    <div style={{position: 'absolute', left: x, top: y, opacity: s.opacity, filter: s.filter}}>
      <div style={{fontFamily: NF.cn, fontWeight: 900, fontSize: NS.chapter, letterSpacing: 4, color: N.white, lineHeight: 1.25}}>{cn}</div>
      {latin ? <div style={{fontFamily: NF.latin, fontStyle: 'italic', fontSize: 16, color: N.label, marginTop: 4, letterSpacing: 1}}>{latin}</div> : null}
    </div>
  );
};

/** 右上角细线框栏目名（你自己的栏目 / 账号名，位置固定）：1px 灰线框，字距拉开 */
export const SeriesTag: React.FC<{text: string; right?: number; top?: number; opacity?: number}> = ({text, right = 63, top = 48, opacity = 1}) => (
  <div style={{position: 'absolute', right, top, opacity, border: `1px solid ${N.frameLine}`, padding: '6px 14px 7px 20px', fontFamily: NF.cn, fontSize: 22, letterSpacing: 6, color: '#8d9097'}}>{text}</div>
);

/** 人物名 + 生卒年：右上角两行西文斜体，讲到这个人的那段才出现 */
export const PersonNote: React.FC<{f: number; at: number; name: string; years: string; out?: number; x?: number; y?: number}> = ({f, at, name, years, out, x = 1500, y = 104}) => {
  const s = blurIn(f, at, 14, out, 12, 8);
  return (
    <div style={{position: 'absolute', left: x, top: y, opacity: s.opacity, filter: s.filter, fontFamily: NF.latin, fontStyle: 'italic'}}>
      <div style={{fontSize: 25, color: N.labelLight, letterSpacing: 0.5}}>{name}</div>
      <div style={{fontSize: 17, color: N.label, marginTop: 8, letterSpacing: 1}}>{years}</div>
    </div>
  );
};

/** 把「【重点词】」拆成普通段和重点段 */
export const splitMarks = (text: string): {text: string; hi?: boolean}[] => {
  const out: {text: string; hi?: boolean}[] = [];
  const re = /【([^【】]+)】/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push({text: text.slice(last, m.index)});
    out.push({text: m[1], hi: true});
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({text: text.slice(last)});
  return out;
};

/**
 * 底部字幕：宋体白字，【】里的重点词变琥珀加粗（一句最多一处）。
 * lines 是一组句子，starts 每句开始帧（可以用 lineStarts 按字数排），end 最后一句淡出的帧；换句用 fadeSwap（先出后进）。
 */
export const NSubtitle: React.FC<{f: number; lines: string[]; starts: number[]; end?: number; y?: number; size?: number}> = ({f, lines, starts, end, y = 1012, size = NS.subtitle}) => (
  <>
    {lines.map((line, k) => {
      const v = fadeSwap(f, starts, k, end);
      if (v <= 0) return null;
      return (
        <div
          key={k}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: y,
            transform: 'translateY(-100%)',
            textAlign: 'center',
            fontFamily: NF.cn,
            fontWeight: 600,
            fontSize: size,
            letterSpacing: 3,
            color: N.white,
            opacity: v,
            filter: v < 1 ? `blur(${((1 - v) * 3).toFixed(2)}px)` : undefined,
            textShadow: '0 2px 10px rgba(0,0,0,0.85), 0 0 2px rgba(0,0,0,0.6)',
          }}
        >
          {splitMarks(line).map((p, i) =>
            p.hi ? (
              <span key={i} style={{color: N.amberHi, fontWeight: 900, textShadow: '0 0 14px rgba(229,190,137,0.35), 0 2px 10px rgba(0,0,0,0.85)'}}>
                {p.text}
              </span>
            ) : (
              <span key={i}>{p.text}</span>
            ),
          )}
        </div>
      );
    })}
  </>
);

/**
 * 纸屑：一阵灰白小纸片从中间炸开、旋转、慢慢往下落，at 帧开始，约 100 帧散尽（开场去色转标题时用）。
 * cx / cy 炸开中心，n 片数。
 */
export const Shards: React.FC<{f: number; at: number; n?: number; cx?: number; cy?: number; seed?: number}> = ({f, at, n = 170, cx = 960, cy = 520, seed = 21}) => {
  const t = f - at;
  if (t < 0 || t > 130) return null;
  return (
    <svg width={1920} height={1080} style={{position: 'absolute', left: 0, top: 0, pointerEvents: 'none'}}>
      {Array.from({length: n}, (_, i) => {
        const s = seed * 1000 + i;
        const a = rand(s) * Math.PI * 2;
        const sp = 4 + rand(s + 1) * 16;
        const k = (1 - Math.exp(-t / 22)) * 22;
        const x = cx + (rand(s + 2) - 0.5) * 900 + Math.cos(a) * sp * k;
        const y = cy + (rand(s + 3) - 0.5) * 500 + Math.sin(a) * sp * k * 0.6 + t * t * 0.012 * (0.5 + rand(s + 4));
        const w = 4 + rand(s + 5) * 12;
        const h = 3 + rand(s + 6) * 5;
        const rot = rand(s + 7) * 360 + t * (rand(s + 8) - 0.5) * 14;
        const g = Math.round(150 + rand(s + 9) * 90);
        const life = clamp01(t / 4) * (1 - clamp01((t - 70 - rand(s + 10) * 40) / 20));
        return <rect key={i} x={x - w / 2} y={y - h / 2} width={w} height={h} fill={`rgb(${g},${g},${g + 4})`} opacity={0.85 * life} transform={`rotate(${rot} ${x} ${y})`} />;
      })}
    </svg>
  );
};

/**
 * 开场标题：上面一句引导语，下面粗宋大标题逐字模糊收拢（每字间隔 4 帧、8 帧完成），再下面一行西文斜体；
 * flyAt 帧起标题约 15 帧缩小飞到左上角，落成 ChapterMark 的样子（引导语和西文先淡掉），chapterLatin 落定后在下面淡入。
 * 纸屑另外放 Shards（通常和去色 Desat 一起用）。
 */
export const TitleCard: React.FC<{f: number; at: number; lead?: string; title: string; latin?: string; flyAt?: number; chapterLatin?: string; size?: number}> = ({
  f,
  at,
  lead,
  title,
  latin,
  flyAt,
  chapterLatin,
  size = NS.title,
}) => {
  const chars = title.split('');
  const small = NS.chapter;
  const S = size / small;
  const boxW = chars.length * (small + 4);
  const boxH = small * 1.25;
  const fly = flyTo(f, flyAt ?? 1e9, {x: 960, y: 470, size: S}, {x: 64 + boxW / 2, y: 50 + boxH / 2, size: 1});
  const scale = fly.size;
  const tx = fly.x - (64 + (boxW * scale) / 2);
  const ty = fly.y - (50 + (boxH * scale) / 2);
  const side = flyAt === undefined ? 1 : 1 - clamp01((f - flyAt) / 8);
  const leadS = blurIn(f, at, 12, undefined, 10, 10);
  const latS = blurIn(f, at + 4 * chars.length + 10, 14, undefined, 10, 8);
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      {lead ? (
        <div style={{position: 'absolute', left: 0, right: 0, top: 470 - size * 0.62 - 66, textAlign: 'center', fontFamily: NF.cn, fontWeight: 600, fontSize: NS.lead, letterSpacing: 6, color: N.white, opacity: leadS.opacity * side * 0.92, filter: leadS.filter}}>{lead}</div>
      ) : null}
      <div style={{position: 'absolute', left: 64, top: 50, transformOrigin: 'left top', transform: `translate(${tx}px, ${ty}px) scale(${scale})`, whiteSpace: 'nowrap', fontFamily: NF.cn, fontWeight: 900, fontSize: small, letterSpacing: 4, lineHeight: 1.25, color: N.white}}>
        {chars.map((c, k) => {
          const ci = charIn(f, at + 6, k);
          return (
            <span key={k} style={{display: 'inline-block', opacity: ci.opacity, filter: ci.blur > 0.05 ? `blur(${(ci.blur / scale).toFixed(2)}px)` : undefined, transform: `scale(${ci.scale})`, textShadow: `0 0 ${18 / scale}px rgba(220,230,245,0.25)`}}>
              {c}
            </span>
          );
        })}
      </div>
      {latin ? (
        <div style={{position: 'absolute', left: 0, right: 0, top: 470 + size * 0.62 + 30, textAlign: 'center', fontFamily: NF.latin, fontStyle: 'italic', fontSize: 26, letterSpacing: 2, color: N.label, opacity: latS.opacity * side, filter: latS.filter}}>{latin}</div>
      ) : null}
      {flyAt !== undefined && chapterLatin ? (
        <div style={{position: 'absolute', left: 64, top: 50 + boxH + 4, fontFamily: NF.latin, fontStyle: 'italic', fontSize: 16, letterSpacing: 1, color: N.label, opacity: clamp01((f - flyAt - 15) / 12)}}>{chapterLatin}</div>
      ) : null}
    </AbsoluteFill>
  );
};

/**
 * 被灯照亮的大字：粗宋大字，灯光落点 light（{x, y, r}，舞台坐标）附近亮、远处暗，像被吊灯扫到。
 * tone 暖（琥珀，热闹 / 欲望）或冷（白，清醒 / 独处）；不传 light 时用 lit（0–1）整体亮度。
 * 出场 10 帧模糊收拢，out 帧起退场；latin 是下面一行西文斜体。
 */
export const LitWord: React.FC<{f: number; at: number; text: string; x: number; y: number; size?: number; tone?: 'warm' | 'cool'; light?: {x: number; y: number; r: number}; lit?: number; latin?: string; out?: number; spacing?: number}> = ({
  f,
  at,
  text,
  x,
  y,
  size = NS.keyword,
  tone = 'warm',
  light,
  lit = 1,
  latin,
  out,
  spacing = 10,
}) => {
  const s = blurIn(f, at, 10, out, 12, 16);
  if (s.v <= 0) return null;
  const warm = tone === 'warm';
  const hi = warm ? N.amberLit : N.coolWhite;
  const mid = warm ? N.amber : '#a9b4c4';
  const lo = warm ? '#3d2e1d' : '#3a3f48';
  const left = x - 960;
  const top = y - 540;
  // 照亮程度：光斑中心到字中心的距离
  const amount = light ? clamp01(1 - Math.hypot(light.x - x, light.y - y) / (light.r * 1.4)) : lit;
  const bg = light
    ? `radial-gradient(circle ${light.r}px at ${light.x - left}px ${light.y - top}px, ${hi} 0%, ${mid} 45%, ${lo} 100%)`
    : `linear-gradient(${lo}, ${lo})`;
  const color = light ? 'transparent' : undefined;
  const flat = light ? undefined : mixHex(lo, hi, lit);
  const glowC = warm ? '255,200,130' : '220,232,250';
  return (
    <>
      <div
        style={{
          position: 'absolute',
          left,
          top,
          width: 1920,
          height: 1080,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: NF.cn,
          fontWeight: 900,
          fontSize: size,
          letterSpacing: spacing,
          lineHeight: 1,
          whiteSpace: 'nowrap',
          paddingLeft: spacing,
          background: light ? bg : undefined,
          WebkitBackgroundClip: light ? 'text' : undefined,
          backgroundClip: light ? 'text' : undefined,
          color: color ?? flat,
          opacity: s.opacity,
          filter: [s.filter, amount > 0.05 ? `drop-shadow(0 0 ${Math.round(24 * amount)}px rgba(${glowC},${(0.45 * amount).toFixed(3)}))` : ''].filter(Boolean).join(' ') || undefined,
        }}
      >
        {text}
      </div>
      {latin ? (
        <div style={{position: 'absolute', left: x - 300, width: 600, top: y + size * 0.62 + 14, textAlign: 'center', fontFamily: NF.latin, fontStyle: 'italic', fontSize: NS.latin, letterSpacing: 2, color: N.label, opacity: s.opacity * (0.55 + 0.45 * amount), filter: s.filter}}>{latin}</div>
      ) : null}
    </>
  );
};

/** 两个 #rrggbb 颜色按 t 混合 */
export const mixHex = (a: string, b: string, t: number) => {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  const k = clamp01(t);
  return `#${pa.map((v, i) => Math.round(v + (pb[i] - v) * k).toString(16).padStart(2, '0')).join('')}`;
};

type Half = {word: string; latin?: string; render?: (f: number) => React.ReactNode};

/**
 * 分屏对照：一条竖直发光细线把画面分成两半，左半冷色聚光灯、右半暖色光晕；每半上方一个大字 + 一行西文，
 * 内容用 render(f) 画（舞台坐标，会被裁在各自半边）。左半 at 帧亮起，右半 rightAt 帧（默认晚 30 帧）亮起。
 */
export const SplitDuo: React.FC<{f: number; at: number; left: Half; right: Half; rightAt?: number; out?: number}> = ({f, at, left, right, rightAt = at + 30, out}) => {
  const line = blurIn(f, at - 6, 12, out, 12, 6);
  const L = blurIn(f, at, 16, out, 12, 10);
  const R = blurIn(f, rightAt, 16, out, 12, 10);
  const word = (h: Half, cx: number, tone: 'cool' | 'warm', s: {opacity: number; filter?: string}, wAt: number) => (
    <>
      <LitWord f={f} at={wAt} text={h.word} x={cx} y={215} size={160} tone={tone} lit={0.92} out={out} />
      {h.latin ? <div style={{position: 'absolute', left: cx - 200, width: 400, top: 330, textAlign: 'center', fontFamily: NF.latin, fontStyle: 'italic', fontSize: 20, letterSpacing: 2, color: tone === 'warm' ? '#8a7f70' : N.label, opacity: s.opacity}}>{h.latin}</div> : null}
    </>
  );
  return (
    <AbsoluteFill>
      {/* 左半：冷色聚光灯 */}
      <AbsoluteFill style={{clipPath: 'inset(0 50% 0 0)', opacity: L.opacity, filter: L.filter}}>
        <AbsoluteFill style={{background: `radial-gradient(ellipse 30% 22% at 25% 86%, rgba(150,165,190,0.22) 0%, rgba(0,0,0,0) 100%)`}} />
        <svg width={1920} height={1080} style={{position: 'absolute'}}>
          <defs>
            <linearGradient id="nsd-spot" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#c4d0e4" stopOpacity={0.28} />
              <stop offset="1" stopColor="#c4d0e4" stopOpacity={0.04} />
            </linearGradient>
          </defs>
          <path d="M 420 0 L 540 0 L 700 960 L 260 960 Z" fill="url(#nsd-spot)" />
        </svg>
        {left.render ? left.render(f) : null}
        {word(left, 480, 'cool', L, at + 8)}
      </AbsoluteFill>
      {/* 右半：暖光晕 */}
      <AbsoluteFill style={{clipPath: 'inset(0 0 0 50%)', opacity: R.opacity, filter: R.filter}}>
        <AbsoluteFill style={{background: `radial-gradient(ellipse 45% 50% at 75% 70%, rgba(150,104,48,0.4) 0%, rgba(80,52,22,0.15) 50%, rgba(0,0,0,0) 85%)`}} />
        {right.render ? right.render(f) : null}
        {word(right, 1440, 'warm', R, rightAt + 8)}
      </AbsoluteFill>
      {/* 中间的发光细线 */}
      <div style={{position: 'absolute', left: 958, top: 0, width: 3, height: 1080, opacity: line.opacity, background: 'linear-gradient(180deg, rgba(220,228,238,0) 0%, rgba(220,228,238,0.85) 25%, rgba(220,228,238,0.85) 75%, rgba(220,228,238,0) 100%)', boxShadow: '0 0 14px rgba(200,212,230,0.55)'}} />
    </AbsoluteFill>
  );
};

/**
 * 回忆照片：一张微微倾斜、带米白边的暖色照片浮在冷色画面上，缓慢摆动。children 按 1920×1080 舞台画，
 * 会被缩进照片里并调成暖褐色。x / y 照片中心，w / h 尺寸，tilt 倾角；at 帧起约 16 帧模糊放大落定。
 */
export const MemoryPhoto: React.FC<{f: number; at: number; x?: number; y?: number; w?: number; h?: number; tilt?: number; out?: number; children: React.ReactNode}> = ({f, at, x = 1000, y = 420, w = 1060, h = 640, tilt = -4, out, children}) => {
  const s = blurIn(f, at, 16, out, 14, 12);
  if (s.v <= 0) return null;
  const t = f - at;
  const b = 12;
  const rot = tilt - 3 * (1 - s.v) + 0.6 * Math.sin(t / 45);
  const sc = 1.06 - 0.06 * s.v;
  const inner = Math.min((w - 2 * b) / 1920, (h - 2 * b) / 1080);
  return (
    <div style={{position: 'absolute', left: x - w / 2, top: y - h / 2, width: w, height: h, opacity: s.opacity, filter: s.filter, transform: `rotate(${rot}deg) scale(${sc})`, background: N.photoEdge, boxShadow: '0 30px 70px rgba(0,0,0,0.65), 0 0 40px rgba(255,200,130,0.12)'}}>
      <div style={{position: 'absolute', left: b, top: b, width: w - 2 * b, height: h - 2 * b, overflow: 'hidden', background: N.photo}}>
        <div style={{position: 'absolute', left: (w - 2 * b - 1920 * inner) / 2, top: (h - 2 * b - 1080 * inner) / 2, width: 1920, height: 1080, transform: `scale(${inner})`, transformOrigin: 'left top', filter: 'sepia(0.55) saturate(1.25) brightness(1.15)'}}>{children}</div>
        <AbsoluteFill style={{background: 'linear-gradient(160deg, rgba(255,214,150,0.22) 0%, rgba(120,70,30,0.18) 100%)', mixBlendMode: 'overlay'}} />
        <AbsoluteFill style={{background: 'radial-gradient(ellipse 75% 70% at 50% 45%, rgba(0,0,0,0) 55%, rgba(30,16,6,0.45) 100%)'}} />
      </div>
    </div>
  );
};

/** 暗场叠化容器：at 帧起约 20 帧从黑里亮起，out 帧起约 20 帧暗下去（不传 out 就不退场） */
export const Dip: React.FC<{f: number; at: number; out?: number; len?: number; children: React.ReactNode}> = ({f, at, out, len = 20, children}) => {
  const v = dip(f, at, out ?? 1e9, len);
  if (v <= 0) return null;
  return <AbsoluteFill style={{opacity: v}}>{children}</AbsoluteFill>;
};

/** 闪白：at 帧 3 帧冲到全白，停 hold 帧，再 fade 帧退去（推进光门时盖在最上层） */
export const WhiteFlash: React.FC<{f: number; at: number; hold?: number; fade?: number}> = ({f, at, hold, fade}) => {
  const v = flash(f, at, hold, fade);
  if (v <= 0) return null;
  return <AbsoluteFill style={{background: '#eef2f8', opacity: v}} />;
};

/** 去色：at 帧起 dur 帧把画面褪成灰并压暗（开场彩色画面转标题时用） */
export const Desat: React.FC<{f: number; at: number; dur?: number; children: React.ReactNode}> = ({f, at, dur = 14, children}) => {
  const p = clamp01((f - at) / dur);
  return <AbsoluteFill style={{filter: p > 0 ? `grayscale(${p}) brightness(${1 - 0.55 * p})` : undefined}}>{children}</AbsoluteFill>;
};
