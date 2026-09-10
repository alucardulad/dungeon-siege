/**
 * 游戏运行时：把「玩家代码 → 世界状态变化 → 动画 → 画面帧」串起来。
 *
 * 关键点：解释器每调用一次英雄指令，都会 await 动画播完，
 * 所以代码推进和画面推进是同一个节奏，玩家能看清每一行代码干了什么。
 */

import { createHeroApi } from './api'
import type { SoundPlayer } from './audio'
import type { Frame, FrameEffect } from './render'
import { HaltSignal, ScriptError, type ScriptLocation } from './script/errors'
import { Interpreter } from './script/interpreter'
import { parseScript } from './script/parser'
import { FEATURE_HINT, FEATURE_LABEL, findForbiddenFeature } from './tutor'
import type { Item, LevelDef, LogEntry, Unit, WorldEvent, WorldState } from './types'
import { ITEM_STATS } from './types'
import { checkOutcome, createWorld, enemiesTurn, heroAttack, heroMove, heroWait, rateStars } from './world'

export type GameStatus = 'ready' | 'running' | 'win' | 'lose'

export interface GameOptions {
  tileSize?: number
  /** 立即完成动画（测试与「一键结算」用） */
  instant?: boolean
  maxSteps?: number
  onLog?: (entry: LogEntry) => void
  /** 音效播放器；不传就是静音 */
  audio?: SoundPlayer
}

export interface RunResult {
  status: GameStatus
  error: ScriptError | null
  actions: number
  steps: number
  stars: number
}

const TIMING = {
  move: 0.16,
  hurt: 0.24,
  die: 0.3,
  beat: 0.06,
  effect: 0.42,
  float: 0.7,
  bubble: 1.4,
}

interface View {
  x: number
  y: number
  fromX: number
  fromY: number
  toX: number
  toY: number
  t: number
  duration: number
  moving: boolean
  hurt: number
  dying: number
  dyingActive: boolean
  dead: boolean
  facing: 1 | -1
}

interface EffectState extends FrameEffect {
  elapsed: number
  duration: number
}

interface BubbleState {
  text: string
  unitId: string
  elapsed: number
}

export class Game {
  readonly level: LevelDef
  world: WorldState
  status: GameStatus = 'ready'
  /** 当前执行到第几行，供编辑器高亮 */
  currentLine = 0
  logs: LogEntry[] = []
  error: ScriptError | null = null
  steps = 0

  private tileSize: number
  private instant: boolean
  private maxSteps: number
  private onLog?: (entry: LogEntry) => void
  private audio: SoundPlayer | null
  private views = new Map<string, View>()
  private effects: EffectState[] = []
  private bubbles: BubbleState[] = []
  private beatTimer = 0
  private idleResolvers: (() => void)[] = []
  private running = false
  private halted = false
  private logSeq = 0
  private time = 0

  constructor(level: LevelDef, options: GameOptions = {}) {
    this.level = level
    this.tileSize = options.tileSize ?? 48
    this.instant = options.instant ?? false
    this.maxSteps = options.maxSteps ?? 20000
    this.onLog = options.onLog
    this.audio = options.audio ?? null
    this.world = createWorld(level)
    this.reset()
  }

  // ------------------------------------------------------------------ 生命周期

  reset(): void {
    this.world = createWorld(this.level)
    this.status = 'ready'
    this.currentLine = 0
    this.logs = []
    this.error = null
    this.steps = 0
    this.halted = false
    this.running = false
    this.effects = []
    this.bubbles = []
    this.beatTimer = 0
    this.time = 0
    this.flushIdle()
    this.views = new Map()
    for (const unit of this.world.units) {
      this.views.set(unit.id, this.createView(unit.x, unit.y))
    }
  }

  get isRunning(): boolean {
    return this.running
  }

  private createView(x: number, y: number): View {
    return {
      x,
      y,
      fromX: x,
      fromY: y,
      toX: x,
      toY: y,
      t: 0,
      duration: TIMING.move,
      moving: false,
      hurt: 0,
      dying: 0,
      dyingActive: false,
      dead: false,
      facing: 1,
    }
  }

