/**
 * 世界规则：地图解析、移动与战斗结算、敌人 AI、胜负判定。
 *
 * 全部是同步的纯逻辑（不碰动画），动画由 engine.ts 根据返回的事件播放。
 */

import type {
  Item,
  ItemType,
  LevelDef,
  TileType,
  Unit,
  UnitType,
  WorldEvent,
  WorldState,
} from './types'
import { ITEM_STATS, UNIT_STATS } from './types'

const TILE_LEGEND: Record<string, TileType> = {
  '#': 'wall',
  '.': 'floor',
  E: 'exit',
  '^': 'spike',
  ' ': 'floor',
}

const UNIT_LEGEND: Record<string, UnitType> = {
  '@': 'hero',
  m: 'munchkin',
  o: 'ogre',
  X: 'ogre-chief',
}

const ITEM_LEGEND: Record<string, ItemType> = {
  g: 'gem',
  p: 'potion',
}

export const SPIKE_DAMAGE = 5

/** 把 ASCII 地图展开成完整的世界状态。 */
export function createWorld(level: LevelDef): WorldState {
  const rows = level.map
  const height = rows.length
  if (height === 0) throw new Error(`关卡 ${level.id} 的地图是空的`)
  const width = rows[0].length

  const tiles: TileType[][] = []
  const units: Unit[] = []
  const items: Item[] = []
  let hero: Unit | null = null
  let index = 0

  for (let y = 0; y < height; y++) {
    const row = rows[y]
    if (row.length !== width) {
      throw new Error(`关卡 ${level.id} 第 ${y + 1} 行长度为 ${row.length}，与第一行的 ${width} 不一致`)
    }
    const tileRow: TileType[] = []
    for (let x = 0; x < width; x++) {
      const char = row[x]
      if (char in UNIT_LEGEND) {
        const type = UNIT_LEGEND[char]
        const stats = UNIT_STATS[type]
        const aggro = type === 'hero' || level.enemiesStandStill ? 0 : stats.aggro
        const unit: Unit = {
          id: type === 'hero' ? 'hero' : `${type}-${index++}`,
          type,
          x,
          y,
          hp: stats.hp,
          maxHp: stats.hp,
          damage: stats.damage,
          aggro,
        }
        if (type === 'hero') hero = unit
        units.push(unit)
        tileRow.push('floor')
        continue
      }
      if (char in ITEM_LEGEND) {
        const type = ITEM_LEGEND[char]
        items.push({ id: `item-${index++}`, type, x, y, value: ITEM_STATS[type].value })
        tileRow.push('floor')
        continue
      }
      const tile = TILE_LEGEND[char]
      if (!tile) throw new Error(`关卡 ${level.id} 出现了未知地图符号：${char}`)
      tileRow.push(tile)
    }
    tiles.push(tileRow)
  }

  if (!hero) throw new Error(`关卡 ${level.id} 没有英雄出生点 @`)

  return {
    level,
    width,
    height,
    tiles,
    units,
    items,
    hero,
    status: 'playing',
    message: '',
    actions: 0,
    gems: 0,
    kills: 0,
  }
}

// ---------------------------------------------------------------- 基础查询

export function tileAt(world: WorldState, x: number, y: number): TileType | null {
  if (x < 0 || y < 0 || x >= world.width || y >= world.height) return null
  return world.tiles[y][x]
}

export function unitAt(world: WorldState, x: number, y: number): Unit | null {
  return world.units.find((unit) => unit.hp > 0 && unit.x === x && unit.y === y) ?? null
}

export function itemAt(world: WorldState, x: number, y: number): Item | null {
  return world.items.find((item) => item.x === x && item.y === y) ?? null
}

export function livingEnemies(world: WorldState): Unit[] {
  return world.units.filter((unit) => unit.type !== 'hero' && unit.hp > 0)
}

export function findUnit(world: WorldState, id: string): Unit | null {
  return world.units.find((unit) => unit.id === id) ?? null
}

