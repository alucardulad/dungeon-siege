/**
 * 音效系统：用「音符序列」描述音效，运行时现场合成。
 *
 * 为什么不直接放 .mid 文件？因为 MIDI 只是乐谱，浏览器和 Cocos 都没有内置合成器，
 * 直接播放 .mid 是没声音的。所以这里把音效定义成数据（音名 + 时值 + 波形），
 * 运行时用振荡器演奏出来——本质就是「MIDI 的思路」。
 *
 * `npm run audio` 会把同一份数据导出成真正的 .mid 与 .wav 文件（见 tools/），
 * 方便你在 DAW 里改、或者给原生平台用。
 */

export type SoundName =
  | 'move'
  | 'swing'
  | 'hit'
  | 'hurt'
  | 'blocked'
  | 'spike'
  | 'gem'
  | 'potion'
  | 'kill'
  | 'win'
  | 'lose'
  | 'error'

export type WaveShape = 'square' | 'triangle' | 'sine' | 'sawtooth'

export interface NoteSpec {
  /** 音名，例如 C4 / F#5 / Bb3 */
  note: string
  /** 时值（秒） */
  duration: number
  /** 波形，默认 square（8-bit 味） */
  wave?: WaveShape
  /** 相对音量 0~1，默认 1 */
  gain?: number
  /** 叠一层白噪声的强度 0~1，用于打击感 */
  noise?: number
  /** 从当前音滑到目标音名（做挥砍、坠落这类效果） */
  glideTo?: string
}

export interface SoundSpec {
  notes: NoteSpec[]
  /** 音符之间的额外间隔（秒） */
  gap?: number
}

/** 音效库：想改音色，改这里就行，两个引擎和导出的 MIDI/WAV 都会跟着变。 */
export const SOUND_BANK: Record<SoundName, SoundSpec> = {
  // 脚步：短促、轻
  move: { notes: [{ note: 'A4', duration: 0.045, wave: 'triangle', gain: 0.3, noise: 0.2 }] },
  // 挥剑：高频下滑
  swing: { notes: [{ note: 'D6', duration: 0.07, wave: 'square', gain: 0.22, glideTo: 'A5' }] },
  // 命中敌人：两下短促的撞击
  hit: {
    notes: [
      { note: 'A5', duration: 0.05, wave: 'square', gain: 0.38, noise: 0.3 },
      { note: 'E5', duration: 0.09, wave: 'square', gain: 0.3, noise: 0.2 },
    ],
  },
  // 英雄受伤：低沉下坠
  hurt: {
    notes: [
      { note: 'A3', duration: 0.09, wave: 'sawtooth', gain: 0.32 },
      { note: 'F3', duration: 0.16, wave: 'sawtooth', gain: 0.26, glideTo: 'D3' },
    ],
  },
  // 撞墙 / 撞到敌人：闷响
  blocked: { notes: [{ note: 'D#3', duration: 0.1, wave: 'square', gain: 0.28, noise: 0.45 }] },
  // 踩到尖刺：刺耳
  spike: {
    notes: [
      { note: 'F#4', duration: 0.06, wave: 'square', gain: 0.32, noise: 0.25 },
      { note: 'C4', duration: 0.13, wave: 'square', gain: 0.28 },
    ],
  },
  // 捡到宝石：清脆上行
  gem: {
    notes: [
      { note: 'E6', duration: 0.06, wave: 'sine', gain: 0.32 },
      { note: 'G6', duration: 0.11, wave: 'sine', gain: 0.28 },
    ],
  },
  // 喝药水：柔和上行三音
  potion: {
    notes: [
      { note: 'C5', duration: 0.07, wave: 'triangle', gain: 0.28 },
      { note: 'E5', duration: 0.07, wave: 'triangle', gain: 0.28 },
      { note: 'G5', duration: 0.12, wave: 'triangle', gain: 0.3 },
    ],
  },
  // 击败敌人：下行三音
  kill: {
    notes: [
      { note: 'E5', duration: 0.07, wave: 'triangle', gain: 0.32 },
      { note: 'C5', duration: 0.07, wave: 'triangle', gain: 0.3 },
      { note: 'A4', duration: 0.14, wave: 'triangle', gain: 0.28 },
    ],
  },
  // 通关：小号角
  win: {
    notes: [
      { note: 'C5', duration: 0.11, wave: 'triangle', gain: 0.34 },
      { note: 'E5', duration: 0.11, wave: 'triangle', gain: 0.34 },
      { note: 'G5', duration: 0.11, wave: 'triangle', gain: 0.34 },
      { note: 'C6', duration: 0.3, wave: 'triangle', gain: 0.4 },
    ],
  },
  // 失败：缓慢下行
  lose: {
    notes: [
      { note: 'G4', duration: 0.16, wave: 'triangle', gain: 0.32 },
      { note: 'F4', duration: 0.16, wave: 'triangle', gain: 0.32 },
      { note: 'D#4', duration: 0.16, wave: 'triangle', gain: 0.32 },
      { note: 'C4', duration: 0.34, wave: 'triangle', gain: 0.34 },
    ],
  },
  // 代码报错 / 语法锁：两声警告
  error: {
    notes: [
      { note: 'A3', duration: 0.12, wave: 'square', gain: 0.26 },
      { note: 'G#3', duration: 0.2, wave: 'square', gain: 0.24 },
    ],
  },
}

/** 播放接口：Web 用振荡器，Cocos 原生可以用 resources 里的音频文件。 */
export interface SoundPlayer {
  play(name: SoundName): void
  setMuted?(muted: boolean): void
  setVolume?(volume: number): void
  dispose?(): void
}

/** 什么都不播（测试与静音场景用）。 */
export class SilentPlayer implements SoundPlayer {
  play(): void {}
}

const SEMITONES: Record<string, number> = {
  C: 0,
  'C#': 1,
  Db: 1,
  D: 2,
  'D#': 3,
  Eb: 3,
  E: 4,
  F: 5,
  'F#': 6,
  Gb: 6,
  G: 7,
  'G#': 8,
  Ab: 8,
  A: 9,
  'A#': 10,
  Bb: 10,
  B: 11,
}

/** 音名 → MIDI 音高编号（A4 = 69）。 */
export function noteToMidi(note: string): number {
  const match = /^([A-Ga-g])([#b]?)(-?\d)$/.exec(note.trim())
  if (!match) throw new Error(`无法识别的音名：${note}`)
  const semitone = SEMITONES[match[1].toUpperCase() + match[2]]
  if (semitone === undefined) throw new Error(`无法识别的音名：${note}`)
  return (Number(match[3]) + 1) * 12 + semitone
}

/** 音名 → 频率（Hz），A4 = 440。 */
export function noteToFrequency(note: string): number {
  return 440 * Math.pow(2, (noteToMidi(note) - 69) / 12)
}

/** 一段音效总时长（秒），导出 WAV 时用来算长度。 */
export function soundDuration(spec: SoundSpec): number {
  const total = spec.notes.reduce((sum, note) => sum + note.duration, 0)
  return total + (spec.gap ?? 0) * Math.max(0, spec.notes.length - 1)
}

export const SOUND_NAMES = Object.keys(SOUND_BANK) as SoundName[]
