/**
 * 生成老师提示语音清单。
 *
 * 清单只描述“哪段文字对应哪个文件”，真正的音频由本地原神 TTS
 * 通过 tools/synthesize-teacher-voice.py 批量合成。
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { LEVELS } from '../assets/scripts/core/levels.ts'
import { HINT_LEADS } from '../assets/scripts/core/teacher.ts'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = resolve(root, 'assets/resources/teacher-voice')
const manifestPath = resolve(outDir, 'manifest.json')

const clips = HINT_LEADS.map((text, index) => ({
  key: `lead-${index}`,
  kind: 'lead',
  index,
  text,
}))

for (const level of LEVELS) {
  level.hints.forEach((text, index) => {
    clips.push({
      key: `${level.id}-${index}`,
      kind: 'hint',
      levelId: level.id,
      index,
      text,
    })
  })
}

const manifest = {
  version: 1,
  sampleRate: 44100,
  voices: {
    female: { speaker: '琴', speed: 1 },
    male: { speaker: '提纳里', speed: 1 },
  },
  clips,
}

await mkdir(outDir, { recursive: true })
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
console.log(`已生成语音清单：${manifestPath}（${clips.length} 段 × 2 位老师）`)
