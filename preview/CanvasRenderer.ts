/** Canvas2D 版画笔：把语义帧画到网页画布上。 */

import { PALETTE, paintFrame, type Frame, type Painter, type RectStyle, type TextSpec } from '../assets/scripts/core/render'

const FONT_STACK = '"PingFang SC", "Microsoft YaHei", "Menlo", "Consolas", monospace'

export class Canvas2DView implements Painter {
  private ctx: CanvasRenderingContext2D
  private canvas: HTMLCanvasElement
  private host: HTMLElement
  private scale = 1
  /** 缓存容器尺寸：每帧读 clientWidth 会强制布局，卡主线程会连累音效 */
  private hostWidth = 0
  private hostHeight = 0

  constructor(canvas: HTMLCanvasElement, host: HTMLElement) {
    this.canvas = canvas
    this.host = host
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('当前浏览器不支持 Canvas2D')
    this.ctx = ctx
    this.measure()
    if (typeof ResizeObserver !== 'undefined') {
      new ResizeObserver(() => this.measure()).observe(host)
    } else {
      window.addEventListener('resize', () => this.measure())
    }
  }

  private measure(): void {
    this.hostWidth = this.host.clientWidth
    this.hostHeight = this.host.clientHeight
  }

  /** 把整张地图等比缩放到容器里。 */
  private fit(frameWidth: number, frameHeight: number): void {
    const padding = 24
    const availableWidth = Math.max(160, this.hostWidth - padding)
    const availableHeight = Math.max(120, this.hostHeight - padding)
    this.scale = Math.max(0.2, Math.min(availableWidth / frameWidth, availableHeight / frameHeight, 1.8))

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const pixelWidth = Math.round(frameWidth * this.scale * dpr)
    const pixelHeight = Math.round(frameHeight * this.scale * dpr)
    if (this.canvas.width !== pixelWidth || this.canvas.height !== pixelHeight) {
      this.canvas.width = pixelWidth
      this.canvas.height = pixelHeight
    }
    this.canvas.style.width = `${Math.round(frameWidth * this.scale)}px`
    this.canvas.style.height = `${Math.round(frameHeight * this.scale)}px`
    this.ctx.setTransform(this.scale * dpr, 0, 0, this.scale * dpr, 0, 0)
  }

  render(frame: Frame): void {
    paintFrame(frame, this)
  }

  clear(width: number, height: number): void {
    this.fit(width, height)
    this.ctx.globalAlpha = 1
    this.ctx.fillStyle = PALETTE.background
    this.ctx.fillRect(0, 0, width, height)
  }

  private prepare(style: RectStyle): void {
    this.ctx.globalAlpha = style.alpha ?? 1
    this.ctx.fillStyle = style.fill ?? 'transparent'
    this.ctx.strokeStyle = style.stroke ?? 'transparent'
    this.ctx.lineWidth = style.lineWidth ?? 1
  }

  rect(x: number, y: number, w: number, h: number, style: RectStyle): void {
    this.prepare(style)
    this.ctx.beginPath()
    if (style.radius) this.roundRectPath(x, y, w, h, style.radius)
    else this.ctx.rect(x, y, w, h)
    if (style.fill) this.ctx.fill()
    if (style.stroke) this.ctx.stroke()
  }

  circle(cx: number, cy: number, r: number, style: RectStyle): void {
    this.prepare(style)
    this.ctx.beginPath()
    this.ctx.arc(cx, cy, Math.max(0.1, r), 0, Math.PI * 2)
    if (style.fill) this.ctx.fill()
    if (style.stroke) this.ctx.stroke()
  }

  polygon(points: number[], style: RectStyle): void {
    if (points.length < 6) return
    this.prepare(style)
    this.ctx.beginPath()
    this.ctx.moveTo(points[0], points[1])
    for (let i = 2; i < points.length; i += 2) this.ctx.lineTo(points[i], points[i + 1])
    this.ctx.closePath()
    if (style.fill) this.ctx.fill()
    if (style.stroke) this.ctx.stroke()
  }

  line(x1: number, y1: number, x2: number, y2: number, style: RectStyle): void {
    this.prepare({ ...style, fill: undefined })
    this.ctx.beginPath()
    this.ctx.moveTo(x1, y1)
    this.ctx.lineTo(x2, y2)
    if (style.stroke) this.ctx.stroke()
  }

  arc(cx: number, cy: number, r: number, startRad: number, endRad: number, style: RectStyle): void {
    this.prepare({ ...style, fill: undefined })
    this.ctx.beginPath()
    this.ctx.arc(cx, cy, Math.max(0.1, r), startRad, endRad)
    if (style.stroke) this.ctx.stroke()
  }

  text(content: string, x: number, y: number, spec: TextSpec): void {
    this.ctx.globalAlpha = spec.alpha ?? 1
    this.ctx.fillStyle = spec.color
    this.ctx.font = `${spec.bold ? '700 ' : ''}${spec.size}px ${FONT_STACK}`
    this.ctx.textAlign = spec.align ?? 'left'
    this.ctx.textBaseline = spec.baseline ?? 'alphabetic'
    this.ctx.fillText(content, x, y)
  }

  private roundRectPath(x: number, y: number, w: number, h: number, r: number): void {
    const radius = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2)
    const ctx = this.ctx
    ctx.moveTo(x + radius, y)
    ctx.lineTo(x + w - radius, y)
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius)
    ctx.lineTo(x + w, y + h - radius)
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h)
    ctx.lineTo(x + radius, y + h)
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius)
    ctx.lineTo(x, y + radius)
    ctx.quadraticCurveTo(x, y, x + radius, y)
    ctx.closePath()
  }
}
