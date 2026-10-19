import React from 'react';
import {AbsoluteFill} from 'remotion';
import {clamp01, rand} from '../anim';
import {N, NF} from './theme';

/**
 * 夜灯哲思风的道具：吊灯、剪影人、人群、光门、月夜窗、书房、挂钟、挂画。
 * 全部是扁平矢量 + 渐变体积，不描边；坐标按 1920×1080 舞台，所有动画由帧号算出。
 */

/** SVG 里用的唯一 id（useId 带冒号等字符，url(#…) 里不能用） */
const useSvgId = (prefix: string) => `${prefix}-${React.useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;

const rad = (deg: number) => (deg * Math.PI) / 180;

/**
 * 光斑落点：吊灯挂在 (x, top)，灯罩中心在 y，摆角 angle（度，正值往左摆），
 * 返回沿光锥中轴、离灯泡 dist 像素处的点。用它把 LitWord 的照亮中心对准灯光。
 */
export const lampSpot = (x: number, top: number, y: number, angle: number, dist: number): [number, number] => {
  const L = y - top + dist;
  return [x - Math.sin(rad(angle)) * L, top + Math.cos(rad(angle)) * L];
};

/**
 * 吊灯：一根细线挂一只深色灯罩，灯泡发光，下面一束光锥。
 * x / top 是挂点，y 是灯罩中心；angle 摆角（度，配合 swing() 做钟摆）；tone 冷白 / 暖黄；
 * light 0–1 控制亮度（开灯、熄灯）；cone 光锥长度，spread 光锥张角（度），halo 灯周围的大光晕。
 */
export const PendantLamp: React.FC<{x: number; y: number; top?: number; angle?: number; tone?: 'cool' | 'warm'; light?: number; size?: number; cone?: number; spread?: number; halo?: number}> = ({
  x,
  y,
  top = 0,
  angle = 0,
  tone = 'cool',
  light = 1,
  size = 1,
  cone = 620,
  spread = 34,
  halo = 1,
}) => {
  const id = useSvgId('lamp');
  const warm = tone === 'warm';
  const coneC = warm ? '255,206,140' : '196,210,232';
  const haloC = warm ? '170,120,60' : '120,140,170';
  const w = 150 * size;
  const h = 58 * size;
  const half = Math.tan(rad(spread / 2)) * cone;
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <svg width={1920} height={1080} style={{position: 'absolute', overflow: 'visible'}}>
        <defs>
          <linearGradient id={`${id}-cone`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={`rgb(${coneC})`} stopOpacity={(warm ? 0.42 : 0.3) * light} />
            <stop offset="0.55" stopColor={`rgb(${coneC})`} stopOpacity={(warm ? 0.16 : 0.12) * light} />
            <stop offset="1" stopColor={`rgb(${coneC})`} stopOpacity={0} />
          </linearGradient>
          <radialGradient id={`${id}-halo`}>
            <stop offset="0" stopColor={`rgb(${haloC})`} stopOpacity={0.55 * light * halo} />
            <stop offset="0.45" stopColor={`rgb(${haloC})`} stopOpacity={0.2 * light * halo} />
            <stop offset="1" stopColor={`rgb(${haloC})`} stopOpacity={0} />
          </radialGradient>
          <linearGradient id={`${id}-shade`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#323c4a" />
            <stop offset="1" stopColor={N.shade} />
          </linearGradient>
          <filter id={`${id}-soft`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation={(warm ? 18 : 10) * size} />
          </filter>
          <filter id={`${id}-glow`} x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation={6 * size} />
          </filter>
        </defs>
        <g transform={`rotate(${angle} ${x} ${top})`}>
          {/* 光晕 + 光锥（在灯罩后面） */}
          <ellipse cx={x} cy={y + cone * 0.32} rx={cone * 0.62} ry={cone * 0.5} fill={`url(#${id}-halo)`} />
          <path d={`M ${x - w * 0.36} ${y + h * 0.35} L ${x + w * 0.36} ${y + h * 0.35} L ${x + half} ${y + cone} L ${x - half} ${y + cone} Z`} fill={`url(#${id}-cone)`} filter={`url(#${id}-soft)`} />
          {/* 吊线 */}
          <line x1={x} y1={top} x2={x} y2={y - h * 0.62} stroke="#59616d" strokeOpacity={0.75} strokeWidth={1.6} />
          <rect x={x - 7 * size} y={y - h * 0.78} width={14 * size} height={h * 0.3} rx={3} fill="#2a323d" />
          {/* 灯罩：半椭圆穹顶，底边一道受光的亮边 */}
          <path d={`M ${x - w / 2} ${y + h * 0.32} C ${x - w / 2} ${y - h * 0.62}, ${x + w / 2} ${y - h * 0.62}, ${x + w / 2} ${y + h * 0.32} Z`} fill={`url(#${id}-shade)`} />
          <path d={`M ${x - w / 2} ${y + h * 0.32} L ${x + w / 2} ${y + h * 0.32}`} stroke={warm ? '#c9a46e' : '#aeb9c9'} strokeOpacity={0.55 * light + 0.15} strokeWidth={2} />
          {/* 灯泡 */}
          <ellipse cx={x} cy={y + h * 0.42} rx={w * 0.2} ry={h * 0.2} fill={warm ? '#ffd9a0' : N.bulb} opacity={light} filter={`url(#${id}-glow)`} />
          <ellipse cx={x} cy={y + h * 0.42} rx={w * 0.14} ry={h * 0.13} fill={N.bulb} opacity={0.25 + 0.75 * light} />
        </g>
      </svg>
    </AbsoluteFill>
  );
};

