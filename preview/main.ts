/**
 * 浏览器预览入口：把 Canvas2D 渲染器接到共用界面上。
 *
 * 需要它只是因为浏览器不认识 .ts，由 tools/dev-server.mjs 现场剥类型：
 *   npm run dev   →  http://localhost:5173
 */

import { mountGameUI } from '../assets/scripts/ui/app'
import { Canvas2DView } from './CanvasRenderer'

const ui = mountGameUI({
  createStage: (canvas, host) => new Canvas2DView(canvas, host),
})

// 调试入口：浏览器控制台里可以直接查看引擎状态，比如 __dungeon.game.world
;(window as any).__dungeon = ui
