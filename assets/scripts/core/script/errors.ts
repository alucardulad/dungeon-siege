/**
 * 玩家代码执行过程中的错误类型。
 *
 * 所有面向玩家的报错都要能定位到「第几行第几列」，
 * 这样编辑器才能画出红色的错误提示。
 */

export interface ScriptLocation {
  line: number
  column: number
}

/** 玩家代码出错（语法错误 / 运行时错误 / 步数超限）。 */
export class ScriptError extends Error {
  readonly location: ScriptLocation
  readonly code: string

  constructor(message: string, location: ScriptLocation = { line: 1, column: 1 }, code = 'runtime') {
    super(message)
    this.name = 'ScriptError'
    this.location = location
    this.code = code
  }
}

/**
 * 内部信号：关卡结束（胜利或失败）或玩家点击停止时，
 * 用它把解释器的调用栈整条掀掉，避免继续执行剩余的代码。
 */
export class HaltSignal extends Error {
  readonly reason: 'win' | 'lose' | 'stop'

  constructor(reason: 'win' | 'lose' | 'stop') {
    super(`halt:${reason}`)
    this.name = 'HaltSignal'
    this.reason = reason
  }
}

/** 内部信号：函数 return。 */
export class ReturnSignal {
  readonly value: unknown

  constructor(value: unknown) {
    this.value = value
  }
}

/** 内部信号：循环 break。 */
export class BreakSignal {}

/** 内部信号：循环 continue。 */
export class ContinueSignal {}
