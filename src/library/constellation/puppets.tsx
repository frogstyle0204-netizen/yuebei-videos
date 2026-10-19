import React from 'react';
import {AbsoluteFill} from 'remotion';
import {clamp01, easeIn, rand} from '../anim';

/**
 * 冷开用的灰阶「提线舞台」：和正片的星图夜空是两套画法——这里是有体积感的灰阶人偶、丝线幕和顶光，
 * 用在开头 3–5 秒的问句蒙太奇和片尾循环回来的那一帧。人偶是原创的关节木偶造型。
 */

export type PuppetPose = 'stand' | 'slump' | 'walk' | 'up';

type Seg = [number, number, number, number];

/** 关节角（度，0 = 竖直向下，正 = 向前 / 朝右）：躯干前倾、低头、左右肩肘、左右髋膝 */
const poseAngles = (pose: PuppetPose, t: number) => {
  const w = Math.sin(t / 7);
  switch (pose) {
    case 'slump':
      return {lean: 14, head: 48, sh: [8, 14], el: [6, 10], hip: [-2, 4], kn: [-4, -2]};
    case 'walk':
      return {lean: 6, head: 8, sh: [-28 * w, 28 * w], el: [-20 - 10 * w, -20 + 10 * w], hip: [24 * w, -24 * w], kn: [Math.max(0, -30 * w) * -1, Math.max(0, 30 * w) * -1]};
    case 'up':
      return {lean: -6, head: -34, sh: [-4, 150], el: [-6, 10], hip: [0, 2], kn: [0, -2]};
    default:
      return {lean: 2, head: 6, sh: [-4, 6], el: [-4, 4], hip: [-3, 3], kn: [0, -1]};
  }
};

const dir = (a: number): [number, number] => [Math.sin((a * Math.PI) / 180), Math.cos((a * Math.PI) / 180)];

/** 两节肢体：从 (x, y) 出发，a1/l1 第一节，a2（相对第一节）/l2 第二节 */
const limb = (x: number, y: number, a1: number, l1: number, a2: number, l2: number): [Seg, Seg] => {
  const [dx1, dy1] = dir(a1);
  const x1 = x + dx1 * l1;
  const y1 = y + dy1 * l1;
  const [dx2, dy2] = dir(a1 + a2);
  return [
    [x, y, x1, y1],
    [x1, y1, x1 + dx2 * l2, y1 + dy2 * l2],
  ];
};

/** 一节有体积的木偶肢体：深色描边 + 浅灰本体 + 偏左的高光（光从左上来） */
const Part: React.FC<{s: Seg; w: number; far?: boolean}> = ({s, w, far}) => (
  <g strokeLinecap="round">
    <line x1={s[0]} y1={s[1]} x2={s[2]} y2={s[3]} stroke="#262627" strokeWidth={w + 5} />
    <line x1={s[0]} y1={s[1]} x2={s[2]} y2={s[3]} stroke={far ? '#8c8c8b' : '#c8c8c6'} strokeWidth={w} />
    <line x1={s[0] - w * 0.18} y1={s[1]} x2={s[2] - w * 0.18} y2={s[3]} stroke={far ? '#a9a9a7' : '#f1f1ef'} strokeWidth={w * 0.32} opacity={0.9} />
  </g>
);

const Joint: React.FC<{x: number; y: number; r: number; far?: boolean}> = ({x, y, r, far}) => <circle cx={x} cy={y} r={r} fill={far ? '#7d7d7c' : '#b9b9b7'} stroke="#262627" strokeWidth={2.5} />;

/**
 * 关节木偶：x 脚底中点、y 地面，h 身高（默认 340），pose 站 / 低头 / 走 / 抬头，t 驱动走路和呼吸；
 * strings 画出从手和头顶伸向画面顶端的提线；drop 0–1 让木偶断线瘫下去并淡出。
 */
