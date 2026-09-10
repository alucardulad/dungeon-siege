# 地牢围攻（CodeDungeon）

一个 CodeCombat 风格的「用代码指挥英雄」闯关游戏，基于 **Cocos Creator 3.8 + TypeScript**。

玩家在右侧写 JavaScript，英雄就会在地牢里执行：走路、砍怪、捡宝石、绕开尖刺。
代码写错了会给出中文报错并指出行号，死循环会被步数上限拦下，关卡目标没达成就不会通关。

## 快速开始

### 方式一：浏览器里直接玩（不用装 Cocos）

```bash
npm run dev          # 启动零依赖开发服务器
# 浏览器打开 http://localhost:5173
```

这条路径用 Canvas2D 渲染，和 Cocos 版共用同一套核心逻辑（关卡、解释器、游戏规则、美术绘制代码），
适合快速试玩和调关卡。

### 方式二：用 Cocos Creator 打开

1. 用 **Cocos Creator 3.8.x** 打开本目录（Dashboard → 项目 → 添加 → 选择本目录）。
2. 双击 `assets/scenes/main.scene`。
3. 点右上方「预览」，选择浏览器（编辑器默认的 Web 预览）。

场景里只有 `Canvas`、`Camera` 和一个挂着 `GameRoot` 组件的节点。
如果场景打开报错，新建一个空场景，然后：

- 在场景里建一个空节点，把 `assets/scripts/cocos/GameRoot.ts` 拖到该节点上；
- `start()` 会自动补齐 Canvas 与相机，所以空场景也能跑起来。

### 常用命令

```bash
npm run dev         # 浏览器预览（localhost:5173）
npm test            # 核心逻辑测试：解释器 + 7 个关卡的参考解
npm run scene       # 重新生成 assets/scenes/main.scene
npm run check:cocos # 提交前自检：场景引用、脚本 uuid、关卡地图、工程配置
```

## 玩法与指令

每一关是一个 ASCII 地图，英雄的初始代码写在编辑器里，点「运行」即可。

| 指令 | 说明 |
| --- | --- |
| `hero.moveRight() / moveLeft() / moveUp() / moveDown()` | 走一格；撞墙会提示并消耗一回合 |
| `hero.attack(敌人)` | 攻击相邻目标，参数用 `hero.findNearestEnemy()` 拿到 |
| `hero.findNearestEnemy()` / `hero.findEnemies()` | 最近的敌人 / 所有敌人（数组） |
| `hero.findNearestItem()` / `hero.findItems()` | 最近的物品 / 所有物品（数组） |
| `hero.distanceTo(目标)` | 到目标的曼哈顿距离 |
| `hero.pos.x` / `hero.pos.y` | 英雄所在格子坐标 |
| `hero.health` / `hero.maxHealth` / `hero.damage` | 英雄血量与攻击力 |
| `hero.say("文字")` | 让英雄说一句话（不消耗回合） |
| `hero.wait()` | 原地等待一回合 |
| `enemy.health` / `enemy.pos` / `enemy.type` | 敌人血量、坐标、类型 |

语言上支持：变量（`let/const/var`）、`if/else`、`while`、`for`、`for...of`、函数声明与 `return`、
`break/continue`、数组/对象字面量、三目运算符、`Math`、`console.log`。
变量名和函数名可以用中文，例如 `function 前进并战斗() { ... }`。

## 关卡

7 关，难度递进（每关只引入一个新概念）：

| 关卡 | 概念 | 地图元素 |
| --- | --- | --- |
| 1 地牢出口 | 顺序执行 | 食人魔（不主动出击） |
| 2 宝石走廊 | `while` 循环 + `if/else` | 宝石、会扑上来的小兽 |
| 3 食人魔王 | 读对象属性、循环条件 | 药水、食人魔王 |
| 4 巡逻的守卫 | `distanceTo` 判断距离 | 会巡逻的小兽 |
| 5 函数的力量 | 函数封装重复动作 | 一列食人魔 + 宝石 |
| 6 阵列清场 | `findEnemies()` / `for...of` | 竞技场，无出口 |
| 7 自由练习 | 综合运用 | 尖刺、药水、混合敌人 |

每一关都带参考解（`solution`），界面上点「💡 看答案」可以直接填入；
`npm test` 会用参考解把 7 关全部跑一遍，确保关卡一定是可通关的。

## 目录结构

```
assets/scripts/core/     引擎无关的核心：词法/语法/解释器、世界规则、关卡数据、动画与帧
assets/scripts/ui/       界面层（DOM）：代码编辑器、关卡面板、控制台、结算弹窗
assets/scripts/cocos/    Cocos 层：Graphics 画笔、GameRoot 入口组件
assets/scenes/           Cocos 场景（由 tools/make-scene.mjs 生成）
preview/                 浏览器预览：入口 + Canvas2D 画笔
tests/                   Node 原生测试（解释器 + 关卡通关 + 动画时序）
tools/                   开发服务器、场景生成、自检脚本
docs/                    架构、关卡设计规范、Cocos 接入说明
```

## 现在的样子与还没做的

已经能玩的部分：完整闯关流程、代码高亮与当前行跟随、中文报错定位、
控制台日志、星级与进度存档（localStorage）、失败与通关弹窗。

已知限制：

- 代码编辑器是 DOM 界面，只有 Web 构建有；原生 App 需要在 Cocos 里自己实现输入框。
- 美术是用 `Graphics` 画的矢量图形（零素材依赖），想换成图片素材只需改 `core/render.ts` 里的绘制函数。
- 解释器只覆盖教学需要的 JS 子集：不支持模板字符串插值、`for...in`、`try/catch`、类与异步。
- 敌人寻路是「先横后竖」的贪心策略，不做真正的 A\*。

## 许可证

仅作学习与教学用途，可自由修改。
