#!/usr/bin/env python3
"""带语气提示的豆包配音（seed-tts-2.0 复刻音色）。

依赖一个豆包语音合成的封装模块 voice.py（提供 request、decode_audio、MODEL、DEFAULT_SPEAKER，密钥由它自己读取）。
仓库不带这个模块：用环境变量 DOUBAO_VOICE_PY 指向你自己的封装，DOUBAO_TTS_SPEAKER_ID 指定复刻音色；
不用豆包的话，换成任何能输出 mp3 的 TTS 即可。相比普通合成，这个脚本只多两样东西：
- context_texts：一段语气提示，告诉模型用什么情绪和节奏来念（默认是本技能验证过的「自然聊天式科普口播」）
- speech_rate：直接让模型念快一点（默认 +30），代替后期 atempo 硬加速，音高不被拉扯，更自然

用法：
  python3 tts_expressive.py --text-file 口播稿.txt --output <期>-口播-自然版.mp3
  python3 tts_expressive.py --text-file 口播稿.txt --output x.mp3 --rate 20 --context "……"
"""
import argparse
import importlib.util
import json
import os
import subprocess
from pathlib import Path

DEFAULT_CONTEXT = (
    '你是一位很会讲故事的科普博主，正在录一条短视频口播。请用自然、松弛、像跟朋友聊天一样的语气讲，'
    '有轻重缓急和停顿：开头要抓人、带一点神秘感；问句要带好奇和调侃的语气；说到疯狂的工程或惊人的数字时语气里有惊叹；'
    '结尾放慢、沉下来，带一点感慨和余味。不要播音腔，不要一字一顿，不要每句都一样的语调。'
)

VOICE_PY = Path(os.environ.get('DOUBAO_VOICE_PY', Path.home() / '.claude/skills/weilanx-doubao-voice-clone/scripts/voice.py')).expanduser()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--text-file', type=Path, required=True)
    ap.add_argument('--output', type=Path, required=True)
    ap.add_argument('--rate', type=int, default=30, help='speech_rate，范围 -50..100，默认 30')
    ap.add_argument('--context', default=DEFAULT_CONTEXT, help='语气提示；传空字符串就不加')
    args = ap.parse_args()
    if not -50 <= args.rate <= 100:
        ap.error('--rate 必须在 -50..100')
    out = args.output.expanduser().resolve()
    if out.exists():
        ap.error(f'{out} 已存在，换个文件名')
    if out.suffix.lower() != '.mp3':
        ap.error('输出必须是 .mp3')
    text = args.text_file.read_text(encoding='utf-8').strip()
    if not text:
        ap.error('稿子是空的')

    spec = importlib.util.spec_from_file_location('voice', str(VOICE_PY))
    v = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(v)
    speaker = os.environ.get('DOUBAO_TTS_SPEAKER_ID', v.DEFAULT_SPEAKER)
    additions = {'explicit_language': 'zh-cn'}
    if args.context:
        additions['context_texts'] = [args.context]
    payload = {'user': {'uid': 'weilanx-claude-videos'}, 'req_params': {
        'text': text, 'speaker': speaker, 'model': v.MODEL,
        'audio_params': {'format': 'mp3', 'sample_rate': 24000, 'bit_rate': 160000, 'speech_rate': args.rate, 'loudness_rate': 0},
        'additions': json.dumps(additions, ensure_ascii=False)}}
    raw, rid = v.request('unidirectional', payload, 'seed-icl-2.0')
    out.parent.mkdir(parents=True, exist_ok=True)
    with out.open('xb') as f:
        f.write(v.decode_audio(raw))
    dur = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(out)],
                         check=True, capture_output=True, text=True).stdout.strip()
    meta = {'output': str(out), 'durationSeconds': float(dur), 'speechRate': args.rate, 'context': args.context, 'requestId': rid}
    out.with_suffix('.json').write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps(meta, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
