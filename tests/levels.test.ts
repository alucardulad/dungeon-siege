import assert from 'node:assert/strict'
import test from 'node:test'

import { Game } from '../assets/scripts/core/engine'
import { CHAPTERS, LEVELS, findLevel, levelsOfChapter } from '../assets/scripts/core/levels'
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

test('课程结构：5 章共 49 关，每章关数固定', () => {
  assert.equal(CHAPTERS.length, 5)
  assert.equal(LEVELS.length, 49)
  const expected = [10, 12, 12, 10, 5]
  CHAPTERS.forEach((chapter, index) => {
    assert.equal(levelsOfChapter(chapter.id).length, expected[index], `${chapter.name} 关数不对`)
  })
})

test('每关都归到了正确的章节，且语法锁与章节一致', () => {
  for (const level of LEVELS) {
    const chapter = CHAPTERS.find((item) => item.id === level.chapter)
    assert.ok(chapter, `${level.id} 的章节 ${level.chapter} 不存在`)
    assert.deepEqual(level.forbidden, chapter?.forbidden, `${level.id} 的语法锁与章节不一致`)
  }
})

test('第 1 章不许循环和判断，提示要说清楚原因', async () => {
  const level = findLevel('level-1')
  assert.ok(level)
  const { result } = await play(level, 'while (true) { hero.moveRight() }')
  assert.equal(result.error?.code, 'locked')
  assert.match(result.error?.message ?? '', /while/)
})

test('第 2 章可以用 for，但不许用 if', async () => {
  const level = findLevel('level-11')
  assert.ok(level)
  const ok = await play(level, level.solution)
  assert.equal(ok.result.status, 'win')

  const locked = await play(level, 'for (let i = 0; i < 3; i++) { if (true) { hero.moveRight() } }')
  assert.equal(locked.result.error?.code, 'locked')
  assert.match(locked.result.error?.message ?? '', /if/)
})

test('第 4 章可以用 while；第 5 章才允许自定义函数', async () => {
  const ch4 = findLevel('level-35')
  const ch5 = findLevel('level-49')
  assert.ok(ch4 && ch5)

  const ch4Function = await play(ch4, 'function 走() { hero.moveRight() }\n走()')
  assert.equal(ch4Function.result.error?.code, 'locked')

  const ch5Function = await play(ch5, 'function 打() {\n  const 敌人 = hero.findNearestEnemy()\n  if (敌人 && hero.distanceTo(敌人) <= 1) { hero.attack(敌人) }\n}\nwhile (true) {\n  打()\n  if (hero.canMoveRight()) { hero.moveRight() } else { break }\n}')
  assert.equal(ch5Function.result.error, null)
})

test('英雄的性别进入画面帧，名字进入对话日志', async () => {
  const level = findLevel('level-1')
  assert.ok(level)
  const game = new Game(level, { instant: true, heroGender: 'female', heroName: '小芳' })
  const frame = game.getFrame()
  const hero = frame.units.find((unit) => unit.type === 'hero')
  assert.equal(hero?.gender, 'female')

  game.say('出发')
  assert.ok(game.logs.some((entry) => entry.text.includes('小芳 说：出发')))
})

test('默认是男英雄，名字默认「英雄」', async () => {
  const level = findLevel('level-1')
  assert.ok(level)
  const game = new Game(level, { instant: true })
  const hero = game.getFrame().units.find((unit) => unit.type === 'hero')
  assert.equal(hero?.gender, 'male')

  game.say('冲')
  assert.ok(game.logs.some((entry) => entry.text.includes('英雄 说：冲')))
})

test('hero.say(敌人) 会说出敌人的中文名字，不会显示 [object Object]', async () => {
  const level = findLevel('level-7')
  assert.ok(level)
  const { game, result } = await play(level, level.solution)
  assert.equal(result.status, 'win')

  const said = game.logs.filter((entry) => entry.kind === 'hero').map((entry) => entry.text)
  assert.ok(said.some((text) => text.includes('食人魔')), `英雄应该说出敌人名字，实际日志：${said.join(' / ')}`)
  assert.ok(!said.some((text) => text.includes('[object')), '不该出现 [object Object]')
})

/**
 * 面向 10 岁左右的孩子：一关只能出现一个新东西。
 *
 * 这里按「指令关键词」扫一遍全部 49 关的参考解与初始代码，
 * 找出每个概念第一次登场的关卡，然后要求：
 *   1. 一关中第一次出现的概念不超过 1 个；
 *   2. 面板上声明的新指令不超过 1 条；
 *   3. 任务说明和提示里不出现「还没教」的指令。
 */