/** 站立剪影的轮廓（局部坐标，脚底在 (0,0)，身高 400 单位，背影）：小头、宽肩、两臂分开下垂、腿长约占一半 */
const STAND_TORSO = 'M -13 -340 C -30 -339 -45 -334 -51 -322 L -48 -214 C -48 -206 -42 -202 -34 -202 L 34 -202 C 42 -202 48 -206 48 -214 L 51 -322 C 45 -334 30 -339 13 -340 Z';
const STAND_ARMS = 'M -53 -325 C -61 -319 -65 -307 -65 -294 L -67 -186 C -67 -176 -57 -174 -55 -184 L -51 -298 Z M 53 -325 C 61 -319 65 -307 65 -294 L 67 -186 C 67 -176 57 -174 55 -184 L 51 -298 Z';
const STAND_LEGS = 'M -34 -208 L -4 -208 L -6 -8 C -6 -3 -10 0 -15 0 L -26 0 C -31 0 -33 -3 -33 -8 Z M 4 -208 L 34 -208 L 33 -8 C 33 -3 31 0 26 0 L 15 0 C 10 0 6 -3 6 -8 Z';
const STAND_HEAD = {cx: 0, cy: -371, rx: 17, ry: 21};

/**
 * 站立的剪影人（背影）：深色身体，轮廓光从上往下渐弱（像被头顶的灯照着），心口一颗发光的「余烬」。
 * x 是脚底中心、y 是脚底；h 身高（像素）；tone 冷 / 暖决定轮廓光颜色；core 0–1 心口光点亮度（0 不画）；
 * rim 0–1 轮廓光强度；shadow 脚下投影。
 */