/** 英雄能否走进这一格（不检查单位）。 */
export function isWalkable(world: WorldState, x: number, y: number): boolean {
  return tileAt(world, x, y) !== null && tileAt(world, x, y) !== 'wall'
}

export function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y)
}

/** 英雄前方那一格能不能走（界内、不是墙、也没有单位站着）。 */
export function canHeroEnter(world: WorldState, dx: number, dy: number): boolean {
  const x = world.hero.x + dx
  const y = world.hero.y + dy
  if (!isWalkable(world, x, y)) return false
  return unitAt(world, x, y) === null
}

/** 英雄前方那一格有什么，返回中文词，供教学关卡的「观察」指令使用。 */
export function lookFromHero(world: WorldState, dx: number, dy: number): string {
  const x = world.hero.x + dx
  const y = world.hero.y + dy
  const tile = tileAt(world, x, y)
  if (tile === null || tile === 'wall') return '墙'
  if (unitAt(world, x, y)) return '敌人'
  if (itemAt(world, x, y)) return '物品'
  if (tile === 'spike') return '尖刺'
  if (tile === 'exit') return '出口'
  return '空地'
}

export function nearestEnemy(world: WorldState): Unit | null {
  return sortByDistance(world.hero, livingEnemies(world))[0] ?? null
}

export function nearestItem(world: WorldState): Item | null {
  return sortByDistance(world.hero, world.items)[0] ?? null
}

function sortByDistance<T extends { x: number; y: number }>(from: { x: number; y: number }, list: T[]): T[] {
  return [...list].sort((a, b) => distance(from, a) - distance(from, b))
}

// ---------------------------------------------------------------- 英雄行动

/** 英雄移动一格。 */
export function heroMove(world: WorldState, dx: number, dy: number): WorldEvent[] {
  const hero = world.hero
  const label = dx > 0 ? '右边' : dx < 0 ? '左边' : dy > 0 ? '下边' : '上边'
  const targetX = hero.x + dx
  const targetY = hero.y + dy

  if (!isWalkable(world, targetX, targetY)) {
    return consumeTurn(world, [{ kind: 'blocked', unitId: hero.id, message: `${label}是墙，走不过去` }])
  }
  const blocker = unitAt(world, targetX, targetY)
  if (blocker) {
    return consumeTurn(world, [
      { kind: 'blocked', unitId: hero.id, message: `${label}站着${UNIT_STATS[blocker.type].name}，先解决它` },
    ])
  }

  const events: WorldEvent[] = [{ kind: 'move', unitId: hero.id, from: { x: hero.x, y: hero.y }, to: { x: targetX, y: targetY } }]
  hero.x = targetX
  hero.y = targetY

  if (tileAt(world, targetX, targetY) === 'spike') {
    const damage = Math.min(SPIKE_DAMAGE, hero.hp)
    hero.hp -= damage
    events.push({ kind: 'spike', unitId: hero.id, damage })
  }

  const item = itemAt(world, targetX, targetY)
  if (item) {
    world.items = world.items.filter((other) => other !== item)
    let healed = false
    if (item.type === 'gem') {
      world.gems++
    } else {
      hero.hp = Math.min(hero.maxHp, hero.hp + item.value)
      healed = true
    }
    events.push({ kind: 'pickup', item, healed })
  }

  return consumeTurn(world, events)
}

/** 英雄攻击目标。 */
export function heroAttack(world: WorldState, targetId: string): WorldEvent[] {
  const hero = world.hero
  const target = findUnit(world, targetId)

  if (!target || target.type === 'hero') {
    throw new Error('攻击目标不存在，请用 hero.findNearestEnemy() 找出敌人再攻击')
  }
  if (target.hp <= 0) {
    // 面向孩子：多写一刀不该让程序整个中断，
    // 只提醒一句「它已经倒下了」，然后继续往下跑。
    return consumeTurn(world, [
      { kind: 'blocked', unitId: hero.id, message: `那个${UNIT_STATS[target.type].name}已经倒下了，不用再打啦` },
    ])
  }
  if (distance(hero, target) > 1) {
    return consumeTurn(world, [
      { kind: 'blocked', unitId: hero.id, message: `离${UNIT_STATS[target.type].name}太远了，先靠近再攻击` },
    ])
  }

  target.hp = Math.max(0, target.hp - hero.damage)
  const killed = target.hp === 0
  const events: WorldEvent[] = [{ kind: 'attack', attackerId: hero.id, targetId: target.id, damage: hero.damage, killed }]
  if (killed) {
    world.kills++
    events.push({ kind: 'died', unitId: target.id })
  }
  return consumeTurn(world, events)
}