export const Mannequin: React.FC<{x: number; y: number; h?: number; pose?: PuppetPose; t?: number; strings?: boolean; drop?: number; face?: 1 | -1; blur?: number; dim?: number}> = ({x, y, h = 340, pose = 'stand', t = 0, strings = true, drop = 0, face = 1, blur = 0, dim = 1}) => {
  const s = h / 340;
  const A = poseAngles(pose, t);
  const sink = easeIn(clamp01(drop)) * 120;
  const fold = clamp01(drop) * 60;
  const hipY = -160 + sink;
  const [lx, ly] = dir(180 - A.lean - fold * 0.5);
  const neck: [number, number] = [lx * 108, hipY + ly * 108];
  const [hx, hy] = dir(180 - A.lean - A.head - fold);
  const head: [number, number] = [neck[0] + hx * 34, neck[1] + hy * 34];
  const shoulder: [number, number] = [neck[0] * 0.92, neck[1] + 10];
  const legs = [0, 1].map((k) => limb(0, hipY, A.hip[k] + (k ? fold : -fold) * 0.4, 82, A.kn[k] - fold, 80));
  const arms = [0, 1].map((k) => limb(shoulder[0], shoulder[1], A.sh[k] + fold * 0.3, 62, A.el[k] - fold * 0.2, 58));
  const op = dim * (1 - clamp01((drop - 0.6) / 0.4));
  const breathe = Math.sin(t / 26) * 1.2;
  const topY = -(y + 40) / s;
  return (
    <svg width={1920} height={1080} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', opacity: op, filter: blur ? `blur(${blur}px)` : undefined}}>
      <g transform={`translate(${x} ${y}) scale(${s * face} ${s})`}>
        {strings && drop < 0.2 ? (
          <g stroke="#d6d6d4" strokeWidth={1.2 / s} opacity={0.55}>
            <line x1={head[0]} y1={head[1] - 26} x2={head[0]} y2={topY} />
            {arms.map((a, k) => (
              <line key={k} x1={a[1][2]} y1={a[1][3]} x2={a[1][2] + (k ? 6 : -6)} y2={topY} />
            ))}
          </g>
        ) : null}
        {/* 远侧肢体先画、颜色更暗 */}
        <Part s={legs[0][0]} w={22} far />
        <Part s={legs[0][1]} w={18} far />
        <Joint x={legs[0][0][2]} y={legs[0][0][3]} r={9} far />
        <Part s={arms[0][0]} w={16} far />
        <Part s={arms[0][1]} w={14} far />
        <Joint x={arms[0][0][2]} y={arms[0][0][3]} r={7} far />
        {/* 躯干：胸腔胶囊 + 盆骨 */}
        <Part s={[0, hipY - 18, neck[0] * 0.85, neck[1] + 18 + breathe]} w={46} />
        <ellipse cx={0} cy={hipY} rx={24} ry={17} fill="#bdbdbb" stroke="#262627" strokeWidth={2.5} />
        <Part s={[neck[0] * 0.9, neck[1] + 6, neck[0], neck[1] - 4]} w={10} />
        <ellipse cx={head[0]} cy={head[1]} rx={21} ry={27} transform={`rotate(${A.lean + A.head * 0.6 + fold} ${head[0]} ${head[1]})`} fill="#d4d4d2" stroke="#262627" strokeWidth={3} />
        <ellipse cx={head[0] - 6} cy={head[1] - 8} rx={7} ry={11} fill="#f4f4f2" opacity={0.7} transform={`rotate(${A.lean + A.head * 0.6 + fold} ${head[0]} ${head[1]})`} />
        {/* 近侧肢体 */}
        <Part s={legs[1][0]} w={22} />
        <Part s={legs[1][1]} w={18} />
        <Joint x={legs[1][0][2]} y={legs[1][0][3]} r={9} />
        <Part s={arms[1][0]} w={16} />
        <Part s={arms[1][1]} w={14} />
        <Joint x={arms[1][0][2]} y={arms[1][0][3]} r={7} />
        {[legs[0][1], legs[1][1]].map((l, k) => (
          <ellipse key={k} cx={l[2] + 8} cy={l[3]} rx={15} ry={6} fill={k ? '#bdbdbb' : '#858584'} stroke="#262627" strokeWidth={2} />
        ))}
      </g>
    </svg>
  );
};

/**
 * 提线舞台：深灰渐变底、垂下来的丝线幕、顶上一束聚光、地面一圈光斑、四角压暗；children 放木偶。
 * fall 0–1 时丝线整片往下坠落并淡出（断线的瞬间），可接星尘溶解进夜空。
 */
export const PuppetStage: React.FC<{f: number; fall?: number; spot?: number; children?: React.ReactNode}> = ({f, fall = 0, spot = 1, children}) => {
  const k = easeIn(clamp01(fall));
  return (
    <AbsoluteFill style={{background: 'linear-gradient(180deg, #1b1b1d 0%, #141415 55%, #0d0d0e 100%)'}}>
      <svg width={1920} height={1080} style={{position: 'absolute'}}>
        {Array.from({length: 150}, (_, i) => {
          const x = rand(i * 3.3) * 1920;
          const len = 500 + rand(i * 7.1) * 600;
          const y0 = -20 + k * 900 * (0.6 + rand(i) * 0.8);
          const o = (0.06 + 0.22 * rand(i * 1.9)) * (1 - k) * (0.85 + 0.15 * Math.sin(f / 20 + i));
          return <line key={i} x1={x} y1={y0} x2={x + (rand(i * 5) - 0.5) * 6} y2={y0 + len} stroke="#cfcfcd" strokeWidth={rand(i * 9) > 0.85 ? 1.4 : 0.7} opacity={o} />;
        })}
      </svg>
      <AbsoluteFill style={{opacity: spot, background: 'radial-gradient(ellipse 34% 60% at 50% 0%, rgba(255,255,255,0.13) 0%, rgba(255,255,255,0.05) 55%, rgba(0,0,0,0) 100%)'}} />
      <AbsoluteFill style={{opacity: spot, background: 'radial-gradient(ellipse 36% 11% at 50% 83%, rgba(230,230,228,0.32) 0%, rgba(200,200,198,0.12) 55%, rgba(0,0,0,0) 100%)'}} />
      {children}
      <AbsoluteFill style={{background: 'radial-gradient(ellipse 75% 75% at 50% 45%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.7) 100%)'}} />
    </AbsoluteFill>
  );
};
