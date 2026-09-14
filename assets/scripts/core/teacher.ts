/**
 * 教学老师：按英雄性别取反（男英雄 → 女老师，女英雄 → 男老师），
 * 并在每关给出针对该关教学点的引导语。
 *
 * 老师的名字、头像、以及每一关的 intro 都在这里，方便统一调整语气。
 */

export type TeacherGender = 'male' | 'female'

export interface TeacherProfile {
  gender: TeacherGender
  name: string
  title: string
  avatar: string
}

/** 男英雄配女老师，女英雄配男老师。 */
export function teacherForHero(heroGender: 'male' | 'female'): TeacherProfile {
  if (heroGender === 'male') {
    return { gender: 'female', name: '小梅老师', title: '地牢导师', avatar: '👩‍🏫' }
  }
  return { gender: 'male', name: '石头老师', title: '地牢导师', avatar: '👨‍🏫' }
}

/** 每一关的教学引导语：跟着关卡的新概念走。 */
const TEACHER_SCRIPTS: Record<string, string> = {
  'level-1': '跟着我学第一件事：代码是一行一行往下跑的。写一行 moveRight()，英雄就走一格，一直走到出口。',
  'level-2': '移动有四个方向。这次出口在左边，用 moveLeft() 往回走就行。',
  'level-3': 'moveDown() 向下、moveUp() 向上。把「先下后右」两段路按顺序写出来。',
  'level-4': '第一次战斗！先走到敌人旁边（不能站到它身上），再用 attack() 打它。食人魔 20 血，一刀 10，要砍两刀。',
  'level-5': '捡东西不用写代码，走过去就会自动捡起来。把路线写对，宝石和出口都会到手。',
  'level-6': '不同敌人血量不同：小兽 10 血一刀倒，食人魔 20 血要两刀。打完一段就重新 findNearestEnemy() 取一次目标。',
  'level-7': '路线可以拐弯：先数一数横着要走几步，再数竖着要走几步。',
  'level-8': '药水走上去会自动喝，回 25 点血。先补给再战斗，别硬扛。',
  'level-9': '这一段要写 17 行 moveRight()，很累对吧？把它记在心里，下一章就教你偷懒的办法。',
  'level-10': '把前面学的串起来：走、打、捡、再走。先在脑子里拆成几段，再一段一段写。',
  'level-11': 'for (let i = 0; i < 次数; i++) 会把循环体重复「次数」遍。数清楚要走几步，写进条件里。',
  'level-12': '两段路的次数不一样，就写两个 for 循环，各自管一段。',
  'level-13': '宝石是等距摆放的，用一个循环走到底就能全部捡到。',
  'level-14': '敌人血量厚怎么办？把 attack() 放进 for 循环里，连砍到它倒下。',
  'level-15': '循环体里可以写多行代码：走两格、砍两刀，整段重复四轮。',
  'level-16': '循环变量 i 每一轮都会变，用字符串拼接就能报出「第几颗」。',
  'level-17': '先向右 5 格、再向下 3 格，两个循环，次数写在各自的条件里。',
  'level-18': '把步数存进变量，循环条件写 i < 步数，以后想改只动那一行。',
  'level-19': '小兽只有 10 血、一刀就倒，循环里「走两格 + 砍一刀」即可。',
  'level-20': '还记得第 9 关你写了 17 行吗？现在一行循环就搞定——这就是循环的价值。',
  'level-21': '循环既能包移动、也能包攻击，把路线拆成「赶路」和「战斗」两段。',
  'level-22': '宝石和敌人交替出现，按「走—打—走—打—走」的节奏写。',
  'level-23': 'if (条件) 只在条件成立时执行。先判断距离，太远就先走近一步再动手。',
  'level-24': 'if / else 二选一：够得着就打，够不着就走。循环次数写宽一点没关系。',
  'level-25': 'enemy.health 是敌人当前血量，掉到 0 就表示倒下。if (boss.health > 0) 时再攻击。',
  'level-26': 'canMoveRight() 返回 true 或 false：能右转就右转，不能就往下走。',
  'level-27': 'lookRight() 会告诉你前方是什么。看到尖刺，就绕到下面那行走。',
  'level-28': '两格尖刺挡路，从下面绕一圈再回到出口。',
  'level-29': 'else if 接着判断第二种情况：先打敌人，再躲尖刺、躲墙，最后往前走。',
  'level-30': 'hero.health 是你的血量，掉过血就先去下面那行喝药水。',
  'level-31': '三个敌人也是一样的套路：循环里套判断，够得着就砍。',
  'level-32': '上面那行全是尖刺，先下到安全的一行，撞墙再上。',
  'level-33': '食人魔王打人很痛，先喝药水再开打，用 if (boss.health > 0) 控制出刀。',
  'level-34': '一条长防线，套路不变：够得着就打，够不着就走，走到出口自动结束。',
  'level-35': 'while (true) 会一直重复，直到踩上出口——任务完成，程序自己会停。',
  'level-36': 'hero.pos.x 是当前列号，while (hero.pos.x < 10) 表示还没到第 10 列就继续走。',
  'level-37': '把 if 嵌进 while：观察 → 决定 → 行动，这就是自动战斗。',
  'level-38': 'while (hero.findNearestItem()) 会一直捡，直到没有宝石为止。',
  'level-39': 'while (boss.health > 0) 比写死「打 6 刀」更聪明，换血量的敌人也不用改代码。',
  'level-40': '能右转就右转，不能就往下走，都不行就 break 结束循环。',
  'level-41': '把上一章躲尖刺的思路换成 while，就不用数次数了。',
  'level-42': '把「打敌人」放在最优先：距离是 1 就先砍，其次才是走路。',
  'level-43': '敌人会主动追你，不用追它；走到墙边还没解决完，用 hero.wait() 原地等它过来。',
  'level-44': '判断顺序很关键：能打就打，其次躲尖刺，再其次往前走，最后才考虑上下。',
  'level-45': '综合挑战来了：先打、再躲尖刺、再走，一套循环走天下。',
  'level-46': '血少就补、够得着就打、能走就走，把前面所有的判断串起来。',
  'level-47': '有时踩一下尖刺（掉 5 血）比绕远路划算，学会权衡。',
  'level-48': '这条迷宫要连着往下拐两次，还藏着守卫，稳住节奏。',
  'level-49': '最后一战！把你学过的所有招式都用上吧。也可以试试用 function 把打怪打包。',
}

