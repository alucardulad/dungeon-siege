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

/** 通关后的夸奖，按星级给不同反馈。 */
export function teacherWin(heroName: string, stars: number, actions: number): string {
  if (stars >= 3) return `${heroName}，${actions} 步就过了，比我还利索！`
  if (stars === 2) return `不错，${heroName}！再精简一点就能拿到三星。`
  return `过关了，${heroName}！下次试试用更少的步骤。`
}