  /** 执行一段玩家代码，直到关卡结束、代码跑完或出错。 */
  async run(code: string): Promise<RunResult> {
    this.reset()
    this.status = 'running'
    this.running = true
    let statements = 0

    try {
      // 语法错误单独处理：此时还没有开始执行，英雄保持原地
      let program
      try {
        program = parseScript(code)
      } catch (error) {
        this.error = error instanceof ScriptError ? error : new ScriptError(String(error))
        this.status = 'ready'
        this.audio?.play('error')
        this.log('error', `第 ${this.error.location.line} 行：${this.error.message}`)
        return this.result(0)
      }

      // 教学进度控制：本章还没教的语法（比如第 1 章的 while）先不许用
      const violation = findForbiddenFeature(program, this.level.forbidden ?? [])
      if (violation) {
        const feature = violation.feature
        this.error = new ScriptError(
          `这一章还不能用 ${FEATURE_LABEL[feature]}，${FEATURE_HINT[feature]}`,
          { line: violation.line, column: violation.column },
          'locked',
        )
        this.status = 'ready'
        this.audio?.play('error')
        this.log('error', `第 ${violation.line} 行：${this.error.message}`)
        return this.result(0)
      }

      const interpreter = new Interpreter(program, {
        globals: createHeroApi(this),
        maxSteps: this.maxSteps,
        onStep: (location: ScriptLocation) => {
          this.currentLine = location.line
          if (this.halted) throw new HaltSignal('stop')
        },
      })

      try {
        await interpreter.run()
        statements = interpreter.statementCount
        if (this.world.status === 'playing') {
          this.status = 'ready'
          this.log('warn', '代码跑完了，但还没有完成全部目标，看看任务说明吧。')
        }
      } catch (error) {
        statements = interpreter.statementCount
        if (error instanceof HaltSignal) {
          // 正常结束：胜利 / 失败 / 玩家点了停止
        } else if (error instanceof ScriptError) {
          this.error = error
          this.status = this.world.status === 'playing' ? 'ready' : this.world.status
          this.audio?.play('error')
          this.log('error', `第 ${error.location.line} 行：${error.message}`)
        } else {
          throw error
        }
      }
    } finally {
      this.running = false
      await this.waitIdle()
    }

    return this.result(statements)
  }

  private result(statements: number): RunResult {
    this.steps = statements
    return {
      status: this.status,
      error: this.error,
      actions: this.world.actions,
      steps: statements,
      stars: this.status === 'win' ? rateStars(this.world.actions, this.level.par) : 0,
    }
  }

  /** 请求停止（玩家点「停止」或切换关卡）。 */
  stop(): void {
    if (!this.running) return
    this.halted = true
    this.log('info', '已停止运行')
  }

  // ------------------------------------------------------------------ 指令执行

  /** 英雄行动：先结算英雄动作，再让敌人走一回合。 */
  async performHeroAction(run: () => WorldEvent[]): Promise<void> {
    if (this.halted) throw new HaltSignal('stop')
    const events = run()
    await this.playEvents(events)
    checkOutcome(this.world)
    if (this.world.status !== 'playing') {
      this.finish()
      throw new HaltSignal(this.world.status === 'win' ? 'win' : 'lose')
    }

    const enemyEvents = enemiesTurn(this.world)
    if (enemyEvents.length > 0) {
      if (!this.instant) {
        this.beatTimer = TIMING.beat
        await this.waitIdle()
      }
      await this.playEvents(enemyEvents)
    }
    checkOutcome(this.world)
    if (this.world.status !== 'playing') {
      this.finish()
      throw new HaltSignal(this.world.status === 'win' ? 'win' : 'lose')
    }
  }

  moveHero(dx: number, dy: number): Promise<void> {
    return this.performHeroAction(() => heroMove(this.world, dx, dy))
  }

  attackHero(targetId: string): Promise<void> {
    return this.performHeroAction(() => heroAttack(this.world, targetId))
  }

  waitHero(): Promise<void> {
    return this.performHeroAction(() => heroWait(this.world))
  }

  say(text: unknown): void {
    const hero = this.world.hero
    const value = String(text).slice(0, 60)
    this.log('hero', `英雄说：${value}`)
    this.bubbles = this.bubbles.filter((bubble) => bubble.unitId !== hero.id)
    this.bubbles.push({ text: value, unitId: hero.id, elapsed: 0 })
  }

  /** 供 console.log / print 使用。 */
  logExternal(text: unknown): void {
    this.log('info', `输出：${String(text)}`)
  }

  private finish(): void {
    if (this.world.status === 'win') {
      this.status = 'win'
      this.audio?.play('win')
      this.log(
        'success',
        `任务完成！用了 ${this.world.actions} 次行动，${rateStars(this.world.actions, this.level.par)} 星评价`,
      )
    } else {
      this.status = 'lose'
      this.audio?.play('lose')
      this.log('error', this.world.message)
    }
  }

  // ------------------------------------------------------------------ 事件播放

  private async playEvents(events: WorldEvent[]): Promise<void> {
    for (const event of events) this.applyEvent(event)
    await this.waitIdle()
  }

