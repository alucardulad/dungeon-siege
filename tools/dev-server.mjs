/**
 * 零依赖开发服务器（只用 Node 内置模块）。
 *
 * 为什么需要它：浏览器不认识 .ts，而本项目不想引入打包器。
 * Node 24 自带 module.stripTypeScriptTypes()，这里用它把 TS 里的类型标注剥掉再发给浏览器，
 * 因此核心代码改完刷新页面即可生效。
 *
 * 用法：npm run dev   然后打开 http://localhost:5173
 */

import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { dirname, extname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { stripTypeScriptTypes } from 'node:module'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const port = Number(process.env.PORT ?? 5173)

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.ts': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
}

/** 判断一个磁盘路径是不是文件。 */
async function isFile(path) {
  try {
    return (await stat(path)).isFile()
  } catch {
    return false
  }
}

async function resolveFile(pathname) {
  const candidates = []
  if (pathname.endsWith('/')) {
    candidates.push(`${pathname}index.html`, `${pathname}index.ts`, `${pathname}index.js`)
  } else {
    candidates.push(pathname)
    if (!extname(pathname)) {
      // 依次尝试：补扩展名、当作目录取 index；命中的 URL 会 302 到真实文件路径
      candidates.push(
        `${pathname}.ts`,
        `${pathname}.js`,
        `${pathname}.html`,
        `${pathname}/index.ts`,
        `${pathname}/index.js`,
      )
    }
  }
  for (const candidate of candidates) {
    const full = join(root, candidate)
    if (!full.startsWith(root + sep) && full !== root) continue // 防目录穿越
    try {
      const content = await readFile(full)
      return { full, content }
    } catch {
      // 继续尝试下一个候选
    }
  }
  return null
}

/**
 * 把相对导入补全成明确的文件路径。
 *
 * 浏览器按 URL 解析相对路径：如果模块是通过 `./script`（目录）加载的，
 * 它内部写的 `./ast` 会被解析到错误的位置。这里在返回前把
 * `from './script'` 改写成 `from './script/index.ts'`，让 URL 与磁盘结构一致。
 */
async function rewriteSpecifiers(source, filePath) {
  const pattern = /(\bfrom\s*|\bimport\s*\(?\s*)(['"])(\.[^'"]+)\2/g
  const directory = dirname(filePath)
  const replacements = new Map()

  const matches = [...source.matchAll(pattern)]
  for (const match of matches) {
    const specifier = match[3]
    if (/\.[cm]?[jt]s$/.test(specifier) || replacements.has(specifier)) continue
    const base = resolve(directory, specifier)
    let resolved = null
    for (const candidate of [`${base}.ts`, `${base}.js`, join(base, 'index.ts'), join(base, 'index.js')]) {
      if (await isFile(candidate)) {
        resolved = candidate
        break
      }
    }
    if (!resolved) continue
    let relativeSpecifier = relative(directory, resolved).split(sep).join('/')
    if (!relativeSpecifier.startsWith('.')) relativeSpecifier = `./${relativeSpecifier}`
    replacements.set(specifier, relativeSpecifier)
  }

  let output = source
  for (const [from, to] of replacements) {
    output = output.split(`'${from}'`).join(`'${to}'`).split(`"${from}"`).join(`"${to}"`)
  }
  return output
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', 'http://localhost')
  let pathname = decodeURIComponent(url.pathname)
  if (pathname === '/') pathname = '/preview/index.html'

  const found = await resolveFile(pathname)
  if (!found) {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
    response.end(`找不到文件：${pathname}`)
    return
  }

  const extension = extname(found.full)

  // 让 URL 与磁盘路径一一对应：否则浏览器会用错误的基准解析模块内部的相对导入
  const fileUrl = `/${relative(root, found.full).split(sep).join('/')}`
  if (pathname !== fileUrl) {
    response.writeHead(302, { Location: fileUrl + url.search, 'Cache-Control': 'no-store' })
    response.end()
    return
  }

  let body = found.content
  try {
    if (extension === '.ts') {
      const stripped = stripTypeScriptTypes(found.content.toString('utf8'), { mode: 'strip' })
      body = Buffer.from(await rewriteSpecifiers(stripped, found.full))
    }
  } catch (error) {
    response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' })
    response.end(`编译失败 ${pathname}\n\n${error?.stack ?? error}`)
    console.error(`[dev-server] 编译失败：${pathname}\n${error?.message ?? error}`)
    return
  }

  response.writeHead(200, {
    'Content-Type': CONTENT_TYPES[extension] ?? 'application/octet-stream',
    'Cache-Control': 'no-store',
  })
  response.end(body)
})

server.listen(port, () => {
  console.log(`地牢围攻开发预览已启动：http://localhost:${port}`)
  console.log('按 Ctrl+C 退出。')
})
