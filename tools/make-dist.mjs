/**
 * 生成可直接发布的静态产物：
 *   - dist/index.html          给 Electron 用的普通 HTML（外部 app.js）
 *   - release/CodeDungeon-single.html  给普通用户双击打开的单文件 HTML
 *
 * 前提：先执行 `npm run build:web`，让 esbuild 把 preview/main.ts
 * 以及它引用的所有核心代码打成 dist/app.js。
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const previewHtmlPath = resolve(root, 'preview/index.html')
const appJsPath = resolve(root, 'dist/app.js')
const distDir = resolve(root, 'dist')
const releaseDir = resolve(root, 'release')

const pkg = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'))
const version = pkg.version
const sourceHtml = await readFile(previewHtmlPath, 'utf8')
const appJs = await readFile(appJsPath, 'utf8')

const CSP = [
  "default-src 'self' 'unsafe-inline' data: blob:",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self' data:",
  "connect-src 'self'",
].join('; ')

const STANDALONE_CSP = [
  "default-src 'none'",
  "script-src 'unsafe-inline'",
  "style-src 'unsafe-inline'",
  "img-src data:",
  "font-src data:",
  "connect-src 'none'",
].join('; ')

function buildHtml({ inline }) {
  const title = inline ? '地牢围攻 · CodeDungeon（离线单文件版）' : '地牢围攻 · CodeDungeon'
  const csp = inline ? STANDALONE_CSP : CSP

  let html = sourceHtml
  html = html.replace(
    /<title>.*?<\/title>/,
    `<title>${title}</title>`,
  )
  html = html.replace(
    '<link\n      rel="icon"',
    `<meta http-equiv="Content-Security-Policy" content="${csp}" />\n    <link rel="icon"`,
  )
  html = html.replace(
    /\s*<script type="module" src="\/preview\/main\.ts"><\/script>/,
    inline
      ? `\n    <script>${appJs.replace(/<\/script/gi, '<\\/script')}</script>`
      : `\n    <script src="./app.js"></script>`,
  )
  return html
}

await mkdir(distDir, { recursive: true })
await mkdir(releaseDir, { recursive: true })

if (process.argv.includes('--single')) {
  const singlePath = resolve(releaseDir, `CodeDungeon-${version}-single.html`)
  await writeFile(singlePath, buildHtml({ inline: true }), 'utf8')
  console.log(`已生成单文件版：${singlePath}`)
} else {
  const indexPath = resolve(distDir, 'index.html')
  await writeFile(indexPath, buildHtml({ inline: false }), 'utf8')
  console.log(`已生成 Electron 入口：${indexPath}`)
}
