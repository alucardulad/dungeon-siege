import assert from 'node:assert/strict'
import test from 'node:test'

import { SOUND_BANK, SOUND_NAMES, noteToFrequency, soundDuration, type SoundName, type SoundPlayer } from '../assets/scripts/core/audio'
import { Game } from '../assets/scripts/core/engine'
import { findLevel } from '../assets/scripts/core/levels'

/** 把播放过的音效名字记下来，方便断言。 */
function recorder() {
  const played: SoundName[] = []
  const player: SoundPlayer = {
    play: (name) => played.push(name),
  }
  return {
    played,
    player,
    count: (name: SoundName) => played.filter((item) => item === name).length,
  }
}

async function play(levelId: string, code: string) {
  const level = findLevel(levelId)
  assert.ok(level, `找不到关卡 ${levelId}`)
  const sound = recorder()
  const game = new Game(level, { instant: true, audio: sound.player })
  const result = await game.run(code)
  return { game, result, sound }
}

test('音效库：每个音效都有合法音符', () => {
  assert.ok(SOUND_NAMES.length >= 10)
  for (const name of SOUND_NAMES) {
    const spec = SOUND_BANK[name]
    assert.ok(spec.notes.length > 0, `${name} 没有任何音符`)
    for (const note of spec.notes) {
      const frequency = noteToFrequency(note.note)
      assert.ok(frequency > 20 && frequency < 8000, `${name} 的 ${note.note} 频率异常：${frequency}`)
      assert.ok(note.duration > 0 && note.duration < 1, `${name} 的音符时值异常：${note.duration}`)
      assert.ok((note.gain ?? 1) > 0 && (note.gain ?? 1) <= 1, `${name} 的音量异常`)
      if (note.glideTo) assert.ok(noteToFrequency(note.glideTo) > 20)
    }
    assert.ok(soundDuration(spec) > 0.02 && soundDuration(spec) < 3, `${name} 总时长异常`)
  }
})

test('音名换算：A4 = 440Hz，C5 ≈ 523.25Hz', () => {
  assert.equal(Math.round(noteToFrequency('A4')), 440)
  assert.ok(Math.abs(noteToFrequency('C5') - 523.25) < 0.1)
  assert.ok(Math.abs(noteToFrequency('F#5') - 739.99) < 0.1)
})

test('第 1 关（纯移动）只有脚步音和通关音', async () => {
  const level = findLevel('level-1')
  assert.ok(level)
  const { result, sound } = await play('level-1', level.solution)
  assert.equal(result.status, 'win')
  assert.ok(sound.count('move') > 0, '应该有脚步音')
  assert.equal(sound.count('swing'), 0, '这一关没有战斗，不该有挥剑音')
  assert.ok(sound.count('win') > 0, '应该有通关音')
})

test('战斗关会发出挥剑、命中、击败、受伤音效', async () => {
  const level = findLevel('level-8')
  assert.ok(level)
  const { result, sound } = await play('level-8', level.solution)
  assert.equal(result.status, 'win')
  assert.ok(sound.count('swing') > 0, '应该有挥剑音')
  assert.ok(sound.count('hit') > 0, '应该有命中音')
  assert.ok(sound.count('kill') > 0, '应该有击败音')
  assert.ok(sound.count('hurt') > 0, '英雄挨打时应该有受伤音')
  assert.ok(sound.count('win') > 0, '应该有通关音')
})

test('撞墙、踩尖刺、捡宝石、喝药水都有自己的音效', async () => {
  const bump = await play('level-1', 'hero.moveLeft()')
  assert.ok(bump.sound.count('blocked') > 0)

  const spike = await play('level-29', 'for (let i = 0; i < 4; i++) { hero.moveRight() }')
  assert.ok(spike.sound.count('spike') > 0, '踩到尖刺应该发出 spike 音')

  const gem = await play('level-5', 'hero.moveRight()\nhero.moveRight()\nhero.moveRight()')
  assert.ok(gem.sound.count('gem') > 0)

  // 第 33 关的药水在英雄下方 4 格处，直接下去喝就行
  const potion = await play(
    'level-33',
    'hero.moveDown()\nhero.moveRight()\nhero.moveRight()\nhero.moveRight()\nhero.moveRight()',
  )
  assert.ok(potion.sound.count('potion') > 0)
})

test('语法被锁时发出提示音', async () => {
  const { result, sound } = await play('level-1', 'while (true) { hero.moveRight() }')
  assert.equal(result.error?.code, 'locked')
  assert.ok(sound.count('error') > 0)
})

test('英雄阵亡时发出失败音', async () => {
  const { result, sound } = await play('level-14', 'for (let i = 0; i < 20; i++) { hero.wait() }')
  assert.equal(result.status, 'lose')
  assert.ok(sound.count('lose') > 0)
  assert.equal(sound.count('win'), 0)
})
