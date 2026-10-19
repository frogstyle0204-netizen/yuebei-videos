import React from 'react';
import {clamp01, rand} from '../anim';
import {V} from './theme';

/**
 * 金器剧场风的器物和道具：金杯、陶杯、展台、俯视杯口、剪影人物、龟裂大地、放射光。
 * 每个组件自己是一张铺满画面的 1920×1080 SVG，用 x / y 摆位置；渐变 id 带上 uid，同屏放多个时传不同的 uid。
 */

const Full: React.FC<{children: React.ReactNode; opacity?: number}> = ({children, opacity = 1}) => (
  <svg width={1920} height={1080} viewBox="0 0 1920 1080" style={{position: 'absolute', inset: 0, pointerEvents: 'none', opacity}}>
    {children}
  </svg>
);

/** 金属横向渐变的五个停点：暗边 → 中 → 高光 → 中 → 暗边（高光偏左 hi，0–1） */
const MetalStops: React.FC<{dark: string; mid: string; hi: string; at?: number}> = ({dark, mid, hi, at = 0.36}) => (
  <>
    <stop offset="0" stopColor={dark} />
    <stop offset={Math.max(0.05, at - 0.2)} stopColor={mid} />
    <stop offset={at} stopColor={hi} />
    <stop offset={Math.min(0.95, at + 0.3)} stopColor={mid} />
    <stop offset="1" stopColor={dark} />
  </>
);

/**
 * 金杯：高脚圣杯，金属渐变杯身 + 杯口细高光 + 液面 + 杯脚，脚下一圈影子。
 * x 中心，y 杯脚底部，s 缩放（「杯子被撑大」直接加大 s）；fill 液面 0–1；pour 0–1 从画面顶部注下一道细金流；
 * tone 'gold' 金（默认）/ 'pale' 褪色银白（「得到了也不快乐」）/ 'dark' 黑杯（不自然也不必要的欲望）。
 */
