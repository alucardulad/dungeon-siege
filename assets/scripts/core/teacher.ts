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
  'level-1': '跟着我做第一件事：写一行 moveRight()，英雄就走一格。',
  'level-2': '出口在左边。这次用 moveLeft()，让英雄往回走。',
  'level-3': '这次往下走。写几行 moveDown()，英雄就往下走几格。',
  'level-4': '换个方向：moveUp() 让英雄往上走。试试先上后右。',
  'level-5': 'hero.say("你好") 能让英雄说一句话，头顶会冒出一个气泡。',
  'level-6': 'hero.findNearestEnemy() 帮你找到最近的敌人。这一关先认识它，不用打。',
  'level-7': '给敌人起个名字：const 敌人 = hero.findNearestEnemy()。',
  'level-8': '第一次出手！attack 就是打。走到它旁边，再写 hero.attack(敌人)。',
  'level-9': '敌人.health 是它还剩多少血。用 say 报一报，看看是几。',
  'level-10': '第一章大考验：走路、捡宝石、喝药水、打两只敌人。慢慢写，写完进第 2 章。',
  'level-11': '要做很多次的事，可以交给 for 循环，就不用写那么多行了。',
  'level-12': '两段路不一样长，就写两个 for 循环，各管一段。',
  'level-13': '宝石排得很整齐，一个循环走过去，就全捡到了。',
  'level-14': '把 hero.attack() 放进循环里，就能一刀一刀连着打。',
  'level-15': '大括号里可以写好几行：走两步、砍两刀，整段重复四次。',
  'level-16': 'i 每一圈都会变。把 "第 " + i + " 颗" 放进 say，就能报数。',
  'level-17': '先向右走 5 格，再向下走 3 格。两个循环各管一段。',
  'level-18': '先把步数存进变量，循环里写 i < 步数，想改只改一个地方。',
  'level-19': '四只小兽排着队：每轮走两格、砍一刀，重复四轮。',
  'level-20': '这条走廊很长，一个循环就够了，不用写 21 行。',
  'level-21': '赶路用循环，打怪也放进循环，把路线分成两段来写。',
  'level-22': '宝石和敌人交替出现，按「走—打—走—打—走」来写。',
  'level-23': 'distanceTo() 会告诉你离敌人还有几格。距离是 1 就够得着了。',
  'level-24': 'if 就是「如果」：如果离得太远，就先走近一步再打。',
  'level-25': 'else 是「不然」：够得着就打，够不着就走近点。两条路只走一条。',
  'level-26': '&& 是「并且」：先确认找到了敌人，再看它离得近不近。',
  'level-27': 'canMoveRight() 会回答右边能不能走。能右就右，不能就往下。',
  'level-28': '这次问的是下面：canMoveDown() 说能，就一直往下；不能就往右。',
  'level-29': 'lookRight() 会告诉你右边是什么。看到尖刺就先下去绕开它。',
  'level-30': 'lookRight() === "墙" 表示前面没路了。撞墙就上去，再往右走。',
  'level-31': 'else if 是「不然再看看」。先看尖刺，再看墙，都不是就往前。',
  'level-32': 'hero.health 是英雄自己还剩多少血，满血是 100。报一报试试。',
  'level-33': 'hero.maxHealth 是满血。比一比，血没满就先下去喝药水。',
  'level-34': '第三章考验：够得着就打，够不着就往前走，一路打到出口。',
  'level-35': 'while (true) 会一直做下去，走到出口就自动结束。',
  'level-36': 'hero.pos.x 是英雄在第几列。没走到第 10 列，就继续走。',
  'level-37': '在 while 里放一个 if：离得近就打，离得远就走，这就是自动战斗。',
  'level-38': '还有宝石就一直捡。捡完了，findNearestItem() 变空，循环就停。',
  'level-39': '只要 boss 还有血，就继续打它。血变成 0，循环自己停。',
  'level-40': '能往右就走，不能就往下去，都不行就 break 停下来。',
  'level-41': '和第 30 关一样，只是这次不用数次数，让 while 一直转。',
  'level-42': '迷宫里藏着一只小兽。把「打敌人」放在最前面，打完再找路。',
  'level-43': '敌人会自己追过来，不用追它。走到墙边用 wait() 原地等它。',
  'level-44': '先打，再躲尖刺，然后往前走，最后才考虑上下。顺序别写反。',
  'level-45': '综合挑战来啦：先打、再躲尖刺、再往前走。',
  'level-46': '血少了先补血，够得着就打，能走就走。',
  'level-47': '有时踩一下尖刺（掉 5 点血）比绕远路更快，自己判断。',
  'level-48': '这个迷宫要往下拐两次，还藏着守卫，慢慢来。',
  'level-49': '最后一关啦！把你会的东西全都用上吧。',
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
    focus: '一步一步来，不用着急。',
    opening: [
      '{name}，慢慢来。写一行代码，英雄就做一个动作。',
      '不用想太复杂，先让英雄走一步，再走一步。',
      '写错了也没关系，我们一步一步试出来。',
    ],
    stuck: [
      '卡住很正常。我们来数一数：英雄离出口还有几格？',
      '看看英雄在哪里停下了，那里就是要加代码的地方。',
      '写的行数多没关系，能走到出口就是成功。',
    ],
    error: [
      '报错不是坏事，它只是说「这句话我没看懂」。',
      '看看报错说是第几行，再认真读一遍那一行。',
      '慢慢读一遍你写的代码，是不是少了一个点或括号？',
    ],
    praise: [
      '太棒了，{name}！你已经会让英雄一步一步做事啦。',
      '每一步都对上了，这就是写代码最重要的耐心。',
      '这一关是你自己走出来的，很厉害。',
    ],
  },
  ch2: {
    accent: '#5ce27a',
    focus: '一样的事情做很多次，就用循环帮忙。',
    opening: [
      '要做很多次的事情，交给 for 循环，就不用写那么多行了。',
      '先数一数要做几次，再把这个数字放进循环里。',
      '循环就三件事：从几开始、什么时候停、每次加多少。',
    ],
    stuck: [
      '数一数循环要转几次？多一次少一次都会走错。',
      '读一读循环里面的那几行，它们每一轮都会做一遍。',
      '先让循环里的一轮做对，再让它转很多次。',
    ],
    error: [
      'for 后面的括号最容易漏，看看 () 和 {} 是不是都成对。',
      '看看报错的行号，检查那一行的逗号和分号。',
      '循环里的 i 是不是写成了别的字母？',
    ],
    praise: [
      '很好！你已经会用循环偷懒啦。',
      '用了循环，代码一下子短了好多。',
      '你已经会发现重复的地方了，这是编程里最有用的本领。',
    ],
  },
  ch3: {
    accent: '#ffd166',
    focus: '让英雄先看看周围，再决定怎么做。',
    opening: [
      'if 就是「如果」：如果前面有敌人，就先打它。',
      '先看清楚情况，再决定是打、是走、还是躲。',
      '想判断的时候，可以问自己：离得近做什么？离得远做什么？',
    ],
    stuck: [
      '先问自己：这个时候英雄该打、该走，还是该躲？',
      '判断里的数字对吗？离 1 格才算够得着哦。',
      'if 和 else 每次只会选一条路，看看它选了哪条。',
    ],
    error: [
      '比较两个数字要用两个等号 ==，一个等号是「变成」。',
      '少一个括号也会报错，检查一下 () 和 {} 吧。',
      '别着急，报错的行号就是它在提醒你。',
    ],
    praise: [
      '英雄现在会自己想事情了，你写得很好！',
      '你已经会看情况做选择啦。',
      '判断写对了，英雄就不会乱跑。',
    ],
  },
  ch4: {
    accent: '#c792ea',
    focus: '不用数次数，让英雄自己决定什么时候停。',
    opening: [
      '这一章让英雄一直做下去，直到不能做为止。',
      'while 就是「只要还可以，就一直做」。',
      '记得给英雄一个停下来的机会，不然它会一直转圈。',
    ],
    stuck: [
      '英雄一直转圈停不下来？想想怎么让它停下来。',
      '把最要紧的事情放在最前面判断。',
      '看看英雄每一步做了什么，就能找到绕圈的原因。',
    ],
    error: [
      '程序跑太久会自己停下来，这是在保护你，不是坏了。',
      '看看报错的行号，再往上看：循环是不是停不下来了？',
      '循环里的条件要用会变的东西，比如英雄的位置。',
    ],
    praise: [
      '你已经会写「自己做事情」的循环了，很厉害。',
      '判断和循环配合得真好！',
      '能让英雄自己找路，说明你真的懂了。',
    ],
  },
  ch5: {
    accent: '#ff9d6b',
    focus: '把学过的都用上：看、判断、循环、函数。',
    opening: [
      '最后一章啦，{name}！把学过的都拿出来用。',
      '地图很复杂，别想一次写完。先让英雄走起来，再慢慢加判断。',
      '一样的动作可以用 function 打包，代码会更好读。',
    ],
    stuck: [
      '把大问题拆小：这一步是打、是躲，还是走？',
      '先写一条最简单的路线，能过就行，以后再改短。',
      '再看看你的判断顺序，很多时候是顺序写反了。',
    ],
    error: [
      '代码越长越容易写错，先看看报错的行号。',
      '把一大段动作分成几个小函数，哪里错了一眼就能看出来。',
      '先让一半的代码跑起来，再检查另一半，这也很有用。',
    ],
    praise: [
      '通关啦，{name}！你已经能自己写出一整套办法。',
      '这一关能过，说明前面的知识你都学会了。',
      '综合关都拿下了，下次可以试着自己设计一关。',
    ],
  },
}

export function guideForChapter(chapterId: string): ChapterGuide {
  return CHAPTER_GUIDES[chapterId] ?? CHAPTER_GUIDES.ch1
}

/** 主动点「给提示」时，老师开头的那半句话。 */
export const HINT_LEADS = ['来，我悄悄告诉你：', '注意这里：', '换个思路试试：', '记住这一招：']

/** 按顺序取本关提示，取完从头再来。 */
export function pickHint(hints: string[], cursor: number): { text: string; cursor: number } {
  if (hints.length === 0) {
    return { text: '先看看英雄每次走到哪里停下，再想想为什么。', cursor: 0 }
  }
  const index = ((cursor % hints.length) + hints.length) % hints.length
  return { text: hints[index], cursor: cursor + 1 }
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
