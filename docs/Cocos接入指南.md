# Cocos Creator 接入指南

## 环境要求

- Cocos Creator **3.8.x**（工程 `package.json` 里声明了 `creator.version = 3.8.4`，3.8 系列都可以）。
- 目标平台选 **Web**：代码编辑器是 DOM 界面，只有 Web 构建才有完整的可玩体验。

## 打开工程

1. Cocos Dashboard → 项目 → 添加 → 选择本目录；
2. 双击 `assets/scenes/main.scene`；
3. 右上角「预览」→ 浏览器。

场景结构（由 `tools/make-scene.mjs` 生成，执行 `npm run scene` 可重建）：

```
main (Scene)
└── Canvas            cc.Canvas + cc.UITransform + cc.Widget
    ├── Camera        cc.Camera（正交、UI_2D 可见层）
    └── GameRoot      GameRoot 组件（本项目入口）
```

### 如果场景打不开或者组件丢失

场景文件是 Creator 的序列化 JSON，版本差异偶尔会带来「Missing Script」提示。手动重建只要 30 秒：

1. 新建场景，里面放一个空节点；
2. 把 `assets/scripts/cocos/GameRoot.ts` 拖到该节点上；
3. 预览即可 —— `GameRoot.start()` 会自动补齐 Canvas 与正交相机，空场景同样能跑。

## GameRoot 属性

| 属性 | 默认 | 说明 |
| --- | --- | --- |
| `sidePanelWidth` | 520 | 右侧代码面板宽度。画面会自动避让这块区域并居中 |
| `maxScale` | 1.6 | 地牢画面的最大放大倍数 |
| `mountWebUI` | true | 是否挂载网页版界面（编辑器/面板）。原生平台请关掉 |

## 运行时做了什么

`GameRoot.start()`：

1. `ensureCanvas()`：场景里没有 Canvas 就现场建一个（节点 + 正交相机 + Widget），并把自身挂到 Canvas 下；
2. `new CocosPainter(this.node)`：建两个子节点，`Shapes` 放 `Graphics`，`Texts` 放 `Label` 池；
3. `mountGameUI({ container: document.body, driveFrames: false })`：把 DOM 界面挂到页面上；
4. `update(dt)`：调用核心的 `game.update(dt)`，拿到语义帧后交给画笔绘制，并实时调整缩放与位置。

界面层是 `position: fixed` 的浮层，右栏（编辑器）和顶栏吃点击事件，
中间的地牢区域 `pointer-events: none`，所以 Cocos 的输入不会被挡住。

## 想改画面

美术全部由 `assets/scripts/core/render.ts` 的 `paintTile / paintUnit / paintItem / paintEffect` 画出来，
两个引擎共用。想让 Cocos 版用图片素材：

1. 新建一个 `SpritePainter` 实现 `Painter` 接口（或者直接改写 `CocosPainter`）；
2. 在 `paintFrame` 之外自己遍历 `Frame.units` / `Frame.items`，用 `Sprite` + `SpriteFrame` 渲染；
3. 关键帧动画建议用 `Animation` 组件，逻辑不变。

## 想改界面

- 样式：`assets/scripts/ui/styles.ts`（颜色集中在 `:root` 变量里）；
- 结构：`assets/scripts/ui/markup.ts`；
- 交互与流程：`assets/scripts/ui/app.ts`。

## 原生平台（iOS / Android / 桌面）

DOM 不存在，因此：

- `GameRoot` 会把 `mountWebUI` 的界面跳过，只画地牢；
- 代码编辑器需要另行实现：可以直接用 Cocos 的 `EditBox`（多行），
  或者做一套「图形化积木 + 少量指令按钮」的输入方式；
- 核心逻辑、解释器、关卡数据与美术绘制无需改动。

## 常见问题

- **画面偏左/被面板压住**：调大 `sidePanelWidth` 或改 `ui/styles.ts` 里的 `--ds-side-width`，两边保持一致。
- **地牢没有出现**：确认 `GameRoot` 在 Canvas 下；另外检查 `update` 是否被禁用（节点 active / 组件 enabled）。
- **文字不显示**：`Label` 用的是系统字体，Web 上没问题；原生平台请确认设备字体包含中文字形。
- **改了脚本没生效**：Creator 会缓存 `library/`，必要时删掉 `library/`、`temp/` 重新导入。
