import assert from 'node:assert/strict'
import test from 'node:test'

import { LEVELS } from '../assets/scripts/core/levels'
import { hasTeacherScript, teacherForHero, teacherIntro, teacherWin } from '../assets/scripts/core/teacher'

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