export const Figure: React.FC<{x: number; y: number; h?: number; tone?: 'cool' | 'warm'; core?: number; rim?: number; shadow?: boolean; opacity?: number}> = ({x, y, h = 400, tone = 'cool', core = 1, rim = 1, shadow = true, opacity = 1}) => {
  const id = useSvgId('fig');
  const s = h / 400;
  const rimC = tone === 'warm' ? '#e0a663' : '#c3d1e6';
  const body = tone === 'warm' ? N.warmSil : N.coolSil;
  const bodyHi = tone === 'warm' ? '#2e1d0f' : '#252c3b';
  const all = (
    <>
      <path d={STAND_LEGS} />
      <path d={STAND_ARMS} />
      <path d={STAND_TORSO} />
      <ellipse {...STAND_HEAD} />
      <rect x={-7} y={-354} width={14} height={18} />
    </>
  );
  return (
    <svg width={1920} height={1080} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', opacity}}>
      <defs>
        <linearGradient id={`${id}-b`} x1="0" y1="-400" x2="0" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={bodyHi} />
          <stop offset="0.5" stopColor={body} />
          <stop offset="1" stopColor={body} />
        </linearGradient>
        <linearGradient id={`${id}-r`} x1="0" y1="-400" x2="0" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={rimC} stopOpacity={1} />
          <stop offset="0.3" stopColor={rimC} stopOpacity={0.7} />
          <stop offset="0.6" stopColor={rimC} stopOpacity={0.12} />
          <stop offset="1" stopColor={rimC} stopOpacity={0} />
        </linearGradient>
        <filter id={`${id}-rim`} x="-40%" y="-20%" width="180%" height="140%">
          <feGaussianBlur stdDeviation={4.5} />
        </filter>
        <radialGradient id={`${id}-core`}>
          <stop offset="0" stopColor={tone === 'warm' ? '#ffe2b0' : '#dfe9fb'} stopOpacity={0.9} />
          <stop offset="0.35" stopColor={tone === 'warm' ? '#d9a865' : '#8ea6cc'} stopOpacity={0.45} />
          <stop offset="1" stopColor={tone === 'warm' ? '#d9a865' : '#8ea6cc'} stopOpacity={0} />
        </radialGradient>
      </defs>
      <g transform={`translate(${x} ${y}) scale(${s})`}>
        {shadow ? <ellipse cx={0} cy={0} rx={70} ry={9} fill="#000" opacity={0.55} /> : null}
        {/* 轮廓光：同一轮廓描边再模糊，垫在身体后面，上亮下暗 */}
        {rim > 0 ? (
          <g filter={`url(#${id}-rim)`} opacity={rim} fill="none" stroke={`url(#${id}-r)`} strokeWidth={7}>
            {all}
          </g>
        ) : null}
        <g fill={`url(#${id}-b)`}>{all}</g>
        {/* 领口的一点受光 */}
        <path d="M -13 -339 L -3 -318 M 13 -339 L 3 -318" stroke={rimC} strokeOpacity={0.35 * rim} strokeWidth={2} />
        {core > 0 ? (
          <>
            <ellipse cx={0} cy={-276} rx={46} ry={56} fill={`url(#${id}-core)`} opacity={0.75 * core} />
            <circle cx={0} cy={-276} r={5.5} fill="#fff" opacity={core} />
          </>
        ) : null}
      </g>
    </svg>
  );
};

/**
 * 坐着的剪影人（侧身朝右，坐在一把简单的椅子上）：用法同 Figure，x / y 是椅子脚底中心，h 是坐姿总高。
 * glow 0–1 给身体一层被灯照到的冷光。
 */
