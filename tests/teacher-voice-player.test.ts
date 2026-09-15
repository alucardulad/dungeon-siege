import assert from 'node:assert/strict'
import test from 'node:test'

import { TeacherVoicePlayer } from '../assets/scripts/ui/teacher-voice'

/** 只实现播放器用到的那部分 HTMLAudioElement，够验证播放流程。 */
class FakeAudio {
  static instances: FakeAudio[] = []
  /** 前 N 次 play() 直接拒绝，用来模拟自动播放策略拦截 */
  static failNextPlays = 0
  /** 这些 URL 上的 play() 永远失败 */
  static blockedSources = new Set<string>()

  src: string
  preload = ''
  volume = 1
  muted = false
  currentTime = 0
  paused = true
  ended = false
  playCalls = 0
  pauseCalls = 0
  private listeners = new Map<string, Set<() => void>>()

  constructor(src: string) {
    this.src = src
    FakeAudio.instances.push(this)
  }

  addEventListener(type: string, listener: () => void): void {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set())
    this.listeners.get(type)!.add(listener)
  }

  removeEventListener(type: string, listener: () => void): void {
    this.listeners.get(type)?.delete(listener)
  }

  emit(type: string): void {
    for (const listener of Array.from(this.listeners.get(type) ?? [])) listener()
  }

  async play(): Promise<void> {
    this.playCalls++
    if (FakeAudio.blockedSources.has(this.src)) {
      const error = new Error('blocked')
      error.name = 'NotAllowedError'
      throw error
    }
    if (FakeAudio.failNextPlays > 0) {
      FakeAudio.failNextPlays--
      const error = new Error('blocked')
      error.name = 'NotAllowedError'
      throw error
    }
    this.paused = false
  }

  pause(): void {
    this.pauseCalls++
    this.paused = true
    this.emit('pause')
  }
}

function installFakeAudio(): void {
  FakeAudio.instances = []
  FakeAudio.failNextPlays = 0
  FakeAudio.blockedSources = new Set()
  ;(globalThis as { Audio?: unknown }).Audio = FakeAudio
}

function tick(ms = 5): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

test('一次提示会依次播放开头语和提示，并各自来自对应音频文件', async () => {
  installFakeAudio()
  const player = new TeacherVoicePlayer({ baseUrl: 'http://voice.test', retryDelayMs: 1, stallTimeoutMs: 60 })
  const playback = player.playHint('female', 0, 'level-1', 0)

  // 等 playHint 走到「等开头语结束」
  await tick()
  assert.equal(FakeAudio.instances[0].src, 'http://voice.test/lead-0-female.mp3')
  assert.equal(FakeAudio.instances[0].playCalls >= 1, true)

  FakeAudio.instances[0].ended = true
  FakeAudio.instances[0].emit('ended')
  await playback

  const hint = FakeAudio.instances.find((audio) => audio.src.includes('level-1-0-female.mp3'))
  assert.ok(hint, '应该创建提示音频')
  assert.ok(hint.playCalls >= 1, '开头语结束后提示应该开始播放')
})

test('第二段被自动播放策略拒绝时会重试，而不是静默没声', async () => {
  installFakeAudio()
  const player = new TeacherVoicePlayer({ baseUrl: 'http://voice.test', retryDelayMs: 1, stallTimeoutMs: 60 })
  const playback = player.playHint('male', 1, 'level-2', 0)

  await tick()
  const lead = FakeAudio.instances.find((audio) => audio.src.includes('lead-1-male.mp3'))
  const hint = FakeAudio.instances.find((audio) => audio.src.includes('level-2-0-male.mp3'))
  assert.ok(lead && hint)

  // 断言：开头语播完后，提示至少被尝试播放过（prime + 正式播放）
  lead.ended = true
  lead.emit('ended')
  await playback
  assert.ok(hint.playCalls >= 1, `提示播放次数应大于 0，实际 ${hint.playCalls}`)
})

test('开头语彻底放不出来时，仍要继续把提示放完', async () => {
  installFakeAudio()
  FakeAudio.blockedSources.add('http://voice.test/lead-0-female.mp3')

  const player = new TeacherVoicePlayer({ baseUrl: 'http://voice.test', retryDelayMs: 1, stallTimeoutMs: 60 })
  await player.playHint('female', 0, 'level-1', 0)

  const hint = FakeAudio.instances.find((audio) => audio.src.includes('level-1-0-female.mp3'))
  assert.ok(hint, '应该创建提示音频')
  assert.ok(hint.playCalls >= 1, '开头语失败后提示仍应播放')
})

test('快速连点会打断上一条语音，不会让两条语音重叠', async () => {
  installFakeAudio()
  const player = new TeacherVoicePlayer({ baseUrl: 'http://voice.test', retryDelayMs: 1, stallTimeoutMs: 60 })
  const first = player.playHint('female', 0, 'level-1', 0)
  await tick()
  const firstLead = FakeAudio.instances[0]

  const second = player.playHint('female', 2, 'level-3', 1)
  await tick()
  assert.ok(firstLead.pauseCalls >= 1, '连点时应暂停上一条语音')

  firstLead.ended = true
  firstLead.emit('ended')
  await Promise.all([first, second])
})