const CONCEPT_RULES: Array<[string, RegExp]> = [
  ['hero.moveRight()', /hero\.moveRight\(/],
  ['hero.moveLeft()', /hero\.moveLeft\(/],
  ['hero.moveDown()', /hero\.moveDown\(/],
  ['hero.moveUp()', /hero\.moveUp\(/],
  ['hero.say()', /hero\.say\(/],
  ['hero.findNearestEnemy()', /hero\.findNearestEnemy\(/],
  ['const 变量', /\bconst\s/],
  ['hero.attack()', /hero\.attack\(/],
  ['enemy.health', /敌人\.health|boss\.health|\w+\.health/],
  ['for 循环', /\bfor\s*\(/],
  ['hero.distanceTo()', /hero\.distanceTo\(/],
  ['if 判断', /\bif\s*\(/],
  ['else', /\belse\b/],
  ['&&', /&&/],
  ['hero.canMoveRight()', /hero\.canMoveRight\(/],
  ['hero.canMoveDown()', /hero\.canMoveDown\(/],
  ['hero.lookRight()', /hero\.lookRight\(/],
  ['else if', /\belse\s+if\b/],
  ['hero.health', /hero\.health/],
  ['hero.maxHealth', /hero\.maxHealth/],
  ['while 循环', /\bwhile\s*\(/],
  ['hero.pos.x', /hero\.pos\.x/],
  ['hero.findNearestItem()', /hero\.findNearestItem\(/],
  ['hero.wait()', /hero\.wait\(/],
  ['break', /\bbreak\b/],
]

/** 每个概念第一次登场的关卡序号。 */
function firstAppearance(): Map<string, number> {
  const first = new Map<string, number>()
  LEVELS.forEach((level, index) => {
    const text = `${level.starter}\n${level.solution}`
    for (const [name, pattern] of CONCEPT_RULES) {
      if (!first.has(name) && pattern.test(text)) first.set(name, index)
    }
  })
  return first
}

test('每一关最多只出现一个新概念（面向 10 岁孩子，一步一步来）', () => {
  const first = firstAppearance()
  const seen = new Set<string>()

  for (const level of LEVELS) {
    const text = `${level.starter}\n${level.solution}`
    const introduced = CONCEPT_RULES.filter(([name, pattern]) => pattern.test(text) && !seen.has(name)).map(
      ([name]) => name,
    )
    for (const [name, pattern] of CONCEPT_RULES) {
      if (pattern.test(text)) seen.add(name)
    }
    assert.ok(
      introduced.length <= 1,
      `${level.id} ${level.name} 一关出现了 ${introduced.length} 个新概念：${introduced.join('、')}`,
    )
    assert.ok(
      (level.newCommands ?? []).length <= 1,
      `${level.id} ${level.name} 的面板声明了多个新指令：${(level.newCommands ?? []).join(' + ')}`,
    )
  }

  assert.ok(first.has('hero.attack()'), 'attack 应该在某关被教到')
  assert.ok(first.has('while 循环'), 'while 应该在某关被教到')
})

test('任务说明和提示里不出现还没教的指令', () => {
  const first = firstAppearance()
  const indexOf = new Map(LEVELS.map((level, index) => [level.id, index]))

  for (const level of LEVELS) {
    const self = indexOf.get(level.id) ?? 0
    const texts = [level.objective, ...level.hints, ...(level.newCommands ?? [])]
    for (const [name, pattern] of CONCEPT_RULES) {
      const taught = first.get(name)
      if (taught === undefined || taught <= self) continue
      for (const text of texts) {
        assert.ok(
          !pattern.test(text),
          `${level.id} ${level.name} 的文案提到了还没教的「${name}」：${text}`,
        )
      }
    }
  }
})

test('本关的新指令不能预先写在初始代码里（第 1 关除外）', () => {
  for (const level of LEVELS) {
    if (level.id === 'level-1') continue // 第一关留一行示范，让新手知道代码长什么样
    for (const command of level.newCommands ?? []) {
      if (/[\u4e00-\u9fa5]/.test(command)) continue // 中文说明式声明，不是可直接运行的代码
      assert.ok(
        !level.starter.includes(command.trim()),
        `${level.id} ${level.name} 把新指令「${command}」提前写好了，孩子就没有动手的机会`,
      )
    }
  }
})

test('初始代码不能直接就是答案（要留出孩子自己动手的部分）', () => {
  const normalize = (text: string) =>
    text
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith('//'))
      .join('|')

  for (const level of LEVELS) {
    if (level.id === 'level-1') continue // 第一关留一行示范
    assert.notEqual(
      normalize(level.starter),
      normalize(level.solution),
      `${level.id} ${level.name} 的初始代码就是答案，孩子只需要点一下运行`,
    )
  }
})
