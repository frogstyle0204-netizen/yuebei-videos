import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {clamp01, easeInOut, keyframes} from '../anim';
import {Flyover, InkSwallow, PushThrough, RingPulse, SlitSwap} from '../crimson-glow/fx';
import {Chasm, ClosedBook, GlowFigure, mixPose, OpenBook, OvalLoop, ovalPoint, pose} from '../crimson-glow/props';
import {Bokeh, BrandTag, ConceptTitle, DarkStage, Grain, Lines, SideFloor, Soft, SourceLine, TrackFloor, Vignette} from '../crimson-glow/stage';
import {C, CF} from '../crimson-glow/theme';

/**
 * 3：尼采权力与意志素材一览（1920×1080，40 秒）：每 150 帧一场，场与场之间用这套风格自己的转场接起来
 * （升机位、溶解、压缝翻开、墨团吞没、地面塌成断崖、推近穿线 + 白光爆闪）。
 * 题目是「拖延」，文案、概念名、出处都是示例，和参考视频无关。
 */
const LEN = 150;
export const CRIMSON_GLOW_DEMO_FRAMES = LEN * 8;

// 俯视椭圆跑道的尺寸（场 3）
const OV = {x: 960, y: 520, w: 1480, h: 450, lanes: 8, gap: 10};
const OV_RM = OV.h / 2 - ((OV.lanes - 1) * OV.gap) / 2;
const OV_LS = OV.w - OV.h;
const OV_P = 2 * OV_LS + 2 * Math.PI * OV_RM;
const startS = (0.3 * OV_LS) / OV_P; // 起点短线在一圈里的位置
const finishS = (0.74 * OV_LS) / OV_P;
const runnerS = (f: number) => startS + (f - 318) / 118; // 318 帧经过起点，约 4 秒一圈

// 场 5–7 的人物：侧视地面 772，872 帧起往右走；断崖崖顶 700
const walkX = (f: number) => 600 + 4.2 * Math.max(0, f - 872);
const GAP: [number, number] = [820, 1240];
const CLIFF_Y = 700;

const TrackWorld: React.FC<{f: number}> = ({f}) => {
  const ring = Math.max(0, 1 - Math.abs(f - 118) / 12);
  return (
    <AbsoluteFill>
      <DarkStage f={f} />
      <TrackFloor horizon={440} center={0.55 + 0.45 * ring} rungs={5} rungP={clamp01((f - 214) / 46)} />
      <Bokeh f={f} y={372} />
    </AbsoluteFill>
  );
};

const OvalWorld: React.FC<{f: number}> = ({f}) => (
  <AbsoluteFill>
    <DarkStage f={f} />
    <OvalLoop
      {...OV}
      runner={runnerS(f)}
      lit={f > 396 ? [0.5 - 0.36 * easeInOut(clamp01((f - 396) / 26)), 0.5 + 0.36 * easeInOut(clamp01((f - 396) / 26))] : undefined}
      label="400 m · exemplum"
    />
  </AbsoluteFill>
);

const BookWorld: React.FC<{f: number}> = ({f}) => (
  <AbsoluteFill>
    <DarkStage f={f} />
    <SlitSwap
      f={f}
      at={520}
      x={960}
      y={400}
      w={740}
      a={<ClosedBook x={960} y={400} w={720} h={320} />}
      b={<OpenBook x={960} y={440} w={1260} h={680} head="第 1 天" sub="Plan · exemplum" items={['06:30 起床', '读二十页书', '整理书桌', '给家里打个电话']} />}
    />
    <InkSwallow f={f} at={556} x={960} y={440} dur={36} maxR={640} />
  </AbsoluteFill>
);

