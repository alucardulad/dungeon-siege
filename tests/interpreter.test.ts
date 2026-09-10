import assert from 'node:assert/strict'
import test from 'node:test'

import { Interpreter } from '../assets/scripts/core/script/interpreter'
import { parseScript } from '../assets/scripts/core/script/parser'
import { ScriptError } from '../assets/scripts/core/script/errors'

/** 跑一段代码，返回 console.log 收集到的输出。 */
async function run(
  code: string,
  globals: Record<string, unknown> = {},
  maxSteps = 20000,
): Promise<string[]> {
  const output: string[] = []
  const program = parseScript(code)
  const interpreter = new Interpreter(program, {
    globals: { log: (value: unknown) => output.push(String(value)), ...globals },
    maxSteps,
  })
  await interpreter.run()
  return output
}

async function runExpectError(code: string): Promise<ScriptError> {
  try {
    await run(code)
  } catch (error) {
    assert.ok(error instanceof ScriptError, `期望 ScriptError，实际是 ${String(error)}`)
    return error
  }
  throw new Error('期望抛出错误，但代码正常跑完了')
}

test('顺序执行与变量', async () => {
  const output = await run(`
    let a = 1
    let b = 2
    const c = a + b * 3
    log(c)
  `)
  assert.deepEqual(output, ['7'])
})

test('字符串拼接与比较运算', async () => {
  const output = await run(`
    const name = "英雄"
    log(name + " 有 " + 3 + " 颗宝石")
    log(3 >= 3 && 1 < 2)
    log(3 >= 3 && 2 < 1)
  `)
  assert.deepEqual(output, ['英雄 有 3 颗宝石', 'true', 'false'])
})

test('while 循环与 break/continue', async () => {
  const output = await run(`
    let sum = 0
    let i = 0
    while (true) {
      i++
      if (i > 5) break
      if (i % 2 === 0) continue
      sum += i
    }
    log(sum)
  `)
  assert.deepEqual(output, ['9'])
})

test('for 循环与 for...of', async () => {
  const output = await run(`
    const list = [1, 2, 3, 4]
    let total = 0
    for (let i = 0; i < list.length; i++) {
      total += list[i]
    }
    log(total)
    let doubled = 0
    for (const value of list) {
      doubled += value * 2
    }
    log(doubled)
  `)
  assert.deepEqual(output, ['10', '20'])
})

test('函数声明、参数与 return', async () => {
  const output = await run(`
    function 翻倍(x) {
      return x * 2
    }
    function 累加(a, b) {
      return a + b
    }
    log(翻倍(21))
    log(累加(1, 翻倍(3)))
  `)
  assert.deepEqual(output, ['42', '7'])
})

test('对象字面量、三目运算符与 typeof', async () => {
  const output = await run(`
    const enemy = { health: 20, name: "食人魔" }
    log(enemy.name)
    log(enemy.health > 10 ? "还活着" : "倒了")
    log(typeof enemy)
  `)
  assert.deepEqual(output, ['食人魔', '还活着', 'object'])
})

test('可以等待宿主函数（比如英雄移动动画）', async () => {
  let remaining = 3
  const globals = {
    move: async () => {
      remaining--
      return remaining > 0
    },
  }
  const output = await run(
    `
    let steps = 0
    while (move()) {
      steps++
      log("前进 " + steps)
    }
  `,
    globals,
  )
  assert.deepEqual(output, ['前进 1', '前进 2'])
})

test('死循环会被步数上限拦下来', async () => {
  const error = await runExpectError(`
    while (true) {
    }
  `)
  assert.equal(error.code, 'timeout')
  assert.match(error.message, /死循环/)
})

test('语法错误会指出行号', async () => {
  const error = await runExpectError('let a = 1\nif (a > 0 { log(a) }')
  assert.equal(error.code, 'syntax')
  assert.equal(error.location.line, 2)
})

test('const 不能被重新赋值', async () => {
  const error = await runExpectError('const a = 1\na = 2')
  assert.match(error.message, /const/)
})

test('访问 null 的属性会给出中文提示', async () => {
  const error = await runExpectError('const enemy = null\nlog(enemy.health)')
  assert.match(error.message, /null/)
})

test('未声明的变量会给出中文提示', async () => {
  const error = await runExpectError('log(missing)')
  assert.match(error.message, /变量 missing/)
})
