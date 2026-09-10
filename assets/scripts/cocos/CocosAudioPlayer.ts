/**
 * Cocos 原生平台的音效播放器：从 assets/resources/audio/<名字>.wav 加载并播放。
 *
 * Web 平台请用 ui/audio-web.ts 的合成器（零素材、延迟低）；
 * 这个实现是给 iOS / Android / 桌面这类没有 Web Audio 的环境准备的，
 * 音频文件由 `npm run audio:wav` 从同一份音符数据生成。
 */

import { AudioClip, AudioSource, Node, resources } from 'cc'

import { SOUND_NAMES, type SoundName, type SoundPlayer } from '../core/audio'

export interface CocosAudioOptions {
  /** 挂载 AudioSource 的父节点 */
  parent: Node
  /** resources 下的目录名，默认 audio */
  folder?: string
  /** 音量 0~1 */
  volume?: number
}

export class CocosAudioPlayer implements SoundPlayer {
  private source: AudioSource
  private clips = new Map<SoundName, AudioClip>()
  private loading = new Set<SoundName>()
  private folder: string
  private volume: number
  private muted = false

  constructor(options: CocosAudioOptions) {
    const node = new Node('Audio')
    node.parent = options.parent
    this.source = node.addComponent(AudioSource)
    this.source.playOnAwake = false
    this.folder = options.folder ?? 'audio'
    this.volume = options.volume ?? 0.7
    this.preload()
  }

  /**
   * 启动时一次性加载全部音效。
   * 否则第一次响某个音效时它还在异步加载，会直接听不到——听起来就像「漏了一拍」。
   */
  private preload(): void {
    const paths = SOUND_NAMES.map((name) => `${this.folder}/${name}`)
    resources.load(paths, AudioClip, (error, assets) => {
      if (error || !assets) {
        console.warn(`[地牢围攻] 音效资源加载失败，可执行 npm run audio:wav 生成 assets/resources/${this.folder}/`)
        return
      }
      const list = Array.isArray(assets) ? assets : [assets]
      list.forEach((asset, index) => {
        const name = SOUND_NAMES[index]
        if (name && asset) this.clips.set(name, asset)
      })
    })
  }

  play(name: SoundName): void {
    if (this.muted) return
    const clip = this.clips.get(name)
    if (clip) {
      this.source.playOneShot(clip, this.volume)
      return
    }
    if (this.loading.has(name)) return
    this.loading.add(name)
    resources.load(`${this.folder}/${name}`, AudioClip, (error, asset) => {
      this.loading.delete(name)
      if (error || !asset) {
        console.warn(`[地牢围攻] 缺少音效 assets/resources/${this.folder}/${name}.wav，可执行 npm run audio:wav 生成`)
        return
      }
      this.clips.set(name, asset)
    })
  }

  setMuted(muted: boolean): void {
    this.muted = muted
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume))
  }
}
