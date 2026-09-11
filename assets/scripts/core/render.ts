/**
 * 渲染层：核心只产出「语义帧」（Frame），画面由画笔（Painter）真正画出来。
 *
 * 这样同一套美术代码可以同时服务浏览器 Canvas2D 预览和 Cocos Creator，
 * 换引擎时不用重画角色。
 */

import type { ItemType, TileType, UnitType } from './types'

export interface FrameUnit {
  id: string
  type: UnitType
  /** 英雄的性别，决定立绘（其他单位没有这个字段） */
  gender?: 'male' | 'female'
  /** 像素坐标（格子中心） */
  x: number
  y: number
  hpRatio: number
  facing: 1 | -1
  /** 受击闪烁强度 0..1 */
  hurt: number
  /** 死亡动画进度 0..1 */
  dying: number
}

export interface FrameItem {
  id: string
  type: ItemType
  x: number
  y: number
  /** 浮动动画相位，用于上下轻微起伏 */
  bob: number
}

export interface FrameEffect {
  kind: 'slash' | 'hit' | 'sparkle' | 'heal' | 'float'
  x: number
  y: number
  /** 0..1 播放进度 */
  t: number
  text?: string
  color?: string
}

export interface FrameBubble {
  text: string
  x: number
  y: number
  alpha: number
}

export interface Frame {
  tileSize: number
  width: number
  height: number
  /** grid[y][x] */
  grid: TileType[][]
  items: FrameItem[]
  units: FrameUnit[]
  effects: FrameEffect[]
  bubbles: FrameBubble[]
}

export interface RectStyle {
  fill?: string
  stroke?: string
  lineWidth?: number
  alpha?: number
  radius?: number
}

export interface TextSpec {
  size: number
  color: string
  align?: 'left' | 'center' | 'right'
  baseline?: 'top' | 'middle' | 'bottom'
  bold?: boolean
  alpha?: number
}

/** 画笔：Cocos 与 Canvas2D 各自实现。 */
export interface Painter {
  /** 清空这一帧 */
  clear(width: number, height: number): void
  rect(x: number, y: number, w: number, h: number, style: RectStyle): void
  circle(cx: number, cy: number, r: number, style: RectStyle): void
  polygon(points: number[], style: RectStyle): void
  line(x1: number, y1: number, x2: number, y2: number, style: RectStyle): void
  arc(cx: number, cy: number, r: number, startRad: number, endRad: number, style: RectStyle): void
  text(content: string, x: number, y: number, spec: TextSpec): void
}

export const PALETTE = {
  background: '#101320',
  floorA: '#2b3145',
  floorB: '#252b3d',
  wall: '#424962',
  wallTop: '#565e7c',
  wallLine: '#232838',
  exit: '#5ef0c0',
  exitGlow: '#1f9f7d',
  spike: '#aab3cc',
  spikeDark: '#6a7288',
  hero: '#6ea8fe',
  heroDark: '#3a63c8',
  heroFace: '#ffd7ad',
  hair: '#4a2f22',
  femaleAccent: '#f2798f',
  munchkin: '#a6e26a',
  ogre: '#7cc45c',
  chief: '#e07a55',
  eye: '#fff3bf',
  metal: '#dfe6f5',
  gem: '#4dd4f7',
  gemDark: '#1c7ea6',
  potion: '#ff8ab5',
  hpBack: '#0b0e18',
  hpGood: '#5ce27a',
  hpMid: '#ffd166',
  hpBad: '#ff6b6b',
  text: '#f5f7ff',
  bubble: '#f7f9ff',
  bubbleText: '#1b1f2a',
  slash: '#fff3c4',
  hit: '#ff9d6b',
  heal: '#7bf59b',
  gold: '#ffd166',
} as const

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '')
  const value = parseInt(clean.length === 3 ? clean.replace(/./g, (c) => c + c) : clean, 16)
  return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 }
}

// ------------------------------------------------------------------ 画面绘制

export function paintFrame(frame: Frame, painter: Painter): void {
  painter.clear(frame.width, frame.height)
  paintTiles(frame, painter)

  for (const item of frame.items) paintItem(item, frame.tileSize, painter)

  // 靠下的单位后画，形成前后遮挡
  const units = [...frame.units].sort((a, b) => a.y - b.y || a.x - b.x)
  for (const unit of units) paintUnit(unit, frame.tileSize, painter)

  for (const effect of frame.effects) paintEffect(effect, frame.tileSize, painter)
  for (const bubble of frame.bubbles) paintBubble(bubble, frame.tileSize, painter)
}

