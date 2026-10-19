import '../vox/theme';
import {clamp01} from '../anim';

/**
 * 金器剧场风：近黑舞台 + 顶光光柱，金属金杯、陶杯、展台在暗场里说话，人物只是剪影。
 * 语义色固定：金 = 欲望 / 奢侈 / 「更多」，陶土铜红 = 朴素 / 够用 / 「更少」，冷石灰 = 舞台和展台。
 */
export const V = {
  bg: '#040303', // 暗场近黑
  bgWarm: '#090705',
  ink: '#f5f2ee', // 字幕暖白
  inkBold: '#fef9f1', // 锚词
  inkDim: 'rgba(245,242,238,0.55)',
  inkFaint: 'rgba(245,242,238,0.3)',
  tagEn: '#9f9d97', // 主题签的西文小字
  goldText: '#f7e8c7', // 字幕里的金色重点词
  // 金器：暗边 → 中间 → 高光
  goldDark: '#5a3f14',
  goldEdge: '#845b1e',
  goldMid: '#be8f36',
  goldHi: '#fdde9e',
  goldLiquid: '#bc8c36',
  // 陶杯
  clayDark: '#5c2f1c',
  clay: '#a15f3d',
  clayHi: '#c98b68',
  // 展台 / 石
  stone: '#201e26',
  stoneTop: '#4c4c58',
  stoneLine: 'rgba(210,208,220,0.35)',
  horizon: 'rgba(160,158,170,0.35)',
  // 黄昏
  duskTop: '#2a1508',
  duskMid: '#b8743a',
  duskLow: '#f2c27e',
  earth: '#c58a52',
  earthDark: '#7a4a24',
  crack: 'rgba(40,20,8,0.75)',
  sun: '#f4efe4',
  // 夜海
  night: '#05070b',
  nightLow: '#0b1018',
  star: 'rgba(230,236,255,0.9)',
  // 剪影
  figure: '#0d0907',
  rim: '#f0a656', // 剪影背后的暖色轮廓光
};

/** 字体：中文全部宋体（字幕常规、重点加粗、锚词最粗），西文 Garamond 斜体（素材库已带） */
export const VF = {
  cn: `'Songti SC', 'Noto Serif SC', 'Noto Serif CJK SC', 'STSong', serif`,
  latin: `'Vox Garamond', 'Georgia', serif`,
};

const easeOut3 = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * 模糊柔入（可带淡出）：at 起 dur 帧从模糊透明收到清楚；out 起 outDur 帧模糊淡出。
 * 返回 v（0–1）和可直接塞进 style 的 opacity / filter。
 */
export const fadeBlur = (f: number, at: number, dur = 12, out?: number, outDur = 10, blurPx = 10) => {
  const i = easeOut3(clamp01((f - at) / dur));
  const o = out === undefined ? 1 : 1 - clamp01((f - out) / outDur);
  const v = i * o;
  return {v, opacity: v, filter: v >= 0.999 ? undefined : `blur(${((1 - v) * blurPx).toFixed(2)}px)`};
};

/** 逐字入场：第 k 个字的进度（0–1）。at 第一个字开始，gap 字间隔帧数，dur 每个字到位的帧数 */
export const charIn = (f: number, at: number, k: number, gap = 5, dur = 8) => easeOut3(clamp01((f - at - k * gap) / dur));

/** 两头淡入淡出的可见度：[a, b] 区间内可见，前 fin 帧淡入、最后 fout 帧淡出（场与场之间交叉淡化用） */
export const vis = (f: number, a: number, b: number, fin = 18, fout = 18) => clamp01((f - a) / fin) * (1 - clamp01((f - (b - fout)) / fout));

/** 线条画出进度（缓出），配 pathLength={1} + strokeDasharray 用 */
export const drawP = (f: number, at: number, dur = 18) => easeOut3(clamp01((f - at) / dur));

export type Mark = {t: string; bold?: boolean; gold?: boolean};

/**
 * 字幕重点标记：「**加粗**」变粗暖白，「〔金色〕」变粗金色，其余常规。
 * 例：'宁静是你最渴时，喝下的**那杯水**。'
 */
export const parseMarks = (s: string): Mark[] => {
  const out: Mark[] = [];
  let buf = '';
  let i = 0;
  const flush = () => {
    if (buf) out.push({t: buf});
    buf = '';
  };
  while (i < s.length) {
    if (s.startsWith('**', i)) {
      const e = s.indexOf('**', i + 2);
      if (e > i + 2) {
        flush();
        out.push({t: s.slice(i + 2, e), bold: true});
        i = e + 2;
        continue;
      }
    }
    if (s[i] === '〔') {
      const e = s.indexOf('〕', i + 1);
      if (e > i + 1) {
        flush();
        out.push({t: s.slice(i + 1, e), bold: true, gold: true});
        i = e + 1;
        continue;
      }
    }
    buf += s[i];
    i++;
  }
  flush();
  return out;
};
