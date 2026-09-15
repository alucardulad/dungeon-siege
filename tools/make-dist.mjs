/**
 * 生成可直接发布的静态产物：
 *   - dist/index.html          给 Electron 用的普通 HTML（外部 app.js）
 *   - release/CodeDungeon-single.html  给普通用户双击打开的单文件 HTML
 *
 * 前提：先执行 `npm run build:web`，让 esbuild 把 preview/main.ts
 * 以及它引用的所有核心代码打成 dist/app.js。
 */

import { cp, mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const previewHtmlPath = resolve(root, 'preview/index.html')
const distDir = resolve(root, 'dist')
const appJsPath = resolve(distDir, 'app.js')
const voiceDir = resolve(root, 'assets/resources/teacher-voice')
const distVoiceDir = resolve(distDir, 'assets/resources/teacher-voice')
const releaseDir = resolve(root, 'release')

const pkg = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'))
const version = pkg.version
const sourceHtml = await readFile(previewHtmlPath, 'utf8')
const appJs = await readFile(appJsPath, 'utf8')
const voiceFiles = (await readdir(voiceDir)).filter((name) => name.endsWith('.mp3')).sort()

const CSP = [
  "default-src 'self' 'unsafe-inline' data: blob:",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "media-src 'self' data:",
].join('; ')

const STANDALONE_CSP = [
  "default-src 'none'",
  "script-src 'unsafe-inline'",
  "style-src 'unsafe-inline'",
  "img-src data:",
  "font-src data:",
  "connect-src 'none'",
  "media-src data:",
].join('; ')

async function buildTeacherVoiceScript() {
  const entries = []
  for (const name of voiceFiles) {
    const buffer = await readFile(resolve(voiceDir, name))
    const data = buffer.toString('base64')
    entries.push(`  ${JSON.stringify(name)}: ${JSON.stringify(data)},`)
  }
  return `window.__DUNGEON_TEACHER_VOICE__ = {\n${entries.join('\n')}\n};`
}

async function buildHtml({ inline }) {
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
  const voiceScript = inline ? await buildTeacherVoiceScript() : ''
  html = html.replace(
    /\s*<script type="module" src="\/preview\/main\.ts"><\/script>/,
    inline
      ? `\n    <script>${voiceScript.replace(/<\/script/gi, '<\\/script')}</script>\n    <script>${appJs.replace(/<\/script/gi, '<\\/script')}</script>`
      : `\n    <script src="./app.js"></script>`,
  )
  return html
}

await mkdir(distDir, { recursive: true })
await mkdir(releaseDir, { recursive: true })
if (!process.argv.includes('--single')) {
  await mkdir(distVoiceDir, { recursive: true })
  for (const name of voiceFiles) await cp(resolve(voiceDir, name), resolve(distVoiceDir, name))
}

if (process.argv.includes('--single')) {
  const singlePath = resolve(releaseDir, `CodeDungeon-${version}-single.html`)
  await writeFile(singlePath, await buildHtml({ inline: true }), 'utf8')
  console.log(`已生成单文件版：${singlePath}`)
} else {
  const indexPath = resolve(distDir, 'index.html')
  await writeFile(indexPath, await buildHtml({ inline: false }), 'utf8')
  console.log(`已生成 Electron 入口：${indexPath}`)
}
