import type React from 'react';
import '../vox/theme';
import {clamp01} from '../anim';

/**
 * 3：尼采权力与意志：暗场里一条赤红跑道，一个发光的米白火柴人，身后跟着放大虚化的红色影子；文字只用宋体，一行行从模糊里浮出来。
 * 光源有语义：左边红光 = 退缩的声音，右边冷灰光 = 往前的声音。强调色（玫红）一个画面最多一处。
 */
export const C = {
  bg: '#040203', // 暖黑
  ink: '#ece5dc', // 米白：正文、火柴人
  inkDim: 'rgba(236,229,220,0.62)',
  inkFaint: 'rgba(236,229,220,0.3)',
  white: '#fffaf4', // 纯白光：结论大字、光环、爆闪
  rose: '#d98a80', // 玫红：强调行
  roseBright: '#eba297',
  ghost: '#8e2b24', // 影子红：红色火柴人、关键词残影
  ghostDeep: '#5e1712',
  track: '#5c1f1a', // 透视跑道（远处）
  trackNear: '#47100c', // 透视跑道（近处，更暗）
  floor: '#5a1e19', // 侧视地面
  floorDeep: '#3a1210',
  field: '#0d0f0e', // 俯视椭圆的场心
  lane: '#b5675e', // 俯视椭圆的跑道线
  laneLine: '#e8e0d8', // 透视分道线
  tag: '#959193', // 左上概念标签
  cite: '#866f6b', // 右下西文出处
  page: '#dbd3c8', // 纸页
  pageShade: '#b9b0a4',
  redGlow: 'rgba(150,40,32,', // 左侧红光（拼透明度用）
  coolGlow: 'rgba(150,145,165,', // 右侧冷光
};

/** 字体：中文全部宋体；西文出处用 Garamond 斜体（素材库已带 Garamond，斜体由浏览器合成） */
export const CF = {
  cn: `'Songti SC', 'Noto Serif SC', 'Noto Serif CJK SC', 'Source Han Serif SC', 'STSong', serif`,
  latin: `'Vox Garamond', 'Georgia', serif`,
};

const easeOut3 = (t: number) => 1 - Math.pow(1 - t, 3);

/** 模糊柔入（可带退场）：透明 + 模糊 8px 一起收拢，默认 10 帧，先快后慢；退场对称 */
export const blurIn = (f: number, at: number, dur = 10, out?: number, outDur = 10) => {
  const i = easeOut3(clamp01((f - at) / dur));
  const o = out === undefined ? 1 : 1 - easeOut3(clamp01((f - out) / outDur));
  const v = i * o;
  return {v, opacity: v, filter: v >= 0.999 ? undefined : `blur(${(1 - v) * 8}px)`};
};

/** 两头淡入淡出的可见度：a 起淡入、b 前淡出完 */
export const vis = (f: number, a: number, b: number, fin = 12, fout = 12) => clamp01((f - a) / fin) * (1 - clamp01((f - (b - fout)) / fout));

/** 发光（给 SVG 元素或 div 的 filter 用）：同色两层外发光，r 半径、k 强度 */
export const glow = (color: string, r = 10, k = 1) => `drop-shadow(0 0 ${r * 0.4}px ${color}) drop-shadow(0 0 ${r}px ${withAlpha(color, 0.6 * k)})`;

/** 文字柔投影：压在亮地面上也读得清 */
export const inkShadow = (strength = 1): React.CSSProperties => ({textShadow: `0 2px ${10 * strength}px rgba(0,0,0,${0.85 * strength}), 0 0 ${24 * strength}px rgba(0,0,0,${0.5 * strength}), 0 0 ${60 * strength}px rgba(0,0,0,${0.45 * strength})`});

/** 结论大字的白色外发光 */
export const heroGlow = (k = 1): React.CSSProperties => ({
  color: C.white,
  textShadow: `0 0 ${10 * k}px rgba(255,250,244,${0.55 * k}), 0 0 ${26 * k}px rgba(255,236,220,${0.28 * k}), 0 2px 10px rgba(0,0,0,0.85), 0 0 60px rgba(0,0,0,0.5)`,
});

/** #rrggbb 加透明度 */
export const withAlpha = (hex: string, a: number) => {
  if (!hex.startsWith('#') || hex.length !== 7) return hex;
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};