export function teacherIntro(levelId: string): string {
  return TEACHER_SCRIPTS[levelId] ?? '这一关靠你自己探索，加油！'
}

export function hasTeacherScript(levelId: string): boolean {
  return levelId in TEACHER_SCRIPTS
}

/**
 * 每一章的引导句池。
 *
 * 同一个场合准备 2~4 句说法，运行时会随机循环着用，
 * 避免老师每次都说一模一样的话；语气也按章节难度递进：
 * 入门章节偏鼓励，后面章节偏"拆问题、看逻辑"。
 */
export interface ChapterGuide {
  /** 本章的强调色（亮色系，界面会用它给老师这块上色） */
  accent: string
  /** 本章一句话要点 */
  focus: string
  /** 进入关卡 / 重来时的开场 */
  opening: string[]
  /** 卡关、阵亡时的鼓励 */
  stuck: string[]
  /** 代码报错时的引导 */
  error: string[]
  /** 通关时的夸奖 */
  praise: string[]
}

export const CHAPTER_GUIDES: Record<string, ChapterGuide> = {
  ch1: {
    accent: '#6ea8fe',
    focus: '这一章只练一件事：把动作按顺序写清楚。',
    opening: [
      '{name}，别急着写快，先写对——一行代码就是英雄的一个动作。',
      '刚上手最容易乱，我们先做最简单的事：走一步、写一行。',
      '这一关不用想聪明的写法，把每一步老老实实写出来就行。',
    ],
    stuck: [
      '卡住了很正常，我们一起数格子：英雄和出口之间隔了几格？',
      '别嫌写得多，第一章本来就是这样，先把路线写完整。',
      '看看英雄停在哪一步——停下来的那一行，就是该补代码的地方。',
    ],
    error: [
      '报错不代表你笨，只是电脑还没看懂你的意思。',
      '先看报错的行号，再去检查那一行的括号和拼写。',
      '慢一点，一行一行读，你写的比你以为的更接近正确答案。',
    ],
    praise: [
      '漂亮，{name}！顺序思维你已经有了。',
      '这就是编程的基本功，你上手很快。',
      '每一步都对上了，继续保持这种耐心。',
    ],
  },
  ch2: {
    accent: '#5ce27a',
    focus: '重复的动作，交给循环去做。',
    opening: [
      '这一章开始偷懒：重复的代码，用一个 for 循环收起来。',
      '先数清楚要重复几次，再把次数写进循环条件里。',
      '循环三件事：从几开始、什么时候停、每次变多少。',
    ],
    stuck: [
      '循环次数数对了吗？多一格少一格都会走偏。',
      '把循环体读一遍：这一遍动作真的能把当前这一步做完吗？',
      '循环里的代码会整段重复，先确认其中一遍是完全正确的。',
    ],
    error: [
      'for 后面的括号最容易漏，检查一下 ( ) 和 { } 是否配对。',
      '报错没关系，看行号，再看那一行的分号和括号。',
      '循环变量名是不是写错了？i 别写成别的字母。',
    ],
    praise: [
      '很好，你已经会用循环省力气了。',
      '循环用对了，代码立刻短了一半。',
      '这就是"发现重复"的能力，很关键。',
    ],
  },
  ch3: {
    accent: '#ffd166',
    focus: '让英雄自己看情况决定怎么做。',
    opening: [
      '这一章教英雄"先看再动"：条件成立才执行里面的代码。',
      '判断的顺序很重要，把最紧急的情况写在最前面。',
      '距离、血量、前方有什么，都可以拿来做判断条件。',
    ],
    stuck: [
      '先问自己：这时候英雄该打、该走，还是该躲？',
      '判断里的数字合适吗？距离是 1 还是 2 才算够得着？',
      'if 和 else 只会执行一个，看看实际走的是哪一支。',
    ],
    error: [
      '条件写成赋值、或者括号不配对，都会报错，检查一下。',
      '别慌，报错行号指的地方就是问题所在。',
      '判断条件里要用双等号比较，单等号是赋值。',
    ],
    praise: [
      '判断逻辑写对了，英雄开始有"脑子"了。',
      '能想到用条件分支，说明你在像程序员一样思考了。',
      '很好，你已经能让英雄自己拿主意。',
    ],
  },
  ch4: {
    accent: '#c792ea',
    focus: '不用数次数了，让循环自己决定什么时候停。',
    opening: [
      '这一章开始写"自动"的代码：条件还成立，就一直做下去。',
      'while 里套 if，就是"观察 → 决定 → 行动"的循环。',
      '记得给自己留出路：循环条件最后要能变成不成立。',
    ],
    stuck: [
      '停不下来，通常是循环条件永远成立，想想怎么让它结束。',
      '把 if 的判断顺序调一调：最该先处理的情况放到最前面。',
      '英雄是不是在绕圈子？看它每一步的判断结果。',
    ],
    error: [
      '死循环会卡住程序，这就是步数上限在保护你。',
      '报错行号就是线索，从那一行往上看循环条件。',
      'while 的判断条件也要能读到最新的值，别写成永远不变。',
    ],
    praise: [
      '这就是自动化的感觉，你已经能写"会思考"的循环了。',
      '判断和循环配合得很顺，漂亮。',
      '能写自动探索，说明你真正理解了循环的本质。',
    ],
  },
  ch5: {
    accent: '#ff9d6b',
    focus: '把学过的都用上：观察、判断、循环、函数。',
    opening: [
      '最后一章了，{name}，把前面的招式串起来用。',
      '复杂局面别想一次写完，先让英雄动起来，再慢慢补判断。',
      '这段逻辑值得用 function 收一收，读起来会清楚很多。',
    ],
    stuck: [
      '先拆问题：这一步是打、是躲，还是走？拆开就好写了。',
      '别追求一次成功，先跑通一条最短的路线。',
      '回头看看判断顺序，很多时候问题出在顺序上。',
    ],
    error: [
      '代码越长越容易出错，报错行号依旧是第一线索。',
      '把一大段逻辑拆成函数，出错也更容易定位。',
      '先注释掉一半代码确认剩下的一半能跑，这也是一种调试。',
    ],
    praise: [
      '通关了，{name}！你已经能独立写出完整的自动逻辑。',
      '这一关能过，说明前面的知识是真的学会了。',
      '综合关都拿下了，接下来可以试着自己设计关卡。',
    ],
  },
}

