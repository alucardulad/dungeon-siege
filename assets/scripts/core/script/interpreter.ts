/**
 * 解释器：直接执行语法树。
 *
 * 为什么不用 eval / new Function？
 * 1. 教学场景需要「步数上限」来兜住死循环，直接跑原生 JS 拦不住；
 * 2. 需要在每一步记录当前行号（编辑器高亮）、在关卡结束时立刻掀栈；
 * 3. 需要把报错翻译成中文、并且屏蔽 constructor / __proto__ 这类危险写法。
 *
 * 所有求值都是 async 的：英雄的一次行动会 await 动画播完，
 * 代码执行和游戏表现天然保持同步。
 */

import type { Expr, Program, Stmt } from './ast'
import { BreakSignal, ContinueSignal, HaltSignal, ReturnSignal, ScriptError, type ScriptLocation } from './errors'

export interface InterpreterOptions {
  globals: Record<string, unknown>
  /** 单次运行允许的最大步数，超过就判定为死循环 */
  maxSteps?: number
  /** 每执行一条语句/一次循环迭代回调，用于同步编辑器高亮 */
  onStep?: (location: ScriptLocation) => void
}

interface Slot {
  value: unknown
  constant: boolean
}

/** 作用域链。 */
class Env {
  private vars = new Map<string, Slot>()
  readonly parent: Env | null

  constructor(parent: Env | null = null) {
    this.parent = parent
  }

  declare(name: string, value: unknown, constant: boolean): void {
    this.vars.set(name, { value, constant })
  }

  find(name: string): Slot | undefined {
    if (this.vars.has(name)) return this.vars.get(name)
    return this.parent?.find(name)
  }

  get(name: string, location: ScriptLocation): unknown {
    const slot = this.find(name)
    if (!slot) {
      throw new ScriptError(`没有找到变量 ${name}，检查一下拼写，或者先用 let 声明它`, location)
    }
    return slot.value
  }

  assign(name: string, value: unknown, location: ScriptLocation): void {
    const slot = this.find(name)
    if (!slot) {
      throw new ScriptError(`没有找到变量 ${name}，先用 let 声明它才能赋值`, location)
    }
    if (slot.constant) {
      throw new ScriptError(`变量 ${name} 是用 const 声明的，不能再次赋值`, location)
    }
    slot.value = value
  }
}

/** 被禁止访问的属性名，防止玩家代码碰到宿主对象内部。 */
const FORBIDDEN_PROPS = new Set(['__proto__', 'constructor', 'prototype'])

const YIELD_INTERVAL = 200

export class Interpreter {
  private program: Program
  private options: InterpreterOptions
  private steps = 0
  private readonly maxSteps: number
  /** 本次运行的语句步数（关卡评分用，不含内部求值） */
  statementCount = 0

  constructor(program: Program, options: InterpreterOptions) {
    this.program = program
    this.options = options
    this.maxSteps = options.maxSteps ?? 20000
  }

  async run(): Promise<void> {
    const root = new Env()
    for (const [name, value] of Object.entries(this.options.globals)) {
      root.declare(name, value, true)
    }
    const body: Stmt = { kind: 'Block', body: this.program.body, line: 1, column: 1 }
    try {
      await this.execStmt(body, root)
    } catch (error) {
      if (error instanceof ReturnSignal) return // 顶层 return 直接结束
      throw error
    }
  }

  // ------------------------------------------------------------ 步数 / 中断

  private async step(location: ScriptLocation): Promise<void> {
    this.steps++
    this.statementCount++
    if (this.steps > this.maxSteps) {
      throw new ScriptError(
        `代码执行超过 ${this.maxSteps} 步还没有结束，可能是死循环（比如 while(true) 里没有 break）`,
        location,
        'timeout',
      )
    }
    this.options.onStep?.(location)
    if (this.steps % YIELD_INTERVAL === 0) {
      // 让出主线程，避免长时间卡住浏览器
      await new Promise<void>((resolve) => setTimeout(resolve, 0))
    }
  }

  // ---------------------------------------------------------------- 语句执行

