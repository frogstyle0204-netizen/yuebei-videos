import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {BurstRays, Chalice, ClayCup, CrackedGround, CupRing, Figure, Pedestal} from '../vessel-stage/props';
import {AnchorWord, Bokeh, DarkStage, DuskSky, Dust, Grain, NightSea, SpotBeam, TopCaption, TopicTag, UnderlineWord} from '../vessel-stage/stage';
import {V, vis} from '../vessel-stage/theme';

/**
 * 金器剧场风素材一览（1920×1080，40 秒）：每 150 帧一场，场与场之间 18 帧交叉淡化。
 * 示例题目是自己编的（「旁边那只杯子」：为什么别人一多，你就觉得自己不够），只用来检查每个组件的样子和动效。
 */
const LEN = 150;
const XF = 18;
export const VESSEL_STAGE_DEMO_FRAMES = LEN * 8;

/** 第 i 场：前后各 XF 帧和相邻场交叠淡化；children 拿到场内帧号 t */
const Scene: React.FC<{f: number; i: number; children: (t: number) => React.ReactNode}> = ({f, i, children}) => {
  const t = f - i * LEN;
  if (t < -XF || t >= LEN + XF) return null;
  const v = i === 0 && t < LEN ? 1 : vis(t, -XF, LEN + XF, XF, XF);
  return <AbsoluteFill style={{opacity: v}}>{children(t)}</AbsoluteFill>;
};

const FLOOR = 660;

export const VesselStageDemo: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{background: V.bg}}>
      {/* 1 俯视杯口 + 逐字锚词（开场） */}
      <Scene f={f} i={0}>
        {(t) => (
          <>
            <DarkStage f={t} warmth={0.4} />
            <CupRing f={t} x={960} y={560} r={380} />
            <AnchorWord f={t} at={20} text="比较" y={600} size={150} gap={6} spacing={0.5} />
          </>
        )}
      </Scene>

      {/* 2 一只陶杯在展台上，一道冷灰顶光；顶部字幕 */}
      <Scene f={f} i={1}>
        {(t) => (
          <>
            <DarkStage f={t} floorY={FLOOR} />
            <SpotBeam x={960} floorY={FLOOR + 260} w={420} />
            <Pedestal x={960} y={620} label="自己 · 够用" />
            <ClayCup f={t} x={960} y={622} steam={0.8} />
            <Dust f={t} n={30} area={[700, 0, 1220, 900]} />
            <TopCaption f={t} at={8} lines={['你手里这只杯子，', '本来**刚刚好**。']} out={130} />
          </>
        )}
      </Scene>

      {/* 3 三个展台：顶光依次点亮，被点到的那台变金 */}
      <Scene f={f} i={2}>
        {(t) => (
          <>
            <DarkStage f={t} floorY={FLOOR} />
            <SpotBeam x={420} floorY={FLOOR + 260} on={Math.min(1, t / 20)} />
            <SpotBeam x={960} floorY={FLOOR + 260} tone={t > 50 ? 'gold' : 'gray'} on={Math.min(1, Math.max(0, (t - 30) / 20))} />
            <SpotBeam x={1500} floorY={FLOOR + 260} on={Math.min(1, Math.max(0, (t - 80) / 20))} />
            <Pedestal x={420} y={600} label="自己 · 够用" uid="p1" />
            <Pedestal x={960} y={600} label="邻居 · 更多" lit={t > 50 ? Math.min(1, (t - 50) / 16) : 0} uid="p2" />
            <Pedestal x={1500} y={600} label="想象 · 无限" uid="p3" />
            <ClayCup f={t} x={400} y={602} s={0.85} uid="c1" />
            <Chalice f={t} x={960} y={606} s={0.92} fill={0.8} uid="g1" opacity={Math.min(1, Math.max(0, (t - 40) / 14))} />
            <Chalice f={t} x={1500} y={606} s={0.92} fill={0} tone="dark" uid="g2" opacity={Math.min(1, Math.max(0, (t - 90) / 14))} />
            <TopCaption f={t} at={6} lines={['可一旦有了旁边那只，', '〔邻居的杯子〕，总是更满一点。']} out={134} />
          </>
        )}
      </Scene>

      {/* 4 招牌：金杯一边被注满一边变大，锚词逐字压在杯身上 */}
      <Scene f={f} i={3}>
        {(t) => (
          <>
            <DarkStage f={t} warmth={0.8} />
            <Bokeh f={t} seed={2} opacity={0.7} />
            <Chalice f={t} x={960} y={1010} s={1.25 + 0.55 * Math.min(1, t / 110)} fill={0.35 + 0.25 * Math.sin(t / 30)} pour={1} uid="big" />
            <ClayCup f={t} x={1560} y={1000} s={0.55 - 0.15 * Math.min(1, t / 110)} crack={t > 90} uid="small" />
            <TopCaption f={t} at={4} lines={['于是，它永远**不够**。']} />
            <AnchorWord f={t} at={70} text="不够" y={600} size={190} gap={6} spacing={0.3} />
          </>
        )}
      </Scene>

      {/* 5 黄昏龟裂大地，剪影跪地捧水 */}
      <Scene f={f} i={4}>
        {(t) => (
          <>
            <DuskSky f={t} />
            <CrackedGround f={t} seed={3} />
            <Figure x={700} y={950} s={1} pose="kneel" rim={-1} />
            <ClayCup f={t} x={880} y={950} s={0.35} uid="k" />
            <TopCaption f={t} at={8} lines={['可真渴的时候，', '你只想要〔一口水〕。']} out={132} />
          </>
        )}
      </Scene>

      {/* 6 下划线词：词淡出，线留下来变成下一场的地平线 */}
      <Scene f={f} i={5}>
        {(t) => (
          <>
            <DarkStage f={t} warmth={0.2} />
            <Figure x={960} y={FLOOR + 30} s={0.5} pose="stand" rim={0} opacity={0.18} />
            <UnderlineWord f={t} at={10} text="看自己" y={540} size={110} lineW={340} wordOut={90} />
            <TopCaption f={t} at={110} lines={['少看一眼旁边，', '杯子就**又满了**。']} />
          </>
        )}
      </Scene>

      {/* 7 爆点：放射光 + 彩屑，剪影举手 */}
      <Scene f={f} i={6}>
        {(t) => (
          <>
            <DarkStage f={t} />
            <BurstRays f={t} at={12} x={960} y={560} />
            <Figure x={960} y={1080} s={1.1} pose="cheer" rim={1} />
            <TopCaption f={t} at={60} lines={['赢了一次比较，', '开心也只撑到**下一次**。']} />
          </>
        )}
      </Scene>

      {/* 8 夜海结尾：剪影站在地平线上，结尾提问；俯视杯口回来，首尾闭环 */}
      <Scene f={f} i={7}>
        {(t) => (
          <>
            <NightSea f={t} />
            <Figure x={960} y={720} s={0.38} pose="stand" rim={0} opacity={Math.max(0, 1 - t / 70)} />
            <CupRing f={t} x={960} y={640} r={230} opacity={Math.min(1, Math.max(0, (t - 60) / 24))} uid="end" />
            <TopCaption f={t} at={10} lines={['你在看的，', '是**自己的杯子**，还是**旁边那只**？']} y={170} size={58} />
          </>
        )}
      </Scene>

      <TopicTag f={f} cn="比较之心" en="On Comparison" at={6} />
      <Grain />
    </AbsoluteFill>
  );
};