  private applyEvent(event: WorldEvent): void {
    switch (event.kind) {
      case 'move': {
        const view = this.views.get(event.unitId)
        if (!view) return
        view.fromX = view.x
        view.fromY = view.y
        view.toX = event.to.x
        view.toY = event.to.y
        view.t = 0
        view.moving = true
        view.duration = TIMING.move
        if (event.to.x !== event.from.x) view.facing = event.to.x > event.from.x ? 1 : -1
        if (this.instant) {
          view.x = view.toX
          view.y = view.toY
          view.moving = false
        }
        if (event.unitId === 'hero') this.audio?.play('move')
        break
      }
      case 'attack': {
        const attacker = this.world.units.find((unit) => unit.id === event.attackerId)
        const target = this.world.units.find((unit) => unit.id === event.targetId)
        const targetView = this.views.get(event.targetId)
        if (targetView && !this.instant) targetView.hurt = TIMING.hurt * 1.4
        if (event.attackerId === 'hero') {
          this.spawnEffect('slash', event.targetId, target)
          this.audio?.play('swing')
          this.audio?.play('hit')
          this.log('info', `英雄攻击${target ? nameOf(target) : '敌人'}，造成 ${event.damage} 点伤害`)
        } else if (attacker && target) {
          this.spawnEffect('hit', event.targetId, target)
          this.audio?.play('hurt')
          this.log('warn', `${nameOf(attacker)}攻击英雄，英雄受到 ${event.damage} 点伤害`)
        }
        break
      }
      case 'blocked':
        this.audio?.play('blocked')
        this.log('warn', event.message)
        break
      case 'spike': {
        this.spawnEffect('hit', event.unitId, this.world.hero)
        this.spawnFloat(`-${event.damage}`, this.world.hero, '#ff8f6b')
        this.audio?.play('spike')
        this.log('warn', `踩到尖刺，掉了 ${event.damage} 点血`)
        break
      }
      case 'pickup': {
        const view = this.views.get(event.item.id)
        const position = view ? { x: view.x, y: view.y } : { x: event.item.x, y: event.item.y }
        const cx = (position.x + 0.5) * this.tileSize
        const cy = (position.y + 0.5) * this.tileSize
        if (!this.instant) {
          this.effects.push({ kind: 'sparkle', x: cx, y: cy, t: 0, elapsed: 0, duration: TIMING.effect })
        }
        if (event.item.type === 'gem') {
          this.audio?.play('gem')
          if (!this.instant) {
            this.effects.push({
              kind: 'float',
              x: cx,
              y: cy - this.tileSize * 0.3,
              t: 0,
              elapsed: 0,
              duration: TIMING.float,
              text: `+${ITEM_STATS.gem.value}`,
              color: '#4dd4f7',
            })
          }
          this.log('success', `捡到宝石，共 ${this.world.gems} 颗`)
        } else {
          this.audio?.play('potion')
          if (!this.instant) {
            this.effects.push({ kind: 'heal', x: cx, y: cy, t: 0, elapsed: 0, duration: TIMING.effect })
            this.effects.push({
              kind: 'float',
              x: cx,
              y: cy - this.tileSize * 0.3,
              t: 0,
              elapsed: 0,
              duration: TIMING.float,
              text: `+${ITEM_STATS.potion.value}`,
              color: '#7bf59b',
            })
          }
          this.log('success', `喝下药水，恢复 ${ITEM_STATS.potion.value} 点生命`)
        }
        break
      }
      case 'died': {
        const view = this.views.get(event.unitId)
        if (!view) return
        if (this.instant) {
          view.dead = true
        } else {
          view.dyingActive = true
          view.dying = 0
        }
        const unit = this.world.units.find((item) => item.id === event.unitId)
        if (unit && unit.type !== 'hero') {
          this.audio?.play('kill')
          this.log('success', `击败了${nameOf(unit)}`)
        }
        break
      }
    }
  }

  private spawnEffect(kind: FrameEffect['kind'], unitId: string, fallback: Unit | Item | undefined): void {
    if (this.instant) return
    const view = this.views.get(unitId)
    const x = view ? view.x : (fallback?.x ?? 0)
    const y = view ? view.y : (fallback?.y ?? 0)
    this.effects.push({
      kind,
      x: (x + 0.5) * this.tileSize,
      y: (y + 0.5) * this.tileSize,
      t: 0,
      elapsed: 0,
      duration: TIMING.effect,
    })
  }

  private spawnFloat(text: string, target: { x: number; y: number }, color: string): void {
    if (this.instant) return
    this.effects.push({
      kind: 'float',
      x: (target.x + 0.5) * this.tileSize,
      y: (target.y + 0.2) * this.tileSize,
      t: 0,
      elapsed: 0,
      duration: TIMING.float,
      text,
      color,
    })
  }

  private log(kind: LogEntry['kind'], text: string): void {
    const last = this.logs[this.logs.length - 1]
    if (last && last.text === text) {
      // 重复的提示合并计数，避免死循环把控制台刷爆
      const match = last.text.match(/（重复 (\d+) 次）$/)
      const count = match ? Number(match[1]) + 1 : 2
      last.text = `${text}（重复 ${count} 次）`
      this.onLog?.(last)
      return
    }
    const entry: LogEntry = { id: ++this.logSeq, kind, text }
    this.logs.push(entry)
    if (this.logs.length > 200) this.logs.splice(0, this.logs.length - 200)
    this.onLog?.(entry)
  }

