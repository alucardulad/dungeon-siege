/**
 * 教学进度控制：检查玩家代码里有没有用到「这一章还没教」的语法。
 *
 * 前几章刻意不允许写循环和判断，是为了让学习者把顺序流程写清楚；
 * 一旦偷用 while 走捷径，后面的课就白上了。所以这里不是报语法错误，
 * 而是给一句「本章还不能用 while，先把每一步写明白」的提示。
 */

import type { Expr, Program, Stmt } from './script/ast'
import type { LanguageFeature } from './types'

export const FEATURE_LABEL: Record<LanguageFeature, string> = {
  for: 'for 循环',
  while: 'while 循环',
  if: 'if 判断',
  function: '自定义函数',
}

export const FEATURE_HINT: Record<LanguageFeature, string> = {
  for: '先把每一步写成一行，等下一章再学循环',
  while: '用 for 循环 + 固定次数也能过关，while 在后面的章节才学',
  if: '这一关的敌人和地形是固定的，先按照顺序把路线写出来',
  function: '先把动作一条条写清楚，函数在后面的章节才学',
}

export interface FeatureViolation {
  feature: LanguageFeature
  line: number
  column: number
}

/** 找出第一处「被禁用」的语法，找不到返回 null。 */
export function findForbiddenFeature(program: Program, forbidden: LanguageFeature[]): FeatureViolation | null {
  if (!forbidden || forbidden.length === 0) return null
  const walker = new TutorWalker(forbidden)
  walker.walkProgram(program)
  return walker.violation
}

class TutorWalker {
  violation: FeatureViolation | null = null
  private forbidden: Set<LanguageFeature>

  constructor(forbidden: LanguageFeature[]) {
    this.forbidden = new Set(forbidden)
  }

  walkProgram(program: Program): void {
    for (const statement of program.body) this.walkStmt(statement)
  }

  private report(feature: LanguageFeature, node: { line: number, column: number }): void {
    if (!this.violation) this.violation = { feature, line: node.line, column: node.column }
  }

  private walkStmt(statement: Stmt): void {
    if (!statement || this.violation) return
    switch (statement.kind) {
      case 'Block':
        for (const item of statement.body) this.walkStmt(item)
        return
      case 'VarDecl':
        for (const declaration of statement.declarations) {
          if (declaration.init) this.walkExpr(declaration.init)
        }
        return
      case 'ExprStmt':
        this.walkExpr(statement.expr)
        return
      case 'If':
        if (this.forbidden.has('if')) this.report('if', statement)
        this.walkExpr(statement.test)
        this.walkStmt(statement.consequent)
        if (statement.alternate) this.walkStmt(statement.alternate)
        return
      case 'While':
        if (this.forbidden.has('while')) this.report('while', statement)
        this.walkExpr(statement.test)
        this.walkStmt(statement.body)
        return
      case 'For':
        if (this.forbidden.has('for')) this.report('for', statement)
        if (statement.init) this.walkStmt(statement.init)
        if (statement.test) this.walkExpr(statement.test)
        if (statement.update) this.walkExpr(statement.update)
        this.walkStmt(statement.body)
        return
      case 'ForOf':
        if (this.forbidden.has('for')) this.report('for', statement)
        this.walkExpr(statement.iterable)
        this.walkStmt(statement.body)
        return
      case 'FunctionDecl':
        if (this.forbidden.has('function')) this.report('function', statement)
        for (const item of statement.body) this.walkStmt(item)
        return
      case 'Return':
        if (statement.argument) this.walkExpr(statement.argument)
        return
      case 'Break':
      case 'Continue':
        return
    }
  }

  private walkExpr(expression: Expr): void {
    if (!expression || this.violation) return
    switch (expression.kind) {
      case 'Number':
      case 'String':
      case 'Boolean':
      case 'Null':
      case 'Undefined':
      case 'Identifier':
        return
      case 'Array':
        for (const element of expression.elements) this.walkExpr(element)
        return
      case 'Object':
        for (const property of expression.props) this.walkExpr(property.value)
        return
      case 'Member':
        this.walkExpr(expression.object)
        this.walkExpr(expression.property)
        return
      case 'Call':
        this.walkExpr(expression.callee)
        for (const argument of expression.args) this.walkExpr(argument)
        return
      case 'Unary':
        this.walkExpr(expression.argument)
        return
      case 'Update':
        this.walkExpr(expression.argument)
        return
      case 'Binary':
      case 'Logical':
        this.walkExpr(expression.left)
        this.walkExpr(expression.right)
        return
      case 'Conditional':
        this.walkExpr(expression.test)
        this.walkExpr(expression.consequent)
        this.walkExpr(expression.alternate)
        return
      case 'Assignment':
        this.walkExpr(expression.target)
        this.walkExpr(expression.value)
        return
    }
  }
}