  private async execStmt(stmt: Stmt, env: Env): Promise<void> {
    await this.step(stmt)

    switch (stmt.kind) {
      case 'Block': {
        const scope = new Env(env)
        for (const item of stmt.body) await this.execStmt(item, scope)
        return
      }
      case 'VarDecl': {
        for (const decl of stmt.declarations) {
          const value = decl.init ? await this.evalExpr(decl.init, env) : undefined
          env.declare(decl.name, value, stmt.declKind === 'const')
        }
        return
      }
      case 'ExprStmt':
        await this.evalExpr(stmt.expr, env)
        return
      case 'If': {
        const test = await this.evalExpr(stmt.test, env)
        if (isTruthy(test)) return this.execStmt(stmt.consequent, env)
        if (stmt.alternate) return this.execStmt(stmt.alternate, env)
        return
      }
      case 'While': {
        for (;;) {
          const test = await this.evalExpr(stmt.test, env)
          if (!isTruthy(test)) return
          await this.step(stmt)
          try {
            await this.execStmt(stmt.body, env)
          } catch (signal) {
            if (signal instanceof BreakSignal) return
            if (!(signal instanceof ContinueSignal)) throw signal
          }
        }
      }
      case 'For': {
        const scope = new Env(env)
        if (stmt.init) await this.execStmt(stmt.init, scope)
        for (;;) {
          if (stmt.test) {
            const test = await this.evalExpr(stmt.test, scope)
            if (!isTruthy(test)) return
          }
          await this.step(stmt)
          try {
            await this.execStmt(stmt.body, scope)
          } catch (signal) {
            if (signal instanceof BreakSignal) return
            if (!(signal instanceof ContinueSignal)) throw signal
          }
          if (stmt.update) await this.evalExpr(stmt.update, scope)
        }
      }
      case 'ForOf': {
        const iterable = await this.evalExpr(stmt.iterable, env)
        const items = toIterable(iterable, stmt)
        for (const item of items) {
          const scope = new Env(env)
          scope.declare(stmt.name, item, false)
          await this.step(stmt)
          try {
            await this.execStmt(stmt.body, scope)
          } catch (signal) {
            if (signal instanceof BreakSignal) return
            if (!(signal instanceof ContinueSignal)) throw signal
          }
        }
        return
      }
      case 'FunctionDecl': {
        const fn = createUserFunction(this, stmt, env)
        env.declare(stmt.name, fn, false)
        return
      }
      case 'Return':
        throw new ReturnSignal(stmt.argument ? await this.evalExpr(stmt.argument, env) : undefined)
      case 'Break':
        throw new BreakSignal()
      case 'Continue':
        throw new ContinueSignal()
    }
  }

  /** 供用户函数调用，内部使用。 */
  async callUserFunction(
    decl: Extract<Stmt, { kind: 'FunctionDecl' }>,
    closure: Env,
    args: unknown[],
    location: ScriptLocation,
  ): Promise<unknown> {
    const scope = new Env(closure)
    decl.params.forEach((param, index) => scope.declare(param, args[index], false))
    try {
      for (const item of decl.body) await this.execStmt(item, scope)
    } catch (signal) {
      if (signal instanceof ReturnSignal) return signal.value
      throw signal
    }
    return undefined
  }

  // ---------------------------------------------------------------- 表达式求值

