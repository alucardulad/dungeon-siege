import assert from 'node:assert/strict'
import test from 'node:test'

import { CHAPTERS, LEVELS } from '../assets/scripts/core/levels'
import {
  GuidePicker,
  formatGuide,
  guideForChapter,
  hasTeacherScript,
  teacherForHero,
  teacherIntro,
  teacherWin,
} from '../assets/scripts/core/teacher'

test('老师性别与英雄相反，名字和头像都不相同', () => {
  const femaleTeacher = teacherForHero('male')
  const maleTeacher = teacherForHero('female')

  assert.equal(femaleTeacher.gender, 'female')
  assert.equal(maleTeacher.gender, 'male')
  assert.notEqual(femaleTeacher.name, maleTeacher.name)
  assert.ok(femaleTeacher.avatar && maleTeacher.avatar)
})

test('49 关都有对应的教学引导语', () => {
  assert.equal(LEVELS.length, 49)
  for (const level of LEVELS) {
    assert.ok(hasTeacherScript(level.id), `${level.id} 缺少老师的引导语`)
    assert.ok(teacherIntro(level.id).length > 5, `${level.id} 的引导语太短`)
  }
})

test('通关夸奖带英雄名字，星级不同话也不同', () => {
  assert.match(teacherWin('小芳', 3, 12), /小芳/)
  assert.match(teacherWin('小芳', 2, 18), /三星/)
  assert.notEqual(teacherWin('小芳', 3, 12), teacherWin('小芳', 1, 40))
})

test('每章都有 2~4 句可轮换的引导语，并按难度区分语气', () => {
  assert.equal(CHAPTERS.length, 5)
  for (const chapter of CHAPTERS) {
    const guide = guideForChapter(chapter.id)
    assert.match(guide.accent, /^#[0-9a-f]{6}$/i, `${chapter.id} 的强调色不合法`)
    assert.ok(guide.focus.length > 6, `${chapter.id} 缺少本章要点`)
    for (const kind of ['opening', 'stuck', 'error', 'praise'] as const) {
      const pool = guide[kind]
      assert.ok(
        pool.length >= 2 && pool.length <= 4,
        `${chapter.id} 的 ${kind} 应该有 2~4 句，实际 ${pool.length} 句`,
      )
      for (const line of pool) assert.ok(line.length > 6, `${chapter.id} 的 ${kind} 有句子太短：${line}`)
    }
  }
})

test('引导句池随机循环：一轮内不重复，取完自动重新洗牌', () => {
  let seed = 7
  const pseudoRandom = () => {
    seed = (seed * 9301 + 49297) % 233280
    return seed / 233280
  }
  const picker = new GuidePicker(pseudoRandom)
  const pool = ['甲', '乙', '丙', '丁']

  const firstRound = [0, 1, 2, 3].map(() => picker.pick('k', pool))
  assert.equal(new Set(firstRound).size, pool.length, '第一轮应该把每句都用一遍')

  const secondRound = [0, 1, 2, 3].map(() => picker.pick('k', pool))
  assert.equal(new Set(secondRound).size, pool.length, '第二轮也应该把每句都用一遍')
  assert.deepEqual([...firstRound].sort(), [...pool].sort())
})

test('句池里的 {name} 会被替换成英雄名字', () => {
  assert.equal(formatGuide('{name}，加油！', { name: '小芳' }), '小芳，加油！')
  assert.equal(formatGuide('{level}', {}), '这一关')
  assert.ok(guideForChapter('ch5').opening.some((line) => line.includes('{name}')))
})