/** 场 5–7：侧视地面 → 断崖；u 0–1 地面塌成断崖的进度 */
const SideWorld: React.FC<{f: number}> = ({f}) => {
  const u = easeInOut(clamp01((f - 900) / 16));
  const lineY = 772 - (772 - CLIFF_Y) * u;
  const floorOn = clamp01((f - 600) / 14) * (1 - u);
  const red = keyframes(f, [[600, 0.15], [680, 0.9], [820, 0.9], [835, 1.15], [860, 0.85], [910, 0.5]]);
  const cool = keyframes(f, [[760, 0], [800, 1], [910, 0.7]]);
  const stand = easeInOut(clamp01((f - 756) / 24));
  const walking = f >= 872;
  const p = walking ? mixPose(pose('stand'), pose('walk', f - 872), clamp01((f - 872) / 8)) : mixPose(pose('slump', f), pose('stand'), stand);
  const x = walkX(f);
  const ghostOn = clamp01((f - 664) / 26) * (1 - clamp01((f - 888) / 20)); // 红色影子一直垂着头
  const bloom = Math.max(0, 1 - Math.abs(f - 812) / 16) * 0.9;
  const fig = clamp01((f - 604) / 12);
  return (
    <AbsoluteFill>
      <DarkStage f={f} red={red} cool={cool} />
      <AbsoluteFill style={{opacity: floorOn}}>
        <SideFloor f={f} y={772} line={clamp01((f - 598) / 8)} red={red * 0.8} cool={cool} />
      </AbsoluteFill>
      {u > 0 && <Chasm y={lineY} gap={GAP} on={u} span={clamp01((f - 904) / 14)} steps={6} lit={((x - GAP[0]) / (GAP[1] - GAP[0])) * 6} />}
      {ghostOn > 0 && <GlowFigure x={330} y={lineY} h={780} p={pose('slump', f + 4)} tone="red" ghost opacity={ghostOn} />}
      <GlowFigure x={x} y={lineY} h={400} p={p} bloom={bloom} opacity={fig} />
    </AbsoluteFill>
  );
};

const FinalWorld: React.FC<{f: number}> = ({f}) => (
  <AbsoluteFill>
    <DarkStage f={f} red={0.35} />
    <Bokeh f={f} y={560} drift={1.6} seed={8} />
    <SideFloor f={f} y={700} scroll={9} red={0.3} stripe={70} />
    <GlowFigure x={500} y={700} h={260} p={pose('run', f + 7)} tone="red" opacity={0.9} />
    <GlowFigure x={960} y={700} h={300} p={pose('run', f)} bloom={Math.max(0, 1 - Math.abs(f - 1104) / 18) * 0.8} />
  </AbsoluteFill>
);

const World: React.FC<{f: number}> = ({f}) => {
  if (f < 300) return <Flyover f={f} at={282} from={<TrackWorld f={f} />} to={<OvalWorld f={f} />} />;
  if (f < 452) {
    const v = clamp01((f - 438) / 12);
    return (
      <AbsoluteFill>
        <AbsoluteFill style={{opacity: 1 - v}}>
          <OvalWorld f={f} />
        </AbsoluteFill>
        {v > 0 && (
          <AbsoluteFill style={{opacity: v}}>
            <BookWorld f={f} />
          </AbsoluteFill>
        )}
      </AbsoluteFill>
    );
  }
  if (f < 600) return <BookWorld f={f} />;
  if (f < 1032) return <SideWorld f={f} />;
  return (
    <PushThrough f={f} at={1032} dur={18} x={1100} y={CLIFF_Y} zoom={7} next={<FinalWorld f={f} />}>
      <SideWorld f={f} />
    </PushThrough>
  );
};