  private async evalExpr(expr: Expr, env: Env): Promise<unknown> {
    switch (expr.kind) {
      case 'Number':
      case 'String':
      case 'Boolean':
        return expr.value
      case 'Null':
        return null
      case 'Undefined':
        return undefined
      case 'Identifier':
        return env.get(expr.name, expr)
      case 'Array': {
        const out: unknown[] = []
        for (const element of expr.elements) out.push(await this.evalExpr(element, env))
        return out
      }
      case 'Object': {
        const out: Record<string, unknown> = {}
        for (const prop of expr.props) out[prop.key] = await this.evalExpr(prop.value, env)
        return out
      }
      case 'Member': {
        const object = await this.evalExpr(expr.object, env)
        const key = expr.computed ? await this.evalExpr(expr.property, env) : (expr.property as { value: string }).value
        return getProperty(object, key, expr)
      }
      case 'Call':
        return this.evalCall(expr, env)
      case 'Unary': {
        const value = await this.evalExpr(expr.argument, env)
        switch (expr.operator) {
          case '!':
            return !isTruthy(value)
          case '-':
            return -toNumber(value, expr)
          case '+':
            return toNumber(value, expr)
          case 'typeof':
            return typeof value
        }
        throw new ScriptError(`不支持的运算符 ${expr.operator}`, expr)
      }
      case 'Update': {
        const current = await this.evalExpr(expr.argument, env)
        const delta = expr.operator === '++' ? 1 : -1
        const next = toNumber(current, expr) + delta
        await this.assignTo(expr.argument, next, env, expr)
        return expr.prefix ? next : current
      }
      case 'Binary': {
        const left = await this.evalExpr(expr.left, env)
        const right = await this.evalExpr(expr.right, env)
        return applyBinary(expr.operator, left, right, expr)
      }
      case 'Logical': {
        const left = await this.evalExpr(expr.left, env)
        if (expr.operator === '&&') return isTruthy(left) ? this.evalExpr(expr.right, env) : left
        return isTruthy(left) ? left : this.evalExpr(expr.right, env)
      }
      case 'Conditional': {
        const test = await this.evalExpr(expr.test, env)
        return isTruthy(test) ? this.evalExpr(expr.consequent, env) : this.evalExpr(expr.alternate, env)
      }
      case 'Assignment': {
        const right = await this.evalExpr(expr.value, env)
        let value = right
        if (expr.operator !== '=') {
          const current = await this.evalExpr(expr.target, env)
          value = applyBinary(expr.operator.slice(0, -1), current, right, expr)
        }
        await this.assignTo(expr.target, value, env, expr)
        return value
      }
    }
  }

  private async assignTo(target: Expr, value: unknown, env: Env, location: ScriptLocation): Promise<void> {
    if (target.kind === 'Identifier') {
      env.assign(target.name, value, location)
      return
    }
    if (target.kind === 'Member') {
      const object = await this.evalExpr(target.object, env)
      const key = target.computed ? await this.evalExpr(target.property, env) : (target.property as { value: string }).value
      setProperty(object, key, value, location)
      return
    }
    throw new ScriptError('这里不能赋值', location)
  }

  private async evalCall(expr: Extract<Expr, { kind: 'Call' }>, env: Env): Promise<unknown> {
    let thisArg: unknown = undefined
    let fn: unknown
    let name = '函数'

    if (expr.callee.kind === 'Member') {
      thisArg = await this.evalExpr(expr.callee.object, env)
      const key = expr.callee.computed
        ? await this.evalExpr(expr.callee.property, env)
        : (expr.callee.property as { value: string }).value
      name = String(key)
      fn = getProperty(thisArg, key, expr)
      if (expr.callee.object.kind === 'Identifier') name = `${expr.callee.object.name}.${name}`
    } else {
      fn = await this.evalExpr(expr.callee, env)
      if (expr.callee.kind === 'Identifier') name = expr.callee.name
    }

    if (typeof fn !== 'function') {
      throw new ScriptError(`${name} 不是一个可以调用的函数`, expr)
    }

    const args: unknown[] = []
    for (const arg of expr.args) args.push(await this.evalExpr(arg, env))

    try {
      return await (fn as (...a: unknown[]) => unknown).apply(thisArg, args)
    } catch (error) {
      rethrow(error, expr, `${name}() 执行出错`)
    }
  }
}

// -------------------------------------------------------------------- 辅助函数

function createUserFunction(
  interpreter: Interpreter,
  decl: Extract<Stmt, { kind: 'FunctionDecl' }>,
  closure: Env,
): (...args: unknown[]) => Promise<unknown> {
  const wrapper = async (...args: unknown[]) => {
    return interpreter.callUserFunction(decl, closure, args, decl)
  }
  Object.defineProperty(wrapper, 'name', { value: decl.name })
  return wrapper
}

