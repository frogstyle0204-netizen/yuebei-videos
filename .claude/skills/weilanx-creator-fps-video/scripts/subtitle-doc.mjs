#!/usr/bin/env node
// 从一期的 timeline.ts 生成字幕稿：node subtitle-doc.mjs src/episodes/<期>/timeline.ts <素材目录>/字幕稿.md
// 读 CUES（[拍号, 文字 | null]）、cueStart / cueEnd、DURATION、FPS、HALF_BEATS、DARK_FROM、DARK_FROM2、HIT、HIT2。
// 文字为 null 的条目（标题卡、大字、爆点）用源码里那一行 // 注释当说明；话说一半的两句结束时间取收暗帧。
// Node 24 能直接 import .ts（类型会被去掉）；timeline.ts 里不要 import 别的 .ts 文件。
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const [src, out] = process.argv.slice(2);
if (!src || !out) {
  console.error('用法：node subtitle-doc.mjs <timeline.ts> <字幕稿.md>');
  process.exit(1);
}
const T = await import(pathToFileURL(resolve(src)).href);
const text = readFileSync(src, 'utf8');
const notes = new Map();
for (const m of text.matchAll(/\[(\d+),\s*null\],?\s*\/\/\s*(.+)/g)) notes.set(Number(m[1]), m[2].trim());

const ts = (f) => {
  const t = f / T.FPS;
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${(t % 60).toFixed(1).padStart(4, '0')}`;
};
const half = T.HALF_BEATS ?? [];
const rows = T.CUES.map(([beat, cue], i) => {
  const a = T.cueStart(i);
  let e = T.cueEnd(i);
  if (beat === half[0] && T.DARK_FROM) e = T.DARK_FROM;
  if (beat === half[1] && T.DARK_FROM2) e = T.DARK_FROM2;
  const body = cue ? cue.replace(/[【】〖〗〔〕]/g, '') : `【${notes.get(beat) ?? '画面'}】`;
  return `| ${i + 1} | ${ts(a)} – ${ts(e)} | ${body} |`;
});
const hits = [T.HIT, T.HIT2].filter((x) => x !== undefined).map(ts).join('、');
const doc = `# 字幕稿\n\n共 ${T.CUES.length} 条 · 时长 ${ts(T.DURATION)} · 无口播，字幕即旁白${hits ? ` · 爆点 ${hits}` : ''}\n\n| 序号 | 时间 | 字幕 |\n|---:|:---|:---|\n${rows.join('\n')}\n`;
mkdirSync(dirname(resolve(out)), {recursive: true});
writeFileSync(out, doc);
console.log(`wrote ${out}（${T.CUES.length} 条，${ts(T.DURATION)}）`);
