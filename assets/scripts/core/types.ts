/** 地牢围攻：核心数据类型。这里刻意不引用任何 Cocos 的 API，保证逻辑可以脱离引擎运行与测试。 */

export type TileType = 'floor' | 'wall' | 'exit' | 'spike'

export type UnitType = 'hero' | 'munchkin' | 'ogre' | 'ogre-chief'

export type ItemType = 'gem' | 'potion'

/** 会随教学进度逐步解锁的语法特性。 */
export type LanguageFeature = 'for' | 'while' | 'if' | 'function'

/** 难度分段（章节）。 */
export interface ChapterDef {
  id: string
  name: string
  subtitle: string
  /** 本章要掌握的技能 */
  goal: string
  /** 本章允许使用的语法（界面展示用） */
  allow: string[]
  /** 本章禁止的语法 */
  forbidden: LanguageFeature[]
}

export interface UnitStats {
  name: string
  hp: number
  damage: number
  /** 发现英雄的距离半径，0 表示原地不动（挨打才还手） */
  aggro: number
}

export const UNIT_STATS: Record<UnitType, UnitStats> = {
  hero: { name: '英雄', hp: 100, damage: 10, aggro: 0 },
  munchkin: { name: '小兽', hp: 10, damage: 5, aggro: 5 },
  ogre: { name: '食人魔', hp: 20, damage: 8, aggro: 6 },
  'ogre-chief': { name: '食人魔王', hp: 60, damage: 12, aggro: 8 },
}

export const ITEM_STATS: Record<ItemType, { name: string; value: number }> = {
  gem: { name: '宝石', value: 10 },
  potion: { name: '药水', value: 25 },
}

/** 关卡胜利需要同时满足的条件。 */
export interface WinCondition {
  killAll?: boolean
  collectAll?: boolean
  reachExit?: boolean
}

export interface LevelDef {
  id: string
  /** 属于哪一章（见 CHAPTERS） */
  chapter: string
  name: string
  subtitle: string
  /** 关卡目标，显示在任务面板 */
  objective: string
  /** 提示，玩家卡住时可以展开 */
  hints: string[]
  /** 本关首次出现的指令，用于教学提示 */
  newCommands?: string[]
  /** 本章还不允许使用的语法；违反时给出友好提示 */
  forbidden?: LanguageFeature[]
  /** 三星所需的行动次数 */
  par: number
  /** ASCII 地图，见 world.ts 的图例 */
  map: string[]
  /** 敌人是否原地驻守（不会主动追人） */
  enemiesStandStill?: boolean
  win: WinCondition
  /** 编辑器初始代码 */
  starter: string
  /** 参考解，用于测试与「看看答案」 */
  solution: string
}

export interface Unit {
  id: string
  type: UnitType
  x: number
  y: number
  hp: number
  maxHp: number
  damage: number
  aggro: number
}

export interface Item {
  id: string
  type: ItemType
  x: number
  y: number
  value: number
}

export type WorldStatus = 'playing' | 'win' | 'lose'

export interface WorldState {
  level: LevelDef
  width: number
  height: number
  /** tiles[y][x] */
  tiles: TileType[][]
  units: Unit[]
  items: Item[]
  hero: Unit
  status: WorldStatus
  message: string
  /** 英雄行动次数（评分用） */
  actions: number
  /** 收集到的宝石数量 */
  gems: number
  /** 击败的敌人数量 */
  kills: number
}

export type WorldEvent =
  | { kind: 'move'; unitId: string; from: { x: number; y: number }; to: { x: number; y: number } }
  | { kind: 'attack'; attackerId: string; targetId: string; damage: number; killed: boolean }
  | { kind: 'blocked'; unitId: string; message: string }
  | { kind: 'spike'; unitId: string; damage: number }
  | { kind: 'pickup'; item: Item; healed: boolean }
  | { kind: 'died'; unitId: string }

export interface LogEntry {
  id: number
  kind: 'info' | 'hero' | 'warn' | 'error' | 'success'
  text: string
}
