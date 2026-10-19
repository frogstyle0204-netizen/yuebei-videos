import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {clamp01} from '../anim';
import {bezier} from '../constellation/geom';
import {Crowd, Figure, Horizon, Kite, OpenBook, OrbitMap, PaperPlane, Planet, Steps, StarWheel, Sunrise, WordTrail} from '../constellation/props';
import {Mannequin, PuppetStage, type PuppetPose} from '../constellation/puppets';
import {ChapterTag, DotWord, FlashFrame, GhostWord, HookLine, Impact, ImpactWord, inverted, KCaptions, NightSky, PaperSky, Reframe, SeriesBox, Stardust, Statement} from '../constellation/stage';
import {K, KF, paceLines, reframe} from '../constellation/theme';

/**
 * 3：虚无主义素材一览（1920×1080，50 秒）：每 150 帧一场，场与场之间用这套风格自己的转场
 * （星尘溶解、冲击白闪、白纸反转、模糊交叉淡化），最后硬切回第一场的画面演示首尾循环。
 * 示例题目「为什么我们只能看到月亮的一面」，文案只用来检查组件的样子和动效。
 */
const LEN = 150;
export const CONSTELLATION_DEMO_FRAMES = LEN * 10;

const Scene: React.FC<{f: number; i: number; fadeIn?: number; fadeOut?: number; children: (t: number) => React.ReactNode}> = ({f, i, fadeIn = 10, fadeOut = 10, children}) => {
  const at = i * LEN;
  const t = f - at;
  if (t < -fadeIn || t >= LEN + fadeOut) return null;
  const vin = fadeIn ? clamp01((t + fadeIn) / (fadeIn * 2)) : t >= 0 ? 1 : 0;
  const vout = fadeOut ? 1 - clamp01((t - LEN + fadeOut) / (fadeOut * 2)) : t < LEN ? 1 : 0;
  const v = Math.min(vin, vout);
  return <AbsoluteFill style={{opacity: v, filter: v < 1 ? `blur(${(1 - v) * 8}px)` : undefined}}>{children(t)}</AbsoluteFill>;
};

const HOOK = [
  {text: '月亮为什么总是同一张脸？', at: 6},
  {text: '它从来不转身吗？', at: 28},
  {text: '背面藏着什么？', at: 50},
  {text: '我们看见的，是全部吗？', at: 72},
  {text: '如果永远看不见呢？', at: 94},
];
const HOOK_POSE: PuppetPose[] = ['stand', 'up', 'walk', 'slump', 'slump'];

/** 冷开的人偶阵：三排，前排大、后排小且虚 */
const Puppets: React.FC<{t: number; pose: PuppetPose; drop?: number}> = ({t, pose, drop = 0}) => (
  <>
    {[0, 1, 2, 3, 4, 5, 6].map((k) => (
      <Mannequin key={`b${k}`} x={330 + k * 210} y={690} h={170} pose={pose} t={t + k * 9} blur={1.6} dim={0.55} drop={drop} />
    ))}
    {[0, 1, 2, 3, 4].map((k) => (
      <Mannequin key={`m${k}`} x={360 + k * 300} y={790} h={250} pose={pose} t={t + k * 5} dim={0.8} drop={drop} />
    ))}
    {[0, 1, 2].map((k) => (
      <Mannequin key={`f${k}`} x={520 + k * 440} y={930} h={360} pose={pose} t={t + k * 3} drop={drop} />
    ))}
    <Mannequin x={110} y={1080} h={560} pose="slump" t={t} blur={9} dim={0.45} strings={false} />
  </>
);