function paintTiles(frame: Frame, painter: Painter): void {
  const size = frame.tileSize
  for (let y = 0; y < frame.grid.length; y++) {
    for (let x = 0; x < frame.grid[y].length; x++) {
      const type = frame.grid[y][x]
      const px = x * size
      const py = y * size

      if (type === 'floor' || type === 'exit' || type === 'spike') {
        painter.rect(px, py, size, size, { fill: (x + y) % 2 === 0 ? PALETTE.floorA : PALETTE.floorB })
      }

      switch (type) {
        case 'wall': {
          painter.rect(px, py, size, size, { fill: PALETTE.wall })
          painter.rect(px, py, size, size * 0.18, { fill: PALETTE.wallTop })
          painter.line(px, py + size * 0.55, px + size, py + size * 0.55, {
            stroke: PALETTE.wallLine,
            lineWidth: 1,
            alpha: 0.7,
          })
          painter.line(px + size * 0.5, py + size * 0.55, px + size * 0.5, py + size, {
            stroke: PALETTE.wallLine,
            lineWidth: 1,
            alpha: 0.7,
          })
          painter.line(px, py + size, px + size, py + size, { stroke: PALETTE.wallLine, lineWidth: 1, alpha: 0.9 })
          break
        }
        case 'exit': {
          const cx = px + size / 2
          const cy = py + size / 2
          painter.circle(cx, cy, size * 0.34, { fill: PALETTE.exitGlow, alpha: 0.35 })
          painter.circle(cx, cy, size * 0.24, { fill: PALETTE.exit, alpha: 0.85 })
          painter.circle(cx, cy, size * 0.12, { fill: PALETTE.background })
          break
        }
        case 'spike': {
          for (let i = 0; i < 3; i++) {
            const offset = px + size * (0.16 + i * 0.28)
            painter.polygon(
              [offset, py + size * 0.78, offset + size * 0.13, py + size * 0.24, offset + size * 0.26, py + size * 0.78],
              { fill: PALETTE.spike, stroke: PALETTE.spikeDark, lineWidth: 1 },
            )
          }
          break
        }
      }
    }
  }
}