export function guideForChapter(chapterId: string): ChapterGuide {
  return CHAPTER_GUIDES[chapterId] ?? CHAPTER_GUIDES.ch1
}

/** 把 {name} / {level} 这类占位符替换掉。 */
export function formatGuide(text: string, values: { name?: string; level?: string; chapter?: string }): string {
  return text
    .replace(/\{name\}/g, values.name ?? '英雄')
    .replace(/\{level\}/g, values.level ?? '这一关')
    .replace(/\{chapter\}/g, values.chapter ?? '本章')
}

/**
 * 随机循环取句子：把句池洗牌后依次取，取完再洗一次，
 * 所以既随机、又不会连着两次说同一句。
 */
export class GuidePicker {
  private states = new Map<string, { order: number[]; index: number }>()
  private random: () => number

  constructor(random: () => number = Math.random) {
    this.random = random
  }

  pick(key: string, pool: string[]): string {
    if (pool.length === 0) return ''
    if (pool.length === 1) return pool[0]

    let state = this.states.get(key)
    if (!state || state.order.length !== pool.length) {
      state = { order: this.shuffle(pool.length), index: 0 }
      this.states.set(key, state)
    }
    if (state.index >= state.order.length) {
      state.order = this.shuffle(pool.length)
      state.index = 0
    }
    return pool[state.order[state.index++]]
  }

  reset(): void {
    this.states.clear()
  }

  private shuffle(length: number): number[] {
    const order = Array.from({ length }, (_, index) => index)
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(this.random() * (i + 1))
      const tmp = order[i]
      order[i] = order[j]
      order[j] = tmp
    }
    return order
  }
}

/** 通关后的夸奖，按星级给不同反馈（章节句池没命中时的兜底）。 */
export function teacherWin(heroName: string, stars: number, actions: number): string {
  if (stars >= 3) return `${heroName}，${actions} 步就过了，比我还利索！`
  if (stars === 2) return `不错，${heroName}！再精简一点就能拿到三星。`
  return `过关了，${heroName}！下次试试用更少的步骤。`
}