export const SeatedFigure: React.FC<{x: number; y: number; h?: number; core?: number; glow?: number}> = ({x, y, h = 330, core = 1, glow = 0.6}) => {
  const id = useSvgId('seat');
  const s = h / 330;
  return (
    <svg width={1920} height={1080} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
      <defs>
        <linearGradient id={`${id}-b`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={`rgba(${Math.round(42 + 40 * glow)},${Math.round(50 + 44 * glow)},${Math.round(66 + 50 * glow)},1)`} />
          <stop offset="1" stopColor={N.coolSil} />
        </linearGradient>
        <radialGradient id={`${id}-core`}>
          <stop offset="0" stopColor="#fff" />
          <stop offset="0.3" stopColor="#e6f0ff" stopOpacity={0.8} />
          <stop offset="1" stopColor="#9fb8e0" stopOpacity={0} />
        </radialGradient>
      </defs>
      <g transform={`translate(${x} ${y}) scale(${s})`}>
        <ellipse cx={10} cy={0} rx={110} ry={12} fill="#000" opacity={0.5} />
        {/* 椅子 */}
        <path d="M -70 -128 L 60 -128 M -64 -128 L -64 0 M 52 -128 L 52 0 M -70 -128 L -78 -300" stroke="#2b333e" strokeWidth={8} strokeLinecap="round" />
        {/* 小腿、大腿 */}
        <path d="M 74 -140 L 104 -140 L 108 -8 C 108 -2 104 0 98 0 L 84 0 C 78 0 76 -3 76 -8 Z" fill={N.coolSil} />
        <path d="M -60 -170 L 92 -170 C 106 -170 112 -160 110 -146 C 108 -132 100 -126 88 -126 L -56 -126 Z" fill={`url(#${id}-b)`} />
        {/* 躯干，微微前倾 */}
        <path d="M -52 -128 C -64 -190 -60 -250 -36 -286 C -22 -298 10 -298 22 -284 C 40 -258 40 -200 30 -160 L 20 -128 Z" fill={`url(#${id}-b)`} />
        {/* 手臂搭在腿上 */}
        <path d="M 6 -262 C 26 -236 40 -196 60 -168 L 92 -160 C 98 -158 98 -150 92 -148 L 52 -146 C 30 -170 10 -210 -2 -246 Z" fill="#232a36" />
        <rect x={-8} y={-304} width={16} height={18} fill={`url(#${id}-b)`} />
        <ellipse cx={2} cy={-322} rx={18} ry={22} fill={`url(#${id}-b)`} />
        {core > 0 ? (
          <>
            <circle cx={-4} cy={-220} r={36} fill={`url(#${id}-core)`} opacity={0.55 * core} />
            <circle cx={-4} cy={-220} r={6} fill="#fff" opacity={core} />
          </>
        ) : null}
      </g>
    </svg>
  );
};

/**
 * 一片暖色人群：rows 排、每排 cols 人，越往后越小越暗（景深）；
 * 背景一团暖光晕。hero 给出一个位置时，那里站一个冷色、心口发光的人（人群里唯一的冷色）。
 * x / y 是最前排的中心和脚底，spread 每排宽度。
 */
export const Crowd: React.FC<{x?: number; y?: number; rows?: number; cols?: number; spread?: number; h?: number; hero?: {x: number; y: number; h: number}; seed?: number; glow?: number}> = ({
  x = 960,
  y = 980,
  rows = 3,
  cols = 7,
  spread = 1500,
  h = 420,
  hero,
  seed = 3,
  glow = 1,
}) => {
  const people: React.ReactNode[] = [];
  for (let r = rows - 1; r >= 0; r--) {
    const k = 1 - r * 0.2;
    const n = cols - (r % 2);
    for (let i = 0; i < n; i++) {
      const s = seed * 1000 + r * 50 + i;
      const px = x + (i - (n - 1) / 2) * (spread * k) / Math.max(1, n - 1) + (rand(s) - 0.5) * 30;
      const py = y - r * 90 * (1 + r * 0.15);
      people.push(<Figure key={`${r}-${i}`} x={px} y={py} h={h * k * (0.92 + rand(s + 1) * 0.12)} tone="warm" core={0} rim={0.9 - r * 0.2} shadow={r === 0} opacity={1 - r * 0.22} />);
    }
  }
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{background: `radial-gradient(ellipse 70% 50% at ${(x / 1920) * 100}% ${((y - h * 0.35) / 1080) * 100}%, rgba(150,104,48,${0.55 * glow}) 0%, rgba(90,60,26,${0.24 * glow}) 45%, rgba(0,0,0,0) 80%)`}} />
      {/* 脚下一片暖色光池 */}
      <AbsoluteFill style={{background: `radial-gradient(ellipse ${(spread / 1920) * 62}% 16% at ${(x / 1920) * 100}% ${((y - 20) / 1080) * 100}%, rgba(170,120,58,${0.38 * glow}) 0%, rgba(110,74,30,${0.14 * glow}) 55%, rgba(0,0,0,0) 100%)`}} />
      {people}
      {hero ? <Figure x={hero.x} y={hero.y} h={hero.h} tone="cool" core={1} /> : null}
    </AbsoluteFill>
  );
};

/**
 * 飘在人群头顶的闲聊小字：每条在 at 帧淡入、慢慢上浮，dur 帧后淡出；字是暖色无衬线，透明度各不相同。
 * items: [文字, x, y, at]。
 */
export const Chatter: React.FC<{f: number; items: [string, number, number, number][]; dur?: number}> = ({f, items, dur = 70}) => (
  <AbsoluteFill style={{pointerEvents: 'none'}}>
    {items.map(([text, x, y, at], i) => {
      const t = f - at;
      if (t < 0 || t > dur + 14) return null;
      const v = clamp01(t / 10) * (1 - clamp01((t - dur) / 14));
      return (
        <div key={i} style={{position: 'absolute', left: x, top: y - t * 0.25, transform: 'translate(-50%,-50%)', fontFamily: `'Noto Sans CJK SC', 'PingFang SC', sans-serif`, fontSize: 24 + (i % 3) * 4, color: N.amberHi, opacity: v * (0.45 + 0.4 * rand(i + 9)), whiteSpace: 'nowrap', letterSpacing: 1}}>
          {text}
        </div>
      );
    })}
  </AbsoluteFill>
);

