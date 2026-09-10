/**
 * Cocos Creator 入口组件。
 *
 * 用法：把本组件挂到场景里的任意节点上（推荐 Canvas 节点）即可运行。
 * 它会：
 *   1. 确保场景里有 Canvas + 相机（没有就自动建一个，因此空场景也能跑）；
 *   2. 用 CocosPainter 把地牢画到 Graphics/Label 上；
 *   3. Web 平台挂载与浏览器预览同一套代码编辑器界面；
 *   4. 在 update 里驱动核心的 Game（代码执行与动画同步推进）。
 *
 * 注意：代码编辑器是 DOM 界面，只有 Web 构建才有。原生平台需要在
 * Cocos 里自己实现输入框，或者在工程里换成 Cocos 原生 UI。
 */

import { _decorator, Camera, Canvas, Color, Component, Layers, Node, UITransform, Widget, director, view } from 'cc'

import type { Frame } from '../core/render'
import type { SoundPlayer } from '../core/audio'
import { mountGameUI, type GameUIHandle } from '../ui/app'
import { WebAudioPlayer } from '../ui/audio-web'
import { CocosPainter } from './CocosPainter'
import { CocosAudioPlayer } from './CocosAudioPlayer'

const { ccclass, property } = _decorator

/** 与 ui/styles.ts 里的两行导航栏、底部按钮条高度保持一致，用于让画面居中 */
const TOP_BAR_HEIGHT = 96
const BOTTOM_BAR_HEIGHT = 80

@ccclass('GameRoot')
export class GameRoot extends Component {
  @property({ tooltip: '右侧代码面板宽度（像素），画面会自动避让它' })
  sidePanelWidth = 520

  @property({ tooltip: '地牢画面的最大放大倍数' })
  maxScale = 1.6

  @property({ tooltip: '是否挂载网页版界面（代码编辑器 / 关卡面板），仅 Web 有效' })
  mountWebUI = true

  private painter: CocosPainter | null = null
  private ui: GameUIHandle | null = null

  start(): void {
    this.ensureCanvas()
    this.painter = new CocosPainter(this.node)

    if (this.mountWebUI && typeof document !== 'undefined' && document.body) {
      this.ui = mountGameUI({
        container: document.body,
        driveFrames: false, // 帧由 Cocos 的 update 驱动，避免两套时钟打架
        audio: this.createAudioPlayer(),
      })
    } else {
      console.warn('[地牢围攻] 当前平台没有 DOM，代码编辑器需要自行接入；核心逻辑与画面仍然可用。')
    }
  }

  /** Web 用合成器（零素材），原生平台用 resources 里的 wav 文件。 */
  private createAudioPlayer(): SoundPlayer {
    const player = new WebAudioPlayer()
    if (player.supported && typeof window !== 'undefined' && window.AudioContext) {
      return player
    }
    return new CocosAudioPlayer({ parent: this.node })
  }

  update(dt: number): void {
    if (!this.painter) return
    const game = this.ui?.game
    if (!game) {
      // 没有 UI（例如原生平台）时，画一张静态画面，方便先看到美术效果
      this.painter.draw(this.staticFrame())
      return
    }
    const frame = game.update(dt)
    this.layout(frame)
    this.painter.draw(frame)
  }

  /** 让地牢在「扣除面板后的可见区域」里居中并等比缩放。 */
  private layout(frame: Frame): void {
    if (!this.painter) return
    const size = view.getVisibleSize()
    const side = Math.min(this.sidePanelWidth, size.width * 0.6)
    const availableWidth = Math.max(160, size.width - side)
    const availableHeight = Math.max(120, size.height - TOP_BAR_HEIGHT - BOTTOM_BAR_HEIGHT)
    const scale = Math.min(availableWidth / frame.width, availableHeight / frame.height, this.maxScale)

    this.painter.root.setScale(scale, scale, 1)
    this.painter.root.setPosition(-side / 2, (BOTTOM_BAR_HEIGHT - TOP_BAR_HEIGHT) / 2, 0)
  }

  private staticFrame(): Frame {
    // 没有 UI 时的占位画面（只有地板，避免黑屏）
    return {
      tileSize: 48,
      width: 48 * 4,
      height: 48 * 3,
      grid: [
        ['floor', 'floor', 'floor', 'floor'],
        ['floor', 'floor', 'floor', 'floor'],
        ['floor', 'floor', 'floor', 'floor'],
      ],
      items: [],
      units: [],
      effects: [],
      bubbles: [],
    }
  }

  /**
   * 场景里没有 Canvas 时自动补一套，这样把 GameRoot 丢进空场景也能跑。
   */
  private ensureCanvas(): void {
    const scene = director.getScene()
    if (!scene) return

    let canvas = scene.getComponentInChildren(Canvas)
    if (!canvas) {
      const canvasNode = new Node('Canvas')
      canvasNode.layer = Layers.Enum.UI_2D
      canvasNode.parent = scene
      canvasNode.addComponent(UITransform)

      const cameraNode = new Node('Camera')
      cameraNode.layer = Layers.Enum.UI_2D
      cameraNode.parent = canvasNode
      const camera = cameraNode.addComponent(Camera)
      camera.projection = Camera.ProjectionType.ORTHO
      camera.clearFlags = Camera.ClearFlag.SOLID_COLOR
      camera.clearColor = new Color(13, 16, 23, 255)
      camera.visibility = Layers.Enum.UI_2D | Layers.Enum.UI_3D
      cameraNode.setPosition(0, 0, 1000)

      canvas = canvasNode.addComponent(Canvas)
      canvas.cameraComponent = camera
      canvasNode.addComponent(Widget)
    }

    // 保证自己挂在 Canvas 下，才会出现在 UI 渲染树里
    if (canvas && !isDescendantOf(this.node, canvas.node)) {
      this.node.parent = canvas.node
    }
  }
}

function isDescendantOf(node: Node, ancestor: Node): boolean {
  let current: Node | null = node
  while (current) {
    if (current === ancestor) return true
    current = current.parent
  }
  return false
}
