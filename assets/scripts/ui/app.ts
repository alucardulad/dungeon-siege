/**
 * 界面装配层：关卡面板 + 代码编辑器 + 控制台 + 结算弹窗。
 *
 * 这一层只碰 DOM 与调度，不碰游戏规则（规则在 core/），也不碰画面绘制
 * （画面通过 StageView 接口交给调用方）：
 *   - 浏览器预览：传入 Canvas2D 渲染器
 *   - Cocos Creator：传 null，由 Cocos 自己的 update 驱动绘制
 */

import {
  CHAPTERS,
  FEATURE_LABEL,
  Game,
  LEVELS,
  findChapter,
  levelsOfChapter,
  teacherForHero,
  teacherIntro,
  teacherWin,
  type Frame,
  type LanguageFeature,
  type LevelDef,
  type RunResult,
  type ScriptError,
} from '../core/index'
import type { SoundPlayer } from '../core/audio'
import { WebAudioPlayer } from './audio-web'
import { CodeEditor } from './editor'
import { UI_MARKUP } from './markup'
import { UI_STYLES } from './styles'

/** 画面渲染接口：只有「把一帧画出来」这一件事。 */
export interface StageView {
  render(frame: Frame): void
}

export interface GameUIOptions {
  /** UI 挂到哪个容器，默认 document.body */
  container?: HTMLElement
  /**
   * 画面的渲染器工厂。界面会建好 canvas 再交给它。
   * Cocos 版不传（画面由引擎自己的 update 负责绘制）。
   */
  createStage?: (canvas: HTMLCanvasElement, host: HTMLElement) => StageView
  /** 是否由界面自己驱动 requestAnimationFrame；Cocos 版传 false */
  driveFrames?: boolean
  levels?: LevelDef[]
  storageKey?: string
  /** 切换到新关卡时通知外部（例如让 Cocos 重新绑定 Game） */
  onLevelChange?: (level: LevelDef, game: Game) => void
  /** 音效播放器；不传就自动建一个 Web 合成器（原生平台可传 file 版实现） */
  audio?: SoundPlayer
}

export interface GameUIHandle {
  readonly game: Game
  readonly editor: CodeEditor
  run(): Promise<void>
  stop(): void
  reset(): void
  showAnswer(): void
  dispose(): void
}

interface Progress {
  stars: number
  actions: number
}

interface SaveData {
  code: Record<string, string>
  progress: Record<string, Progress>
}

interface Profile {
  name: string
  gender: 'male' | 'female'
}

function injectStyles(doc: Document): void {
  if (doc.getElementById('dungeon-siege-styles')) return
  const style = doc.createElement('style')
  style.id = 'dungeon-siege-styles'
  style.textContent = UI_STYLES
  doc.head.appendChild(style)
}

