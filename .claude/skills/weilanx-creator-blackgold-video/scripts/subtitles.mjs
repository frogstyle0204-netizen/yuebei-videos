#!/usr/bin/env node
// 从一期黑金光影风的 timeline.ts 生成双语字幕稿和 SRT：
//   node .claude/skills/weilanx-creator-blackgold-video/scripts/subtitles.mjs <期> <输出目录>
// 产物：<输出目录>/字幕稿.md（序号 | 时间 | 中文 | English）、<输出目录>/字幕.srt（中文一行 + 英文一行）。
// 读 CUES（[拍号, 中文 | null, 英文]）、cueStart、cueEnd、HALF_BEATS、DARK_FROM、DARK_FROM2、HIT、HIT2、FPS、DURATION、
// TITLE、TITLE_EN、TITLE_SUB、ANCHOR、TERM。中文为 null 的条目：落在 HIT 上写标题，落在 HIT2 上写锚词 + 术语，其余用源码同一行的 // 注释。
// Node 24 直接 import .ts（剥掉类型），所以 timeline.ts 不能 import 别的 .ts / .tsx。
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const [ep, outDir] = process.argv.slice(2);
if (!ep || !outDir) {
  console.error('用法：node subtitles.mjs <期> <输出目录>');
  process.exit(1);
}
const src = resolve(`src/episodes/${ep}/timeline.ts`);
const T = await import(pathToFileURL(src).href);
const notes = new Map();
for (const m of readFileSync(src, 'utf8').matchAll(/\[(\d+),\s*null,\s*'[^']*'\],?\s*\/\/\s*(.+)/g)) notes.set(Number(m[1]), m[2].trim());

const strip = (s) => s.replace(/[【】〔〕〖〗]/g, '');
const srt = (f) => {
  const ms = Math.round((f / T.FPS) * 1000);
  const p = (n, w = 2) => String(n).padStart(w, '0');
  return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)},${p(ms % 1000, 3)}`;
};
const mmss = (f) => {
  const t = f / T.FPS;
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${(t % 60).toFixed(1).padStart(4, '0')}`;
};
const half = T.HALF_BEATS ?? [];
const rows = [];
T.CUES.forEach(([beat, cn, en], i) => {
  const a = T.cueStart(i);
  let e = T.cueEnd(i);
  if (beat === half[0] && T.DARK_FROM) e = T.DARK_FROM;
  if (beat === half[1] && T.DARK_FROM2) e = T.DARK_FROM2;
  if (cn) return rows.push({a, e, cn: strip(cn), en});
  if (a === T.HIT && T.TITLE) return rows.push({a, e, cn: `${T.TITLE.replace(/\n/g, '')}${T.TITLE_SUB ? `：${T.TITLE_SUB}` : ''}`, en: T.TITLE_EN ?? ''});
  if (a === T.HIT2 && T.ANCHOR) return rows.push({a, e, cn: `${T.ANCHOR}${T.TERM ? `（${T.TERM.split(' · ')[0]}）` : ''}`, en: T.TERM?.split(' · ')[1] ?? ''});
  if (notes.has(beat)) rows.push({a, e, cn: `【${notes.get(beat)}】`, en: ''});
});
const hits = [T.HIT, T.HIT2].filter((x) => x !== undefined).map(mmss).join('、');
const md =
  `# 字幕稿 · ${ep}${T.TITLE ? ` ${T.TITLE.replace(/\n/g, '')}` : ''}\n\n共 ${rows.length} 条 · 时长 ${mmss(T.DURATION)} · 无口播，画面上的双语字幕即旁白${hits ? ` · 爆点 ${hits}` : ''}\n\n` +
  `| 序号 | 时间 | 中文 | English |\n|---:|:---|:---|:---|\n` +
  rows.map((r, i) => `| ${i + 1} | ${mmss(r.a)}–${mmss(r.e)} | ${r.cn} | ${r.en} |`).join('\n') +
  '\n';
mkdirSync(resolve(outDir), {recursive: true});
writeFileSync(resolve(outDir, '字幕稿.md'), md);
writeFileSync(resolve(outDir, '字幕.srt'), rows.filter((r) => !r.cn.startsWith('【')).map((r, i) => `${i + 1}\n${srt(r.a)} --> ${srt(r.e)}\n${r.cn}${r.en ? `\n${r.en}` : ''}\n`).join('\n'));
console.log(`wrote ${outDir}/字幕稿.md + 字幕.srt（${rows.length} 条，${mmss(T.DURATION)}）`);
