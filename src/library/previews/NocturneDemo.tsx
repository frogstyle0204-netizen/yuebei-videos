import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {clamp01} from '../anim';
import {Chatter, Crowd, Figure, LightDoor, LinkArcs, lampSpot, MoonPainting, PendantLamp, SeatedFigure, StudyRoom, WallClock} from '../nocturne/props';
import {ChapterMark, Desat, Dip, LitWord, MemoryPhoto, Motes, NightBg, NSubtitle, PersonNote, SeriesTag, Shards, SplitDuo, TitleCard, WhiteFlash} from '../nocturne/stage';
import {lineStarts, N, NF, pushIn, swing} from '../nocturne/theme';

/**
 * 夜灯哲思风素材一览（1920×1080，45 秒）：每 150 帧一场，场与场之间暗场叠化；第 2～4 场用同一盏吊灯贯穿。
 * 题目「习惯」和全部文案都是示例，用来检查每个组件的样子和动效；人物、栏目名都是占位。
 */
const LEN = 150;
export const NOCTURNE_DEMO_FRAMES = LEN * 9;

/** 一场：at 帧亮起、out 帧开始暗下去（默认场尾前 20 帧），children 拿到场内帧号 */
const Scene: React.FC<{f: number; i: number; inAt?: number; outAt?: number; children: (t: number) => React.ReactNode}> = ({f, i, inAt, outAt, children}) => {
  const at = inAt ?? i * LEN;
  const out = outAt ?? (i + 1) * LEN - 20;
  if (f < at - 1 || f > out + 21) return null;
  return (
    <Dip f={f} at={at} out={out}>
      {children(f - i * LEN)}
    </Dip>
  );
};

/** 一场的字幕：from 场内第几帧开始，按字数排，end 场内淡出帧 */
const Lines: React.FC<{t: number; lines: string[]; from: number; end: number}> = ({t, lines, from, end}) => <NSubtitle f={t} lines={lines} starts={lineStarts(lines, from)} end={end} />;

const LAMP = {x: 960, top: 0, y: 300};

