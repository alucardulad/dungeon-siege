/**
 * 玩家代码里能调用的 API（英雄指令）。
 *
 * 设计上贴近 CodeCombat：英雄是一个对象，敌人/物品也是对象，
 * 属性是「活的」——敌人血条会随着战斗实时变化。
 */

import type { Game } from './engine'
import type { Item, Unit } from './types'
import { ITEM_STATS, UNIT_STATS } from './types'
import { distance, findUnit, livingEnemies, nearestEnemy, nearestItem } from './world'

type ApiObject = Record<string, unknown>

function define(api: ApiObject, name: string, get: () => unknown): void {
  Object.defineProperty(api, name, { get, enumerable: true, configurable: true })
}

/** 把敌人包装成玩家可读的对象（隐藏的内部标记用于校验参数）。 */
function wrapUnit(unit: Unit): ApiObject {
  const api: ApiObject = {}
  Object.defineProperty(api, '__unitId', { value: unit.id, enumerable: false })
  define(api, 'id', () => unit.id)
  define(api, 'type', () => unit.type)
  define(api, 'name', () => UNIT_STATS[unit.type].name)
  define(api, 'health', () => Math.max(0, unit.hp))
  define(api, 'maxHealth', () => unit.maxHp)
  define(api, 'damage', () => unit.damage)
  define(api, 'pos', () => ({ x: unit.x, y: unit.y }))
  return api
}

function wrapItem(item: Item): ApiObject {
  const api: ApiObject = {}
  Object.defineProperty(api, '__itemId', { value: item.id, enumerable: false })
  define(api, 'id', () => item.id)
  define(api, 'type', () => item.type)
  define(api, 'name', () => ITEM_STATS[item.type].name)
  define(api, 'value', () => item.value)
  define(api, 'pos', () => ({ x: item.x, y: item.y }))
  return api
}

function resolveUnit(game: Game, target: unknown, method: string): Unit {
  if (target === null || target === undefined) {
    throw new Error(`${method} 需要一个敌人，但它现在是空的（null），先用 if 判断一下再攻击`)
  }
  const id = (target as ApiObject).__unitId
  if (typeof id !== 'string') {
    throw new Error(`${method} 的参数要用 hero.findNearestEnemy() 这类方法返回的敌人`)
  }
  const unit = findUnit(game.world, id)
  if (!unit) throw new Error('这个敌人已经不在了')
  return unit
}

function makeMath(): ApiObject {
  const math: ApiObject = {}
  define(math, 'PI', () => Math.PI)
  define(math, 'abs', () => (x: number) => Math.abs(x))
  define(math, 'floor', () => (x: number) => Math.floor(x))
  define(math, 'ceil', () => (x: number) => Math.ceil(x))
  define(math, 'round', () => (x: number) => Math.round(x))
  define(math, 'min', () => (...xs: number[]) => Math.min(...xs))
  define(math, 'max', () => (...xs: number[]) => Math.max(...xs))
  define(math, 'pow', () => (x: number, y: number) => Math.pow(x, y))
  define(math, 'sqrt', () => (x: number) => Math.sqrt(x))
  define(math, 'random', () => () => Math.random())
  return math
}

/** 组装一次运行里玩家可见的全部全局对象。 */
export function createHeroApi(game: Game): Record<string, unknown> {
  const hero: ApiObject = {}

  define(hero, 'pos', () => ({ x: game.world.hero.x, y: game.world.hero.y }))
  define(hero, 'health', () => Math.max(0, game.world.hero.hp))
  define(hero, 'maxHealth', () => game.world.hero.maxHp)
  define(hero, 'damage', () => game.world.hero.damage)
  define(hero, 'gems', () => game.world.gems)

  define(hero, 'moveRight', () => () => game.moveHero(1, 0))
  define(hero, 'moveLeft', () => () => game.moveHero(-1, 0))
  define(hero, 'moveUp', () => () => game.moveHero(0, -1))
  define(hero, 'moveDown', () => () => game.moveHero(0, 1))
  define(hero, 'wait', () => () => game.waitHero())

  define(hero, 'attack', () => (target: unknown) => {
    const unit = resolveUnit(game, target, 'hero.attack')
    if (unit.type === 'hero') throw new Error('英雄不能攻击自己')
    return game.attackHero(unit.id)
  })

  define(hero, 'findNearestEnemy', () => () => {
    const enemy = nearestEnemy(game.world)
    return enemy ? wrapUnit(enemy) : null
  })
  define(hero, 'findEnemies', () => () => livingEnemies(game.world).map(wrapUnit))
  define(hero, 'findNearestItem', () => () => {
    const item = nearestItem(game.world)
    return item ? wrapItem(item) : null
  })
  define(hero, 'findItems', () => () => game.world.items.map(wrapItem))
  define(hero, 'distanceTo', () => (target: { pos?: { x: number; y: number } } | null) => {
    if (!target || !target.pos) throw new Error('hero.distanceTo() 需要一个敌人或物品对象')
    return distance(game.world.hero, target.pos)
  })
  define(hero, 'say', () => (text: unknown) => {
    game.say(text === undefined || text === null ? '' : String(text))
  })

  const consoleApi: ApiObject = {}
  define(consoleApi, 'log', () => (text: unknown) => game.logExternal(text))

  return {
    hero,
    Math: makeMath(),
    console: consoleApi,
    print: (text: unknown) => game.logExternal(text),
    distance: (a: { x: number; y: number }, b: { x: number; y: number }) => distance(a, b),
  }
}