export const Chalice: React.FC<{f: number; x: number; y: number; s?: number; fill?: number; pour?: number; tone?: 'gold' | 'pale' | 'dark'; uid?: string; opacity?: number}> = ({
  f,
  x,
  y,
  s = 1,
  fill = 0.6,
  pour = 0,
  tone = 'gold',
  uid = 'a',
  opacity = 1,
}) => {
  const pal =
    tone === 'pale'
      ? {dark: '#5d5a52', mid: '#a9a496', hi: '#efece2', liq: '#cfc9b8'}
      : tone === 'dark'
        ? {dark: '#050505', mid: '#1c1b1e', hi: '#4a4850', liq: '#0c0c0e'}
        : {dark: V.goldDark, mid: V.goldMid, hi: V.goldHi, liq: V.goldLiquid};
  const id = `vs-chalice-${uid}`;
  // 局部坐标：杯口在 -320，宽 ±100；杯脚底在 0。视角略高于杯口，液面只在杯口椭圆里露出来
  const level = clamp01(fill);
  const ly = -320 + (1 - level) * 34; // 液面高度（被杯口椭圆裁切）
  const wob = Math.sin(f / 6) * 1.2;
  return (
    <Full opacity={opacity}>
      <defs>
        <linearGradient id={`${id}-body`} x1="0" y1="0" x2="1" y2="0">
          <MetalStops dark={pal.dark} mid={pal.mid} hi={pal.hi} />
        </linearGradient>
        <linearGradient id={`${id}-stem`} x1="0" y1="0" x2="1" y2="0">
          <MetalStops dark={pal.dark} mid={pal.mid} hi={pal.hi} at={0.4} />
        </linearGradient>
        <radialGradient id={`${id}-liq`} cx="0.4" cy="0.4" r="0.7">
          <stop offset="0" stopColor={pal.hi} />
          <stop offset="0.6" stopColor={pal.liq} />
          <stop offset="1" stopColor={pal.dark} />
        </radialGradient>
        <linearGradient id={`${id}-pour`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={pal.mid} />
          <stop offset="0.45" stopColor={pal.hi} />
          <stop offset="1" stopColor={pal.mid} />
        </linearGradient>
        <filter id={`${id}-soft`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation={14} />
        </filter>
        <filter id={`${id}-hl`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation={5} />
        </filter>
        <clipPath id={`${id}-mouth`}>
          <ellipse cx={0} cy={-320} rx={97} ry={15.5} />
        </clipPath>
      </defs>
      {/* 注流：从画面顶部落到液面 */}
      {pour > 0 && <rect x={x - 4 * s + wob * 0.3} y={0} width={8 * s} height={Math.max(0, y + ly * s)} fill={`url(#${id}-pour)`} opacity={pour} />}
      <g transform={`translate(${x} ${y}) scale(${s})`}>
        {/* 落地影子 */}
        <ellipse cx={0} cy={4} rx={120} ry={16} fill="rgba(0,0,0,0.65)" filter={`url(#${id}-soft)`} />
        {/* 杯脚：细颈外翻成一片扁圆盘 */}
        <path d="M -9 -44 C -11 -24 -28 -13 -76 -7 C -62 7 62 7 76 -7 C 28 -13 11 -24 9 -44 Z" fill={`url(#${id}-stem)`} />
        <ellipse cx={0} cy={-6} rx={76} ry={9} fill="none" stroke={pal.hi} strokeOpacity={0.3} strokeWidth={1.5} />
        {/* 杯柄 + 节 */}
        <rect x={-7} y={-170} width={14} height={128} fill={`url(#${id}-stem)`} />
        <ellipse cx={0} cy={-104} rx={19} ry={10} fill={`url(#${id}-stem)`} />
        {/* 杯身：深圆碗 */}
        <path d="M -100 -320 C -102 -232 -62 -172 -10 -166 L 10 -166 C 62 -172 102 -232 100 -320 Z" fill={`url(#${id}-body)`} />
        {/* 杯口：内壁暗面 + 液面（裁在杯口里） + 口沿高光 */}
        <ellipse cx={0} cy={-320} rx={100} ry={18} fill={pal.dark} />
        {level > 0.02 && (
          <g clipPath={`url(#${id}-mouth)`}>
            <ellipse cx={0} cy={ly + wob * 0.2} rx={97} ry={15.5} fill={`url(#${id}-liq)`} />
          </g>
        )}
        <ellipse cx={0} cy={-320} rx={100} ry={18} fill="none" stroke={pal.hi} strokeOpacity={0.75} strokeWidth={3} />
        {/* 杯身上一道柔和的竖向高光 */}
        <path d="M -60 -300 C -62 -250 -46 -208 -26 -188" fill="none" stroke="rgba(255,250,235,0.28)" strokeWidth={10} strokeLinecap="round" filter={`url(#${id}-hl)`} />
      </g>
    </Full>
  );
};

/**
 * 陶杯：上宽下窄的素陶直杯，杯里一汪清水（深色水面 + 一点反光）；朴素、够用的那一方。
 * x 中心，y 杯底，s 缩放；crack 杯身裂一道（「原本的日子成了苦」）；steam 冒热气（0–1）。
 */
export const ClayCup: React.FC<{f: number; x: number; y: number; s?: number; crack?: boolean; steam?: number; uid?: string; opacity?: number}> = ({f, x, y, s = 1, crack, steam = 0, uid = 'a', opacity = 1}) => {
  const id = `vs-clay-${uid}`;
  return (
    <Full opacity={opacity}>
      <defs>
        <linearGradient id={`${id}-body`} x1="0" y1="0" x2="1" y2="0">
          <MetalStops dark={V.clayDark} mid={V.clay} hi={V.clayHi} at={0.3} />
        </linearGradient>
        <radialGradient id={`${id}-water`} cx="0.35" cy="0.35" r="0.8">
          <stop offset="0" stopColor="#2b3a4a" />
          <stop offset="1" stopColor="#0a0f16" />
        </radialGradient>
        <filter id={`${id}-soft`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation={10} />
        </filter>
      </defs>
      <g transform={`translate(${x} ${y}) scale(${s})`}>
        <ellipse cx={0} cy={4} rx={80} ry={12} fill="rgba(0,0,0,0.6)" filter={`url(#${id}-soft)`} />
        <path d="M -70 -150 L -56 -4 C -40 4 40 4 56 -4 L 70 -150 Z" fill={`url(#${id}-body)`} />
        <ellipse cx={0} cy={-150} rx={70} ry={13} fill={V.clayDark} />
        <ellipse cx={0} cy={-148} rx={63} ry={10.5} fill={`url(#${id}-water)`} />
        <ellipse cx={-18} cy={-150} rx={14} ry={2.5} fill="rgba(220,235,255,0.35)" />
        <ellipse cx={0} cy={-150} rx={70} ry={13} fill="none" stroke={V.clayHi} strokeOpacity={0.7} strokeWidth={2} />
        {crack && <path d="M 18 -150 L 10 -112 L 22 -86 L 12 -48" fill="none" stroke="rgba(20,8,4,0.9)" strokeWidth={3} strokeLinejoin="round" />}
        {steam > 0 &&
          [0, 1, 2].map((k) => {
            const t = (f / 40 + k / 3) % 1;
            const sx = -20 + k * 20 + Math.sin(f / 15 + k) * 6;
            return (
              <path
                key={k}
                d={`M ${sx} ${-165 - t * 60} c 8 -12 -8 -22 0 -34`}
                fill="none"
                stroke="rgba(240,235,225,0.5)"
                strokeWidth={3}
                strokeLinecap="round"
                opacity={steam * Math.sin(t * Math.PI)}
              />
            );
          })}
      </g>
    </Full>
  );
};

/**
 * 展台：略收腰的深石灰圆台，台面椭圆亮一档，正面一行宽字距标签；
 * x 中心，y 台面高度，w 宽，h 高；lit 0–1 被点到时台身泛出暖光边。光柱用 stage 的 SpotBeam 另画。
 */
export const Pedestal: React.FC<{x: number; y: number; w?: number; h?: number; label?: string; lit?: number; labelOpacity?: number; uid?: string}> = ({
  x,
  y,
  w = 280,
  h = 320,
  label,
  lit = 0,
  labelOpacity = 1,
  uid = 'a',
}) => {
  const id = `vs-ped-${uid}`;
  const hw = w / 2;
  return (
    <Full>
      <defs>
        <linearGradient id={`${id}-body`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#141318" />
          <stop offset="0.35" stopColor={V.stone} />
          <stop offset="0.7" stopColor="#1a1920" />
          <stop offset="1" stopColor="#0e0d11" />
        </linearGradient>
        <filter id={`${id}-glow`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation={16} />
        </filter>
      </defs>
      {lit > 0 && <ellipse cx={x} cy={y + h} rx={hw * 1.3} ry={30} fill={`rgba(255,190,100,${0.28 * lit})`} filter={`url(#${id}-glow)`} />}
      <path d={`M ${x - hw} ${y} L ${x - hw - 10} ${y + h} C ${x - hw / 2} ${y + h + 14} ${x + hw / 2} ${y + h + 14} ${x + hw + 10} ${y + h} L ${x + hw} ${y} Z`} fill={`url(#${id}-body)`} />
      <path d={`M ${x - hw} ${y} L ${x - hw - 10} ${y + h}`} stroke={lit > 0 ? `rgba(255,200,120,${0.35 + 0.4 * lit})` : V.stoneLine} strokeWidth={1.5} />
      <ellipse cx={x} cy={y} rx={hw} ry={22} fill={V.stoneTop} />
      <ellipse cx={x} cy={y} rx={hw} ry={22} fill="none" stroke="rgba(230,228,240,0.45)" strokeWidth={1.5} />
      {label && (
        <text x={x} y={y + h * 0.5} textAnchor="middle" fontFamily={`'Songti SC', 'Noto Serif SC', serif`} fontSize={34} letterSpacing={8} fill="#dcdad9" opacity={labelOpacity}>
          {label}
        </text>
      )}
    </Full>
  );
};

/**
 * 俯视杯口：一圈铜红陶环 + 深色水面 + 一颗月亮倒影（缓慢晃动），开头结尾各用一次做首尾闭环。
 * x / y 中心，r 外半径，ripple 0–1 水面晃动幅度；中间的大字用 stage 的 AnchorWord 另压。
 */
export const CupRing: React.FC<{f: number; x?: number; y?: number; r?: number; ripple?: number; uid?: string; opacity?: number}> = ({f, x = 960, y = 600, r = 390, ripple = 0.4, uid = 'a', opacity = 1}) => {
  const id = `vs-ring-${uid}`;
  const mx = x + r * 0.33 + Math.sin(f / 30) * 6 * ripple;
  const my = y - r * 0.38 + Math.cos(f / 37) * 4 * ripple;
  return (
    <Full opacity={opacity}>
      <defs>
        <radialGradient id={`${id}-water`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#16202c" />
          <stop offset="0.85" stopColor="#090d13" />
          <stop offset="1" stopColor="#020304" />
        </radialGradient>
        <linearGradient id={`${id}-rim`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7a4a2c" />
          <stop offset="0.5" stopColor="#4a2a18" />
          <stop offset="1" stopColor="#2e190e" />
        </linearGradient>
        <filter id={`${id}-glow`} x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation={10} />
        </filter>
      </defs>
      <circle cx={x} cy={y} r={r} fill={`url(#${id}-rim)`} />
      <circle cx={x} cy={y} r={r} fill="none" stroke="rgba(230,170,130,0.35)" strokeWidth={2} />
      <circle cx={x} cy={y} r={r * 0.84} fill={`url(#${id}-water)`} />
      {/* 水面上几圈很淡的涟漪 */}
      {[0.35, 0.55, 0.72].map((k, i) => (
        <circle key={i} cx={x} cy={y} r={r * k + Math.sin(f / 20 + i) * 3 * ripple} fill="none" stroke="rgba(160,190,230,0.06)" strokeWidth={1.5} />
      ))}
      <circle cx={mx} cy={my} r={r * 0.13} fill="rgba(220,230,245,0.45)" filter={`url(#${id}-glow)`} />
      <circle cx={mx} cy={my} r={r * 0.095} fill="#d9dde4" />
    </Full>
  );
};

/**
 * 剪影人物：几何搭的无脸剪影（圆头、圆角躯干、粗腿），背后一道暖色轮廓光，脚下一团影子。
 * pose 'stand' 站 / 'kneel' 跪（双手捧在胸前）/ 'cheer' 双手举起；x 脚的中心，y 地面，s 缩放；rim 轮廓光方向 -1 左 / 1 右 / 0 不要。
 */
export const Figure: React.FC<{x: number; y: number; s?: number; pose?: 'stand' | 'kneel' | 'cheer'; rim?: -1 | 0 | 1; uid?: string; opacity?: number}> = ({
  x,
  y,
  s = 1,
  pose = 'stand',
  rim = 1,
  uid = 'a',
  opacity = 1,
}) => {
  const id = `vs-fig-${uid}`;
  const body =
    pose === 'kneel' ? (
      <>
        <circle cx={60} cy={-330} r={40} />
        <path d="M 10 -290 C 70 -300 92 -260 88 -200 L 80 -110 C 78 -96 60 -88 40 -90 L 0 -96 C -12 -170 -16 -250 10 -290 Z" />
        {/* 大腿 + 小腿贴地 */}
        <path d="M 4 -110 L 82 -104 L 118 -16 C 122 -2 108 6 96 2 L 58 -60 Z" />
        <rect x={-110} y={-30} width={210} height={30} rx={15} />
        {/* 前伸的双臂：从肩膀斜下伸到身前 */}
        <path d="M 52 -262 C 104 -246 140 -214 158 -186 C 164 -176 152 -164 142 -170 C 120 -192 92 -210 52 -222 Z" />
      </>
    ) : pose === 'cheer' ? (
      <>
        <circle cx={0} cy={-392} r={38} />
        <path d="M -46 -340 C -46 -352 46 -352 46 -340 L 42 -170 L -42 -170 Z" />
        <rect x={-40} y={-176} width={34} height={176} rx={12} />
        <rect x={6} y={-176} width={34} height={176} rx={12} />
        <path d="M -40 -330 C -70 -380 -84 -430 -96 -480 L -78 -486 C -62 -440 -44 -392 -26 -350 Z" />
        <path d="M 40 -330 C 70 -380 84 -430 96 -480 L 78 -486 C 62 -440 44 -392 26 -350 Z" />
      </>
    ) : (
      <>
        <circle cx={0} cy={-392} r={38} />
        <path d="M -46 -340 C -46 -352 46 -352 46 -340 L 42 -170 L -42 -170 Z" />
        <rect x={-40} y={-176} width={34} height={176} rx={12} />
        <rect x={6} y={-176} width={34} height={176} rx={12} />
        <rect x={-62} y={-336} width={18} height={150} rx={9} />
        <rect x={44} y={-336} width={18} height={150} rx={9} />
      </>
    );
  return (
    <Full opacity={opacity}>
      <defs>
        <filter id={`${id}-soft`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation={18} />
        </filter>
      </defs>
      <g transform={`translate(${x} ${y}) scale(${s})`}>
        <ellipse cx={20} cy={6} rx={240} ry={48} fill="rgba(28,22,48,0.72)" filter={`url(#${id}-soft)`} />
        {rim !== 0 && (
          <g fill={V.rim} opacity={0.9} transform={`translate(${-rim * 5} -3)`}>
            {body}
          </g>
        )}
        <g fill={V.figure}>{body}</g>
      </g>
    </Full>
  );
};

/**
 * 龟裂大地：从地平线 horizonY 铺到画面底部的土地，透视网格 + 随机抖动的裂缝；seed 换一套裂纹。
 * tone 'dusk' 黄昏暖土（默认）/ 'ash' 灰土；sway 0–1 地面热浪轻微浮动。
 */
export const CrackedGround: React.FC<{f: number; horizonY?: number; seed?: number; tone?: 'dusk' | 'ash'; sway?: number}> = ({f, horizonY = 645, seed = 1, tone = 'dusk', sway = 0.3}) => {
  const id = `vs-ground-${seed}`;
  const rows = 9;
  const H = 1080 - horizonY;
  const rowY = (i: number) => horizonY + H * Math.pow(i / rows, 1.7);
  const cols = (i: number) => 7 + i;
  const lines: {d: string; w: number}[] = []; // w 线宽：越靠近镜头越粗
  for (let i = 1; i <= rows; i++) {
    const y = rowY(i);
    const n = 14 + i * 2;
    let d = '';
    for (let k = 0; k <= n; k++) {
      const px = -40 + (2000 / n) * k;
      const py = y + (rand(seed * 97 + i * 31 + k) - 0.5) * (10 + i * 7) + Math.sin(f / 50 + k) * sway * 0.6;
      d += `${k ? 'L' : 'M'} ${px.toFixed(1)} ${py.toFixed(1)} `;
    }
    lines.push({d, w: 1 + 2.2 * (i / rows)});
  }
  for (let i = 0; i < rows; i++) {
    const y0 = rowY(i);
    const y1 = rowY(i + 1);
    const n = cols(i);
    for (let k = 0; k < n; k++) {
      const u = (k + 0.2 + rand(seed * 53 + i * 17 + k) * 0.6) / n; // 0–1
      const spread0 = 0.6 + 0.4 * (i / rows);
      const spread1 = 0.6 + 0.4 * ((i + 1) / rows);
      const x0 = 960 + (u - 0.5) * 2400 * spread0;
      const x1 = 960 + (u - 0.5) * 2400 * spread1 + (rand(seed * 71 + i * 13 + k) - 0.5) * (60 + i * 20);
      const mx = (x0 + x1) / 2 + (rand(seed * 29 + i + k * 7) - 0.5) * (40 + i * 14);
      lines.push({d: `M ${x0.toFixed(1)} ${y0.toFixed(1)} L ${mx.toFixed(1)} ${((y0 + y1) / 2).toFixed(1)} L ${x1.toFixed(1)} ${y1.toFixed(1)}`, w: 1 + 2.2 * ((i + 0.5) / rows)});
    }
  }
  const top = tone === 'ash' ? '#5e5a5c' : V.earth;
  const low = tone === 'ash' ? '#2c2a2e' : V.earthDark;
  return (
    <Full>
      <defs>
        <linearGradient id={`${id}-g`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={top} />
          <stop offset="1" stopColor={low} />
        </linearGradient>
      </defs>
      <rect x={0} y={horizonY} width={1920} height={H} fill={`url(#${id}-g)`} />
      <g fill="none" stroke={V.crack} strokeLinejoin="round">
        {lines.map((l, i) => (
          <path key={i} d={l.d} strokeWidth={l.w} />
        ))}
      </g>
      <rect x={0} y={horizonY - 2} width={1920} height={4} fill="rgba(255,230,190,0.25)" />
    </Full>
  );
};

/**
 * 放射光 + 彩屑：从 (x, y) 向四周放出的金色光芒，at 起爆开，同时彩屑四散下落（爆点用，比如「终于得到了」）。
 * n 光芒数，pieces 彩屑数。
 */
export const BurstRays: React.FC<{f: number; at: number; x?: number; y?: number; n?: number; pieces?: number}> = ({f, at, x = 960, y = 560, n = 28, pieces = 160}) => {
  const t = f - at;
  if (t < 0) return null;
  const open = 1 - Math.pow(1 - clamp01(t / 14), 3);
  const rot = t * 0.08;
  const colors = ['#f7d58a', '#e8a33c', '#f2f0e6', '#d9534a', '#5a8fd8'];
  return (
    <Full>
      <defs>
        <filter id="vs-burst-blur" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation={6} />
        </filter>
        <radialGradient id="vs-burst-core" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="rgba(255,240,200,0.95)" />
          <stop offset="0.4" stopColor="rgba(255,200,110,0.4)" />
          <stop offset="1" stopColor="rgba(0,0,0,0)" />
        </radialGradient>
      </defs>
      <g transform={`translate(${x} ${y}) rotate(${rot})`} opacity={open * 0.85} filter="url(#vs-burst-blur)">
        {Array.from({length: n}, (_, i) => {
          const a = (i / n) * 360;
          const len = (900 + rand(i * 5) * 500) * open;
          const w = 10 + rand(i * 3) * 26;
          return <polygon key={i} points={`0,0 ${len},${-w} ${len},${w}`} transform={`rotate(${a})`} fill={`rgba(255,${190 + Math.round(rand(i) * 40)},110,${0.08 + rand(i * 7) * 0.12})`} />;
        })}
      </g>
      <circle cx={x} cy={y} r={360 * open} fill="url(#vs-burst-core)" />
      {Array.from({length: pieces}, (_, i) => {
        const ang = rand(i * 3 + 1) * Math.PI * 2;
        const sp = 6 + rand(i * 7 + 2) * 16;
        const px = x + Math.cos(ang) * sp * t;
        const py = y + Math.sin(ang) * sp * t * 0.7 + 0.12 * t * t;
        if (py > 1100 || px < -20 || px > 1940) return null;
        const sz = 4 + rand(i * 11) * 6;
        return <rect key={i} x={px} y={py} width={sz} height={sz * 0.5} fill={colors[i % colors.length]} transform={`rotate(${(t * 9 + i * 37) % 360} ${px} ${py})`} opacity={0.85} />;
      })}
    </Full>
  );
};
