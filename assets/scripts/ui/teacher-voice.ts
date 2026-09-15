/**
 * 老师提示语音：播放 assets/resources/teacher-voice 下的静态 MP3。
 *
 * 一条提示由「开头语 + 当前提示」两段组成，第一段放完后接第二段。
 * 播放走 HTMLAudioElement：浏览器、Electron 的 file:// 页面和离线单文件版都能用，
 * 也能和右上角的静音开关保持一致。
 *
 * 为了尽量避免「偶尔没声音」，这里刻意不做音频元素复用：
 *   - 每次播放都用全新的 Audio，避免上一段的 ended / 未结算的 play() 影响这一次；
 *   - play() 被拒绝时自动重试；
 *   - 开头语万一彻底放不出来，也要把提示本身接着放完；
 *   - 用看门狗兜住 ended 不触发的情况，第二段不会被无声卡死。
 */

import type { TeacherGender } from '../core/teacher'

export interface TeacherVoicePlayerOptions {
  /** 资源根路径，默认从当前页面相对定位到 assets/resources/teacher-voice */
  baseUrl?: string
  /** 加载或播放失败时的提示回调（同类问题只报一次，避免刷屏） */
  onError?: (message: string) => void
  /** 播放迟迟没有进度多久算卡住（毫秒），主要给测试用 */
  stallTimeoutMs?: number
  /** play() 失败后的重试间隔（毫秒），主要给测试用 */
  retryDelayMs?: number
}

type VoicePart = 'lead-0' | 'lead-1' | 'lead-2' | 'lead-3' | `level-${number}-${number}`

/** 单文件构建会把音频转成 data URL，通过这个全局量交给播放器。 */
interface EmbeddedTeacherVoice {
  [name: string]: string
}

declare global {
  // eslint-disable-next-line no-var
  var __DUNGEON_TEACHER_VOICE__: EmbeddedTeacherVoice | undefined
}

const DEFAULT_STALL_TIMEOUT_MS = 3500
const DEFAULT_RETRY_DELAY_MS = 140
const MAX_PLAY_ATTEMPTS = 2

/** 把老师性别映射到配音音色，方便以后单独换音。 */
export function teacherVoiceName(gender: TeacherGender): string {
  return gender === 'female' ? '琴' : '提纳里'
}

export class TeacherVoicePlayer {
  private baseUrl: string
  private onError?: (message: string) => void
  private stallTimeoutMs: number
  private retryDelayMs: number
  private muted = false
  private volume = 1
  /** 每次播放自增；用来让上一轮还没走完的异步流程立刻退出 */
  private token = 0
  private reported = new Set<string>()
  private preloadedKey = ''
  private playing = new Set<HTMLAudioElement>()
  private timers = new Set<ReturnType<typeof setTimeout>>()
  /** stop() 时要立刻唤醒正在等「这一段放完」的流程，避免异步永远挂着 */
  private waiters = new Set<() => void>()

  constructor(options: TeacherVoicePlayerOptions = {}) {
    this.baseUrl = options.baseUrl ?? resolveVoiceBaseUrl()
    this.onError = options.onError
    this.stallTimeoutMs = options.stallTimeoutMs ?? DEFAULT_STALL_TIMEOUT_MS
    this.retryDelayMs = options.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS
  }

