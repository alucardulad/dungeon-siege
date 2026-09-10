/**
 * 把 core/audio.ts 里的音效数据导出成真正的 MIDI 文件（放到 audio/midi/）。
 *
 * 说明：游戏运行时不会播这些 .mid（浏览器和 Cocos 都没有内置 MIDI 合成器），
 * 运行时是用 Web Audio 现场演奏同一份音符数据。导出 MIDI 是为了让你能
 * 在 DAW / 编曲软件里直接改音色和旋律，改完再把音名抄回 audio.ts。
 *
 * 用法：npm run audio:midi
 */

import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const outputDir = resolve(root, 'audio/midi')
const { SOUND_BANK, noteToMidi } = await import(pathToFileURL(resolve(root, 'assets/scripts/core/audio.ts')).href)

const PPQ = 480
const BPM = 120
const TICKS_PER_SECOND = (PPQ * BPM) / 60

/** MIDI 的可变长度数量（VLQ）编码 */
function variableLength(value) {
  const bytes = [value & 0x7f]
  let rest = value >> 7
  while (rest > 0) {
    bytes.unshift((rest & 0x7f) | 0x80)
    rest >>= 7
  }
  return Buffer.from(bytes)
}

function chunk(id, payload) {
  const header = Buffer.alloc(8)
  header.write(id, 0, 'ascii')
  header.writeUInt32BE(payload.length, 4)
  return Buffer.concat([header, payload])
}

function buildMidi(spec) {
  const events = []
  // 速度：120 BPM
  events.push(Buffer.concat([variableLength(0), Buffer.from([0xff, 0x51, 0x03, 0x07, 0xa1, 0x20])]))
  // 音色：80 = Lead 1 (square)，和游戏里的方波接近
  events.push(Buffer.concat([variableLength(0), Buffer.from([0xc0, 80])]))

  for (const note of spec.notes) {
    const midi = noteToMidi(note.note)
    const velocity = Math.max(1, Math.min(127, Math.round((note.gain ?? 1) * 110)))
    events.push(Buffer.concat([variableLength(0), Buffer.from([0x90, midi, velocity])]))
    const ticks = Math.max(1, Math.round(note.duration * TICKS_PER_SECOND))
    events.push(Buffer.concat([variableLength(ticks), Buffer.from([0x80, midi, 0])]))
  }

  events.push(Buffer.concat([variableLength(0), Buffer.from([0xff, 0x2f, 0x00])]))

  const header = Buffer.alloc(6)
  header.writeUInt16BE(0, 0) // format 0
  header.writeUInt16BE(1, 2) // 1 条轨道
  header.writeUInt16BE(PPQ, 4)

  return Buffer.concat([chunk('MThd', header), chunk('MTrk', Buffer.concat(events))])
}

mkdirSync(outputDir, { recursive: true })
let count = 0
for (const [name, spec] of Object.entries(SOUND_BANK)) {
  const file = resolve(outputDir, `${name}.mid`)
  writeFileSync(file, buildMidi(spec))
  count++
}

console.log(`已导出 ${count} 个 MIDI 文件到 audio/midi/`)
console.log('提示：这些文件用于编曲或参考，游戏运行时是现场合成同一份音符数据。')