export const NocturneDemo: React.FC = () => {
  const f = useCurrentFrame();
  // 第 2～4 场贯穿的吊灯：书房里是冷白灯，暗场后换成暖灯，第 4 场开始摆
  const lampOn = f >= LEN - 22 && f < LEN * 4 - 6;
  const warmMix = clamp01((f - (LEN * 2 - 18)) / 24);
  const angle = swing(f, LEN * 3 + 8);
  const lampFade = clamp01((f - (LEN - 22)) / 20) * (1 - clamp01((f - (LEN * 4 - 26)) / 20));

  return (
    <AbsoluteFill style={{background: N.void, fontFamily: NF.cn}}>
      {/* 1 开场：暖色热闹画面 → 去色 + 纸屑 → 逐字标题 → 飞到左上角 */}
      <Scene f={f} i={0} inAt={-30} outAt={118}>
        {(t) => (
          <>
            <Desat f={t} at={40}>
              <StudyRoom f={t} tone="warm" desk={false} />
              <PendantLamp x={960} y={260} tone="warm" cone={700} />
              <Crowd y={990} rows={1} cols={4} spread={900} h={430} glow={0.8} />
            </Desat>
            <Lines t={t} lines={['下班回到家，你是否又在【重复】昨天？']} from={2} end={40} />
          </>
        )}
      </Scene>

      {/* 2 冷色书房：月夜窗、浮尘、人物名、字幕重点词 */}
      <Scene f={f} i={1} inAt={LEN - 22} outAt={LEN * 2 - 20}>
        {(t) => (
          <>
            <StudyRoom f={f} />
            <Figure x={980} y={815} h={380} core={0.9} rim={0.45} />
            <Motes f={f} />
            <PersonNote f={t} at={20} name="Exemplum Persona" years="1800 – 1880" out={128} />
            <Lines t={t} lines={['明明想改，最后又回到【老样子】。', '这不是意志力差，是大脑在省力。']} from={18} end={142} />
          </>
        )}
      </Scene>

      {/* 3 暗场里只剩吊灯（贯穿元素），暖光照亮大字 */}
      <Scene f={f} i={2}>
        {(t) => {
          const [sx, sy] = lampSpot(LAMP.x, LAMP.top, LAMP.y, 0, 420);
          return (
            <>
              <NightBg tone="warm" glow={[50, 52]} strength={0.7} />
              <Motes f={f} warm n={40} opacity={0.8} />
              <LitWord f={t} at={66} text="惯性" x={960} y={690} tone="warm" light={{x: sx, y: sy, r: 320}} latin="Inertia" />
              <Lines t={t} lines={['有一股力，总把你拉回原来的轨道，', '它叫【惯性】。']} from={6} end={140} />
            </>
          );
        }}
      </Scene>

      {/* 4 吊灯钟摆：光锥扫到哪个词，哪个词就亮 */}
      <Scene f={f} i={3}>
        {(t) => {
          const [sx, sy] = lampSpot(LAMP.x, LAMP.top, LAMP.y, angle, 400);
          const light = {x: sx, y: sy, r: 300};
          return (
            <>
              <NightBg tone="none" />
              <WallClock x={1660} y={230} r={84} minutes={600 + t * 0.6} light={0.8} />
              <LitWord f={t} at={8} text="计划" x={580} y={650} size={160} tone="warm" light={light} latin="Consilium" />
              <LitWord f={t} at={14} text="拖延" x={1340} y={650} size={160} tone="cool" light={light} latin="Mora" />
              <Lines t={t} lines={['于是你在计划和拖延之间，', '来回【摆荡】。']} from={12} end={140} />
            </>
          );
        }}
      </Scene>

      {/* 贯穿第 2～4 场的吊灯（画在场景外面，场切换时它不动） */}
      {lampOn ? (
        <AbsoluteFill style={{opacity: lampFade}}>
          <AbsoluteFill style={{opacity: 1 - warmMix}}>
            <PendantLamp x={LAMP.x} y={LAMP.y} top={LAMP.top} angle={angle} tone="cool" cone={640} />
          </AbsoluteFill>
          <AbsoluteFill style={{opacity: warmMix}}>
            <PendantLamp x={LAMP.x} y={LAMP.y} top={LAMP.top} angle={angle} tone="warm" cone={560} halo={1.6} />
          </AbsoluteFill>
        </AbsoluteFill>
      ) : null}

      {/* 5 回忆照片：暖色照片浮在冷色书房上 */}
      <Scene f={f} i={4}>
        {(t) => (
          <>
            <StudyRoom f={f} />
            <PendantLamp x={960} y={250} cone={600} light={0.7} />
            <Motes f={f} />
            <MemoryPhoto f={t} at={22} x={1010} y={430} w={1040} h={620} tilt={-3.5}>
              <StudyRoom f={f} tone="warm" desk={false} />
              <PendantLamp x={960} y={260} tone="warm" cone={700} />
              <Crowd y={1000} rows={1} cols={4} spread={1000} h={480} glow={1} />
            </MemoryPhoto>
            <Lines t={t} lines={['新年立下的目标，', '只在第一周【发过光】。']} from={10} end={140} />
          </>
        )}
      </Scene>

      {/* 6 暖色人群里唯一的冷色人：闲聊小字 + 人与人之间的虚线弧（绕过他） */}
      <Scene f={f} i={5}>
        {(t) => (
          <>
            <NightBg tone="warm" glow={[50, 62]} strength={0.6} />
            <Crowd y={1010} rows={1} cols={6} spread={1700} h={470} hero={{x: 960, y: 1010, h: 480}} />
            <Chatter
              f={t}
              items={[
                ['打卡了吗', 330, 470, 14],
                ['第 21 天！', 1500, 450, 24],
                ['一起一起', 660, 420, 34],
                ['冲', 1240, 430, 44],
                ['我也是', 820, 380, 58],
              ]}
            />
            <LinkArcs f={t} points={[[110, 690], [450, 690], [790, 690], [1130, 690], [1470, 690], [1810, 690]]} p={clamp01((t - 40) / 50)} />
            <Lines t={t} lines={['大家都在打卡，你也跟着打卡，', '却忘了问自己【为什么】。']} from={10} end={140} />
          </>
        )}
      </Scene>

      {/* 7 分屏对照：左冷右暖，中间一条发光细线 */}
      <Scene f={f} i={6}>
        {(t) => (
          <>
            <NightBg tone="none" />
            <SplitDuo
              f={t}
              at={8}
              left={{word: '此刻', latin: 'Nunc', render: () => <Figure x={480} y={900} h={430} core={1} />}}
              right={{word: '惯例', latin: 'Consuetudo', render: () => <Crowd x={1440} y={1075} rows={5} cols={6} spread={820} h={340} glow={1.1} />}}
            />
            <Lines t={t} lines={['改变，是从人群的【惯例】里走出来。']} from={20} end={140} />
          </>
        )}
      </Scene>

      {/* 8 两道光门 → 推进左门闪白 → 灯下独坐 */}
      <Scene f={f} i={7}>
        {(t) => {
          const push = 1 + 1.6 * Math.pow(clamp01((t - 36) / 34), 2.2);
          return (
            <>
              {t < 72 ? (
                <AbsoluteFill style={{transform: `scale(${push})`, transformOrigin: '600px 560px'}}>
                  <NightBg tone="none" />
                  <LightDoor x={600} y={760} w={170} h={390} spread={300} />
                  <LightDoor x={1320} y={760} w={170} h={390} spread={300} />
                  <Figure x={960} y={830} h={230} core={1} rim={0.7} />
                </AbsoluteFill>
              ) : (
                <AbsoluteFill>
                  <NightBg tone="cool" glow={[44, 60]} strength={0.6} />
                  <MoonPainting x={1220} y={290} w={330} h={220} light={0.85} />
                  <WallClock x={1660} y={180} r={60} minutes={1300} light={0.7} />
                  <SeatedFigure x={800} y={900} h={340} />
                  <PendantLamp x={820} y={300} cone={640} />
                  <Motes f={f} n={30} />
                </AbsoluteFill>
              )}
              <WhiteFlash f={t} at={66} hold={4} fade={24} />
              <Lines t={t} lines={['出口不在远方，', '就在每天的【第一步】。']} from={8} end={142} />
            </>
          );
        }}
      </Scene>

      {/* 9 收尾：书房、窗外星点变多，冷白大字，镜头慢推 6% */}
      <Scene f={f} i={8} outAt={LEN * 9}>
        {(t) => (
          <>
            <AbsoluteFill style={{transform: `scale(${pushIn(t, 0, LEN)})`}}>
              <StudyRoom f={f} stars={0.3 + 0.7 * clamp01((t - 30) / 80)} beam={1.5} desk={false} />
              <Figure x={420} y={860} h={420} core={1} />
              <PendantLamp x={1180} y={240} cone={660} />
              <Motes f={f} n={70} />
              <LitWord f={t} at={40} text="开始" x={1000} y={420} size={200} tone="cool" lit={1} latin="Initium" />
            </AbsoluteFill>
            <Lines t={t} lines={['今晚，就是新的【开始】。']} from={36} end={150} />
          </>
        )}
      </Scene>

      {/* 开场纸屑和标题画在所有场景上面：标题飞到左上角时，下一场已经在底下亮起来 */}
      <Shards f={f} at={40} />
      {f < LEN ? <TitleCard f={f} at={48} lead="你每天重复的事，" title="习惯" latin="Habitus · 示例人物" flyAt={112} chapterLatin="Habitus" /> : null}

      {/* 固定版式：右上栏目框；左上章节名在标题飞过来之后常驻 */}
      <SeriesTag text="示例栏目" />
      {f >= LEN ? <ChapterMark f={f} cn="习惯" latin="Habitus" /> : null}
    </AbsoluteFill>
  );
};
