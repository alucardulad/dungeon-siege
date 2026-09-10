/**
 * 轻量代码编辑器：一个透明 textarea 叠在语法高亮层上。
 *
 * 故意不引第三方库（Monaco / CodeMirror 需要联网或打包）：
 * 只要行列对齐，读起来和商业编辑器没差别；将来想换也很容易，
 * 只要实现 value / onChange / setActiveLine / setErrorLine 这几个接口即可。
 */

const KEYWORDS = new Set([
  'let', 'const', 'var', 'if', 'else', 'while', 'for', 'of', 'in',
  'function', 'return', 'break', 'continue', 'true', 'false', 'null', 'undefined', 'typeof',
])

const TOKEN_PATTERN = new RegExp(
  [
    '(\\/\\/[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/)', // 1 注释
    '("(?:[^"\\\\]|\\\\.)*"|\'(?:[^\'\\\\]|\\\\.)*\'|`[^`]*`)', // 2 字符串
    '([A-Za-z_$\\p{L}][\\w$\\p{L}]*)', // 3 标识符 / 关键字
    '(\\d+(?:\\.\\d+)?)', // 4 数字
    '(\\s+)', // 5 空白
    '([{}()\\[\\];,.:?])', // 6 标点
    '([+\\-*/%<>=!&|]+)', // 7 运算符
  ].join('|'),
  'gu',
)

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** 把一行代码转成带 class 的 HTML。 */
function highlightLine(line: string): string {
  let html = ''
  let lastIndex = 0
  TOKEN_PATTERN.lastIndex = 0

  const push = (text: string, className?: string) => {
    const safe = escapeHtml(text)
    html += className ? `<span class="${className}">${safe}</span>` : safe
  }

  let match: RegExpExecArray | null
  while ((match = TOKEN_PATTERN.exec(line)) !== null) {
    if (match.index > lastIndex) push(line.slice(lastIndex, match.index))
    const [raw, comment, string, word, number, space, punct, operator] = match
    if (comment) push(raw, 'ds-tok-comment')
    else if (string) push(raw, 'ds-tok-string')
    else if (number) push(raw, 'ds-tok-number')
    else if (word) {
      const after = line.slice(match.index + raw.length)
      if (KEYWORDS.has(raw)) push(raw, 'ds-tok-keyword')
      else if (/^\s*\(/.test(after)) push(raw, 'ds-tok-function')
      else if (/^\s*\./.test(after)) push(raw, 'ds-tok-property')
      else push(raw, 'ds-tok-ident')
    } else if (space) push(raw)
    else if (punct) push(raw, 'ds-tok-punct')
    else if (operator) push(raw, 'ds-tok-operator')
    else push(raw)
    lastIndex = match.index + raw.length
  }
  if (lastIndex < line.length) push(line.slice(lastIndex))
  return html || ' '
}

export interface CodeEditorOptions {
  initial?: string
  onChange?: (value: string) => void
  onRun?: () => void
}

export class CodeEditor {
  private host: HTMLElement
  private options: CodeEditorOptions
  private textarea: HTMLTextAreaElement
  private highlight: HTMLElement
  private gutter: HTMLElement
  private activeLine: number | null = null
  private errorLine: number | null = null

  constructor(host: HTMLElement, options: CodeEditorOptions = {}) {
    this.host = host
    this.options = options
    this.host.innerHTML = ''

    this.gutter = document.createElement('div')
    this.gutter.className = 'ds-gutter'

    this.highlight = document.createElement('pre')
    this.highlight.className = 'ds-highlight'
    this.highlight.setAttribute('aria-hidden', 'true')

    this.textarea = document.createElement('textarea')
    this.textarea.className = 'ds-input'
    this.textarea.spellcheck = false
    this.textarea.setAttribute('wrap', 'off')
    this.textarea.value = options.initial ?? ''

    this.host.append(this.gutter, this.highlight, this.textarea)

    this.textarea.addEventListener('input', () => {
      this.render()
      this.options.onChange?.(this.textarea.value)
    })
    this.textarea.addEventListener('scroll', () => this.syncScroll())
    this.textarea.addEventListener('keydown', (event) => this.onKeyDown(event))
    this.textarea.addEventListener('keyup', () => this.render())
    this.textarea.addEventListener('click', () => this.render())

    this.render()
  }

  get value(): string {
    return this.textarea.value
  }

  set value(next: string) {
    this.textarea.value = next
    this.errorLine = null
    this.activeLine = null
    this.render()
    this.textarea.scrollTop = 0
    this.syncScroll()
  }

  focus(): void {
    this.textarea.focus()
  }

  setActiveLine(line: number | null): void {
    if (line === 0) line = null
    if (line === this.activeLine) return
    this.activeLine = line
    this.render()
  }

  setErrorLine(line: number | null): void {
    if (line === this.errorLine) return
    this.errorLine = line
    this.render()
  }

  /** 在光标处插入一段代码。 */
  insert(text: string): void {
    const start = this.textarea.selectionStart
    const end = this.textarea.selectionEnd
    const before = this.textarea.value.slice(0, start)
    const needsNewline = before.length > 0 && !before.endsWith('\n')
    const snippet = `${needsNewline ? '\n' : ''}${text}`
    this.textarea.value = before + snippet + this.textarea.value.slice(end)
    const caret = start + snippet.length
    this.textarea.selectionStart = caret
    this.textarea.selectionEnd = caret
    this.render()
    this.options.onChange?.(this.textarea.value)
    this.focus()
  }

  private onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Tab') {
      event.preventDefault()
      this.insertAtCaret('  ')
      return
    }
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault()
      this.options.onRun?.()
    }
  }

  private insertAtCaret(text: string): void {
    const start = this.textarea.selectionStart
    const end = this.textarea.selectionEnd
    this.textarea.value = this.textarea.value.slice(0, start) + text + this.textarea.value.slice(end)
    const caret = start + text.length
    this.textarea.selectionStart = caret
    this.textarea.selectionEnd = caret
    this.render()
    this.options.onChange?.(this.textarea.value)
  }

  private syncScroll(): void {
    this.highlight.scrollTop = this.textarea.scrollTop
    this.highlight.scrollLeft = this.textarea.scrollLeft
    this.gutter.scrollTop = this.textarea.scrollTop
  }

  private render(): void {
    const lines = this.textarea.value.split('\n')

    this.highlight.innerHTML = lines
      .map((line, index) => {
        const number = index + 1
        const classes = ['ds-line']
        if (number === this.activeLine) classes.push('is-active')
        if (number === this.errorLine) classes.push('is-error')
        return `<div class="${classes.join(' ')}">${highlightLine(line)}</div>`
      })
      .join('')

    this.gutter.innerHTML = lines
      .map((_, index) => {
        const number = index + 1
        const classes = ['ds-gutter-line']
        if (number === this.activeLine) classes.push('is-active')
        if (number === this.errorLine) classes.push('is-error')
        return `<div class="${classes.join(' ')}">${number}</div>`
      })
      .join('')

    this.syncScroll()
  }
}
