/**
 * 语法分析器：把 token 流解析成语法树（递归下降 + 运算符优先级）。
 */

import type { Expr, Program, Stmt } from './ast'
import { ScriptError } from './errors'
import { tokenize, type Token } from './lexer'

const ASSIGN_OPS = new Set(['=', '+=', '-=', '*=', '/=', '%='])

export function parseScript(source: string): Program {
  return new Parser(tokenize(source)).parseProgram()
}

class Parser {
  private tokens: Token[]
  private pos = 0

  constructor(tokens: Token[]) {
    this.tokens = tokens
  }

  // ---------------------------------------------------------------- 工具方法

  private peek(offset = 0): Token {
    return this.tokens[Math.min(this.pos + offset, this.tokens.length - 1)]
  }

  private next(): Token {
    const token = this.peek()
    if (token.type !== 'eof') this.pos++
    return token
  }

  private at(value: string): boolean {
    return this.peek().value === value
  }

  private eat(value: string): boolean {
    if (this.at(value)) {
      this.pos++
      return true
    }
    return false
  }

  private expect(value: string, what?: string): Token {
    if (!this.at(value)) {
      const token = this.peek()
      throw new ScriptError(
        `${what ?? '语法错误'}：这里应该是 ${value}，实际是 ${token.value}`,
        { line: token.line, column: token.col },
        'syntax',
      )
    }
    return this.next()
  }

  private expectIdentifier(what = '这里需要一个名字'): Token {
    const token = this.peek()
    if (token.type !== 'identifier') {
      throw new ScriptError(`${what}，实际是 ${token.value}`, { line: token.line, column: token.col }, 'syntax')
    }
    return this.next()
  }

  /** 分号可有可无：玩家少写分号也照样能跑。 */
  private consumeSemicolon(): void {
    this.eat(';')
  }

  private loc(token: Token) {
    return { line: token.line, column: token.col }
  }

  // ------------------------------------------------------------------ 语句层

  parseProgram(): Program {
    const body: Stmt[] = []
    while (this.peek().type !== 'eof') {
      body.push(this.parseStatement())
    }
    return { body }
  }

  private parseStatement(): Stmt {
    const token = this.peek()

    if (token.value === '{') return this.parseBlock()

    if (token.type === 'keyword') {
      switch (token.value) {
        case 'let':
        case 'const':
        case 'var':
          return this.parseVarDecl()
        case 'if':
          return this.parseIf()
        case 'while':
          return this.parseWhile()
        case 'for':
          return this.parseFor()
        case 'function':
          return this.parseFunctionDecl()
        case 'return': {
          const start = this.next()
          const argument = this.at(';') || this.at('}') || this.peek().type === 'eof' ? null : this.parseExpression()
          this.consumeSemicolon()
          return { kind: 'Return', argument, ...this.loc(start) }
        }
        case 'break': {
          const start = this.next()
          this.consumeSemicolon()
          return { kind: 'Break', ...this.loc(start) }
        }
        case 'continue': {
          const start = this.next()
          this.consumeSemicolon()
          return { kind: 'Continue', ...this.loc(start) }
        }
      }
    }

    const expr = this.parseExpression()
    this.consumeSemicolon()
    return { kind: 'ExprStmt', expr, ...this.loc(token) }
  }

  private parseBlock(): Stmt {
    const start = this.expect('{')
    const body: Stmt[] = []
    while (!this.at('}')) {
      if (this.peek().type === 'eof') {
        throw new ScriptError('大括号没有闭合：缺少 }', this.loc(start), 'syntax')
      }
      body.push(this.parseStatement())
    }
    this.expect('}')
    return { kind: 'Block', body, ...this.loc(start) }
  }

