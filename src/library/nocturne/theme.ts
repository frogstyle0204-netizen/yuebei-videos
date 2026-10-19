import '../vox/theme';
import {clamp01} from '../anim';

/**
 * 3：悲观主义：深夜房间、一盏吊灯、心口发光的剪影人。大面积近黑，冷（月光、独处）和暖（灯、热闹、回忆）两套光，
 * 一个画面通常只让一种光占主导。所有数值来自参考片实测（1920×1080，30fps）。
 */
export const N = {
  void: '#07080d', // 暗场底色
  voidEdge: '#020306', // 四角
  wall: '#0d151e', // 冷房间墙
  wallLit: '#1a2330', // 灯照到的墙
  sofa: '#1b232c', // 家具主体
  sofaHi: '#2a3440', // 家具受光面
  floor: '#06070c',
  sky: '#282f46', // 窗外夜空
  skyDeep: '#141a2c',
  moon: '#dce4ed',
  bulb: '#fdf4e3', // 灯泡
  shade: '#1a212b', // 灯罩
  white: '#f2f5f6', // 字幕、章节名
  coolWhite: '#e8eff8', // 冷色大字、光门
  amberLit: '#ffd8a1', // 被照亮的暖字
  amberHi: '#e5be89', // 字幕重点词
  amber: '#b88a54',
  amberDim: '#7f5d37', // 没照到的暖字
  amberDeep: '#4d3a24',
  warmGlow: '#715636', // 暖光晕
  warmSil: '#21150b', // 暖光里的剪影
  coolSil: '#1a1c25', // 冷剪影
  label: '#767b84', // 西文小字
  labelLight: '#959aa2', // 人物名
  frameLine: '#61646b', // 细线框
  photo: '#8e5f2e', // 回忆照片的暖褐
  photoEdge: '#e9dcc0', // 照片白边
  gold: '#8a6c3c', // 画框
};

/** 字体：中文全部宋体（大字 Black、字幕 SemiBold），西文用 Garamond 斜体小字 */
export const NF = {
  cn: `'Noto Serif SC', 'Noto Serif CJK SC', 'Source Han Serif SC', 'Songti SC', 'STSong', serif`,
  latin: `'Vox Garamond', 'Noto Serif CJK SC', serif`,
};

/** 字号层级（1920 宽） */
export const NS = {
  title: 180,
  lead: 44,
  keyword: 180,
  subtitle: 44,
  chapter: 34,
  latin: 20,
};

const easeOut3 = (t: number) => 1 - Math.pow(1 - t, 3);
const easeInOut3 = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** 模糊收拢：at 帧起 dur 帧内透明度 0→1、模糊 blur→0（大关键词 10 帧、14px）；out 起 outDur 帧反向退场 */
export const blurIn = (f: number, at: number, dur = 10, out?: number, outDur = 10, blur = 14) => {
  const i = easeOut3(clamp01((f - at) / dur));
  const o = out === undefined ? 1 : 1 - easeInOut3(clamp01((f - out) / outDur));
  const v = i * o;
  return {v, opacity: v, filter: v >= 0.999 ? undefined : `blur(${((1 - v) * blur).toFixed(2)}px)`};
};

/** 逐字出现：第 k 个字在 at + k·gap 帧开始，每字 dur 帧模糊收拢（实测 gap 4、dur 8） */
export const charIn = (f: number, at: number, k: number, gap = 4, dur = 8) => {
  const t = clamp01((f - at - k * gap) / dur);
  const e = easeOut3(t);
  return {v: e, opacity: e, blur: (1 - e) * 14, scale: 1.12 - 0.12 * e};
};

/**
 * 字幕换句：上一句 8 帧淡出，下一句等它走完再 6 帧淡入（两句不叠）。
 * 返回第 k 句在 f 帧的透明度；starts 是每句开始帧，最后一句到 end 帧淡出。
 */
export const fadeSwap = (f: number, starts: number[], k: number, end?: number) => {
  const OUT = 8;
  const IN = 6;
  const s = starts[k];
  const next = k + 1 < starts.length ? starts[k + 1] : end;
  const inV = clamp01((f - s) / IN);
  const outV = next === undefined ? 1 : 1 - clamp01((f - (next - OUT)) / OUT);
  return Math.min(inV, outV);
};

/** 按字数估一句字幕停留多少帧：参考片中位数约 2.5 秒一句，读得慢；最短 2 秒、最长 4 秒 */
export const readFrames = (text: string, fps = 30) => {
  const n = text.replace(/[【】，。、？！：；,.!?\s]/g, '').length;
  return Math.round(Math.min(4 * fps, Math.max(2 * fps, 1.2 * fps + n * 0.11 * fps)));
};

/** 把一组字幕按 readFrames 排成开始帧（from 帧开始） */
export const lineStarts = (lines: string[], from = 0, fps = 30) => {
  const out: number[] = [];
  let t = from;
  for (const l of lines) {
    out.push(t);
    t += readFrames(l, fps);
  }
  return out;
};

/** 钟摆角度（度）：一个来回 period 帧（实测约 72 帧，接近一小节），摆幅 amp，at 帧起 rampIn 帧内摆幅从 0 拉满 */
export const swing = (f: number, at = 0, period = 72, amp = 28, rampIn = 24) => {
  const t = f - at;
  if (t <= 0) return 0;
  return amp * clamp01(t / rampIn) * Math.sin((2 * Math.PI * t) / period);
};

/** 暗场叠化的亮度：场在 at 帧亮起、out 帧开始变暗，各 len 帧（实测约 20 帧），返回 0–1 */
export const dip = (f: number, at: number, out: number, len = 20) => {
  const a = easeInOut3(clamp01((f - at) / len));
  const b = 1 - easeInOut3(clamp01((f - out) / len));
  return Math.min(a, b);
};

/** 闪白强度：at 帧 3 帧冲到全白，hold 帧后用 fade 帧退去（推进光门时用） */
export const flash = (f: number, at: number, hold = 4, fade = 22) => {
  if (f < at) return 0;
  if (f < at + 3) return (f - at) / 3;
  if (f < at + 3 + hold) return 1;
  return 1 - easeOut3(clamp01((f - at - 3 - hold) / fade));
};

/** 飞到角落：标题从 from 位置 / 字号缩到 to，at 帧起 dur 帧（实测约 15 帧，两头慢） */
export const flyTo = (f: number, at: number, from: {x: number; y: number; size: number}, to: {x: number; y: number; size: number}, dur = 15) => {
  const p = easeInOut3(clamp01((f - at) / dur));
  return {p, x: from.x + (to.x - from.x) * p, y: from.y + (to.y - from.y) * p, size: from.size + (to.size - from.size) * p};
};

/** 慢推：收尾镜头 len 帧内放大 amount（参考片收尾约 6%） */
export const pushIn = (f: number, at: number, len: number, amount = 0.06) => 1 + amount * easeInOut3(clamp01((f - at) / Math.max(1, len)));
