/**
 * 把打赏码图片内联成 TS 模块（data URL）。
 *
 * 为什么内联：关于页面是 DOM 界面，浏览器预览和 Cocos 构建的资源路径不一样，
 * 内联成 data URL 两边都能直接显示，不需要额外拷贝资源。
 *
 * 源图：docs/images/donate-qr-card.png
 *   它由原始海报 docs/images/donate-qr.png 裁剪而来（去掉四周空白，让二维码占满画面，
 *   否则缩小显示后二维码太小、手机扫不出来）。
 * 用法：npm run about:image
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, extname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const sourcePath = resolve(root, 'docs/images/donate-qr-card.png')
const outputPath = resolve(root, 'assets/scripts/ui/about-image.ts')

const base64 = readFileSync(sourcePath).toString('base64')
const MIME_TYPES = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp' }
const mime = MIME_TYPES[extname(sourcePath).toLowerCase()] ?? 'image/png'

const content = `/**
 * 关于页面的打赏码图片（内联 data URL）。
 *
 * 内联而不是引用文件，是为了让浏览器预览和 Cocos 构建都能直接显示，
 * 不用管资源路径差异。
 *
 * 由 \`npm run about:image\` 从 docs/images/donate-qr-card.png 生成，请不要手改。
 */

export const DONATE_QR_IMAGE = 'data:${mime};base64,${base64}'
`

mkdirSync(dirname(outputPath), { recursive: true })
writeFileSync(outputPath, content, 'utf8')
console.log(`已生成 ${outputPath}`)
console.log(`内联图片大小：${(base64.length / 1024).toFixed(1)} KB（base64）`)