export const ConstellationDemo: React.FC = () => {
  const f = useCurrentFrame();
  const paper = inverted(f, LEN * 4 + 8, LEN * 4 + 100);
  const tagOn = f >= LEN * 2 - 10 && f < LEN * 9;
  return (
    <AbsoluteFill style={{background: K.bg, fontFamily: KF.cn}}>
      <NightSky f={f} />
      <PaperSky opacity={paper} />

      {/* 1 冷开：提线舞台 + 问句蒙太奇（每 22 帧一句、4 帧快溶），断线后碎成星尘 */}
      <Scene f={f} i={0} fadeIn={0}>
        {(t) => {
          const k = HOOK.filter((h) => t >= h.at).length - 1;
          const drop = clamp01((t - 116) / 18);
          return (
            <>
              <AbsoluteFill style={{opacity: 1 - clamp01((t - 128) / 14)}}>
                <PuppetStage f={t} fall={clamp01((t - 112) / 20)}>
                  <Puppets t={t} pose={HOOK_POSE[Math.max(0, k)]} drop={drop} />
                </PuppetStage>
              </AbsoluteFill>
              <HookLine f={t} lines={HOOK} out={124} />
              <Stardust f={t} at={124} dur={30} rect={[300, 420, 1320, 520]} />
            </>
          );
        }}
      </Scene>

      {/* 2 星点大标题：星尘聚拢成字，结尾碎开 */}
      <Scene f={f} i={1}>
        {(t) => (
          <>
            <DotWord text="月之背面" cy={400} gather={clamp01((t - 4) / 70)} shatter={clamp01((t - 126) / 24)} f={t} />
            <KCaptions f={t} lines={paceLines(['这一期，我们追一个【看不见】的地方。'], 72, {line: 72})} />
          </>
        )}
      </Scene>

      {/* 3 轨道图 + 星点月球：同一面永远朝着地球（小旗一直指向中心） */}
      <Scene f={f} i={2}>
        {(t) => {
          const ang = -40 + t * 1.1;
          const a = (ang * Math.PI) / 180;
          const c = Math.cos((-12 * Math.PI) / 180);
          const s = Math.sin((-12 * Math.PI) / 180);
          const mx = 960 + Math.cos(a) * 520 * c - Math.sin(a) * 200 * s;
          const my = 470 + Math.cos(a) * 520 * s + Math.sin(a) * 200 * c;
          const face = (Math.atan2(470 - my, 960 - mx) * 180) / Math.PI;
          return (
            <>
              <Stardust f={t} at={-6} dur={26} mode="in" rect={[420, 260, 1080, 420]} />
              <OrbitMap cx={960} cy={470} f={t} p={clamp01(t / 50)} orbits={[{rx: 520, ry: 200, period: 9999, label: 'Orbita Lunae'}, {rx: 760, ry: 300, period: 900, label: 'Exemplum'}]} core={clamp01(t / 20)} />
              <Planet cx={mx} cy={my} r={54} rot={face} mark={0} gather={clamp01((t - 20) / 40)} f={t} />
              <KCaptions f={t} lines={paceLines(['它绕地球走一圈，', '自己也正好【转一圈】。'], 20, {line: 66})} />
            </>
          );
        }}
      </Scene>

      {/* 4 几何星轮：散点聚拢 → 外圈和辐条扫出 → 花瓣补齐 → 中心点亮 → 光柱；右边一个小小的观看者 */}
      <Scene f={f} i={3}>
        {(t) => (
          <>
            <StarWheel cx={740} cy={440} R={280} gather={clamp01((t - 8) / 34)} draw={clamp01((t - 30) / 28)} detail={clamp01((t - 50) / 22)} core={clamp01((t - 64) / 16)} beams={clamp01((t - 84) / 20) * 0.6} f={t} spin={t * 0.03} />
            <Horizon y={780} p={clamp01((t - 50) / 30)} from="center" x0={1180} x1={1640} />
            <Figure x={1400} y={780} h={110} pose="sit" face={-1} gather={clamp01((t - 40) / 24)} f={t} />
            <KCaptions f={t} lines={paceLines(['古人以为，天空是一只【转动的轮】。'], 30, {line: 110})} />
          </>
        )}
      </Scene>

      {/* 5 白纸反转：6 帧淡白（快），黑色实心的月亮和指着它的人，100 帧起 45 帧慢慢溶回夜色 */}
      <Scene f={f} i={4} fadeOut={0}>
        {(t) => {
          const p = inverted(t, 8, 100);
          return (
            <>
              <AbsoluteFill style={{opacity: p}}>
                <Horizon y={780} paper x0={160} x1={1760} />
                <div style={{position: 'absolute', left: 1340 - 170, top: 520 - 170, width: 340, height: 340, borderRadius: '50%', background: K.paperInk, transform: `translateY(${-t * 0.3}px)`}} />
                <Figure x={560} y={780} h={190} pose="point" paper />
                <Statement f={t} at={20} text="你只见过它的一面" align="left" x={200} y={250} size={86} paper out={96} />
                <KCaptions f={t} lines={paceLines(['我们一直以为，看见的就是全部。'], 30, {line: 72})} paper={() => true} />
              </AbsoluteFill>
              <AbsoluteFill style={{opacity: 1 - p}}>
                <StarWheel cx={740} cy={440} R={280} core={0.6} shatter={clamp01((t - 104) / 40) * 0.25} f={t} />
              </AbsoluteFill>
            </>
          );
        }}
      </Scene>

      {/* 6 主角 + 幽灵字 + 有动机的拉远：配角人群随拉远进画 */}
      <Scene f={f} i={5} fadeIn={0}>
        {(t) => {
          const s = reframe(t, 40, 120, 1.35, 0.95);
          return (
            <>
              <Reframe s={s} ox={960} oy={620}>
                <GhostWord f={t} at={10} text="远方" x={420} y={250} />
                <Figure x={960} y={760} h={190} pose="point" gather={clamp01(t / 26)} f={t} />
                <Crowd x0={260} x1={1660} y={760} n={12} h={130} gap={[800, 1120]} gather={clamp01((t - 60) / 40)} f={t} />
                <Horizon y={760} p={clamp01((t - 30) / 40)} from="center" x0={200} x1={1720} />
              </Reframe>
              <KCaptions f={t} lines={paceLines(['其实我们只是，一直站在【同一个位置】。'], 24, {line: 110})} />
            </>
          );
        }}
      </Scene>

      {/* 7 词语长链 + 爆点字 + 冲击白闪：长链被震碎成星尘 */}
      <Scene f={f} i={6}>
        {(t) => {
          const path = [...bezier([360, 900], [520, 520], [980, 860], [1160, 520], 40), ...bezier([1160, 520], [1300, 260], [1560, 300], [1700, 120], 40).slice(1)];
          const sh = clamp01((t - 96) / 40);
          return (
            <>
              <WordTrail path={path} word="看不见" p={clamp01((t - 4) / 70)} size={40} shatter={sh} f={t} />
              <Figure x={300} y={900} h={110} f={t} shatter={0} />
              <ImpactWord f={t} at={80} text="转身" y={240} size={170} out={136} />
              <Impact f={t} at={96} x={1160} y={520} />
              <KCaptions f={t} lines={paceLines(['直到有人说：', '那就绕到背后去看。'], 14, {line: 74})} />
            </>
          );
        }}
      </Scene>

      {/* 8 小道具：书、风筝、纸飞机、台阶、坐着的小人 + 陈述大字 */}
      <Scene f={f} i={7}>
        {(t) => (
          <>
            <OpenBook x={480} y={760} w={280} gather={clamp01(t / 30)} draw={clamp01((t - 10) / 40)} f={t} />
            <Kite x={330} y={250} s={0.85} f={t} gather={clamp01((t - 10) / 30)} />
            <PaperPlane x={1520} y={250} s={1} gather={clamp01((t - 20) / 30)} />
            <Steps x={1180} y={760} n={3} w={120} h={60} draw={clamp01((t - 20) / 40)} />
            <Figure x={900} y={760} h={110} pose="sit" gather={clamp01((t - 6) / 26)} f={t} />
            <Horizon y={760} p={clamp01(t / 40)} from="left" x0={260} x1={1660} />
            <Statement f={t} at={60} text="看不见，不等于不存在。" y={460} />
            <KCaptions f={t} lines={paceLines(['后来，我们终于看到了它的另一面。'], 20, {line: 110})} />
          </>
        )}
      </Scene>

      {/* 9 地平线从右画出 → 唯一一次暖金日出，最后一个关键词变金 */}
      <Scene f={f} i={8}>
        {(t) => (
          <>
            <Sunrise cx={860} y={666} p={clamp01((t - 46) / 90)} f={t} />
            <Horizon y={666} p={clamp01(t / 40)} from="right" gold={t > 60} />
            {[500, 630, 1120, 1270].map((x, k) => (
              <Figure key={k} x={x} y={666} h={k === 3 ? 120 : 92} dim={k !== 3} gather={clamp01((t - 20 - k * 6) / 24)} f={t} pose={k === 1 ? 'walk' : 'stand'} />
            ))}
            <KCaptions f={t} lines={paceLines(['你看见的那一面，', '已经足够〔明亮〕。'], 16, {line: 66})} />
          </>
        )}
      </Scene>

      {/* 10 片尾：星尘聚成月亮 + 逐字爆点字，最后 8 帧硬切回冷开画面（首尾循环） */}
      <Scene f={f} i={9} fadeOut={0}>
        {(t) =>
          t < 142 ? (
            <>
              <Stardust f={t} at={-4} dur={30} mode="in" rect={[760, 420, 400, 300]} />
              <Planet cx={960} cy={600} r={150} rot={t * 0.4} gather={clamp01(t / 40)} f={t} />
              <ImpactWord f={t} at={46} text="抬头看看" y={250} size={140} per={6} />
            </>
          ) : (
            <PuppetStage f={0}>
              <Puppets t={0} pose="stand" />
            </PuppetStage>
          )
        }
      </Scene>

      {tagOn ? <ChapterTag f={f} at={LEN * 2 - 10} text="月之背面" out={LEN * 9 - 16} /> : null}
      {f >= LEN * 2 - 10 && f < LEN * 9 ? (
        <SeriesBox
          f={f}
          at={LEN * 2 - 10}
          label="示例栏目"
          paper={paper > 0.5}
          note={f < LEN * 3 ? 'Exemplum · 示意图' : f >= LEN * 4 && f < LEN * 5 ? 'Liber Exempli · 示例' : undefined}
          noteAt={f < LEN * 3 ? LEN * 2 : LEN * 4 + 10}
        />
      ) : null}
      {/* 冲击闪帧要盖住所有层（包括角标），放最后 */}
      <FlashFrame f={f} at={LEN * 6 + 96} x={1160} y={520} />
    </AbsoluteFill>
  );
};