function paintUnit(unit: FrameUnit, size: number, painter: Painter): void {
  const alpha = unit.dying > 0 ? Math.max(0, 1 - unit.dying) : 1
  const shrink = 1 - unit.dying * 0.35
  const x = unit.x
  const y = unit.y - unit.dying * size * 0.2
  const scale = (size / 48) * shrink
  const flash = unit.hurt

  switch (unit.type) {
    case 'hero': {
      // 披风
      painter.polygon(
        [
          x - unit.facing * 6 * scale, y - 8 * scale,
          x - unit.facing * 16 * scale, y + 12 * scale,
          x - unit.facing * 2 * scale, y + 12 * scale,
        ],
        { fill: PALETTE.heroDark, alpha },
      )
      // 身体
      painter.rect(x - 8 * scale, y - 8 * scale, 16 * scale, 20 * scale, {
        fill: flash > 0.35 ? PALETTE.hit : PALETTE.hero,
        alpha,
        radius: 5 * scale,
      })
      if (unit.gender === 'female') {
        // 马尾（在背后）
        painter.polygon(
          [
            x - unit.facing * 7 * scale, y - 18 * scale,
            x - unit.facing * 15 * scale, y - 9 * scale,
            x - unit.facing * 8 * scale, y - 5 * scale,
          ],
          { fill: PALETTE.hair, alpha },
        )
        // 后脑头发
        painter.circle(x, y - 16 * scale, 9 * scale, { fill: PALETTE.hair, alpha })
        // 脸
        painter.circle(x, y - 15 * scale, 7.5 * scale, { fill: flash > 0.35 ? PALETTE.hit : PALETTE.heroFace, alpha })
        // 发带
        painter.rect(x - 7.5 * scale, y - 21 * scale, 15 * scale, 3 * scale, {
          fill: PALETTE.femaleAccent,
          alpha,
          radius: 1.5 * scale,
        })
        painter.circle(x + 7 * scale, y - 21 * scale, 2.2 * scale, { fill: PALETTE.femaleAccent, alpha })
      } else {
        // 头
        painter.circle(x, y - 15 * scale, 8 * scale, { fill: flash > 0.35 ? PALETTE.hit : PALETTE.heroFace, alpha })
        // 头盔
        painter.polygon(
          [x - 8 * scale, y - 17 * scale, x + 8 * scale, y - 17 * scale, x, y - 27 * scale],
          { fill: PALETTE.heroDark, alpha },
        )
      }
      // 眼睛
      painter.circle(x + unit.facing * 2 * scale, y - 15 * scale, 1.4 * scale, { fill: PALETTE.bubbleText, alpha })
      painter.circle(x + unit.facing * 5 * scale, y - 15 * scale, 1.4 * scale, { fill: PALETTE.bubbleText, alpha })
      // 剑
      const swordX = x + unit.facing * 13 * scale
      painter.line(swordX, y - 16 * scale, swordX + unit.facing * 3 * scale, y + 12 * scale, {
        stroke: PALETTE.metal,
        lineWidth: 3 * scale,
        alpha,
      })
      painter.line(swordX - unit.facing * 3 * scale, y + 4 * scale, swordX + unit.facing * 5 * scale, y + 4 * scale, {
        stroke: PALETTE.gold,
        lineWidth: 3 * scale,
        alpha,
      })
      break
    }
    case 'munchkin': {
      painter.circle(x, y, 13 * scale, { fill: flash > 0.35 ? PALETTE.hit : PALETTE.munchkin, alpha })
      painter.polygon([x - 12 * scale, y - 9 * scale, x - 4 * scale, y - 16 * scale, x - 2 * scale, y - 4 * scale], {
        fill: PALETTE.ogre,
        alpha,
      })
      painter.polygon([x + 12 * scale, y - 9 * scale, x + 4 * scale, y - 16 * scale, x + 2 * scale, y - 4 * scale], {
        fill: PALETTE.ogre,
        alpha,
      })
      painter.circle(x - 4 * scale, y - 3 * scale, 2 * scale, { fill: PALETTE.bubbleText, alpha })
      painter.circle(x + 4 * scale, y - 3 * scale, 2 * scale, { fill: PALETTE.bubbleText, alpha })
      painter.line(x - 4 * scale, y + 6 * scale, x + 4 * scale, y + 6 * scale, {
        stroke: PALETTE.bubbleText,
        lineWidth: 1.5 * scale,
        alpha,
      })
      break
    }
    case 'ogre':
    case 'ogre-chief': {
      const isChief = unit.type === 'ogre-chief'
      const main = flash > 0.35 ? PALETTE.hit : isChief ? PALETTE.chief : PALETTE.ogre
      painter.circle(x, y + 2 * scale, isChief ? 16 * scale : 14 * scale, { fill: main, alpha })
      painter.circle(x, y - 10 * scale, 10 * scale, { fill: main, alpha })
      // 角
      painter.polygon(
        [x - 9 * scale, y - 16 * scale, x - 14 * scale, y - 24 * scale, x - 4 * scale, y - 19 * scale],
        { fill: PALETTE.metal, alpha },
      )
      painter.polygon(
        [x + 9 * scale, y - 16 * scale, x + 14 * scale, y - 24 * scale, x + 4 * scale, y - 19 * scale],
        { fill: PALETTE.metal, alpha },
      )
      painter.circle(x - 4 * scale, y - 11 * scale, 2.2 * scale, { fill: PALETTE.eye, alpha })
      painter.circle(x + 4 * scale, y - 11 * scale, 2.2 * scale, { fill: PALETTE.eye, alpha })
      // 牙
      painter.polygon([x - 4 * scale, y - 4 * scale, x - 2 * scale, y + 1 * scale, x, y - 4 * scale], {
        fill: PALETTE.bubble,
        alpha,
      })
      painter.polygon([x + 4 * scale, y - 4 * scale, x + 2 * scale, y + 1 * scale, x, y - 4 * scale], {
        fill: PALETTE.bubble,
        alpha,
      })
      if (isChief) {
        painter.polygon(
          [
            x - 9 * scale, y - 19 * scale,
            x - 9 * scale, y - 27 * scale,
            x - 4.5 * scale, y - 22 * scale,
            x, y - 28 * scale,
            x + 4.5 * scale, y - 22 * scale,
            x + 9 * scale, y - 27 * scale,
            x + 9 * scale, y - 19 * scale,
          ],
          { fill: PALETTE.gold, alpha },
        )
      }
      break
    }
  }

  // 血条：只有不满血时才显示，避免画面太吵
  if (unit.hpRatio < 1) {
    const width = size * 0.72
    const bx = x - width / 2
    const by = y - size * 0.47
    painter.rect(bx - 1, by - 1, width + 2, 6, { fill: PALETTE.hpBack, alpha: 0.85 })
    const color = unit.hpRatio > 0.6 ? PALETTE.hpGood : unit.hpRatio > 0.3 ? PALETTE.hpMid : PALETTE.hpBad
    painter.rect(bx, by, width * Math.max(0, unit.hpRatio), 4, { fill: color, alpha })
  }
}