  setMuted(muted: boolean): void {
    this.muted = muted
    for (const audio of this.playing) audio.volume = this.effectiveVolume()
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume))
    for (const audio of this.playing) audio.volume = this.effectiveVolume()
  }

  /** 停止当前语音，并取消还没播出的排期。 */
  stop(): void {
    this.token++
    for (const timer of this.timers) clearTimeout(timer)
    this.timers.clear()
    for (const resolve of Array.from(this.waiters)) resolve()
    this.waiters.clear()
    for (const audio of this.playing) {
      audio.pause()
      try {
        audio.currentTime = 0
      } catch {
        // 音频还没加载到可定位状态时忽略，下一次播放会用新元素从 0 开始
      }
    }
    this.playing.clear()
  }

  /** 预加载当前老师、当前关卡会用到的语音；换关卡或换老师时替换掉上一批。 */
  preload(gender: TeacherGender, levelId: string, hintCount: number): void {
    const levelNumber = levelNumberFromId(levelId)
    if (!levelNumber) return
    const key = `${gender}:${levelId}`
    if (this.preloadedKey === key) return

    this.preloadedKey = key

    const parts: VoicePart[] = []
    for (let lead = 0; lead < 4; lead++) parts.push(`lead-${lead}` as VoicePart)
    const count = Math.max(0, Math.floor(hintCount))
    for (let index = 0; index < count; index++) parts.push(`level-${levelNumber}-${index}` as VoicePart)

    // 触发浏览器把文件读进缓存；播放时仍然 new 一个新元素，避免复用带来的 AbortError。
    for (const part of parts) {
      const src = this.sourceFor(gender, part)
      if (src) this.createAudio(src, true)
    }
  }

  /**
   * 播放「开头语 + 提示」。
   *
   * @param leadIndex HINT_LEADS 里的下标
   * @param levelId 关卡 id
   * @param hintIndex 本关提示下标
   */
  async playHint(
    gender: TeacherGender,
    leadIndex: number,
    levelId: string,
    hintIndex: number,
  ): Promise<void> {
    const levelNumber = levelNumberFromId(levelId)
    if (!levelNumber) return

    const leadSrc = this.sourceFor(gender, `lead-${Math.max(0, Math.min(3, leadIndex))}` as VoicePart)
    const hintSrc = this.sourceFor(gender, `level-${levelNumber}-${hintIndex}` as VoicePart)
    if (!leadSrc || !hintSrc) return

    this.stop()
    const ownToken = this.token

    // 两段同时建好：提示在后面播，正好利用开头语的时间完成缓冲。
    const parts: HTMLAudioElement[] = []
    const lead = this.createAudio(leadSrc, true)
    const hint = this.createAudio(hintSrc, true)
    if (lead) parts.push(lead)
    if (hint) parts.push(hint)
    if (parts.length === 0) return

    this.playing = new Set(parts)
    // 在用户点击的手势里先把第二段「预热」一次：等到开头语结束、进入 ended
    // 回调时，这次点击的手势上下文已经过去，部分浏览器会按自动播放策略拒绝。
    // 这里用一次性元素同步发起 play()，既不占用真正要播的 hint 元素，
    // 也不会因为预热慢而拖住后面的正式播放。
    if (hint) {
      const primer = this.createAudio(hintSrc, true)
      if (primer) this.prime(primer)
    }

    for (const audio of parts) {
      if (ownToken !== this.token) return
      const started = await this.tryPlay(audio)
      if (ownToken !== this.token) return
      // 这一段没能放出来（例如被浏览器拒绝）就跳过它，别把后面整段拖没声
      if (!started) continue
      await this.waitForPart(audio)
    }
  }

  dispose(): void {
    this.stop()
    this.preloadedKey = ''
  }

  // ------------------------------------------------------------ 内部实现

  private sourceFor(gender: TeacherGender, part: VoicePart): string | null {
    const name = `${part}-${gender}.mp3`
    const embedded = typeof globalThis !== 'undefined' ? globalThis.__DUNGEON_TEACHER_VOICE__?.[name] : undefined
    if (embedded) return `data:audio/mpeg;base64,${embedded}`
    if (!this.baseUrl) return null
    return `${this.baseUrl}/${name}`
  }

  private createAudio(src: string, forPlayback: boolean): HTMLAudioElement | null {
    if (typeof Audio === 'undefined') return null
    const audio = new Audio(src)
    audio.preload = forPlayback ? 'auto' : 'metadata'
    audio.addEventListener('error', () => this.report('load', `[地牢围攻] 老师语音加载失败：${src}`))
    return audio
  }

  /**
   * 在手势内静音播一下就暂停，给元素留下「已被允许播放」的状态。
   * 这一步全程静音，听不到声音，也不会影响正在播的开头语。
   */
  private async prime(audio: HTMLAudioElement): Promise<void> {
    try {
      audio.muted = true
      audio.currentTime = 0
      await audio.play()
      audio.pause()
    } catch {
      // 预热失败不影响正式播放：tryPlay() 还会正常尝试并重试
    }
  }

  /** 播一段，失败会重试；返回是否真的开始播放。 */
  private async tryPlay(audio: HTMLAudioElement): Promise<boolean> {
    audio.volume = this.effectiveVolume()
    try {
      audio.currentTime = 0
    } catch {
      // 见 stop()：尚未加载完时忽略，由浏览器从默认起点开始
    }

    for (let attempt = 1; attempt <= MAX_PLAY_ATTEMPTS; attempt++) {
      try {
        await audio.play()
        return true
      } catch (error) {
        // AbortError 是我们自己 stop() 打断的，不算故障
        if (isCancelled(error)) return false
        if (attempt < MAX_PLAY_ATTEMPTS) await delay(this.retryDelayMs)
      }
    }

    this.report('play', `[地牢围攻] 老师语音播放被拒绝：${audio.src}`)
    return false
  }

  /** 等这一段放完、报错或卡住（长时间没有播放进度）。 */
  private waitForPart(audio: HTMLAudioElement): Promise<void> {
    return new Promise((resolve) => {
      let settled = false
      let stall: ReturnType<typeof setTimeout> | undefined

      const finish = () => {
        if (settled) return
        settled = true
        this.waiters.delete(finish)
        audio.removeEventListener('ended', finish)
        audio.removeEventListener('error', finish)
        audio.removeEventListener('timeupdate', armStall)
        audio.removeEventListener('pause', finish)
        if (stall !== undefined) {
          clearTimeout(stall)
          this.timers.delete(stall)
        }
        resolve()
      }

      this.waiters.add(finish)

      const armStall = () => {
        if (stall !== undefined) {
          clearTimeout(stall)
          this.timers.delete(stall)
        }
        stall = setTimeout(finish, this.stallTimeoutMs)
        this.timers.add(stall)
      }

      audio.addEventListener('ended', finish)
      audio.addEventListener('error', finish)
      audio.addEventListener('timeupdate', armStall)
      // 暂停（例如被下一次点击 stop 掉）说明这一段不会再继续，别白等看门狗
      audio.addEventListener('pause', finish)
      armStall()
    })
  }

  private effectiveVolume(): number {
    return this.muted ? 0 : this.volume
  }

  private report(kind: 'load' | 'play', message: string): void {
    if (this.reported.has(kind)) return
    this.reported.add(kind)
    console.warn(message)
    this.onError?.(message)
  }
}

function isCancelled(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { name?: string }).name === 'AbortError'
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function levelNumberFromId(levelId: string): number | null {
  const match = /^level-(\d+)$/.exec(levelId)
  return match ? Number(match[1]) : null
}

/**
 * 普通构建放在 dist/assets/resources/teacher-voice，单文件版使用内嵌 data URL。
 * 浏览器预览的页面在 /preview/ 下，但资源仍从站点根目录的 /assets/ 提供。
 */
function resolveVoiceBaseUrl(): string {
  if (typeof document === 'undefined') return ''
  const location = document.location
  if (/^https?:$/.test(location.protocol) && location.pathname.startsWith('/preview/')) {
    return new URL('/assets/resources/teacher-voice', location.origin).href
  }
  return new URL('assets/resources/teacher-voice', document.baseURI).href
}
