/**
 * Web 音效播放器：用 Web Audio 的振荡器现场演奏 SOUND_BANK 里的音符序列。
 *
 * 好处是不带任何音频素材、延迟极低、音色可以随时改代码；
 * 浏览器要求先有用户交互才能出声，所以第一次点击/按键时会自动解锁。
 */

import { SOUND_BANK, noteToFrequency, type NoteSpec, type SoundName, type SoundPlayer } from '../core/audio'

type AudioContextCtor = typeof AudioContext

export class WebAudioPlayer implements SoundPlayer {
  private context: AudioContext | null = null
  private master: GainNode | null = null
  private noiseBuffer: AudioBuffer | null = null
  private muted = false
  private volume: number
  /** 同一音效的最小间隔，避免连击时糊成一片 */
  private lastPlayed = new Map<SoundName, number>()

  constructor(volume = 0.45) {
    this.volume = Math.max(0, Math.min(1, volume))
  }

  get supported(): boolean {
    return typeof window !== 'undefined' && !!(window.AudioContext || (window as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext)
  }

  /** 在第一次用户交互时调用，解锁浏览器的音频播放权限。 */
  unlock(): void {
    this.ensure()
  }

  setMuted(muted: boolean): void {
    this.muted = muted
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume))
    if (this.master) this.master.gain.value = this.volume
  }

  play(name: SoundName): void {
    if (this.muted) return
    const spec = SOUND_BANK[name]
    if (!spec) return

    const now = typeof performance !== 'undefined' ? performance.now() : Date.now()
    const last = this.lastPlayed.get(name) ?? -1000
    if (now - last < 30) return
    this.lastPlayed.set(name, now)

    const context = this.ensure()
    if (!context || !this.master) return

    let start = context.currentTime + 0.005
    for (const note of spec.notes) {
      this.scheduleNote(context, note, start)
      start += note.duration + (spec.gap ?? 0)
    }
  }

  dispose(): void {
    void this.context?.close()
    this.context = null
    this.master = null
    this.noiseBuffer = null
  }

  // ------------------------------------------------------------ 内部实现

  private ensure(): AudioContext | null {
    if (typeof window === 'undefined') return null
    const Ctor = window.AudioContext ?? (window as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext
    if (!Ctor) return null

    if (!this.context) {
      this.context = new Ctor()
      this.master = this.context.createGain()
      this.master.gain.value = this.volume
      this.master.connect(this.context.destination)
    }
    if (this.context.state === 'suspended') void this.context.resume()
    return this.context
  }

  private scheduleNote(context: AudioContext, note: NoteSpec, start: number): void {
    const peak = Math.max(0.0001, (note.gain ?? 1) * this.volume)
    const end = start + Math.max(0.02, note.duration)

    const oscillator = context.createOscillator()
    oscillator.type = note.wave ?? 'square'
    oscillator.frequency.setValueAtTime(noteToFrequency(note.note), start)
    if (note.glideTo) {
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, noteToFrequency(note.glideTo)), end)
    }

    const envelope = context.createGain()
    envelope.gain.setValueAtTime(0.0001, start)
    envelope.gain.linearRampToValueAtTime(peak, start + 0.008)
    envelope.gain.exponentialRampToValueAtTime(0.0001, end)

    oscillator.connect(envelope)
    envelope.connect(this.master as GainNode)
    oscillator.start(start)
    oscillator.stop(end + 0.02)

    if (note.noise) this.scheduleNoise(context, peak * note.noise, start, end)
  }

  /** 打击感：叠一层短促的白噪声 */
  private scheduleNoise(context: AudioContext, peak: number, start: number, end: number): void {
    if (!this.noiseBuffer) {
      const length = Math.floor(context.sampleRate * 0.3)
      const buffer = context.createBuffer(1, length, context.sampleRate)
      const data = buffer.getChannelData(0)
      for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1
      this.noiseBuffer = buffer
    }

    const source = context.createBufferSource()
    source.buffer = this.noiseBuffer
    const filter = context.createBiquadFilter()
    filter.type = 'highpass'
    filter.frequency.value = 900
    const gain = context.createGain()
    gain.gain.setValueAtTime(Math.max(0.0001, peak), start)
    gain.gain.exponentialRampToValueAtTime(0.0001, end)

    source.connect(filter)
    filter.connect(gain)
    gain.connect(this.master as GainNode)
    source.start(start)
    source.stop(end + 0.02)
  }
}