export const CrimsonGlowDemo: React.FC = () => {
  const f = useCurrentFrame();
  const fadeIn = clamp01(f / 7);
  const fadeOut = clamp01((f - 1182) / 18);
  const st = ovalPoint(OV.x, OV.y, OV.w, OV_RM, startS, OV.h);
  const fi = ovalPoint(OV.x, OV.y, OV.w, OV_RM, finishS, OV.h);
  return (
    <AbsoluteFill style={{background: C.bg, fontFamily: CF.cn}}>
      <World f={f} />
      <Vignette />

      {/* 场 1：透视跑道 + 观众席光斑 + 三行宋体（米白 / 玫红 / 结论） */}
      <Lines f={f} at={10} out={96} y={92} lines={[{t: '闹钟响到第三遍，'}, {t: '被子里还留着一点温度，', tone: 'rose'}, {t: '你是不是又想说：明天吧？', tone: 'hero'}]} />
      <Lines f={f} at={104} out={142} y={150} lines={[{t: '这种时刻，有一个名字。'}]} />
      <RingPulse f={f} at={116} x={960} y={440} r={210} />

      {/* 场 2：概念大标题收进左上角标（之后一直留在左上），中间道上的横档由远到近亮起 */}
      <ConceptTitle f={f} at={150} dock={196} name="完美主义拖延" sub="示例概念 · 仅作版式演示" by="示例人物" y={330} />
      <Lines f={f} at={206} out={272} y={92} lines={[{t: '我们总想等一切都准备好，'}, {t: '再迈出第一步，'}, {t: '可「准备好」永远【差一点】。', tone: 'hero'}]} />
      <SourceLine f={f} at={210} out={278} text="Exemplum de Mora · § 2" />

      {/* 场 3：俯视椭圆跑道，光点绕圈；起点光环、终点涟漪、上直道中段点亮 */}
      <RingPulse f={f} at={318} x={st.x} y={st.y} r={70} dur={16} />
      <RingPulse f={f} at={372} x={fi.x} y={fi.y} r={90} dur={18} rings={3} spacing={6} flash={0.6} width={2} />
      <Lines f={f} at={316} out={392} x={150} y={860} align="left" lines={[{t: '计划写得很满，'}]} />
      <Lines f={f} at={370} out={392} x={1770} y={860} align="right" lines={[{t: '收尾也想得很美，'}]} />
      <Lines f={f} at={402} out={436} y={830} lines={[{t: '唯独【中间】这一段，没人想跑。', tone: 'hero'}]} />
      <SourceLine f={f} at={322} out={436} text="Liber Exempli · I · 7" />
      <Soft f={f} at={310} out={436} style={{left: 72, bottom: 34, fontSize: 20, color: C.tag, letterSpacing: '0.3em'}}>
        示意
      </Soft>

      {/* 场 4：合上的书压成一条缝再翻开，墨团把整页吞掉 */}
      <Lines f={f} at={458} out={514} y={630} lines={[{t: '新年第一天，你买了一本很厚的计划本，'}, {t: '第一页写得工工整整。'}]} />
      <Lines f={f} at={538} out={556} y={850} lines={[{t: '可往后翻，全是空白。'}]} />
      <Lines f={f} at={562} out={596} y={850} lines={[{t: '它们被一句【以后再说】，慢慢吞掉。'}]} />

      {/* 场 5：侧视地面，垂头的白色小人，身后放大虚化的红色影子，左侧红光升起 */}
      <Lines f={f} at={616} out={660} x={1770} y={110} align="right" lines={[{t: '我们常说，'}, {t: '这是懒，是自律不够。'}]} />
      <Lines f={f} at={668} out={742} x={1770} y={110} align="right" lines={[{t: '可那其实是一个很旧的本能：'}, {t: '先躲开，就不会失败。', tone: 'rose'}]} />
      <SourceLine f={f} at={620} out={892} text="Liber Exempli · III · 2" />

      {/* 场 6：小人站直，右侧冷光亮起；两个声音一左一右 */}
      <Lines f={f} at={772} out={818} y={110} lines={[{t: '于是同一时刻，'}, {t: '两个声音在你身上撞到了一起。'}]} />
      <Lines f={f} at={822} out={866} x={120} y={300} align="left" lines={[{t: '「等你准备好。」', tone: 'voice'}]} />
      <Lines f={f} at={842} out={886} x={1790} y={300} align="right" lines={[{t: '「现在就去。」', tone: 'call'}]} />

      {/* 场 7：地面塌成断崖，横跨的线画出来，小人走过去，落脚点逐个点亮 */}
      <Lines f={f} at={918} out={980} y={110} lines={[{t: '想到和做到之间，'}, {t: '隔着一道看不见底的缝。'}]} />
      <Lines f={f} at={986} out={1030} y={110} lines={[{t: '不用一次跨过去，'}, {t: '每走一步，脚下就多亮一格。', tone: 'rose'}]} />

      {/* 场 8：推近穿过那条线、白光爆闪，接原地奔跑；结论关键词带红色残影 */}
      <Lines
        f={f}
        at={1062}
        y={150}
        lines={[{t: '不是你终于准备好了，'}, {t: '而是你【已经出发】。', tone: 'hero', at: 1080}, {t: '示例人物：行动本身，就是最好的准备', tone: 'dim', at: 1104}]}
      />

      <BrandTag />
      <Grain />
      <AbsoluteFill style={{background: '#000', opacity: Math.max(1 - fadeIn, fadeOut), pointerEvents: 'none'}} />
    </AbsoluteFill>
  );
};