/** 英雄原地等待一回合。 */
export function heroWait(world: WorldState): WorldEvent[] {
  return consumeTurn(world, [])
}

function consumeTurn(world: WorldState, events: WorldEvent[]): WorldEvent[] {
  world.actions++
  return events
}

// ---------------------------------------------------------------- 敌人回合

/** 敌人行动：贴身就攻击，在警戒范围内就朝英雄靠近。 */
export function enemiesTurn(world: WorldState): WorldEvent[] {
  const events: WorldEvent[] = []
  const hero = world.hero

  for (const enemy of livingEnemies(world)) {
    if (world.status !== 'playing') break

    const dist = distance(enemy, hero)
    if (dist <= 1) {
      const damage = Math.min(enemy.damage, hero.hp)
      hero.hp -= damage
      events.push({ kind: 'attack', attackerId: enemy.id, targetId: hero.id, damage, killed: hero.hp === 0 })
      if (hero.hp === 0) {
        events.push({ kind: 'died', unitId: hero.id })
        world.status = 'lose'
        world.message = '英雄倒下了…… 检查一下是不是硬拼了太多敌人'
      }
      continue
    }

    if (enemy.aggro > 0 && dist <= enemy.aggro) {
      const step = chooseStep(world, enemy, hero)
      if (step) {
        const from = { x: enemy.x, y: enemy.y }
        enemy.x = step.x
        enemy.y = step.y
        events.push({ kind: 'move', unitId: enemy.id, from, to: { x: step.x, y: step.y } })
      }
    }
  }

  return events
}

function chooseStep(world: WorldState, enemy: Unit, hero: Unit): { x: number; y: number } | null {
  const dx = Math.sign(hero.x - enemy.x)
  const dy = Math.sign(hero.y - enemy.y)
  const primary = Math.abs(hero.x - enemy.x) >= Math.abs(hero.y - enemy.y)

  const candidates = primary
    ? [
        { x: enemy.x + dx, y: enemy.y },
        { x: enemy.x, y: enemy.y + dy },
      ]
    : [
        { x: enemy.x, y: enemy.y + dy },
        { x: enemy.x + dx, y: enemy.y },
      ]

  for (const candidate of candidates) {
    if (candidate.x === enemy.x && candidate.y === enemy.y) continue
    if (!isWalkable(world, candidate.x, candidate.y)) continue
    if (unitAt(world, candidate.x, candidate.y)) continue
    return candidate
  }
  return null
}

// ---------------------------------------------------------------- 胜负判定

/** 每次行动后检查一次胜负，会在 world 上写入 status 与 message。 */
export function checkOutcome(world: WorldState): void {
  if (world.status !== 'playing') return
  const hero = world.hero

  if (hero.hp <= 0) {
    world.status = 'lose'
    world.message = '英雄倒下了…… 检查一下是不是硬拼了太多敌人'
    return
  }

  const win = world.level.win
  if (win.killAll && livingEnemies(world).length > 0) return
  if (win.collectAll && world.items.some((item) => item.type === 'gem')) return
  if (win.reachExit && tileAt(world, hero.x, hero.y) !== 'exit') return

  world.status = 'win'
  world.message = '任务完成！'
}

/** 三星评价：行动次数越接近理论最优，星越多。 */
export function rateStars(actions: number, par: number): number {
  if (actions <= par) return 3
  if (actions <= Math.ceil(par * 1.4)) return 2
  return 1
}
