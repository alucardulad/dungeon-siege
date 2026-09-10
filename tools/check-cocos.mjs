/**
 * 提交前的自检脚本（npm run check:cocos）：
 *   1. 场景 JSON 能否解析、__id__ 引用是否都有效；
 *   2. 场景里引用脚本用的压缩 uuid，是否与 GameRoot.ts.meta 一致；
 *   3. 每个关卡地图是否矩形、是否只有一个英雄出生点；
 *   4. package.json 是否带了 Creator 需要的字段。
 *
 * 这些检查都不能替代「用 Cocos Creator 打开一次」，但能挡住最常见的低级错误。
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, resolve, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const problems = []
const notes = []

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

function collectFiles(dir, predicate) {
  const out = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...collectFiles(full, predicate))
    else if (predicate(full)) out.push(full)
  }
  return out
}

// ------------------------------------------------------------ 1. 场景文件

const scenePath = resolve(root, 'assets/scenes/main.scene')
if (!existsSync(scenePath)) {
  problems.push('缺少 assets/scenes/main.scene（可执行 npm run scene 重新生成）')
} else {
  const scene = readJson(scenePath)
  if (!Array.isArray(scene)) problems.push('main.scene 顶层应该是数组')
  else {
    scene.forEach((entry, index) => {
      if (!entry || typeof entry !== 'object' || typeof entry.__type__ !== 'string') {
        problems.push(`main.scene 第 ${index} 个对象缺少 __type__`)
        return
      }
      for (const [key, value] of Object.entries(entry)) {
        const check = (candidate) => {
          if (candidate && typeof candidate === 'object' && typeof candidate.__id__ === 'number') {
            if (candidate.__id__ < 0 || candidate.__id__ >= scene.length) {
              problems.push(`main.scene 第 ${index} 个对象的 ${key} 指向不存在的 __id__ ${candidate.__id__}`)
            }
          }
        }
        if (Array.isArray(value)) value.forEach(check)
        else check(value)
      }
    })
    const nodeNames = scene.filter((entry) => entry.__type__ === 'cc.Node').map((entry) => entry._name)
    notes.push(`场景节点：${nodeNames.join('、') || '（无）'}`)
  }
}

// ------------------------------------------------------------ 2. 脚本 uuid

const metaPath = resolve(root, 'assets/scripts/cocos/GameRoot.ts.meta')
if (!existsSync(metaPath)) problems.push('缺少 assets/scripts/cocos/GameRoot.ts.meta')
else {
  const uuid = readJson(metaPath).uuid
  const BASE64_KEYS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
  const compress = (value) => {
    const hex = value.replace(/-/g, '')
    let out = hex.slice(0, 5)
    for (let i = 5; i < hex.length; i += 3) {
      const number = parseInt(hex.slice(i, i + 3), 16)
      out += BASE64_KEYS[number >> 6] + BASE64_KEYS[number & 63]
    }
    return out
  }
  const classId = compress(uuid)
  const scene = existsSync(scenePath) ? readJson(scenePath) : []
  const used = scene.some((entry) => entry.__type__ === classId)
  if (!used) {
    problems.push(`main.scene 里没有引用 GameRoot 的脚本类 ID（应为 ${classId}），执行 npm run scene 可重新生成`)
  } else {
    notes.push(`GameRoot 脚本类 ID：${classId}`)
  }
}

// ------------------------------------------------------------ 3. 关卡数据

// 直接导入真实的关卡数据来校验，比正则扫源码靠谱
const { LEVELS, CHAPTERS } = await import(pathToFileURL(resolve(root, 'assets/scripts/core/levels.ts')).href)

if (!Array.isArray(LEVELS) || LEVELS.length === 0) {
  problems.push('levels.ts 没有导出关卡数组')
} else {
  const ids = new Set()
  const counts = new Map()

  for (const level of LEVELS) {
    if (ids.has(level.id)) problems.push(`关卡 id 重复：${level.id}`)
    ids.add(level.id)

    const chapter = CHAPTERS.find((item) => item.id === level.chapter)
    if (!chapter) problems.push(`${level.id} 引用了不存在的章节 ${level.chapter}`)
    counts.set(level.chapter, (counts.get(level.chapter) ?? 0) + 1)

    const rows = level.map
    const width = rows[0]?.length ?? 0
    rows.forEach((row, rowIndex) => {
      if (row.length !== width) {
        problems.push(`${level.id} 第 ${rowIndex + 1} 行宽度 ${row.length}，与第一行 ${width} 不一致`)
      }
    })

    const joined = rows.join('')
    const heroes = (joined.match(/@/g) ?? []).length
    if (heroes !== 1) problems.push(`${level.id} 应该有 1 个英雄出生点 @，实际 ${heroes} 个`)
    if (level.win?.reachExit && !joined.includes('E')) {
      problems.push(`${level.id} 的胜利条件要求到达出口，但地图里没有 E`)
    }
    if (!level.solution?.trim()) problems.push(`${level.id} 缺少参考解`)
    if (!(level.par > 0)) problems.push(`${level.id} 的三星线不合法：${level.par}`)
  }

  notes.push(`关卡数量：${LEVELS.length} 关，分 ${CHAPTERS.length} 章`)
  for (const chapter of CHAPTERS) {
    notes.push(`  ${chapter.name}（${chapter.subtitle}）：${counts.get(chapter.id) ?? 0} 关`)
  }
}

// ------------------------------------------------------------ 4. 工程配置

const pkg = readJson(resolve(root, 'package.json'))
if (!pkg.creator?.version) problems.push('package.json 缺少 creator.version，Cocos Creator 可能无法识别工程')
else notes.push(`声明 Creator 版本：${pkg.creator.version}`)

const scripts = collectFiles(resolve(root, 'assets/scripts'), (file) => file.endsWith('.ts'))
notes.push(`脚本文件：${scripts.length} 个`)
for (const file of scripts) {
  const source = readFileSync(file, 'utf8')
  if (/constructor\s*\([^)]*\b(private|public|protected|readonly)\b/.test(source)) {
    problems.push(`${relative(root, file).split(sep).join('/')} 用了参数属性写法，预览用的剥类型模式不支持，请改成显式字段`)
  }
}

// ------------------------------------------------------------ 输出

for (const note of notes) console.log(`· ${note}`)
if (problems.length > 0) {
  console.error('\n发现以下问题：')
  for (const problem of problems) console.error(`  ✖ ${problem}`)
  process.exit(1)
}
console.log('\n✔ 自检通过')
