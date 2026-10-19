import React from 'react';
import {AbsoluteFill} from 'remotion';
import {clamp01, easeInOut, easeOut, rand} from '../anim';
import {scatter} from './geom';
import {capFade, flashAt, glowGold, glowWhite, haze, K, KF} from './theme';

/**
 * 3：虚无主义的舞台层：夜空底、白纸反转、角标、字幕、大字、星点标题、冲击白闪、推拉镜头。
 * 全部按 1920×1080 横屏设计；所有动画由帧号 f 算出。
 */

/** 夜空底：近黑偏冷 + 中间一块几乎看不出的椭圆亮区 + 约 170 颗各自闪烁的小星点 */
export const NightSky: React.FC<{f: number; stars?: number; seed?: number; glow?: number}> = ({f, stars = 170, seed = 5, glow = 1}) => (
  <AbsoluteFill style={{background: K.bg}}>
    <AbsoluteFill style={{background: `radial-gradient(ellipse 38% 42% at 50% 50%, ${K.bgCenter} 0%, rgba(6,7,11,${0.9 * glow}) 70%, rgba(3,4,7,0) 100%)`}} />
    <AbsoluteFill style={{background: `radial-gradient(ellipse 60% 62% at 50% 50%, rgba(0,0,0,0) 60%, ${K.bgEdge} 100%)`}} />
    <svg width={1920} height={1080} style={{position: 'absolute'}}>
      {Array.from({length: stars}, (_, i) => {
        const s = seed * 1000 + i;
        const x = rand(s) * 1920;
        const y = rand(s + 0.31) * 1080;
        const b = 0.35 + 0.6 * rand(s + 0.77);
        const tw = 0.55 + 0.45 * Math.sin(f / (18 + rand(s + 0.5) * 40) + i * 1.7);
        return <circle key={i} cx={x.toFixed(1)} cy={y.toFixed(1)} r={(0.5 + rand(s + 0.13) * 0.8).toFixed(2)} fill="#d8dce6" opacity={(b * tw).toFixed(3)} />;
      })}
    </svg>
  </AbsoluteFill>
);

/** 白纸反转底：中心 #f1f1ec，四角强暗角（像一张被台灯照亮的白纸） */
export const PaperSky: React.FC<{opacity?: number}> = ({opacity = 1}) =>
  opacity <= 0 ? null : (
    <AbsoluteFill style={{opacity, background: `radial-gradient(ellipse 70% 75% at 50% 42%, ${K.paper} 0%, #e9e9e4 45%, #dcdcd7 70%, ${K.paperEdge} 100%)`}} />
  );

/** 反转进度：at 起 6 帧淡成白纸（快），out 起 45 帧慢慢溶回夜色（慢）。进快出慢是原片的手法 */
export const inverted = (f: number, at: number, out?: number, inDur = 6, outDur = 45) => {
  const i = clamp01((f - at) / inDur);
  const o = out === undefined ? 1 : 1 - easeInOut(clamp01((f - out) / outDur));
  return Math.min(i, o);
};

/** 左上章节签：粗宋 40px、47% 灰，下面一条细线 */
export const ChapterTag: React.FC<{f: number; at: number; text: string; out?: number}> = ({f, at, text, out}) => {
  const s = haze(f, at, 18, out);
  return (
    <div style={{position: 'absolute', left: 72, top: 46, opacity: s.opacity, filter: s.filter}}>
      <div style={{fontFamily: KF.cn, fontWeight: 700, fontSize: 40, letterSpacing: 4, lineHeight: 1.1, color: K.tag}}>{text}</div>
      <div style={{height: 1, marginTop: 6, background: K.tagLine}} />
    </div>
  );
};

/**
 * 右上栏目框：1px 细边框里宽字距的栏目名（22% 灰，水印式），下面一行西文斜体注（年代 / 书名 · 年份）。
 * label 由每期自己传，不要照抄参考视频的栏目名。
 */