  private parseVarDecl(): Stmt {
    const start = this.next()
    const declKind = start.value as 'let' | 'const' | 'var'
    const declarations: { name: string; init: Expr | null }[] = []

    do {
      const nameToken = this.expectIdentifier('变量声明缺少变量名')
      let init: Expr | null = null
      if (this.eat('=')) init = this.parseExpression()
      if (declKind === 'const' && !init) {
        throw new ScriptError(`const 变量 ${nameToken.value} 必须立刻赋值`, this.loc(nameToken), 'syntax')
      }
      declarations.push({ name: nameToken.value, init })
    } while (this.eat(','))

    this.consumeSemicolon()
    return { kind: 'VarDecl', declKind, declarations, ...this.loc(start) }
  }

  private parseIf(): Stmt {
    const start = this.expect('if')
    this.expect('(', 'if 后面要跟条件括号')
    const test = this.parseExpression()
    this.expect(')', 'if 条件缺少右括号')
    const consequent = this.parseStatement()
    let alternate: Stmt | null = null
    if (this.eat('else')) alternate = this.parseStatement()
    return { kind: 'If', test, consequent, alternate, ...this.loc(start) }
  }

  private parseWhile(): Stmt {
    const start = this.expect('while')
    this.expect('(', 'while 后面要跟条件括号')
    const test = this.parseExpression()
    this.expect(')', 'while 条件缺少右括号')
    const body = this.parseStatement()
    return { kind: 'While', test, body, ...this.loc(start) }
  }

  private parseFor(): Stmt {
    const start = this.expect('for')
    this.expect('(', 'for 后面要跟括号')

    // for (const x of 数组)
    if (this.at('let') || this.at('const') || this.at('var')) {
      const declStart = this.next()
      const declKind = declStart.value as 'let' | 'const' | 'var'
      const nameToken = this.expectIdentifier('for 循环缺少变量名')
      if (this.at('of') || this.at('in')) {
        const isIn = this.at('in')
        this.next()
        const iterable = this.parseExpression()
        this.expect(')', 'for 循环缺少右括号')
        if (isIn) {
          throw new ScriptError(
            'for...in 暂不支持，请改用 for...of 或普通 for 循环',
            this.loc(start),
            'unsupported',
          )
        }
        const body = this.parseStatement()
        return { kind: 'ForOf', name: nameToken.value, iterable, body, ...this.loc(start) }
      }

      const declarations: { name: string; init: Expr | null }[] = [{ name: nameToken.value, init: null }]
      if (this.eat('=')) declarations[0].init = this.parseExpression()
      while (this.eat(',')) {
        const extra = this.expectIdentifier('变量声明缺少变量名')
        let init: Expr | null = null
        if (this.eat('=')) init = this.parseExpression()
        declarations.push({ name: extra.value, init })
      }
      const init: Stmt = { kind: 'VarDecl', declKind, declarations, ...this.loc(declStart) }
      return this.finishClassicFor(init, start)
    }

    if (this.at(';')) {
      this.next()
      return this.finishClassicFor(null, start)
    }

    const initExpr = this.parseExpression()
    const init: Stmt = { kind: 'ExprStmt', expr: initExpr, ...this.loc(start) }
    return this.finishClassicFor(init, start)
  }

  private finishClassicFor(init: Stmt | null, start: Token): Stmt {
    if (!this.eat(';')) {
      // 允许玩家直接写 for (let i = 0; i < 3; i++) 之外的简写：这里补一个分号检查
      if (!this.at(';') && !this.at(')')) {
        throw new ScriptError('for 循环缺少分号', this.loc(this.peek()), 'syntax')
      }
      this.eat(';')
    }
    const test = this.at(';') ? null : this.parseExpression()
    this.expect(';', 'for 循环缺少第二个分号')
    const update = this.at(')') ? null : this.parseExpression()
    this.expect(')', 'for 循环缺少右括号')
    const body = this.parseStatement()
    return { kind: 'For', init, test, update, body, ...this.loc(start) }
  }

  private parseFunctionDecl(): Stmt {
    const start = this.expect('function')
    const nameToken = this.expectIdentifier('函数缺少名字')
    this.expect('(', '函数名后面要跟括号')
    const params: string[] = []
    if (!this.at(')')) {
      do {
        params.push(this.expectIdentifier('函数参数必须是名字').value)
      } while (this.eat(','))
    }
    this.expect(')', '函数参数缺少右括号')
    const block = this.parseBlock()
    if (block.kind !== 'Block') throw new ScriptError('函数体必须是 { }', this.loc(start), 'syntax')
    return { kind: 'FunctionDecl', name: nameToken.value, params, body: block.body, ...this.loc(start) }
  }

