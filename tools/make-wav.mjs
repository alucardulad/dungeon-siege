/**
 * 把音效数据渲染成 WAV 文件，输出到 assets/resources/audio/。
 *
 * 用途：Cocos 的原生构建（iOS / Android / 桌面）没有 Web Audio，
 * CocosAudioPlayer 会用 resources.load 加载这里的 wav。
 * Web 平台不需要这些文件，直接用合成器。
 *
 * 用法：npm run audio:wav
 */

import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const outputDir = resolve(root, 'assets/resources/audio')
const { SOUND_BANK, noteToFrequency, soundDuration } = await import(
  pathToFileURL(resolve(root, 'assets/scripts/core/audio.ts')).href
)

const SAMPLE_RATE = 44100

/** 把一段音效渲染成 [-1, 1] 的浮点采样 */
function render(spec) {
  const totalSamples = Math.ceil(soundDuration(spec) * SAMPLE_RATE) + Math.ceil(0.05 * SAMPLE_RATE)
  const samples = new Float32Array(totalSamples)

  let cursor = 0
  for (const note of spec.notes) {
    const duration = Math.max(0.02, note.duration)
    const length = Math.floor(duration * SAMPLE_RATE)
    const startFreq = noteToFrequency(note.note)
    const endFreq = note.glideTo ? noteToFrequency(note.glideTo) : startFreq
    const gain = note.gain ?? 1
    let phase = 0

    for (let i = 0; i < length; i++) {
      const progress = i / Math.max(1, length - 1)
      const frequency = startFreq * Math.pow(endFreq / startFreq, progress)
      phase += (frequency / SAMPLE_RATE) * Math.PI * 2

      const wave = waveAt(note.wave ?? 'square', phase)
      // 起音 8ms 淡入，其余时间指数衰减，避免爆音
      const attack = Math.min(1, i / (0.008 * SAMPLE_RATE))
      const decay = Math.pow(1 - progress, 1.6)
      let value = wave * gain * attack * decay
      if (note.noise) value += (Math.random() * 2 - 1) * note.noise * attack * decay
      samples[cursor + i] += value
    }

    cursor += length + Math.floor((spec.gap ?? 0) * SAMPLE_RATE)
  }

  return samples
}

function waveAt(shape, phase) {
  switch (shape) {
    case 'sine':
      return Math.sin(phase)
    case 'triangle':
      return (2 / Math.PI) * Math.asin(Math.sin(phase))
    case 'sawtooth': {
      const normalized = ((phase / (Math.PI * 2)) % 1 + 1) % 1
      return normalized * 2 - 1
    }
    default: {
      const normalized = ((phase / (Math.PI * 2)) % 1 + 1) % 1
      return normalized < 0.5 ? 1 : -1
    }
  }
}

function encodeWav(samples) {
  const dataLength = samples.length * 2
  const buffer = Buffer.alloc(44 + dataLength)

  buffer.write('RIFF', 0, 'ascii')
  buffer.writeUInt32LE(36 + dataLength, 4)
  buffer.write('WAVE', 8, 'ascii')
  buffer.write('fmt ', 12, 'ascii')
  buffer.writeUInt32LE(16, 16) // fmt 块长度
  buffer.writeUInt16LE(1, 20) // PCM
  buffer.writeUInt16LE(1, 22) // 单声道
  buffer.writeUInt32LE(SAMPLE_RATE, 24)
  buffer.writeUInt32LE(SAMPLE_RATE * 2, 28) // 字节率
  buffer.writeUInt16LE(2, 32) // 块对齐
  buffer.writeUInt16LE(16, 34) // 位深
  buffer.write('data', 36, 'ascii')
  buffer.writeUInt32LE(dataLength, 40)

  for (let i = 0; i < samples.length; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i] * 0.8))
    buffer.writeInt16LE(Math.round(clamped * 32767), 44 + i * 2)
  }
  return buffer
}

mkdirSync(outputDir, { recursive: true })
let count = 0
let bytes = 0
for (const [name, spec] of Object.entries(SOUND_BANK)) {
  const wav = encodeWav(render(spec))
  writeFileSync(resolve(outputDir, `${name}.wav`), wav)
  count++
  bytes += wav.length
}

console.log(`已生成 ${count} 个 WAV 到 assets/resources/audio/（共 ${(bytes / 1024).toFixed(1)} KB）`)
console.log('这些文件供 Cocos 原生平台使用；Web 平台用的是现场合成。')