export const SeriesBox: React.FC<{f: number; at?: number; label: string; note?: string; noteAt?: number; out?: number; paper?: boolean}> = ({f, at = 0, label, note, noteAt, out, paper}) => {
  const s = haze(f, at, 18);
  const n = haze(f, noteAt ?? at, 18, out);
  const c = paper ? '#a9a9a5' : K.box;
  return (
    <div style={{position: 'absolute', right: 64, top: 50, textAlign: 'right'}}>
      <div style={{display: 'inline-block', border: `1px solid ${c}`, padding: '2px 8px 2px 16px', fontFamily: KF.cn, fontSize: 26, letterSpacing: 8, color: c, lineHeight: 1.3, opacity: s.opacity}}>{label}</div>
      {note ? <div style={{fontFamily: KF.latinItalic, fontStyle: 'italic', fontSize: 24, color: paper ? '#8d8d89' : K.note, marginTop: 14, opacity: n.opacity, filter: n.filter, whiteSpace: 'nowrap'}}>{note}</div> : null}
    </div>
  );
};

/** 解析字幕标记：`【词】` 加粗提亮，`〔词〕` 加粗变暖金（整片只用一次） */
export const parseCap = (text: string) => {
  const out: {s: string; mark: '' | 'hi' | 'gold'}[] = [];
  let mark: '' | 'hi' | 'gold' = '';
  let buf = '';
  const flush = () => {
    if (buf) out.push({s: buf, mark});
    buf = '';
  };
  for (const ch of text) {
    if (ch === '【' || ch === '〔') {
      flush();
      mark = ch === '【' ? 'hi' : 'gold';
    } else if (ch === '】' || ch === '〕') {
      flush();
      mark = '';
    } else buf += ch;
  }
  flush();
  return out;
};

/**
 * 字幕：宋体常规 44px、81% 灰，整句一起换——淡出 6 帧、黑 3 帧、淡入 7 帧（带模糊），不位移。
 * paper 用在白纸场（深灰字）。y 是字的中心高度（默认 987）。
 */
export const KCaption: React.FC<{f: number; at: number; text: string; out?: number; y?: number; size?: number; paper?: boolean}> = ({f, at, text, out, y = 987, size = 44, paper}) => {
  if (f < at || (out !== undefined && f > out + 8)) return null;
  const c = capFade(f, at, out);
  return (
    <div style={{position: 'absolute', left: 0, right: 0, top: y - size * 0.62, textAlign: 'center', fontFamily: KF.cn, fontSize: size, letterSpacing: 2, lineHeight: 1.25, color: paper ? '#4a4a48' : K.cap, opacity: c.opacity, filter: c.filter, textShadow: paper ? undefined : '0 2px 10px rgba(0,0,0,0.9)'}}>
      {parseCap(text).map((p, i) =>
        p.mark === 'hi' ? (
          <span key={i} style={{fontWeight: 900, color: paper ? '#111' : K.capHi}}>
            {p.s}
          </span>
        ) : p.mark === 'gold' ? (
          <span key={i} style={{fontWeight: 900, ...glowGold(0.8)}}>
            {p.s}
          </span>
        ) : (
          <span key={i}>{p.s}</span>
        ),
      )}
    </div>
  );
};

/** 一串排好的字幕（paceLines 的结果）直接渲染 */
export const KCaptions: React.FC<{f: number; lines: {text: string; at: number; out: number}[]; paper?: (i: number) => boolean}> = ({f, lines, paper}) => (
  <>
    {lines.map((l, i) => (
      <KCaption key={i} f={f} at={l.at} out={l.out} text={l.text} paper={paper?.(i)} />
    ))}
  </>
);

/** 陈述大字：宋体 Heavy、宽字距、白色柔光；模糊 + 透明一起收约 14 帧。paper 用在白纸场（黑字无光） */
export const Statement: React.FC<{f: number; at: number; text: string; out?: number; y?: number; x?: number; size?: number; align?: 'center' | 'left'; paper?: boolean; dur?: number}> = ({f, at, text, out, y = 500, x, size = 80, align = 'center', paper, dur = 14}) => {
  const s = haze(f, at, dur, out, 12, 12);
  if (s.v <= 0) return null;
  return (
    <div
      style={{
        position: 'absolute',
        left: align === 'center' ? 0 : x,
        right: align === 'center' ? 0 : undefined,
        top: y - size * 0.62,
        textAlign: align,
        fontFamily: KF.cn,
        fontWeight: 900,
        fontSize: size,
        letterSpacing: size * 0.12,
        lineHeight: 1.25,
        whiteSpace: 'nowrap',
        opacity: s.opacity,
        filter: s.filter,
        ...(paper ? {color: K.paperInk} : glowWhite(1)),
      }}
    >
      {text}
    </div>
  );
};

