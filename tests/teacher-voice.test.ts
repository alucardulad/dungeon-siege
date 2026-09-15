import assert from 'node:assert/strict'
import { readFileSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'

import { LEVELS } from '../assets/scripts/core/levels'
import { HINT_LEADS } from '../assets/scripts/core/teacher'
import { teacherVoiceName } from '../assets/scripts/ui/teacher-voice'

interface VoiceManifest {
  voices: Record<'female' | 'male', { speaker: string; speed: number }>
  clips: Array<{ key: string }>
}

const voiceDir = resolve(process.cwd(), 'assets/resources/teacher-voice')
const manifest = JSON.parse(readFileSync(resolve(voiceDir, 'manifest.json'), 'utf8')) as VoiceManifest

test('男女老师分别使用琴和提纳里，台词按关卡完整拆成语音片段', () => {
  assert.equal(teacherVoiceName('female'), '琴')
  assert.equal(teacherVoiceName('male'), '提纳里')
  assert.equal(manifest.voices.female.speaker, '琴')
  assert.equal(manifest.voices.male.speaker, '提纳里')

  const expected = HINT_LEADS.length + LEVELS.reduce((sum, level) => sum + level.hints.length, 0)
  assert.equal(manifest.clips.length, expected)
  assert.equal(new Set(manifest.clips.map((clip) => clip.key)).size, expected)
})

test('每段提示都有男女两套非空 mp3', () => {
  for (const clip of manifest.clips) {
    for (const gender of ['female', 'male'] as const) {
      const file = resolve(voiceDir, `${clip.key}-${gender}.mp3`)
      assert.ok(statSync(file).size > 1024, `${clip.key}-${gender}.mp3 缺失或内容异常`)
    }
  }
})