  // ------------------------------------------------------------------ 动画推进

  private hasActivity(): boolean {
    if (this.beatTimer > 0) return true
    if (this.effects.length > 0) return true
    for (const view of this.views.values()) {
      if (view.moving && view.t < view.duration) return true
      if (view.hurt > 0) return true
      if (view.dyingActive) return true
    }
    return false
  }

  private waitIdle(): Promise<void> {
    if (!this.hasActivity()) return Promise.resolve()
    return new Promise<void>((resolve) => this.idleResolvers.push(resolve))
  }

  private flushIdle(): void {
    const resolvers = this.idleResolvers
    this.idleResolvers = []
    for (const resolve of resolvers) resolve()
  }

  /** 每帧调用：推进动画并返回这一帧要画的内容。 */
  update(dtRaw: number): Frame {
    const dt = Math.min(Math.max(dtRaw, 0), 0.05)
    this.time += dt

    if (this.beatTimer > 0) this.beatTimer = Math.max(0, this.beatTimer - dt)

    for (const view of this.views.values()) {
      if (view.moving) {
        view.t += dt
        const progress = Math.min(1, view.t / view.duration)
        const eased = 1 - (1 - progress) * (1 - progress)
        view.x = view.fromX + (view.toX - view.fromX) * eased
        view.y = view.fromY + (view.toY - view.fromY) * eased
        if (progress >= 1) {
          view.x = view.toX
          view.y = view.toY
          view.moving = false
        }
      }
      if (view.hurt > 0) view.hurt = Math.max(0, view.hurt - dt)
      if (view.dyingActive) {
        view.dying = Math.min(1, view.dying + dt / TIMING.die)
        if (view.dying >= 1) {
          view.dyingActive = false
          view.dead = true
        }
      }
    }

    for (const effect of this.effects) {
      effect.elapsed += dt
      effect.t = Math.min(1, effect.elapsed / effect.duration)
    }
    this.effects = this.effects.filter((effect) => effect.t < 1)

    for (const bubble of this.bubbles) bubble.elapsed += dt
    this.bubbles = this.bubbles.filter((bubble) => bubble.elapsed < TIMING.bubble)

    if (!this.hasActivity()) this.flushIdle()
    return this.getFrame()
  }

  // ------------------------------------------------------------------ 画面帧

  getFrame(): Frame {
    const tile = this.tileSize
    const units = []
    for (const unit of this.world.units) {
      const view = this.views.get(unit.id)
      if (!view || view.dead) continue
      if (unit.type !== 'hero' && unit.hp <= 0 && !view.dyingActive) continue
      units.push({
        id: unit.id,
        type: unit.type,
        x: (view.x + 0.5) * tile,
        y: (view.y + 0.5) * tile,
        hpRatio: unit.maxHp > 0 ? Math.max(0, unit.hp) / unit.maxHp : 0,
        facing: view.facing,
        hurt: Math.min(1, view.hurt / TIMING.hurt),
        dying: view.dyingActive ? view.dying : 0,
      })
    }

    const items = this.world.items.map((item) => {
      const view = this.views.get(item.id)
      const x = view ? view.x : item.x
      const y = view ? view.y : item.y
      return {
        id: item.id,
        type: item.type,
        x: (x + 0.5) * tile,
        y: (y + 0.5) * tile,
        bob: this.time * 3 + item.x + item.y,
      }
    })

    const bubbles = this.bubbles.map((bubble) => {
      const view = this.views.get(bubble.unitId)
      const fadeOut = Math.max(0, 1 - Math.max(0, bubble.elapsed - 0.9) / 0.5)
      const fadeIn = Math.min(1, bubble.elapsed / 0.15)
      return {
        text: bubble.text,
        x: ((view?.x ?? 0) + 0.5) * tile,
        y: ((view?.y ?? 0) + 0.5) * tile,
        alpha: Math.max(0, Math.min(fadeIn, fadeOut)),
      }
    })

    return {
      tileSize: tile,
      width: this.world.width * tile,
      height: this.world.height * tile,
      grid: this.world.tiles,
      items,
      units,
      effects: this.effects.map((state) => ({
        kind: state.kind,
        x: state.x,
        y: state.y,
        t: state.t,
        text: state.text,
        color: state.color,
      })),
      bubbles,
    }
  }
}

function nameOf(unit: Unit): string {
  switch (unit.type) {
    case 'hero':
      return '英雄'
    case 'munchkin':
      return '小兽'
    case 'ogre':
      return '食人魔'
    case 'ogre-chief':
      return '食人魔王'
  }
}
