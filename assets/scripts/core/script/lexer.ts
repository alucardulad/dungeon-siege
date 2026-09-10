/**
 * 词法分析器：把玩家写的代码切成 token 流。
 *
 * 只支持教学需要的 JavaScript 子集：
 * 变量声明、if/else、while、for、for...of、函数声明、return、break/continue、
 * 基本表达式与字符串/数组/对象字面量（不做模板字符串插值、不写正则）。
 */

import { ScriptError } from './errors'

export type TokenType = 'number' | 'string' | 'identifier' | 'keyword' | 'punct' | 'eof'

export interface Token {
  type: TokenType
  value: string
  /** 仅 number 类型有值 */
  num?: number
  line: number
  col: number
}

export const KEYWORDS = new Set([
  'let', 'const', 'var',
  'if', 'else',
  'while', 'for', 'of', 'in',
  'function', 'return',
  'break', 'continue',
  'true', 'false', 'null', 'undefined', 'typeof',
])

/** 多字符运算符要按长度从大到小匹配，否则 '===' 会被切成 '==' 和 '='。 */
const PUNCTUATORS = [
  '**=', '===', '!==', '...',
  '==', '!=', '<=', '>=', '&&', '||', '+=', '-=', '*=', '/=', '%=', '**',
  '++', '--',
  '{', '}', '(', ')', '[', ']',
  ';', ',', '.', ':', '?',
  '+', '-', '*', '/', '%', '<', '>', '=', '!',
].sort((a, b) => b.length - a.length)

const isDigit = (c: string) => c >= '0' && c <= '9'
// 允许中文等 Unicode 字母做变量名/函数名，教学时写「前进并战斗()」比拼音亲切得多
const ID_START = /[\p{L}\p{Nl}_$]/u
const ID_PART = /[\p{L}\p{Nl}\p{Mn}\p{Mc}\p{Nd}_$]/u
const isIdStart = (c: string) => ID_START.test(c)
const isIdPart = (c: string) => ID_PART.test(c)

export function tokenize(source: string): Token[] {
  const tokens: Token[] = []
  let i = 0
  let line = 1
  let lineStart = 0
  const col = () => i - lineStart + 1

  const push = (type: TokenType, value: string, num?: number) => {
    tokens.push({ type, value, num, line, col: col() - value.length })
  }

  while (i < source.length) {
    const c = source[i]

    // 换行
    if (c === '\n') {
      i++
      line++
      lineStart = i
      continue
    }
    // 空白
    if (c === ' ' || c === '\t' || c === '\r') {
      i++
      continue
    }
    // 注释
    if (c === '/' && source[i + 1] === '/') {
      while (i < source.length && source[i] !== '\n') i++
      continue
    }
    if (c === '/' && source[i + 1] === '*') {
      const startLine = line
      const startCol = col()
      i += 2
      while (i < source.length && !(source[i] === '*' && source[i + 1] === '/')) {
        if (source[i] === '\n') {
          line++
          lineStart = i + 1
        }
        i++
      }
      if (i >= source.length) {
        throw new ScriptError('注释没有闭合：缺少 */', { line: startLine, column: startCol }, 'syntax')
      }
      i += 2
      continue
    }

    // 数字
    if (isDigit(c) || (c === '.' && isDigit(source[i + 1]))) {
      const start = i
      const startCol = col()
      while (i < source.length && (isDigit(source[i]) || source[i] === '.')) i++
      const raw = source.slice(start, i)
      const num = Number(raw)
      if (!Number.isFinite(num)) {
        throw new ScriptError(`无法识别的数字：${raw}`, { line, column: startCol }, 'syntax')
      }
      tokens.push({ type: 'number', value: raw, num, line, col: startCol })
      continue
    }

    // 字符串
    if (c === '"' || c === "'") {
      const quote = c
      const startCol = col()
      i++
      let value = ''
      while (i < source.length && source[i] !== quote) {
        if (source[i] === '\\') {
          const esc = source[i + 1]
          value += esc === 'n' ? '\n' : esc === 't' ? '\t' : esc === '\\' ? '\\' : esc
          i += 2
          continue
        }
        if (source[i] === '\n') {
          throw new ScriptError('字符串没有闭合：缺少结尾的引号', { line, column: startCol }, 'syntax')
        }
        value += source[i]
        i++
      }
      if (i >= source.length) {
        throw new ScriptError('字符串没有闭合：缺少结尾的引号', { line, column: startCol }, 'syntax')
      }
      i++
      tokens.push({ type: 'string', value, line, col: startCol })
      continue
    }

    // 模板字符串：当前只支持不带插值的写法，遇到 ${ 给出明确提示
    if (c === '`') {
      const startCol = col()
      i++
      let value = ''
      while (i < source.length && source[i] !== '`') {
        if (source[i] === '$' && source[i + 1] === '{') {
          throw new ScriptError(
            '暂不支持模板字符串里的 ${...} 插值，请改成 "文字" + 变量 的写法',
            { line, column: startCol },
            'unsupported',
          )
        }
        value += source[i]
        i++
      }
      if (i >= source.length) {
        throw new ScriptError('反引号字符串没有闭合', { line, column: startCol }, 'syntax')
      }
      i++
      tokens.push({ type: 'string', value, line, col: startCol })
      continue
    }

    // 标识符 / 关键字
    if (isIdStart(c)) {
      const start = i
      const startCol = col()
      while (i < source.length && isIdPart(source[i])) i++
      const word = source.slice(start, i)
      tokens.push({ type: KEYWORDS.has(word) ? 'keyword' : 'identifier', value: word, line, col: startCol })
      continue
    }

    // 运算符 / 标点
    const punct = PUNCTUATORS.find((p) => source.startsWith(p, i))
    if (punct) {
      const startCol = col()
      i += punct.length
      tokens.push({ type: 'punct', value: punct, line, col: startCol })
      continue
    }

    throw new ScriptError(`代码里出现了无法识别的符号：${c}`, { line, column: col() }, 'syntax')
  }

  tokens.push({ type: 'eof', value: '<结束>', line, col: col() })
  return tokens
}