function paintItem(item: FrameItem, size: number, painter: Painter): void {
  const offset = Math.sin(item.bob) * size * 0.06
  const y = item.y + offset
  const scale = size / 48

  if (item.type === 'gem') {
    painter.polygon(
      [item.x, y - 11 * scale, item.x + 9 * scale, y, item.x, y + 11 * scale, item.x - 9 * scale, y],
      { fill: PALETTE.gem, stroke: PALETTE.gemDark, lineWidth: 1.5 * scale },
    )
    painter.polygon(
      [
        item.x, y - 11 * scale,
        item.x + 4 * scale, y - 2 * scale,
        item.x, y + 11 * scale,
        item.x - 4 * scale, y - 2 * scale,
      ],
      { fill: PALETTE.bubble, alpha: 0.35 },
    )
    return
  }

  // 药水瓶
  painter.rect(item.x - 4 * scale, y - 12 * scale, 8 * scale, 5 * scale, { fill: PALETTE.metal, radius: 2 * scale })
  painter.circle(item.x, y + 2 * scale, 8 * scale, { fill: PALETTE.potion, alpha: 0.9 })
  painter.circle(item.x, y + 2 * scale, 5 * scale, { fill: PALETTE.bubble, alpha: 0.4 })
}

function paintEffect(effect: FrameEffect, size: number, painter: Painter): void {
  const scale = size / 48
  const progress = Math.max(0, Math.min(1, effect.t))

  switch (effect.kind) {
    case 'slash': {
      const alpha = 1 - progress
      const radius = (8 + progress * 14) * scale
      for (let i = 0; i < 3; i++) {
        const offset = i * 0.35
        painter.arc(effect.x, effect.y, radius + i * 3 * scale, -Math.PI * 0.7 + offset, -Math.PI * 0.1 + offset, {
          stroke: PALETTE.slash,
          lineWidth: 3 * scale,
          alpha: Math.max(0, alpha - i * 0.2),
        })
      }
      break
    }
    case 'hit': {
      const alpha = 1 - progress
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI * 2 * i) / 6
        const inner = (6 + progress * 8) * scale
        const outer = inner + 8 * scale
        painter.line(
          effect.x + Math.cos(angle) * inner,
          effect.y + Math.sin(angle) * inner,
          effect.x + Math.cos(angle) * outer,
          effect.y + Math.sin(angle) * outer,
          { stroke: PALETTE.hit, lineWidth: 2.5 * scale, alpha },
        )
      }
      break
    }
    case 'sparkle': {
      const alpha = 1 - progress
      for (let i = 0; i < 4; i++) {
        const angle = (Math.PI / 2) * i + progress
        const distance = 6 * scale + progress * 16 * scale
        const px = effect.x + Math.cos(angle) * distance
        const py = effect.y + Math.sin(angle) * distance
        const r = 3 * scale * (1 - progress)
        painter.polygon([px, py - r * 2, px + r, py, px, py + r * 2, px - r, py], {
          fill: PALETTE.gem,
          alpha,
        })
      }
      break
    }
    case 'heal': {
      const alpha = 1 - progress
      const y = effect.y - progress * 20 * scale
      painter.rect(effect.x - 2 * scale, y - 8 * scale, 4 * scale, 16 * scale, { fill: PALETTE.heal, alpha })
      painter.rect(effect.x - 8 * scale, y - 2 * scale, 16 * scale, 4 * scale, { fill: PALETTE.heal, alpha })
      break
    }
    case 'float': {
      const alpha = 1 - progress
      painter.text(effect.text ?? '', effect.x, effect.y - progress * 26 * scale, {
        size: 15 * scale,
        color: effect.color ?? PALETTE.gold,
        align: 'center',
        baseline: 'middle',
        bold: true,
        alpha,
      })
      break
    }
  }
}

function paintBubble(bubble: FrameBubble, size: number, painter: Painter): void {
  const scale = size / 48
  const padding = 10 * scale
  const fontSize = 14 * scale
  const width = Math.max(44 * scale, bubble.text.length * fontSize * 0.95 + padding * 2)
  const height = 28 * scale
  const x = bubble.x - width / 2
  const y = bubble.y - 46 * scale - height

  painter.rect(x, y, width, height, { fill: PALETTE.bubble, alpha: bubble.alpha, radius: 8 * scale })
  painter.polygon(
    [bubble.x - 6 * scale, y + height, bubble.x + 6 * scale, y + height, bubble.x, y + height + 8 * scale],
    { fill: PALETTE.bubble, alpha: bubble.alpha },
  )
  painter.text(bubble.text, bubble.x, y + height / 2, {
    size: fontSize,
    color: PALETTE.bubbleText,
    align: 'center',
    baseline: 'middle',
    alpha: bubble.alpha,
  })
}
