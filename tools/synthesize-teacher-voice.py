#!/usr/bin/env python3
"""用本机原神 Bert-VITS2 批量生成老师提示语音。

默认读取 assets/resources/teacher-voice/manifest.json，并输出同目录下的
<key>-<female|male>.mp3。已经存在的文件会跳过，方便中断后续跑。
"""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path

TTS_HOME = Path(os.environ.get('GENSHIN_TTS_HOME', '~/Documents/ChatGPT/语音合成')).expanduser()
DEFAULT_MANIFEST = Path('assets/resources/teacher-voice/manifest.json')

# TTS 的中文前端会把英文字母和括号读得含糊；配音时换成自然中文，界面文字保持不变。
VOICE_TEXT_REPLACEMENTS = [
    ('hero.say(hero.findNearestEnemy())', '说出敌人的名字'),
    ('hero.say(hero.distanceTo(敌人))', '说出和敌人的距离'),
    ('hero.say(hero.health)', '说出英雄的血量'),
    ('hero.say(敌人.health)', '说出敌人的血量'),
    ('hero.say("你好")', '说出你好'),
    ('hero.say(敌人)', '说出敌人的名字'),
    ('hero.say()', '说一句话'),
    ('hero.findNearestEnemy()', '寻找最近的敌人'),
    ('hero.findNearestItem()', '寻找最近的物品'),
    ('hero.distanceTo(敌人)', '和敌人之间的距离'),
    ('hero.canMoveRight()', '能不能向右走'),
    ('hero.canMoveDown()', '能不能向下走'),
    ('hero.lookRight()', '看看右边是什么'),
    ('hero.attack(敌人)', '攻击敌人'),
    ('hero.attack()', '攻击'),
    ('hero.wait()', '原地等待'),
    ('hero.moveRight()', '向右移动'),
    ('hero.moveLeft()', '向左移动'),
    ('hero.moveDown()', '向下移动'),
    ('hero.moveUp()', '向上移动'),
    ('hero.health', '英雄的血量'),
    ('hero.maxHealth', '英雄的血量上限'),
    ('hero.pos.x', '英雄所在的列'),
    ('hero.pos.y', '英雄所在的行'),
    ('敌人.health', '敌人的血量'),
    ('boss.health', '首领的血量'),
    ('moveRight()', '向右移动'),
    ('moveLeft()', '向左移动'),
    ('moveDown()', '向下移动'),
    ('moveUp()', '向上移动'),
    ('findNearestEnemy()', '寻找最近的敌人'),
    ('findNearestItem()', '寻找最近的物品'),
    ('distanceTo()', '计算距离'),
    ('canMoveRight()', '能不能向右走'),
    ('canMoveDown()', '能不能向下走'),
    ('lookRight()', '看看右边是什么'),
    ('wait()', '原地等待'),
    ('attack', '攻击'),
    ('health', '血量'),
    ('say', '说'),
    ('while (true)', '只要条件一直成立'),
    ('while', '只要循环'),
    ('for', '循环'),
    ('if', '如果'),
    ('else if', '否则如果'),
    ('else', '否则'),
    ('const', '常量'),
    ('let', '变量'),
    ('function', '函数'),
    ('break', '跳出循环'),
    ('null', '空值'),
    ('true', '成立'),
    ('&&', '并且'),
    ('===', '等于'),
    ('<=', '小于等于'),
    ('<', '小于'),
    ('>', '大于'),
    ('i', '循环变量'),
]



def voice_text(text: str) -> str:
    """把代码标识符换成适合中文单元音合成的说法。"""
    result = text
    for source, replacement in VOICE_TEXT_REPLACEMENTS:
        result = result.replace(source, replacement)
    return result


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description='批量生成地牢围攻老师提示语音')
    parser.add_argument('--manifest', type=Path, default=DEFAULT_MANIFEST)
    parser.add_argument('--out-dir', type=Path, default=None)
    parser.add_argument('--force', action='store_true', help='已有的 mp3 也重新生成')
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    manifest_path = args.manifest.expanduser().resolve()
    out_dir = (args.out_dir or manifest_path.parent).expanduser().resolve()
    out_dir.mkdir(parents=True, exist_ok=True)

    manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
    sys.path.insert(0, str(TTS_HOME))
    from genshin_bert_backend import get_engine
    import soundfile as sf

    engine = get_engine(device=os.environ.get('SBV2_DEVICE', 'cpu'))
    clips = manifest['clips']
    voices = manifest['voices']
    total = len(clips) * len(voices)
    done = 0

    for gender, voice in voices.items():
        speaker = voice['speaker']
        speed = float(voice.get('speed', 1.0))
        for clip in clips:
            target = out_dir / f"{clip['key']}-{gender}.mp3"
            done += 1
            if target.exists() and not args.force:
                print(f'[{done}/{total}] 跳过 {target.name}', flush=True)
                continue

            _, _, sample_rate, audio = engine.synthesize(
                text=voice_text(clip['text']), speaker=speaker, speed=speed
            )
            with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp:
                wav_path = Path(tmp.name)
            try:
                sf.write(wav_path, audio, sample_rate)
                subprocess.run(
                    [
                        'ffmpeg', '-hide_banner', '-loglevel', 'error', '-y',
                        '-i', str(wav_path), '-ac', '1', '-ar', '44100',
                        '-codec:a', 'libmp3lame', '-b:a', '64k', str(target),
                    ],
                    check=True,
                )
                print(f'[{done}/{total}] {target.name}', flush=True)
            finally:
                wav_path.unlink(missing_ok=True)

    print(f'完成：{out_dir}', flush=True)
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