/** 爆点字：逐字模糊收拢（每字 6 帧，间隔 per 帧），轻微从 1.08 倍收到 1 倍，强柔光。x 不传就水平居中 */
export const ImpactWord: React.FC<{f: number; at: number; text: string; out?: number; x?: number; y?: number; size?: number; per?: number; glow?: number}> = ({f, at, text, out, x, y = 470, size = 160, per = 6, glow = 1.3}) => {
  if (f < at) return null;
  const o = out === undefined ? 1 : 1 - clamp01((f - out) / 12);
  return (
    <div style={{position: 'absolute', left: x ?? 0, right: x === undefined ? 0 : undefined, top: y - size * 0.62, textAlign: x === undefined ? 'center' : 'left', whiteSpace: 'nowrap', opacity: o}}>
      {text.split('').map((ch, i) => {
        const v = easeOut(clamp01((f - at - i * per) / 6));
        return (
          <span key={i} style={{display: 'inline-block', fontFamily: KF.cn, fontWeight: 900, fontSize: size, letterSpacing: size * 0.04, opacity: v, filter: v < 1 ? `blur(${(1 - v) * 10}px)` : undefined, transform: `scale(${1.08 - 0.08 * v})`, ...glowWhite(glow)}}>
            {ch}
          </span>
        );
      })}
    </div>
  );
};

/** 冷开问句：一组问句每 0.6–0.8 秒换一句，4 帧快溶（带一点模糊）。lines 里 at 是每句出现的帧 */
export const HookLine: React.FC<{f: number; lines: {text: string; at: number}[]; out?: number; y?: number; size?: number}> = ({f, lines, out, y = 175, size = 76}) => {
  const o = out === undefined ? 1 : 1 - clamp01((f - out) / 6);
  return (
    <>
      {lines.map((l, i) => {
        const next = lines[i + 1]?.at;
        const vin = clamp01((f - l.at) / 4);
        const vout = next === undefined ? 1 : 1 - clamp01((f - next) / 4);
        const v = Math.min(vin, vout) * o;
        if (v <= 0) return null;
        return (
          <div key={i} style={{position: 'absolute', left: 0, right: 0, top: y - size * 0.62, textAlign: 'center', fontFamily: KF.cn, fontWeight: 900, fontSize: size, letterSpacing: 4, color: '#f4f4f2', opacity: v, filter: v < 1 ? `blur(${(1 - v) * 6}px)` : undefined, textShadow: '0 4px 18px rgba(0,0,0,0.85)'}}>
            {l.text}
          </div>
        );
      })}
    </>
  );
};

/**
 * 星点大标题：字形由一圈圈星点描出（细字重 + 圆点虚线描边）。gather 时先有一团星尘从四周聚向字的位置，
 * 星尘收拢后字亮起；shatter 时字熄灭、星尘向外炸开。cy 是字的中心高度，size 约 240。
 */