/**
 * 人与人之间的发光虚线弧：points 依次相连，p 0–1 画出进度；一颗亮点沿已画出的弧来回游走（表示话题、情绪在人之间传递）。
 */
export const LinkArcs: React.FC<{f: number; points: [number, number][]; p: number; lift?: number; color?: string}> = ({f, points, p, lift = 70, color = N.amberHi}) => {
  const id = useSvgId('arc');
  const segs = points.slice(1).map((b, i) => {
    const a = points[i];
    const mx = (a[0] + b[0]) / 2;
    const my = Math.min(a[1], b[1]) - lift;
    return {a, b, c: [mx, my] as [number, number]};
  });
  const total = segs.length;
  const shown = p * total;
  const dot = (() => {
    if (shown <= 0) return null;
    const u = ((Math.sin(f / 28) + 1) / 2) * Math.min(shown, total);
    const k = Math.min(total - 1, Math.floor(u));
    const t = u - k;
    const {a, b, c} = segs[k];
    const qx = (1 - t) * (1 - t) * a[0] + 2 * (1 - t) * t * c[0] + t * t * b[0];
    const qy = (1 - t) * (1 - t) * a[1] + 2 * (1 - t) * t * c[1] + t * t * b[1];
    return [qx, qy];
  })();
  return (
    <svg width={1920} height={1080} style={{position: 'absolute', left: 0, top: 0}}>
      <defs>
        <filter id={`${id}-g`} x="-20%" y="-50%" width="140%" height="200%">
          <feGaussianBlur stdDeviation={3} />
        </filter>
      </defs>
      {segs.map(({a, b, c}, i) => {
        const vis = clamp01(shown - i);
        if (vis <= 0) return null;
        const d = `M ${a[0]} ${a[1]} Q ${c[0]} ${c[1]} ${b[0]} ${b[1]}`;
        return (
          <g key={i}>
            <path d={d} fill="none" stroke={color} strokeWidth={6} opacity={0.5} filter={`url(#${id}-g)`} pathLength={1} strokeDasharray={`${vis} 1`} />
            <path d={d} fill="none" stroke="#f3d9ae" strokeWidth={2.5} strokeDasharray="6 9" opacity={0.9 * vis} />
          </g>
        );
      })}
      {dot ? <circle cx={dot[0]} cy={dot[1]} r={6} fill="#fff4e0" filter={`url(#${id}-g)`} /> : null}
    </svg>
  );
};

/**
 * 光门：黑屋里一道冷白发光的门，门前地面投出一片梯形光。x 是门底中心，y 是门底，w / h 门宽高，
 * spread 地面光往外张开的宽度，light 0–1 亮度。
 */
