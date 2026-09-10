import assert from 'node:assert/strict'
import test from 'node:test'

import { parseScript } from '../assets/scripts/core/script/parser'
import { findForbiddenFeature } from '../assets/scripts/core/tutor'

test('嵌套在循环里的 if 也会被发现', () => {
  const program = parseScript('for (let i = 0; i < 3; i++) { if (true) { hero.moveRight() } }')
  const violation = findForbiddenFeature(program, ['if'])
  assert.ok(violation)
  assert.equal(violation.feature, 'if')
  assert.equal(violation.line, 1)
})

test('函数体里的 while 也会被发现', () => {
  const program = parseScript(['function 走() {', '  while (true) {', '    hero.moveRight()', '  }', '}'].join('\n'))
  const violation = findForbiddenFeature(program, ['while'])
  assert.ok(violation)
  assert.equal(violation.feature, 'while')
  assert.equal(violation.line, 2)
})

test('for 循环本身可以被单独禁用', () => {
  const program = parseScript('for (const 敌人 of hero.findEnemies()) { hero.attack(敌人) }')
  const violation = findForbiddenFeature(program, ['for'])
  assert.ok(violation)
  assert.equal(violation.feature, 'for')
})

test('没有用到禁用语法时返回 null', () => {
  const program = parseScript('if (hero.canMoveRight()) { hero.moveRight() }')
  assert.equal(findForbiddenFeature(program, ['while', 'function']), null)
})

test('禁用列表为空时不拦截任何写法', () => {
  const program = parseScript('while (true) { hero.moveRight() }')
  assert.equal(findForbiddenFeature(program, []), null)
})