/** 把解释器内部错误原样抛出，其它错误包装成中文提示。 */
export function rethrow(error: unknown, location: ScriptLocation, prefix: string): never {
  if (error instanceof ScriptError) throw new ScriptError(error.message, location, error.code)
  if (error instanceof HaltSignal || error instanceof ReturnSignal) throw error
  if (error instanceof BreakSignal || error instanceof ContinueSignal) throw error
  const message = error instanceof Error ? error.message : String(error)
  throw new ScriptError(`${prefix}：${message}`, location)
}

function getProperty(object: unknown, key: unknown, location: ScriptLocation): unknown {
  const name = String(key)
  if (FORBIDDEN_PROPS.has(name)) {
    throw new ScriptError(`出于安全考虑，不能访问 ${name}`, location)
  }
  if (object === null || object === undefined) {
    const label = object === null ? 'null（空）' : 'undefined（未定义）'
    throw new ScriptError(`这里的值是 ${label}，不能读取属性 ${name}。先判断它是否存在再访问。`, location)
  }
  return (object as Record<string, unknown>)[name]
}

function setProperty(object: unknown, key: unknown, value: unknown, location: ScriptLocation): void {
  const name = String(key)
  if (FORBIDDEN_PROPS.has(name)) {
    throw new ScriptError(`出于安全考虑，不能修改 ${name}`, location)
  }
  if (object === null || object === undefined || typeof object !== 'object') {
    throw new ScriptError(`这里的值不能设置属性 ${name}`, location)
  }
  ;(object as Record<string, unknown>)[name] = value
}

function toIterable(value: unknown, location: ScriptLocation): unknown[] {
  if (Array.isArray(value)) return value
  if (typeof value === 'string') return value.split('')
  if (value === null || value === undefined) {
    throw new ScriptError('for...of 后面需要一个数组，但这里是空的', location)
  }
  throw new ScriptError('for...of 只能遍历数组或字符串', location)
}

function applyBinary(operator: string, left: unknown, right: unknown, location: ScriptLocation): unknown {
  switch (operator) {
    case '+':
      if (typeof left === 'string' || typeof right === 'string') return stringify(left) + stringify(right)
      return toNumber(left, location) + toNumber(right, location)
    case '-':
      return toNumber(left, location) - toNumber(right, location)
    case '*':
      return toNumber(left, location) * toNumber(right, location)
    case '/':
      return toNumber(left, location) / toNumber(right, location)
    case '%':
      return toNumber(left, location) % toNumber(right, location)
    case '**':
      return toNumber(left, location) ** toNumber(right, location)
    case '==':
    case '===':
      return operator === '===' ? left === right : left == right
    case '!=':
    case '!==':
      return operator === '!==' ? left !== right : left != right
    case '<':
      return toNumber(left, location) < toNumber(right, location)
    case '>':
      return toNumber(left, location) > toNumber(right, location)
    case '<=':
      return toNumber(left, location) <= toNumber(right, location)
    case '>=':
      return toNumber(left, location) >= toNumber(right, location)
    default:
      throw new ScriptError(`不支持的运算符 ${operator}`, location)
  }
}

function toNumber(value: unknown, location: ScriptLocation): number {
  if (typeof value === 'number') return value
  if (typeof value === 'boolean') return value ? 1 : 0
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) return Number(value)
  throw new ScriptError(`期望一个数字，但拿到的是 ${describe(value)}`, location)
}

function stringify(value: unknown): string {
  if (value === null) return 'null'
  if (value === undefined) return 'undefined'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function describe(value: unknown): string {
  if (value === null) return 'null'
  if (value === undefined) return 'undefined'
  if (Array.isArray(value)) return '数组'
  if (typeof value === 'object') return '对象'
  return `${typeof value} 类型的 ${String(value)}`
}

export function isTruthy(value: unknown): boolean {
  if (value === false || value === null || value === undefined || value === 0 || value === '') return false
  return true
}

export { Env }