export const DotWord: React.FC<{text: string; cy?: number; size?: number; gather?: number; shatter?: number; f?: number; seed?: number; dim?: boolean; dot?: number}> = ({text, cy = 330, size = 240, gather = 1, shatter = 0, f = 0, seed = 31, dim, dot = 16}) => {
  const w = text.length * size * 1.04;
  const vis = clamp01((gather - 0.55) / 0.35) * (1 - clamp01(shatter * 2.5));
  const swarm = (1 - clamp01((gather - 0.75) / 0.25)) * (gather > 0 ? 1 : 0) + (shatter > 0 ? 1 - shatter : 0);
  const color = dim ? K.dim : K.star;
  return (
    <>
      <svg width={1920} height={1080} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
        <text
          x={960}
          y={cy + size * 0.36}
          textAnchor="middle"
          fontFamily={KF.cn}
          fontWeight={300}
          fontSize={size}
          letterSpacing={size * 0.04}
          fill="none"
          stroke={color}
          strokeWidth={size / 30}
          strokeDasharray={`0 ${dot}`}
          strokeLinecap="round"
          opacity={vis * (0.85 + 0.15 * Math.sin(f / 15))}
          style={{filter: dim ? undefined : 'drop-shadow(0 0 5px rgba(235,242,255,0.85))'}}
        >
          {text}
        </text>
        {swarm > 0
          ? Array.from({length: 160}, (_, i) => {
              const tx = 960 - w / 2 + rand(seed + i * 1.1) * w;
              const ty = cy - size * 0.45 + rand(seed + i * 2.3) * size * 0.9;
              const [sx, sy] = scatter(seed, i, 700);
              const g = shatter > 0 ? 1 - easeOut(shatter) : easeInOut(clamp01((gather - rand(seed + i) * 0.3) / 0.7));
              const x = tx + sx * (1 - g);
              const y = ty + sy * (1 - g) * 0.6;
              const o = swarm * clamp01(gather * 5 - rand(seed * 3 + i) * 2);
              return o > 0.01 ? <circle key={i} cx={x.toFixed(1)} cy={y.toFixed(1)} r={1.2 + rand(seed + i * 4) * 1.4} fill={color} opacity={o.toFixed(3)} /> : null;
            })
          : null}
      </svg>
    </>
  );
};

/** 幽灵星图字：主体旁边一个 42% 灰的大字，星点描边 + 细连线，衬托不抢戏。x, y 是字左上角 */
export const GhostWord: React.FC<{f: number; at: number; text: string; x: number; y: number; size?: number; out?: number}> = ({f, at, text, x, y, size = 220, out}) => {
  const s = haze(f, at, 20, out, 14, 6);
  if (s.v <= 0) return null;
  return (
    <svg width={1920} height={1080} style={{position: 'absolute', left: 0, top: 0, opacity: s.opacity, filter: s.filter}}>
      <text x={x} y={y + size * 0.86} fontFamily={KF.cn} fontWeight={300} fontSize={size} letterSpacing={size * 0.02} fill="none" stroke={K.dim} strokeWidth={0.8} opacity={0.6}>
        {text}
      </text>
      <text x={x} y={y + size * 0.86} fontFamily={KF.cn} fontWeight={300} fontSize={size} letterSpacing={size * 0.02} fill="none" stroke="#8d8e92" strokeWidth={size / 70} strokeDasharray="0 22" strokeLinecap="round">
        {text}
      </text>
    </svg>
  );
};

/**
 * 冲击闪帧：at 帧起 hold 帧整屏「反相」（黑底变白、白线白字变黑，四周略灰），fall 帧内退掉。
 * 原片的冲击帧就是这样一张底片，而不是纯白。要盖住所有层，放在画面组件的最后。
 */
export const FlashFrame: React.FC<{f: number; at: number; hold?: number; fall?: number; x?: number; y?: number}> = ({f, at, hold = 2, fall = 6, x = 960, y = 500}) => {
  const w = flashAt(f, at, hold, fall);
  if (w <= 0) return null;
  return <AbsoluteFill style={{background: `radial-gradient(ellipse 80% 80% at ${(x / 1920) * 100}% ${(y / 1080) * 100}%, #ffffff 0%, #ededeb 55%, #c4c4c2 100%)`, mixBlendMode: 'difference', opacity: w}} />;
};

/**
 * 冲击波：at 帧起一圈冲击波从 (x, y) 扩到 ring 半径、放射细线向外弹出，约 12 帧扩完、20 帧退掉。
 * 和 FlashFrame 同帧用；主体的碎裂交给各组件自己的 shatter 进度。
 */
