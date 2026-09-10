/** 玩家代码的语法树结构定义。 */

export interface Loc {
  line: number
  column: number
}

export interface Program {
  body: Stmt[]
}

export type Stmt =
  | { kind: 'Block'; body: Stmt[] } & Loc
  | { kind: 'VarDecl'; declKind: 'let' | 'const' | 'var'; declarations: { name: string; init: Expr | null }[] } & Loc
  | { kind: 'ExprStmt'; expr: Expr } & Loc
  | { kind: 'If'; test: Expr; consequent: Stmt; alternate: Stmt | null } & Loc
  | { kind: 'While'; test: Expr; body: Stmt } & Loc
  | { kind: 'For'; init: Stmt | null; test: Expr | null; update: Expr | null; body: Stmt } & Loc
  | { kind: 'ForOf'; name: string; iterable: Expr; body: Stmt } & Loc
  | { kind: 'FunctionDecl'; name: string; params: string[]; body: Stmt[] } & Loc
  | { kind: 'Return'; argument: Expr | null } & Loc
  | { kind: 'Break' } & Loc
  | { kind: 'Continue' } & Loc

export type Expr =
  | { kind: 'Number'; value: number } & Loc
  | { kind: 'String'; value: string } & Loc
  | { kind: 'Boolean'; value: boolean } & Loc
  | { kind: 'Null' } & Loc
  | { kind: 'Undefined' } & Loc
  | { kind: 'Identifier'; name: string } & Loc
  | { kind: 'Array'; elements: Expr[] } & Loc
  | { kind: 'Object'; props: { key: string; value: Expr }[] } & Loc
  | { kind: 'Member'; object: Expr; property: Expr; computed: boolean } & Loc
  | { kind: 'Call'; callee: Expr; args: Expr[] } & Loc
  | { kind: 'Unary'; operator: string; argument: Expr } & Loc
  | { kind: 'Update'; operator: '++' | '--'; argument: Expr; prefix: boolean } & Loc
  | { kind: 'Binary'; operator: string; left: Expr; right: Expr } & Loc
  | { kind: 'Logical'; operator: '&&' | '||'; left: Expr; right: Expr } & Loc
  | { kind: 'Conditional'; test: Expr; consequent: Expr; alternate: Expr } & Loc
  | { kind: 'Assignment'; operator: string; target: Expr; value: Expr } & Loc
