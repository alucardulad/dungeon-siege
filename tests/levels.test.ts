import assert from 'node:assert/strict'
import test from 'node:test'

import { Game } from '../assets/scripts/core/engine'
import { LEVELS, findLevel } from '../assets/scripts/core/levels'
import { rateStars } from '../assets/scripts/core/world'
import type { LevelDef } from '../assets/scripts/core/types'

/** 用「立即模式」跑通关卡：动画直接结算，只验证逻辑。 */
async function play(level: LevelDef, code: string) {
  const game = new Game(level, { instant: true })
  const result = await game.run(code)
  return { game, result }
}

/**
 * 用「真实时钟」跑一遍：引擎会等待动画播完，
 * 这里手动喂 dt，验证动画与代码执行的同步没有死锁。
 */
async function playWithClock(
  level: LevelDef,
  code: string,
  options: { dt?: number; onFrame?: (game: Game) => void } = {},
) {
  const dt = options.dt ?? 0.05
  const game = new Game(level)
  let finished = false
  const promise = game.run(code).then((value) => {
    finished = true
    return value
  })

  let guard = 0
  while (!finished) {
    game.update(dt)
    options.onFrame?.(game)
    await new Promise((resolve) => setTimeout(resolve, 0))
    if (++guard > 200000) throw new Error('动画没有推进，可能是引擎死锁了')
  }
  return { game, result: await promise }
}

for (const level of LEVELS) {
  test(`${level.name}：参考解可以通关`, async (t) => {
    const { game, result } = await play(level, level.solution)
    t.diagnostic(`${level.id} 行动 ${result.actions} 次（三星线 ${level.par}），语句 ${result.steps} 步`)
    assert.equal(result.error, null, `参考解报错了：${result.error?.message}`)
    assert.equal(result.status, 'win', `参考解没有通关，日志：\n${game.logs.map((l) => l.text).join('\n')}`)
    assert.equal(result.stars, 3, `参考解应该拿到三星，实际 ${result.stars} 星`)
  })
}

test('真实时钟下也能跑完（动画与代码同步）', async () => {
  const level = findLevel('level-1')
  assert.ok(level)
  const { result } = await playWithClock(level, level.solution)
  assert.equal(result.status, 'win')
})

test('动画会随时间推进（移动时不是瞬间归位）', async () => {
  const level = findLevel('level-1')
  assert.ok(level)
  let sawIntermediate = false
  const { game } = await playWithClock(level, level.solution, {
    dt: 0.02,
    onFrame: (current) => {
      const hero = current.getFrame().units.find((unit) => unit.type === 'hero')
      if (!hero) return
      const tileX = hero.x / 48 - 0.5
      if (Math.abs(tileX - Math.round(tileX)) > 0.08) sawIntermediate = true
    },
  })
  assert.ok(sawIntermediate, '英雄移动过程中应该停在两格之间，而不是瞬间归位')
  assert.equal(game.status, 'win')
})

test('撞墙会提示并且消耗一回合', async () => {
  const level = findLevel('level-1')
  assert.ok(level)
  const { game } = await play(level, 'hero.moveLeft()')
  assert.equal(game.world.hero.x, 1)
  assert.equal(game.world.actions, 1)
  assert.ok(game.logs.some((entry) => entry.text.includes('墙')))
})

test('代码跑完但没达成目标时给出提醒', async () => {
  const level = findLevel('level-1')
  assert.ok(level)
  const { game, result } = await play(level, 'hero.moveRight()')
  assert.equal(result.status, 'ready')
  assert.ok(game.logs.some((entry) => entry.text.includes('还没有完成全部目标')))
})

test('攻击不存在的目标会报中文错误', async () => {
  const level = findLevel('level-1')
  assert.ok(level)
  const { result } = await play(level, 'hero.attack(null)')
  assert.ok(result.error)
  assert.match(result.error.message, /null/)
})

test('星级评价：行动越少星越多', () => {
  assert.equal(rateStars(9, 9), 3)
  assert.equal(rateStars(12, 9), 2)
  assert.equal(rateStars(20, 9), 1)
})