export const Impact: React.FC<{f: number; at: number; x?: number; y?: number; ring?: number; rays?: number}> = ({f, at, x = 960, y = 500, ring = 560, rays = 28}) => {
  const t = f - at;
  if (t < 0 || t > 40) return null;
  const e = easeOut(clamp01(t / 12));
  const fade = 1 - clamp01((t - 4) / 16);
  return (
    <>
      <svg width={1920} height={1080} style={{position: 'absolute', left: 0, top: 0}}>
        <circle cx={x} cy={y} r={40 + (ring - 40) * e} fill="none" stroke="#f4f6fb" strokeWidth={3 - 2 * e} opacity={fade} style={{filter: 'drop-shadow(0 0 8px rgba(240,245,255,0.8))'}} />
        <circle cx={x} cy={y} r={30 + (ring * 0.6 - 30) * e} fill="none" stroke="#f4f6fb" strokeWidth={1} opacity={fade * 0.6} />
        {Array.from({length: rays}, (_, i) => {
          const a = (i / rays) * Math.PI * 2 + rand(i) * 0.1;
          const r0 = 60 + ring * 0.25 * e;
          const r1 = r0 + (60 + 120 * rand(i + 9)) * (0.4 + 0.6 * e);
          return <line key={i} x1={x + Math.cos(a) * r0} y1={y + Math.sin(a) * r0} x2={x + Math.cos(a) * r1} y2={y + Math.sin(a) * r1} stroke="#eef1f8" strokeWidth={1.4} opacity={fade * 0.9} />;
        })}
      </svg>
    </>
  );
};

/**
 * 星尘溶解：一块区域里的内容「碎成点」飞散（mode='out'），或者四周的星尘聚进这块区域（mode='in'）。
 * 配合内容本身的 haze 淡出 / 淡入用，就是这套风格的段落转场。rect = [x, y, w, h]。
 */
export const Stardust: React.FC<{f: number; at: number; dur?: number; rect?: [number, number, number, number]; n?: number; mode?: 'out' | 'in'; seed?: number}> = ({f, at, dur = 30, rect = [360, 160, 1200, 680], n = 220, mode = 'out', seed = 17}) => {
  const t = (f - at) / dur;
  if (t < 0 || t > 1) return null;
  const [rx, ry, rw, rh] = rect;
  return (
    <svg width={1920} height={1080} style={{position: 'absolute', left: 0, top: 0}}>
      {Array.from({length: n}, (_, i) => {
        const bx = rx + rand(seed + i * 1.3) * rw;
        const by = ry + rand(seed + i * 2.9) * rh;
        const [vx, vy] = scatter(seed, i, 1);
        const sp = 80 + 260 * rand(seed + i * 5.1);
        const k = mode === 'out' ? easeOut(t) : 1 - easeInOut(t);
        const x = bx + vx * sp * k;
        const y = by + vy * sp * k - 30 * k;
        const o = mode === 'out' ? (1 - t) * clamp01(t * 8) : clamp01(t * 4) * (1 - clamp01((t - 0.8) / 0.2));
        return <circle key={i} cx={x.toFixed(1)} cy={y.toFixed(1)} r={(0.8 + rand(seed + i * 7) * 1.6).toFixed(2)} fill={K.star} opacity={(o * (0.5 + 0.5 * rand(seed + i))).toFixed(3)} />;
      })}
    </svg>
  );
};

/** 推拉镜头容器：以 (ox, oy) 为中心缩放 s 倍，可再平移 (dx, dy)。配合 theme 里的 reframe 用 */
export const Reframe: React.FC<{s: number; ox?: number; oy?: number; dx?: number; dy?: number; children: React.ReactNode}> = ({s, ox = 960, oy = 540, dx = 0, dy = 0, children}) => (
  <AbsoluteFill style={{transform: `translate(${dx}px, ${dy}px) scale(${s})`, transformOrigin: `${ox}px ${oy}px`}}>{children}</AbsoluteFill>
);

/** 柔入容器：包住任意内容，at 出场、out 退场，带模糊 */
export const Haze: React.FC<{f: number; at: number; out?: number; dur?: number; outDur?: number; style?: React.CSSProperties; children: React.ReactNode}> = ({f, at, out, dur = 14, outDur = 10, style, children}) => {
  const s = haze(f, at, dur, out, outDur);
  if (s.v <= 0) return null;
  return <div style={{position: 'absolute', inset: 0, ...style, opacity: s.opacity, filter: s.filter}}>{children}</div>;
};