export function mountGameUI(options: GameUIOptions = {}): GameUIHandle {
  const doc = options.container?.ownerDocument ?? document
  const levels = options.levels ?? LEVELS
  const storageKey = options.storageKey ?? 'dungeon-siege:v1'
  const muteKey = `${storageKey}:muted`
  const driveFrames = options.driveFrames ?? true

  injectStyles(doc)

  const root = options.container ?? doc.body
  const app = doc.createElement('div')
  app.className = 'ds-app'
  app.innerHTML = UI_MARKUP
  root.appendChild(app)

  const $ = <T extends HTMLElement>(id: string): T => app.querySelector(`#${id}`) as T

  const levelListEl = $<HTMLElement>('ds-level-list')
  const chaptersEl = $<HTMLElement>('ds-chapters')
  const progressEl = $<HTMLElement>('ds-progress')
  const levelNameEl = $<HTMLElement>('ds-level-name')
  const levelSubtitleEl = $<HTMLElement>('ds-level-subtitle')
  const objectiveEl = $<HTMLElement>('ds-objective')
  const syntaxEl = $<HTMLElement>('ds-syntax')
  const commandsEl = $<HTMLElement>('ds-commands')
  const hintsEl = $<HTMLElement>('ds-hints')
  const statsEl = $<HTMLElement>('ds-stats')
  const statusEl = $<HTMLElement>('ds-status')
  const consoleEl = $<HTMLElement>('ds-console')
  const teacherAvatarEl = $<HTMLElement>('ds-teacher-avatar')
  const teacherNameEl = $<HTMLElement>('ds-teacher-name')
  const teacherTextEl = $<HTMLElement>('ds-teacher-text')
  const overlayEl = $<HTMLElement>('ds-overlay')
  const dialogEl = $<HTMLElement>('ds-dialog')
  const canvasHost = $<HTMLElement>('ds-canvas-host')
  const runButton = $<HTMLButtonElement>('ds-run')
  const stopButton = $<HTMLButtonElement>('ds-stop')
  const resetButton = $<HTMLButtonElement>('ds-reset')
  const answerButton = $<HTMLButtonElement>('ds-answer')
  const profileButton = $<HTMLButtonElement>('ds-profile')
  const heroNameEl = $<HTMLElement>('ds-hero-name')
  const heroAvatarEl = $<HTMLElement>('ds-profile-avatar')
  const loginEl = $<HTMLElement>('ds-login')
  const loginNameEl = $<HTMLInputElement>('ds-login-name')
  const loginStartButton = $<HTMLButtonElement>('ds-login-start')
  const genderPickerEl = $<HTMLElement>('ds-gender-picker')

  // 浏览器预览需要一块画布交给 Canvas2D 渲染器
  let stage: StageView | null = null
  if (options.createStage) {
    const canvas = doc.createElement('canvas')
    canvas.id = 'ds-stage-canvas'
    canvasHost.appendChild(canvas)
    stage = options.createStage(canvas, canvasHost)
  }

  const save = loadSave(storageKey)
  const audio: SoundPlayer = options.audio ?? new WebAudioPlayer()
  let muted = doc.defaultView?.localStorage?.getItem(muteKey) === '1'
  const profileKey = `${storageKey}:profile`
  let profile = loadProfile()
  let heroGender: 'male' | 'female' = profile?.gender ?? 'male'
  let heroName: string = profile?.name ?? '英雄'
  let selectedGender: 'male' | 'female' = heroGender
  let teacher = teacherForHero(heroGender)
  /** 本关连续失败次数，用来逐条给出提示 */
  let failCount = 0
  /** 上一次写进 DOM 的状态签名：值没变就不碰 DOM，减少主线程卡顿（卡顿会拖慢音效排期） */
  let statsSignature = ''
  let logsSignature = ''

  let currentIndex = 0
  let currentChapterId = LEVELS[0].chapter
  const makeGame = () => new Game(currentLevel(), { audio, heroGender, heroName })
  let game = makeGame()
  let running = false
  let logElements = new Map<number, HTMLElement>()
  let scrollConsole = false
  let disposed = false

  const editor = new CodeEditor($<HTMLElement>('ds-editor-host'), {
    initial: save.code[levels[0].id] ?? levels[0].starter,
    onChange: (value) => {
      save.code[levels[currentIndex].id] = value
      persist()
    },
    onRun: () => void runCode(),
  })

  function currentLevel(): LevelDef {
    return levels[currentIndex]
  }

  function loadSave(key: string): SaveData {
    try {
      const raw = doc.defaultView?.localStorage?.getItem(key)
      if (!raw) return { code: {}, progress: {} }
      const parsed = JSON.parse(raw) as Partial<SaveData>
      return { code: parsed.code ?? {}, progress: parsed.progress ?? {} }
    } catch {
      return { code: {}, progress: {} }
    }
  }

  function persist(): void {
    try {
      doc.defaultView?.localStorage?.setItem(storageKey, JSON.stringify(save))
    } catch {
      // 隐私模式下 localStorage 可能不可用，忽略即可
    }
  }

  function loadProfile(): Profile | null {
    try {
      const raw = doc.defaultView?.localStorage?.getItem(profileKey)
      if (!raw) return null
      const parsed = JSON.parse(raw) as Partial<Profile>
      if (parsed && typeof parsed.name === 'string' && (parsed.gender === 'male' || parsed.gender === 'female')) {
        return { name: parsed.name.slice(0, 12), gender: parsed.gender }
      }
    } catch {
      // 忽略损坏的存档
    }
    return null
  }

  function persistProfile(): void {
    try {
      doc.defaultView?.localStorage?.setItem(profileKey, JSON.stringify({ name: heroName, gender: heroGender }))
    } catch {
      // 隐私模式忽略
    }
  }

  // ------------------------------------------------------------ 关卡与状态

  function buildChapters(): void {
    chaptersEl.innerHTML = ''
    for (const chapter of CHAPTERS) {
      const button = doc.createElement('button')
      button.className = 'ds-chapter-chip'
      button.type = 'button'
      button.textContent = chapter.name.replace(/^第 (\d+) 章 · /, '$1 · ')
      button.title = `${chapter.subtitle}\n${chapter.goal}`
      button.addEventListener('click', () => jumpToChapter(chapter.id))
      chaptersEl.appendChild(button)
    }
    highlightChapter()
  }

  function highlightChapter(): void {
    Array.from(chaptersEl.children).forEach((child, index) => {
      child.classList.toggle('is-active', CHAPTERS[index].id === currentChapterId)
    })
  }

  /** 切到某一章：优先落在这一章里最近玩过的关卡，否则落到第一关。 */
  function jumpToChapter(chapterId: string): void {
    const chapterLevels = levelsOfChapter(chapterId)
    if (chapterLevels.length === 0) return
    const played = chapterLevels.filter((level) => save.code[level.id] !== undefined)
    const target = played.length > 0 ? played[played.length - 1] : chapterLevels[0]
    const index = levels.indexOf(target)
    if (index === currentIndex) {
      currentChapterId = chapterId
      highlightChapter()
      buildLevelList()
      return
    }
    selectLevel(index)
  }

  function buildLevelList(): void {
    levelListEl.innerHTML = ''
    const chapterLevels = levelsOfChapter(currentChapterId)
    for (const level of chapterLevels) {
      const index = levels.indexOf(level)
      const chip = doc.createElement('button')
      chip.className = 'ds-level-chip'
      chip.type = 'button'
      const stars = save.progress[level.id]?.stars ?? 0
      chip.innerHTML = `<span>${index + 1}</span><span class="ds-stars">${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}</span>`
      chip.title = level.name
      chip.addEventListener('click', () => selectLevel(index))
      levelListEl.appendChild(chip)
    }
    highlightChip()
    highlightChapter()
    updateProgress()
  }

  function updateProgress(): void {
    const cleared = levels.filter((level) => (save.progress[level.id]?.stars ?? 0) > 0).length
    const stars = levels.reduce((total, level) => total + (save.progress[level.id]?.stars ?? 0), 0)
    progressEl.textContent = `通关 ${cleared}/${levels.length} · ★ ${stars}/${levels.length * 3}`
  }

  function highlightChip(): void {
    Array.from(levelListEl.children).forEach((child, index) => {
      child.classList.toggle('is-active', index === currentIndex)
    })
  }

  function updateBriefing(): void {
    const level = currentLevel()
    const chapter = findChapter(level.chapter)
    levelNameEl.textContent = level.name
    levelSubtitleEl.textContent = `${chapter?.name ?? ''} · ${level.subtitle} · 三星线 ${level.par} 次行动`
    objectiveEl.textContent = level.objective

    const locks = ((level.forbidden ?? []) as LanguageFeature[]).map((feature) => FEATURE_LABEL[feature])
    syntaxEl.innerHTML = locks.length
      ? `本章可用：${chapter?.allow.join(' / ') ?? ''}<br /><span class="ds-lock">还不能用：${locks.join(' / ')}</span>`
      : `本章可用：全部语法（含自定义函数）`

    commandsEl.innerHTML = ''
    for (const command of level.newCommands ?? []) {
      const li = doc.createElement('li')
      li.textContent = command
      li.title = '点击插入到代码里'
      li.addEventListener('click', () => editor.insert(command))
      commandsEl.appendChild(li)
    }

    hintsEl.innerHTML = ''
    for (const hint of level.hints) {
      const li = doc.createElement('li')
      li.textContent = hint
      hintsEl.appendChild(li)
    }
    $<HTMLDetailsElement>('ds-hint-box').open = false
  }

  function selectLevel(index: number): void {
    if (index === currentIndex) return
    if (running) stopCode()
    save.code[currentLevel().id] = editor.value
    currentIndex = index
    currentChapterId = levels[currentIndex].chapter
    game = makeGame()
    editor.value = save.code[currentLevel().id] ?? currentLevel().starter
    editor.setErrorLine(null)
    clearConsole()
    hideOverlay()
    updateBriefing()
    buildLevelList()
    setStatus('准备就绪')
    updateStats()
    failCount = 0
    teacherSay(teacherIntro(currentLevel().id))
    options.onLevelChange?.(currentLevel(), game)
  }

  function setStatus(text: string, kind: 'idle' | 'win' | 'lose' = 'idle'): void {
    statusEl.textContent = text
    statusEl.className = `ds-status${kind === 'win' ? ' is-win' : kind === 'lose' ? ' is-lose' : ''}`
  }

  function setRunning(value: boolean): void {
    running = value
    runButton.disabled = value
    resetButton.disabled = value
    answerButton.disabled = value
    stopButton.disabled = !value
  }

  // ------------------------------------------------------------ 运行控制

  async function runCode(): Promise<void> {
    if (running || disposed) return
    // 切到后台再回来时浏览器会挂起音频，这里先唤醒，避免第一批音效迟到
    webAudio.unlock?.()
    save.code[currentLevel().id] = editor.value
    persist()
    clearConsole()
    hideOverlay()
    editor.setErrorLine(null)
    setRunning(true)
    setStatus('运行中…')

    const result = await game.run(editor.value)
    setRunning(false)
    handleResult(result)
  }

  function stopCode(): void {
    game.stop()
    setRunning(false)
    setStatus('已停止')
  }

  function resetGame(): void {
    if (running) {
      game.stop()
      setRunning(false)
    }
    game.reset()
    editor.setActiveLine(null)
    editor.setErrorLine(null)
    clearConsole()
    hideOverlay()
    setStatus('准备就绪')
    updateStats()
  }

  function showAnswer(): void {
    editor.value = currentLevel().solution
    save.code[currentLevel().id] = editor.value
    persist()
    setStatus('已填入参考解，点运行试试')
    teacherSay('参考解已经放进编辑器了，点运行看看它是怎么过关的。')
  }

  function teacherReactToError(error: ScriptError): void {
    if (error.code === 'locked') {
      teacherSay('这一章还没教这个写法，先看看「本章可用」里能用的指令。')
    } else if (error.code === 'timeout') {
      teacherSay('这像是死循环：循环条件是不是永远成立？试试加 break，或者改一下条件。')
    } else {
      failCount++
      teacherSay(`卡在第 ${error.location.line} 行啦，别慌。${teacherHint()}`)
    }
  }

  function handleResult(result: RunResult): void {
    if (result.error) {
      editor.setErrorLine(result.error.location.line)
      setStatus(`第 ${result.error.location.line} 行有错误`, 'lose')
      teacherReactToError(result.error)
      return
    }
    if (result.status === 'win') {
      const level = currentLevel()
      const previous = save.progress[level.id]
      save.progress[level.id] = {
        stars: Math.max(result.stars, previous?.stars ?? 0),
        actions: Math.min(result.actions, previous?.actions ?? Number.MAX_SAFE_INTEGER),
      }
      persist()
      buildLevelList()
      setStatus(`通关！${result.stars} 星`, 'win')
      failCount = 0
      teacherSay(teacherWin(heroName, result.stars, result.actions))
      showWinDialog(result.stars, result.actions)
      return
    }
    if (result.status === 'lose') {
      failCount++
      setStatus('英雄倒下了', 'lose')
      teacherSay(`英雄倒下了，别灰心。${teacherHint()}`)
      showLoseDialog()
      return
    }
    failCount++
    setStatus('代码跑完了，但目标还没完成')
    teacherSay(`程序跑完了，但任务还没完成。${teacherHint()}`)
  }

  // ------------------------------------------------------------ 弹窗

  function starsMarkup(stars: number): string {
    return `<div class="ds-dialog-stars">${[1, 2, 3]
      .map((value) => (value <= stars ? '<span class="on">★</span>' : '★'))
      .join('')}</div>`
  }

  function showWinDialog(stars: number, actions: number): void {
    const level = currentLevel()
    const hasNext = currentIndex < levels.length - 1
    dialogEl.innerHTML = `
      <h2>任务完成！</h2>
      ${starsMarkup(stars)}
      <p>用了 <b>${actions}</b> 次行动（三星线 ${level.par} 次），代码执行 ${game.steps} 步。</p>
      <div class="ds-actions">
        ${hasNext ? '<button class="ds-btn ds-primary" data-action="next">下一关 →</button>' : ''}
        <button class="ds-btn" data-action="retry">再试一次</button>
        <button class="ds-btn" data-action="close">留在这里</button>
      </div>
    `
    overlayEl.classList.remove('hidden')
  }

  function showLoseDialog(): void {
    dialogEl.innerHTML = `
      <h2>英雄倒下了</h2>
      <p>${game.world.message || '再想想哪里可以少挨几下打。'}</p>
      <p>提示：小兽会对贴身目标还手，食人魔王伤害很高，先捡药水再来。</p>
      <div class="ds-actions">
        <button class="ds-btn ds-primary" data-action="retry">再来一次</button>
        <button class="ds-btn" data-action="close">看看日志</button>
      </div>
    `
    overlayEl.classList.remove('hidden')
  }

  function hideOverlay(): void {
    overlayEl.classList.add('hidden')
  }

  // 点弹窗外面也能关掉，不用非得点按钮
  overlayEl.addEventListener('click', (event) => {
    if (event.target === overlayEl) hideOverlay()
  })

  dialogEl.addEventListener('click', (event) => {
    const target = event.target as HTMLElement
    const action = target.dataset.action
    if (!action) return
    if (action === 'next') {
      hideOverlay()
      selectLevel(Math.min(currentIndex + 1, levels.length - 1))
      return
    }
    if (action === 'retry') {
      hideOverlay()
      resetGame()
      editor.focus()
      return
    }
    hideOverlay()
  })

  // ------------------------------------------------------------ 控制台与状态

  function clearConsole(): void {
    consoleEl.innerHTML = ''
    logElements = new Map()
    logsSignature = ''
  }

  function drainLogs(): void {
    if (game.logs.length === 0 && logElements.size > 0) clearConsole()
    const last = game.logs[game.logs.length - 1]
    const signature = `${game.logs.length}|${last?.id ?? -1}|${last?.text ?? ''}`
    if (signature === logsSignature) return
    logsSignature = signature

    for (const entry of game.logs) {
      const existing = logElements.get(entry.id)
      if (!existing) {
        const element = doc.createElement('div')
        element.className = `ds-log ds-log-${entry.kind}`
        element.textContent = entry.text
        consoleEl.appendChild(element)
        logElements.set(entry.id, element)
        scrollConsole = true
      } else if (existing.textContent !== entry.text) {
        existing.textContent = entry.text
      }
    }
    if (scrollConsole) {
      consoleEl.scrollTop = consoleEl.scrollHeight
      scrollConsole = false
    }
  }

  function updateStats(): void {
    const hero = game.world.hero
    const signature = `${Math.max(0, hero.hp)}|${hero.maxHp}|${game.world.gems}|${game.world.actions}|${game.world.kills}`
    if (signature === statsSignature) return
    statsSignature = signature

    const hpRatio = Math.max(0, hero.hp) / hero.maxHp
    statsEl.innerHTML = `
      <div class="ds-stat"><span>生命</span><b>${Math.max(0, hero.hp)} / ${hero.maxHp}</b></div>
      <div class="ds-stat"><span>宝石</span><b>${game.world.gems}</b></div>
      <div class="ds-stat"><span>行动</span><b>${game.world.actions}</b></div>
      <div class="ds-stat"><span>战果</span><b>${game.world.kills} 杀</b></div>
      <div class="ds-hp-bar"><div class="ds-hp-fill" style="width:${Math.round(hpRatio * 100)}%"></div></div>
    `
  }

  // ------------------------------------------------------------ 主循环

  let lastTime = performance.now()
  let frameHandle = 0

  function frame(now: number): void {
    if (disposed) return
    const dt = Math.min(0.05, (now - lastTime) / 1000)
    lastTime = now

    const snapshot = game.update(dt)
    stage?.render(snapshot)
    editor.setActiveLine(game.isRunning ? game.currentLine : null)
    drainLogs()
    updateStats()

    frameHandle = requestAnimationFrame(frame)
  }

  if (driveFrames) frameHandle = requestAnimationFrame(frame)

  runButton.addEventListener('click', () => void runCode())
  stopButton.addEventListener('click', stopCode)
  resetButton.addEventListener('click', resetGame)
  answerButton.addEventListener('click', showAnswer)
  $<HTMLButtonElement>('ds-clear-console').addEventListener('click', clearConsole)

  // 音效：第一次交互解锁浏览器音频，右上角可以随时静音
  const muteButton = $<HTMLButtonElement>('ds-mute')
  const webAudio = audio as WebAudioPlayer

  function applyMute(next: boolean): void {
    muted = next
    audio.setMuted?.(next)
    muteButton.textContent = next ? '🔇' : '🔊'
    const info = webAudio.latencyInfo?.()
    const detail = info && info.state !== 'uninitialized' ? `（输出延迟约 ${info.outputLatency.toFixed(0)}ms）` : ''
    muteButton.title = next ? '音效已关闭' : `音效已开启${detail}`
    try {
      doc.defaultView?.localStorage?.setItem(muteKey, next ? '1' : '0')
    } catch {
      // 隐私模式忽略
    }
  }

  muteButton.addEventListener('click', () => {
    applyMute(!muted)
    if (!muted) audio.play('gem')
  })

  const unlockAudio = () => {
    webAudio.unlock?.()
    applyMute(muted) // 解锁后把测到的延迟写进按钮提示
  }
  doc.defaultView?.addEventListener('pointerdown', unlockAudio, { once: true })
  doc.defaultView?.addEventListener('keydown', unlockAudio, { once: true })
  applyMute(muted)

  // ------------------------------------------------------------ 登录 / 选人

  function updateTeacher(): void {
    teacher = teacherForHero(heroGender)
    teacherAvatarEl.textContent = teacher.avatar
    teacherNameEl.textContent = `${teacher.name} · ${teacher.title}`
  }

  function teacherSay(text: string): void {
    teacherTextEl.textContent = text
  }

  /** 根据连续失败次数，给出当前这一条提示。 */
  function teacherHint(): string {
    const hints = currentLevel().hints
    if (hints.length === 0) return '再试一次，观察英雄卡在了哪一步。'
    const index = Math.min(Math.max(0, failCount - 1), hints.length - 1)
    return hints[index]
  }

  function updateGreeting(): void {
    heroNameEl.textContent = heroName
    heroAvatarEl.textContent = heroGender === 'female' ? '👧' : '👦'
  }

  function renderGenderPicker(): void {
    Array.from(genderPickerEl.children).forEach((child) => {
      const card = child as HTMLElement
      card.classList.toggle('is-active', card.dataset.gender === selectedGender)
    })
  }

  function openLogin(): void {
    if (running) {
      game.stop()
      setRunning(false)
    }
    loginNameEl.value = heroName === '英雄' ? '' : heroName
    selectedGender = heroGender
    renderGenderPicker()
    loginEl.classList.remove('hidden')
    loginNameEl.focus()
  }

  function closeLoginAndApply(): void {
    heroName = (loginNameEl.value.trim() || '英雄').slice(0, 12)
    heroGender = selectedGender
    profile = { name: heroName, gender: heroGender }
    persistProfile()
    loginEl.classList.add('hidden')
    updateGreeting()
    updateTeacher()
    teacherSay(`${heroName}，欢迎来到地牢！我是${teacher.name}，会一路陪你闯过 49 关。`)
    game = makeGame()
    updateStats()
    setStatus('准备就绪')
  }

  profileButton.addEventListener('click', openLogin)
  loginStartButton.addEventListener('click', closeLoginAndApply)
  loginNameEl.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') closeLoginAndApply()
  })
  genderPickerEl.addEventListener('click', (event) => {
    const card = (event.target as HTMLElement).closest<HTMLElement>('[data-gender]')
    if (!card) return
    selectedGender = card.dataset.gender as 'male' | 'female'
    renderGenderPicker()
  })

  updateBriefing()
  buildChapters()
  buildLevelList()
  updateStats()
  setRunning(false)
  updateGreeting()
  updateTeacher()
  teacherSay(teacherIntro(currentLevel().id))
  if (!profile) openLogin()
  editor.focus()
  options.onLevelChange?.(currentLevel(), game)

  return {
    get game() {
      return game
    },
    get editor() {
      return editor
    },
    run: runCode,
    stop: stopCode,
    reset: resetGame,
    showAnswer,
    dispose() {
      disposed = true
      if (frameHandle) cancelAnimationFrame(frameHandle)
      app.remove()
    },
  }
}