  // ---------------------------------------------------------------- 表达式层

  private parseExpression(): Expr {
    return this.parseAssignment()
  }

  private parseAssignment(): Expr {
    const left = this.parseConditional()
    const token = this.peek()
    if (token.type === 'punct' && ASSIGN_OPS.has(token.value)) {
      if (left.kind !== 'Identifier' && left.kind !== 'Member') {
        throw new ScriptError('等号左边必须是变量或属性', this.loc(token), 'syntax')
      }
      this.next()
      const value = this.parseAssignment()
      return { kind: 'Assignment', operator: token.value, target: left, value, ...this.loc(token) }
    }
    return left
  }

  private parseConditional(): Expr {
    const test = this.parseLogicalOr()
    if (this.at('?')) {
      const token = this.next()
      const consequent = this.parseAssignment()
      this.expect(':', '三目运算符缺少 :')
      const alternate = this.parseAssignment()
      return { kind: 'Conditional', test, consequent, alternate, ...this.loc(token) }
    }
    return test
  }

  private parseLogicalOr(): Expr {
    let left = this.parseLogicalAnd()
    while (this.at('||')) {
      const token = this.next()
      const right = this.parseLogicalAnd()
      left = { kind: 'Logical', operator: '||', left, right, ...this.loc(token) }
    }
    return left
  }

  private parseLogicalAnd(): Expr {
    let left = this.parseEquality()
    while (this.at('&&')) {
      const token = this.next()
      const right = this.parseEquality()
      left = { kind: 'Logical', operator: '&&', left, right, ...this.loc(token) }
    }
    return left
  }

  private parseEquality(): Expr {
    let left = this.parseRelational()
    while (this.at('==') || this.at('!=') || this.at('===') || this.at('!==')) {
      const token = this.next()
      const right = this.parseRelational()
      left = { kind: 'Binary', operator: token.value, left, right, ...this.loc(token) }
    }
    return left
  }

  private parseRelational(): Expr {
    let left = this.parseAdditive()
    while (this.at('<') || this.at('>') || this.at('<=') || this.at('>=')) {
      const token = this.next()
      const right = this.parseAdditive()
      left = { kind: 'Binary', operator: token.value, left, right, ...this.loc(token) }
    }
    return left
  }

  private parseAdditive(): Expr {
    let left = this.parseMultiplicative()
    while (this.at('+') || this.at('-')) {
      const token = this.next()
      const right = this.parseMultiplicative()
      left = { kind: 'Binary', operator: token.value, left, right, ...this.loc(token) }
    }
    return left
  }

  private parseMultiplicative(): Expr {
    let left = this.parseExponent()
    while (this.at('*') || this.at('/') || this.at('%')) {
      const token = this.next()
      const right = this.parseExponent()
      left = { kind: 'Binary', operator: token.value, left, right, ...this.loc(token) }
    }
    return left
  }

  private parseExponent(): Expr {
    const left = this.parseUnary()
    if (this.at('**')) {
      const token = this.next()
      const right = this.parseExponent() // 右结合
      return { kind: 'Binary', operator: '**', left, right, ...this.loc(token) }
    }
    return left
  }

  private parseUnary(): Expr {
    const token = this.peek()
    if (token.type === 'punct' && (token.value === '!' || token.value === '-' || token.value === '+')) {
      this.next()
      const argument = this.parseUnary()
      return { kind: 'Unary', operator: token.value, argument, ...this.loc(token) }
    }
    if (token.type === 'keyword' && token.value === 'typeof') {
      this.next()
      const argument = this.parseUnary()
      return { kind: 'Unary', operator: 'typeof', argument, ...this.loc(token) }
    }
    if (token.value === '++' || token.value === '--') {
      this.next()
      const argument = this.parseUnary()
      return { kind: 'Update', operator: token.value as '++' | '--', argument, prefix: true, ...this.loc(token) }
    }
    return this.parsePostfix()
  }