export const LightDoor: React.FC<{x: number; y: number; w?: number; h?: number; spread?: number; light?: number; floor?: number}> = ({x, y, w = 190, h = 430, spread = 420, light = 1, floor = 1080}) => {
  const id = useSvgId('door');
  return (
    <svg width={1920} height={1080} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
      <defs>
        <linearGradient id={`${id}-f`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c9d2e2" stopOpacity={0.55 * light} />
          <stop offset="1" stopColor="#9aa6ba" stopOpacity={0.05 * light} />
        </linearGradient>
        <filter id={`${id}-g`} x="-60%" y="-30%" width="220%" height="160%">
          <feGaussianBlur stdDeviation={22} />
        </filter>
      </defs>
      <path d={`M ${x - w / 2} ${y} L ${x + w / 2} ${y} L ${x + w / 2 + spread} ${floor} L ${x - w / 2 - spread * 0.2} ${floor} Z`} fill={`url(#${id}-f)`} />
      <rect x={x - w / 2 - 10} y={y - h - 10} width={w + 20} height={h + 20} fill={N.coolWhite} opacity={0.55 * light} filter={`url(#${id}-g)`} />
      <rect x={x - w / 2} y={y - h} width={w} height={h} fill={N.coolWhite} opacity={0.2 + 0.8 * light} />
    </svg>
  );
};

/**
 * 月夜窗：深蓝夜空、带光晕的月亮、闪烁的星点、远处楼群和零星暖窗，可选一道斜射进屋的冷光。
 * x / y / w / h 是窗框；stars 0–1 星点多少（收尾时拉满）；beam 斜光的强度；f 用于星点闪烁。
 */
export const NightWindow: React.FC<{f: number; x: number; y: number; w: number; h: number; stars?: number; beam?: number; seed?: number}> = ({f, x, y, w, h, stars = 0.3, beam = 1, seed = 5}) => {
  const id = useSvgId('win');
  const n = Math.round(20 + 120 * stars);
  const mx = x + w * 0.62;
  const my = y + h * 0.24;
  return (
    <svg width={1920} height={1080} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={N.skyDeep} />
          <stop offset="1" stopColor={N.sky} />
        </linearGradient>
        <radialGradient id={`${id}-moon`}>
          <stop offset="0" stopColor="#c8d4e6" stopOpacity={0.5} />
          <stop offset="1" stopColor="#c8d4e6" stopOpacity={0} />
        </radialGradient>
        <linearGradient id={`${id}-beam`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#c6d2e6" stopOpacity={0.2 * beam} />
          <stop offset="1" stopColor="#c6d2e6" stopOpacity={0} />
        </linearGradient>
        <clipPath id={`${id}-clip`}>
          <rect x={x} y={y} width={w} height={h} />
        </clipPath>
        <filter id={`${id}-b`}>
          <feGaussianBlur stdDeviation={4} />
        </filter>
      </defs>
      <g clipPath={`url(#${id}-clip)`}>
        <rect x={x} y={y} width={w} height={h} fill={`url(#${id}-sky)`} />
        <circle cx={mx} cy={my} r={w * 0.2} fill={`url(#${id}-moon)`} />
        <circle cx={mx} cy={my} r={w * 0.065} fill={N.moon} />
        {Array.from({length: n}, (_, i) => {
          const s = seed * 300 + i;
          const tw = 0.4 + 0.6 * Math.abs(Math.sin(f / (20 + rand(s + 3) * 40) + i));
          return <circle key={i} cx={x + rand(s) * w} cy={y + ((rand(s + 1) * h * 0.8 + f * (0.15 + rand(s + 4) * 0.25)) % (h * 0.8))} r={0.8 + rand(s + 2) * (1.2 + 2.4 * stars)} fill="#eef3fb" opacity={tw * (0.5 + 0.4 * stars)} />;
        })}
        {/* 远处楼群 + 零星暖窗 */}
        {Array.from({length: 7}, (_, i) => {
          const s = seed * 70 + i;
          const bw = w * (0.12 + rand(s) * 0.08);
          const bx = x + (i / 7) * w + (rand(s + 1) - 0.5) * 20;
          const bh = h * (0.28 + rand(s + 2) * 0.32);
          const lights = Array.from({length: 18}, (_, j) => {
            const t = s * 40 + j;
            if (rand(t) > 0.42) return null;
            return <rect key={j} x={bx + 6 + (j % 3) * (bw / 3.4)} y={y + h - bh + 10 + Math.floor(j / 3) * 18} width={6} height={8} fill={rand(t + 1) > 0.3 ? '#b8995f' : '#c9d3e4'} opacity={0.75} />;
          });
          return (
            <g key={i}>
              <rect x={bx} y={y + h - bh} width={bw} height={bh} fill="#0c1220" />
              {lights}
            </g>
          );
        })}
      </g>
      {/* 窗框 */}
      <rect x={x} y={y} width={w} height={h} fill="none" stroke="#1e2633" strokeWidth={12} />
      <line x1={x + w / 2} y1={y} x2={x + w / 2} y2={y + h} stroke="#1e2633" strokeWidth={8} />
      <line x1={x} y1={y + h * 0.42} x2={x + w} y2={y + h * 0.42} stroke="#1e2633" strokeWidth={6} />
      {/* 斜射进屋的冷光（往右下） */}
      {beam > 0 ? <path d={`M ${x} ${y} L ${x + w} ${y} L ${x + w + 520} ${1080} L ${x + 280} ${1080} Z`} fill={`url(#${id}-beam)`} filter={`url(#${id}-b)`} /> : null}
    </svg>
  );
};

/**
 * 冷色书房（舞台层）：墙、地面、左侧月夜窗、右侧书架、中间书桌和椅子。吊灯另外放（PendantLamp），方便做贯穿转场。
 * tone 'warm' 时整间屋子换成暖褐（热闹 / 回忆段落），desat 0–1 去色（开场转标题时用）。
 */
export const StudyRoom: React.FC<{f: number; tone?: 'cool' | 'warm'; stars?: number; beam?: number; desk?: boolean}> = ({f, tone = 'cool', stars = 0.3, beam = 1, desk = true}) => {
  const id = useSvgId('room');
  const warm = tone === 'warm';
  const wall = warm ? '#3a2716' : N.wall;
  const wall2 = warm ? '#24170c' : '#090e15';
  const furn = warm ? '#5a3a20' : N.sofa;
  const furnHi = warm ? '#7a5130' : N.sofaHi;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{background: `linear-gradient(180deg, ${wall2} 0%, ${wall} 45%, ${wall2} 68%, ${N.floor} 69%, ${N.floor} 100%)`}} />
      <NightWindow f={f} x={180} y={150} w={430} h={470} stars={stars} beam={warm ? 0 : beam} />
      <svg width={1920} height={1080} style={{position: 'absolute', left: 0, top: 0}}>
        <defs>
          <linearGradient id={`${id}-f`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={furnHi} />
            <stop offset="1" stopColor={furn} />
          </linearGradient>
        </defs>
        {/* 书架 */}
        <rect x={1460} y={170} width={330} height={570} fill={warm ? '#2c1d10' : '#0b1018'} />
        {Array.from({length: 5}, (_, r) => (
          <g key={r}>
            <rect x={1460} y={170 + r * 114 + 104} width={330} height={10} fill={warm ? '#4a301a' : '#151c27'} />
            {Array.from({length: 11}, (_, i) => {
              const s = r * 20 + i;
              const bh = 64 + rand(s) * 34;
              return <rect key={i} x={1472 + i * 28 + rand(s + 1) * 4} y={170 + r * 114 + 104 - bh} width={20 + rand(s + 2) * 6} height={bh} rx={2} fill={warm ? '#5a3a20' : '#18202b'} opacity={0.6 + rand(s + 3) * 0.4} />;
            })}
          </g>
        ))}
        {desk ? (
          <>
            {/* 书桌 + 台面上的书和杯子 */}
            <rect x={760} y={640} width={560} height={24} rx={6} fill={`url(#${id}-f)`} />
            <rect x={790} y={664} width={22} height={150} fill={furn} />
            <rect x={1268} y={664} width={22} height={150} fill={furn} />
            <rect x={1110} y={612} width={130} height={28} rx={3} fill={furnHi} opacity={0.8} />
            <rect x={1124} y={590} width={100} height={22} rx={3} fill={furn} />
            <path d="M 880 606 L 920 606 L 916 640 L 884 640 Z" fill={furnHi} />
            {/* 椅子背 */}
            <path d="M 930 560 C 930 540 1030 540 1030 560 L 1036 700 L 924 700 Z" fill={`url(#${id}-f)`} />
            <rect x={940} y={700} width={10} height={114} fill={furn} />
            <rect x={1010} y={700} width={10} height={114} fill={furn} />
          </>
        ) : null}
        {/* 地毯（透视梯形，虚线边） */}
        <path d="M 560 830 L 1500 830 L 1720 1040 L 340 1040 Z" fill={warm ? '#2a1a0e' : '#0b0f16'} opacity={0.9} />
        <path d="M 600 850 L 1460 850 L 1650 1020 L 410 1020 Z" fill="none" stroke={warm ? '#6a4626' : '#232c3a'} strokeWidth={2} strokeDasharray="10 10" />
      </svg>
    </AbsoluteFill>
  );
};

/** 罗马数字挂钟：x / y 圆心，r 半径；minutes 从 0 点起的分钟数（时针分针都按它算），light 0–1 亮度 */
export const WallClock: React.FC<{x: number; y: number; r?: number; minutes: number; light?: number}> = ({x, y, r = 90, minutes, light = 1}) => {
  const ROMAN = ['XII', 'I', 'II', 'III', 'IIII', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
  const hA = ((minutes / 720) % 1) * 360;
  const mA = ((minutes / 60) % 1) * 360;
  return (
    <svg width={1920} height={1080} style={{position: 'absolute', left: 0, top: 0, opacity: 0.35 + 0.65 * light}}>
      <circle cx={x} cy={y} r={r} fill="#0a0c14" stroke="#4a5262" strokeWidth={3} />
      <circle cx={x} cy={y} r={r - 8} fill="none" stroke="#252b38" strokeWidth={1.5} />
      {ROMAN.map((s, i) => {
        const a = (i / 12) * Math.PI * 2;
        return (
          <text key={s} x={x + Math.sin(a) * (r - 22)} y={y - Math.cos(a) * (r - 22) + 5} fill="#8b93a3" fontSize={r * 0.15} textAnchor="middle" fontFamily={NF.latin}>
            {s}
          </text>
        );
      })}
      <line x1={x} y1={y} x2={x + Math.sin(rad(hA)) * r * 0.48} y2={y - Math.cos(rad(hA)) * r * 0.48} stroke="#c9d2e0" strokeWidth={4} strokeLinecap="round" />
      <line x1={x} y1={y} x2={x + Math.sin(rad(mA)) * r * 0.74} y2={y - Math.cos(rad(mA)) * r * 0.74} stroke="#c9d2e0" strokeWidth={2.5} strokeLinecap="round" />
      <circle cx={x} cy={y} r={4} fill="#c9d2e0" />
    </svg>
  );
};

/** 挂画：细金框里一幅月下远山（夜空、月亮光晕、三层山）。x / y 左上角，w / h 尺寸，light 0–1 */
export const MoonPainting: React.FC<{x: number; y: number; w?: number; h?: number; light?: number}> = ({x, y, w = 300, h = 210, light = 1}) => {
  const id = useSvgId('ptg');
  return (
    <svg width={1920} height={1080} style={{position: 'absolute', left: 0, top: 0, opacity: 0.4 + 0.6 * light}}>
      <defs>
        <linearGradient id={`${id}-s`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1b2a44" />
          <stop offset="1" stopColor="#2f4566" />
        </linearGradient>
        <radialGradient id={`${id}-m`}>
          <stop offset="0" stopColor="#dfe8f5" stopOpacity={0.6} />
          <stop offset="1" stopColor="#dfe8f5" stopOpacity={0} />
        </radialGradient>
      </defs>
      <rect x={x - 8} y={y - 8} width={w + 16} height={h + 16} fill="none" stroke={N.gold} strokeWidth={6} />
      <rect x={x} y={y} width={w} height={h} fill={`url(#${id}-s)`} />
      <circle cx={x + w * 0.3} cy={y + h * 0.3} r={h * 0.28} fill={`url(#${id}-m)`} />
      <circle cx={x + w * 0.3} cy={y + h * 0.3} r={h * 0.08} fill="#e8eef7" />
      <path d={`M ${x} ${y + h * 0.72} L ${x + w * 0.22} ${y + h * 0.5} L ${x + w * 0.42} ${y + h * 0.66} L ${x + w * 0.66} ${y + h * 0.44} L ${x + w} ${y + h * 0.7} L ${x + w} ${y + h} L ${x} ${y + h} Z`} fill="#22324e" />
      <path d={`M ${x} ${y + h * 0.84} L ${x + w * 0.3} ${y + h * 0.7} L ${x + w * 0.55} ${y + h * 0.8} L ${x + w * 0.8} ${y + h * 0.68} L ${x + w} ${y + h * 0.82} L ${x + w} ${y + h} L ${x} ${y + h} Z`} fill="#18243a" />
      <path d={`M ${x} ${y + h * 0.94} C ${x + w * 0.3} ${y + h * 0.86}, ${x + w * 0.6} ${y + h * 0.98}, ${x + w} ${y + h * 0.9} L ${x + w} ${y + h} L ${x} ${y + h} Z`} fill="#0f1828" />
    </svg>
  );
};
