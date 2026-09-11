import assert from 'node:assert/strict'
import test from 'node:test'

import { ABOUT } from '../assets/scripts/ui/about'
import { DONATE_QR_IMAGE } from '../assets/scripts/ui/about-image'

test('关于页文案齐全，并写清了免费与无广告', () => {
  assert.ok(ABOUT.paragraphs.length >= 5)
  const text = ABOUT.paragraphs.join('')
  assert.match(text, /永久免费/)
  assert.match(text, /49 关/)
  assert.match(text, /没有任何收费项目/)
  assert.match(text, /不会弹出广告/)
  assert.match(text, /编程的乐趣/)
})

test('关于页带上开发者与联系方式', () => {
  assert.equal(ABOUT.developer, 'alucardulad')
  assert.equal(ABOUT.email, 'alucardulad@gmail.com')
  assert.ok(ABOUT.donateTitle.includes('打赏'))
})

test('打赏码被内联成 data URL，界面不需要外部资源', () => {
  assert.ok(DONATE_QR_IMAGE.startsWith('data:image/png;base64,'))
  assert.ok(DONATE_QR_IMAGE.length > 10000, '图片内容看起来是空的')
})