  private parsePostfix(): Expr {
    let expr = this.parseCallMember()
    while (this.at('++') || this.at('--')) {
      const token = this.next()
      expr = {
        kind: 'Update',
        operator: token.value as '++' | '--',
        argument: expr,
        prefix: false,
        ...this.loc(token),
      }
    }
    return expr
  }

  private parseCallMember(): Expr {
    let expr = this.parsePrimary()
    for (;;) {
      if (this.eat('.')) {
        const name = this.expectIdentifier('点号后面需要属性名')
        expr = {
          kind: 'Member',
          object: expr,
          property: { kind: 'String', value: name.value, ...this.loc(name) },
          computed: false,
          ...this.loc(name),
        }
        continue
      }
      if (this.at('[')) {
        const token = this.next()
        const property = this.parseExpression()
        this.expect(']', '下标访问缺少 ]')
        expr = { kind: 'Member', object: expr, property, computed: true, ...this.loc(token) }
        continue
      }
      if (this.at('(')) {
        const token = this.next()
        const args: Expr[] = []
        if (!this.at(')')) {
          do {
            args.push(this.parseAssignment())
          } while (this.eat(','))
        }
        this.expect(')', '函数调用缺少右括号')
        expr = { kind: 'Call', callee: expr, args, ...this.loc(token) }
        continue
      }
      return expr
    }
  }

  private parsePrimary(): Expr {
    const token = this.peek()

    if (token.type === 'number') {
      this.next()
      return { kind: 'Number', value: token.num ?? Number(token.value), ...this.loc(token) }
    }
    if (token.type === 'string') {
      this.next()
      return { kind: 'String', value: token.value, ...this.loc(token) }
    }
    if (token.type === 'identifier') {
      this.next()
      return { kind: 'Identifier', name: token.value, ...this.loc(token) }
    }
    if (token.type === 'keyword') {
      if (token.value === 'true' || token.value === 'false') {
        this.next()
        return { kind: 'Boolean', value: token.value === 'true', ...this.loc(token) }
      }
      if (token.value === 'null') {
        this.next()
        return { kind: 'Null', ...this.loc(token) }
      }
      if (token.value === 'undefined') {
        this.next()
        return { kind: 'Undefined', ...this.loc(token) }
      }
    }
    if (token.value === '(') {
      this.next()
      const expr = this.parseExpression()
      this.expect(')', '括号没有闭合')
      return expr
    }
    if (token.value === '[') {
      this.next()
      const elements: Expr[] = []
      while (!this.at(']')) {
        elements.push(this.parseAssignment())
        if (!this.eat(',')) break
      }
      this.expect(']', '数组字面量缺少 ]')
      return { kind: 'Array', elements, ...this.loc(token) }
    }
    if (token.value === '{') {
      this.next()
      const props: { key: string; value: Expr }[] = []
      while (!this.at('}')) {
        const keyToken = this.next()
        let key: string
        if (keyToken.type === 'identifier' || keyToken.type === 'keyword' || keyToken.type === 'string') key = keyToken.value
        else if (keyToken.type === 'number') key = keyToken.value
        else throw new ScriptError('对象的键名不合法', this.loc(keyToken), 'syntax')

        let value: Expr
        if (this.eat(':')) {
          value = this.parseAssignment()
        } else {
          value = { kind: 'Identifier', name: key, ...this.loc(keyToken) }
        }
        props.push({ key, value })
        if (!this.eat(',')) break
      }
      this.expect('}', '对象字面量缺少 }')
      return { kind: 'Object', props, ...this.loc(token) }
    }

    if (token.type === 'eof') {
      throw new ScriptError('代码在这里突然结束了，后面还缺少内容', this.loc(token), 'syntax')
    }
    throw new ScriptError(`无法理解的写法：${token.value}`, this.loc(token), 'syntax')
  }
}
