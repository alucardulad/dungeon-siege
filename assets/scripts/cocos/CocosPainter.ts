/**
 * Painter 的 Cocos Creator 实现：用 Graphics 画几何，用 Label 池画文字。
 *
 * 坐标系转换：核心用的是「左上角原点、y 向下」的画布坐标，
 * Cocos 是「原点在中心、y 向上」，所以这里统一做一次映射，
 * 上层的美术代码（core/render.ts）完全不用关心引擎差异。
 */

import {
  Color,
  Graphics,
  HorizontalTextAlignment,
  Label,
  Node,
  UITransform,
  Vec3,
  VerticalTextAlignment,
} from 'cc'

import { PALETTE, hexToRgb, paintFrame, type Frame, type Painter, type RectStyle, type TextSpec } from '../core/render'

const H_ALIGN = {
  left: HorizontalTextAlignment.LEFT,
  center: HorizontalTextAlignment.CENTER,
  right: HorizontalTextAlignment.RIGHT,
}

const V_ALIGN = {
  top: VerticalTextAlignment.TOP,
  middle: VerticalTextAlignment.MIDDLE,
  bottom: VerticalTextAlignment.BOTTOM,
}

function toColor(hex: string, alpha = 1): Color {
  const { r, g, b } = hexToRgb(hex)
  return new Color(r, g, b, Math.round(Math.max(0, Math.min(1, alpha)) * 255))
}

export class CocosPainter implements Painter {
  /** 挂到场景里的绘制根节点，外部可以整体缩放/位移 */
  readonly root: Node

  private graphics: Graphics
  private textHost: Node
  private labels: Label[] = []
  private labelCount = 0
  private width = 0
  private height = 0

  constructor(parent: Node) {
    this.root = new Node('DungeonStage')
    this.root.parent = parent

    const shapes = new Node('Shapes')
    shapes.parent = this.root
    this.graphics = shapes.addComponent(Graphics)

    this.textHost = new Node('Texts')
    this.textHost.parent = this.root
  }

  /** 画一帧，并回收这一帧没用到的文字节点。 */
  draw(frame: Frame): void {
    this.width = frame.width
    this.height = frame.height
    this.labelCount = 0
    paintFrame(frame, this)
    for (let i = this.labelCount; i < this.labels.length; i++) {
      this.labels[i].node.active = false
    }
  }

  // 画布坐标 → Cocos 局部坐标
  private tx(x: number): number {
    return x - this.width / 2
  }

  private ty(y: number): number {
    return this.height / 2 - y
  }

  clear(width: number, height: number): void {
    this.width = width
    this.height = height
    this.graphics.clear()
    this.graphics.fillColor = toColor(PALETTE.background)
    this.graphics.rect(this.tx(0), this.ty(height), width, height)
    this.graphics.fill()
  }

  private begin(style: RectStyle): void {
    if (style.fill) this.graphics.fillColor = toColor(style.fill, style.alpha ?? 1)
    if (style.stroke) this.graphics.strokeColor = toColor(style.stroke, style.alpha ?? 1)
    this.graphics.lineWidth = style.lineWidth ?? 1
  }

  private end(style: RectStyle): void {
    if (style.fill) this.graphics.fill()
    if (style.stroke) this.graphics.stroke()
  }

  rect(x: number, y: number, w: number, h: number, style: RectStyle): void {
    this.begin(style)
    if (style.radius) {
      this.graphics.roundRect(this.tx(x), this.ty(y + h), w, h, Math.min(style.radius, w / 2, h / 2))
    } else {
      this.graphics.rect(this.tx(x), this.ty(y + h), w, h)
    }
    this.end(style)
  }

  circle(cx: number, cy: number, r: number, style: RectStyle): void {
    this.begin(style)
    this.graphics.circle(this.tx(cx), this.ty(cy), Math.max(0.1, r))
    this.end(style)
  }

  polygon(points: number[], style: RectStyle): void {
    if (points.length < 6) return
    this.begin(style)
    this.graphics.moveTo(this.tx(points[0]), this.ty(points[1]))
    for (let i = 2; i < points.length; i += 2) {
      this.graphics.lineTo(this.tx(points[i]), this.ty(points[i + 1]))
    }
    this.graphics.close()
    this.end(style)
  }

  line(x1: number, y1: number, x2: number, y2: number, style: RectStyle): void {
    this.begin({ ...style, fill: undefined })
    this.graphics.moveTo(this.tx(x1), this.ty(y1))
    this.graphics.lineTo(this.tx(x2), this.ty(y2))
    this.graphics.stroke()
  }

  arc(cx: number, cy: number, r: number, startRad: number, endRad: number, style: RectStyle): void {
    this.begin({ ...style, fill: undefined })
    // Cocos 的 y 轴朝上、角度逆时针，这里把角度取反保持视觉一致
    this.graphics.arc(this.tx(cx), this.ty(cy), Math.max(0.1, r), -endRad, -startRad, false)
    this.graphics.stroke()
  }

  text(content: string, x: number, y: number, spec: TextSpec): void {
    if (!content) return
    const label = this.obtainLabel()
    const align = spec.align ?? 'left'
    const baseline = spec.baseline ?? 'top'

    label.string = content
    label.fontSize = Math.max(6, Math.round(spec.size))
    label.lineHeight = Math.round(spec.size * 1.2)
    label.color = toColor(spec.color, spec.alpha ?? 1)
    label.horizontalAlign = H_ALIGN[align]
    label.verticalAlign = V_ALIGN[baseline]
    label.isBold = spec.bold ?? false

    const anchorX = align === 'left' ? 0 : align === 'center' ? 0.5 : 1
    const anchorY = baseline === 'top' ? 1 : baseline === 'middle' ? 0.5 : 0
    const transform = label.node.getComponent(UITransform) ?? label.node.addComponent(UITransform)
    transform.setAnchorPoint(anchorX, anchorY)
    label.node.setPosition(new Vec3(this.tx(x), this.ty(y), 0))
  }

  private obtainLabel(): Label {
    let label = this.labels[this.labelCount]
    if (!label) {
      const node = new Node(`Text${this.labelCount}`)
      node.parent = this.textHost
      label = node.addComponent(Label)
      label.useSystemFont = true
      label.fontFamily = 'PingFang SC, Microsoft YaHei, Heiti SC, sans-serif'
      label.overflow = Label.Overflow.NONE
      label.cacheMode = Label.CacheMode.NONE
      this.labels.push(label)
    }
    this.labelCount++
    label.node.active = true
    return label
  }
}
