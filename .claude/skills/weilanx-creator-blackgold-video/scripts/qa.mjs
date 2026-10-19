#!/usr/bin/env node
// 一期的自动自查：抽帧拼图 + 两个爆点的收暗 / 静止 / 爆发 + 整片响度 + 每个音效有没有被配乐盖住。
//   node .claude/skills/weilanx-creator-blackgold-video/scripts/qa.mjs <期>            # 全部
//   node .claude/skills/weilanx-creator-blackgold-video/scripts/qa.mjs <期> --frames   # 只抽帧
//   node .claude/skills/weilanx-creator-blackgold-video/scripts/qa.mjs <期> --audio    # 只测音频
//   node .claude/skills/weilanx-creator-blackgold-video/scripts/qa.mjs <期> --frames-only=title,hit2   # 只重渲某几个镜头
//   --loud=impact,press,drop   # 要检查「有没有被配乐盖住」的音效文件名（默认见下面 LOUD）
// 产物在 /tmp/<期>/qa/：sheet-1.jpg、sheet-2.jpg …（每张 4×4，标了镜头名）、hits.jpg（两个爆点 −16 / −3 / +2 帧）、report.md。
// 读 src/episodes/<期>/timeline.ts 的 SHOTS、HIT、HIT2、SFX、DURATION、FPS；timeline.ts 里不能 import 别的 .ts / .tsx（Node 只能剥掉本文件的类型）。
// 运行前先 export NODE_OPTIONS=--max-old-space-size=4096。一次只渲一帧（并发渲染会把内存吃光）。
import {execFileSync, spawnSync} from 'node:child_process';
import {existsSync, mkdirSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const [ep, ...flags] = process.argv.slice(2);
if (!ep) {
  console.error('用法：node qa.mjs <期> [--frames | --audio | --frames-only=a,b]');
  process.exit(1);
}
const only = flags.find((x) => x.startsWith('--frames-only='))?.split('=')[1]?.split(',');
const doFrames = !flags.includes('--audio');
const doAudio = !flags.includes('--frames') && !only;
const T = await import(pathToFileURL(resolve(`src/episodes/${ep}/timeline.ts`)).href);
const dir = `/tmp/${ep}/qa`;
mkdirSync(dir, {recursive: true});
const run = (cmd, args) => execFileSync(cmd, args, {stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 1 << 28}).toString();
/** ffmpeg 的统计信息都打在 stderr 上，成功时也要读 stderr */
const runErr = (cmd, args) => {
  const r = spawnSync(cmd, args, {maxBuffer: 1 << 28});
  return String(r.stderr ?? '') + String(r.stdout ?? '');
};
const still = (name, frame) => {
  const out = `${dir}/${name}.jpg`;
  run('npx', ['remotion', 'still', 'src/index.ts', ep, out, `--frame=${frame}`, '--scale=0.5', '--timeout=120000']);
  // 左上角写镜头名和帧号，拼图时好对照
  run('ffmpeg', ['-v', 'error', '-y', '-i', out, '-vf', `drawbox=x=0:y=0:w=330:h=44:color=black@0.7:t=fill,drawtext=text='${name} f${frame}':x=10:y=10:fontsize=24:fontcolor=yellow`, `${out}.tmp.jpg`]);
  run('mv', [`${out}.tmp.jpg`, out]);
  return out;
};
const sheet = (files, out, cols = 4) => {
  const n = files.length;
  const layout = files.map((_, i) => `${i % cols === 0 ? '0' : Array(i % cols).fill('w0').join('+')}_${Math.floor(i / cols) === 0 ? '0' : Array(Math.floor(i / cols)).fill('h0').join('+')}`).join('|');
  run('ffmpeg', ['-v', 'error', '-y', ...files.flatMap((f) => ['-i', f]), '-filter_complex', n === 1 ? 'null' : `xstack=inputs=${n}:layout=${layout}:fill=black`, out]);
};
const report = [`# ${ep} 自查报告`, ''];

if (doFrames) {
  // 每个镜头取切走前的倒数第 4 帧：这时画面里该出现的东西都应该已经出来了（上一镜头的字幕也已退场）。
  // 曾经漏过的 bug：节点要等到镜头结束之后才点亮、从头到尾都没露面——只看 3/4 处发现不了
  const shots = Object.entries(T.SHOTS).filter(([k]) => !only || only.includes(k));
  const files = [];
  for (const [k, [a, b]] of shots) {
    const f = Math.max(a, b - 4);
    files.push(still(k, f));
    process.stdout.write(`· ${k} `);
  }
  for (let i = 0; i < files.length; i += 16) sheet(files.slice(i, i + 16), `${dir}/sheet-${i / 16 + 1}.jpg`);
  report.push(`## 抽帧`, '', `每个镜头切走前一帧，拼成 ${Math.ceil(files.length / 16)} 张：${Array.from({length: Math.ceil(files.length / 16)}, (_, i) => `${dir}/sheet-${i + 1}.jpg`).join('、')}`, '');
  if (!only) {
    const hits = [];
    for (const [name, H] of [['hit1', T.HIT], ['hit2', T.HIT2]]) for (const d of [-16, -3, 2]) hits.push(still(`${name}${d > 0 ? '+' : ''}${d}`, H + d));
    sheet(hits, `${dir}/hits.jpg`, 3);
    report.push(`两个爆点各 −16 / −3 / +2 帧：${dir}/hits.jpg（应当是 收暗 → 静止 → 已经亮起来）`, '');
  }
  console.log('\n抽帧完成');
}

if (doAudio) {
  const wav = `${dir}/a.wav`;
  run('npx', ['remotion', 'render', 'src/index.ts', ep, wav, '--codec=wav']);
  const eb = runErr('ffmpeg', ['-nostats', '-i', wav, '-af', 'ebur128=peak=true', '-f', 'null', '-']);
  const I = Number(/I:\s+(-?[\d.]+) LUFS/.exec(eb.split('Summary')[1] ?? '')?.[1]);
  const peak = Number(/Peak:\s+(-?[\d.]+) dBFS/.exec(eb.split('Summary')[1] ?? '')?.[1]);
  // band = true 时只量 1.2–5 kHz：铃、咔哒、碎响这类高频小音效全频会被配乐低频淹掉，看频段才准
  const mean = (t, d, band = false) =>
    Number(/mean_volume: (-?[\d.]+) dB/.exec(runErr('ffmpeg', ['-ss', String(Math.max(0, t)), '-t', String(d), '-i', wav, '-af', `${band ? 'highpass=f=1200,lowpass=f=5000,' : ''}volumedetect`, '-f', 'null', '-']))?.[1] ?? NaN);
  report.push('## 音频', '', `- 整片 ${I} LUFS（目标约 −15.5）、真峰值 ${peak} dBFS（不能高于 −1.0）${I > -14.5 || I < -16.5 || peak > -1 ? ' ⚠' : ''}`, '');
  // 只看「要听得见」的音效：冲击、本期的动作音（按键、落下、铃）；whoosh、paper、room 本来就轻
  const LOUD = flags.find((x) => x.startsWith('--loud='))?.split('=')[1]?.split(',') ?? ['impact', 'press', 'drop', 'chime', 'bell', 'clink', 'stamp', 'coin', 'tick'];
  const loud = new RegExp(`/(${LOUD.join('|')})\\.wav$`);
  const weak = [];
  for (const [file, at, vol] of T.SFX) {
    if (!loud.test(file)) continue;
    const t = at / T.FPS;
    const rise = mean(t, 0.15) - mean(t - 0.3, 0.15);
    const riseHi = mean(t, 0.15, true) - mean(t - 0.3, 0.15, true);
    // 全频高出 4 dB，或者 1.2–5 kHz 高出 6 dB，就算听得见
    if (!(rise >= 4 || riseHi >= 6)) weak.push(`- ${file.split('/').pop()} @ ${t.toFixed(2)} 秒（音量 ${vol}）：全频只高 ${rise.toFixed(1)} dB、1.2–5 kHz 只高 ${riseHi.toFixed(1)} dB`);
  }
  report.push(weak.length ? `被配乐盖住的音效（全频高出不到 4 dB、1.2–5 kHz 也高出不到 6 dB；要么加音量、要么挪开前面的音效）：\n${weak.join('\n')}` : '要听得见的音效都比前一刻明显高出（全频 ≥ 4 dB 或 1.2–5 kHz ≥ 6 dB）。', '');
  report.push('音量只看数值，听感要让用户自己确认。', '');
  console.log(`音频：${I} LUFS / 峰值 ${peak} dBFS / 偏弱音效 ${weak.length} 处`);
}

writeFileSync(`${dir}/report.md`, report.join('\n'));
console.log(`报告：${dir}/report.md`);
if (!existsSync(`public/audio/${ep}/bgm.wav`)) console.log('⚠ 还没生成音频：node audio/episodes/<期>.mjs');
