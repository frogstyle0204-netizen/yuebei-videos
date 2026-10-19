import type React from 'react';
import '../vox/theme';
import {clamp01, easeInOut, keyframes} from '../anim';

/**
 * 星图线描风：近黑夜空里，一切都由星点和细线描出来，整片黑白灰，只在结尾用一次暖金。
 * 颜色按「亮度层级」用，不按色相：节点最亮 → 大字 → 字幕 → 配角 → 角标。
 */
export const K = {
  bg: '#030407', // 底色：近黑偏冷
  bgCenter: '#07080c', // 中间椭圆亮区
  bgEdge: '#020306',
  star: '#f9fafd', // 星点节点
  line: '#b3b4b8', // 连线（约 70%）
  ink: '#f2f4f9', // 陈述大字
  cap: '#cecfd3', // 字幕正文（81%）
  capHi: '#ededef', // 字幕关键词（加粗提亮）
  dim: '#6b6c6f', // 配角、人群、幽灵字（42%）
  tag: '#78797c', // 左上章节签（47%）
  tagLine: '#4e4f52',
  box: '#393a3d', // 右上栏目框（22%）
  note: '#58585b', // 斜体年代注（35%）
  // 暖金：整片只用一次，给最后的「答案」
  gold: '#c9b897',
  goldLine: '#fae8cc',
  sun: '#fff1dd',
  sunGlow: '#412e17',
  sunFar: '#181101',
  // 白纸反转场
  paper: '#f1f1ec',
  paperEdge: '#c8c8c5',
  paperInk: '#0d0d0e',
  paperCrowd: '#91918e',
  paperLine: '#373734',
};

/** 字体：全片宋体；西文斜体注用细的 Garamond（配 fontStyle: 'italic'），比 Playfair 粗斜体更接近原片那行小字 */
export const KF = {
  cn: `'Songti SC', 'Noto Serif SC', 'Noto Serif CJK SC', 'STSong', serif`,
  latinItalic: `'Vox Garamond', 'Songti SC', serif`,
  latin: `'Vox Garamond', 'Songti SC', serif`,
};

/** 白色柔光（陈述大字、爆点字）：strength 0–1.5 */
export const glowWhite = (strength = 1): React.CSSProperties => ({
  color: K.ink,
  textShadow: `0 0 ${10 * strength}px rgba(235,240,255,${0.55 * strength}), 0 0 ${28 * strength}px rgba(200,210,235,${0.25 * strength}), 0 2px 10px rgba(0,0,0,0.9)`,
});

/** 暖金字（只给结尾的答案词） */
export const glowGold = (strength = 1): React.CSSProperties => ({
  color: K.gold,
  textShadow: `0 0 ${12 * strength}px rgba(250,226,180,${0.45 * strength}), 0 2px 10px rgba(0,0,0,0.9)`,
});

/** 柔入柔出：透明 + 模糊一起收；dur 入场帧数，out 起始帧，outDur 退场帧数，blur 最大模糊 */
export const haze = (f: number, at: number, dur = 14, out?: number, outDur = 10, blur = 8) => {
  const i = clamp01((f - at) / dur);
  const e = 1 - Math.pow(1 - i, 3);
  const o = out === undefined ? 1 : 1 - clamp01((f - out) / outDur);
  const v = e * o;
  return {v, opacity: v, filter: v >= 1 ? undefined : `blur(${((1 - v) * blur).toFixed(2)}px)`};
};

/** 节奏常量（实测中位数）：一句 81 帧（2.7 秒），淡出 6 帧、黑 3 帧、淡入 7 帧 */
export const RHYTHM = {line: 81, fadeOut: 6, gap: 3, fadeIn: 7, blur: 6};

/** 字幕的淡出—黑—淡入：at 这句开始淡入，out 这句开始淡出 */
export const capFade = (f: number, at: number, out?: number) => {
  const i = clamp01((f - at) / RHYTHM.fadeIn);
  const o = out === undefined ? 1 : 1 - clamp01((f - out) / RHYTHM.fadeOut);
  const v = Math.min(i, o);
  return {v, opacity: v, filter: i >= 1 ? undefined : `blur(${((1 - i) * RHYTHM.blur).toFixed(2)}px)`};
};

/**
 * 按实测节奏排一串字幕：从 start 帧开始，每句默认 81 帧；`hold` 给某句额外多停几帧。
 * 返回每句的 at（淡入起点）和 out（淡出起点），下一句在上一句淡出 + 黑场之后进来。
 */
export const paceLines = (texts: string[], start: number, opts: {line?: number; hold?: Record<number, number>} = {}) => {
  const line = opts.line ?? RHYTHM.line;
  const res: {text: string; at: number; out: number}[] = [];
  let t = start;
  texts.forEach((text, i) => {
    const len = line + (opts.hold?.[i] ?? 0);
    const out = t + len - RHYTHM.fadeOut - RHYTHM.gap;
    res.push({text, at: t, out});
    t += len;
  });
  return res;
};

/** 有动机的推拉：在 [a, b] 帧之间从 s0 缓入缓出到 s1（拉远让人群进画，或推近看细节） */
export const reframe = (f: number, a: number, b: number, s0 = 1, s1 = 0.72) => keyframes(f, [[a, s0], [b, s1]], easeInOut);

/** 冲击白闪：at 帧纯白 hold 帧，然后 fall 帧内退掉（1–2 帧纯白最像原片） */
export const flashAt = (f: number, at: number, hold = 2, fall = 6) => {
  const t = f - at;
  if (t < 0) return 0;
  if (t < hold) return 1;
  return 1 - clamp01((t - hold) / fall);
};
