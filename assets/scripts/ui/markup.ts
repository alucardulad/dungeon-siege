/** 界面骨架。浏览器预览与 Cocos Web 构建共用同一份结构。 */

export const UI_MARKUP = `
<div class="ds-stage" id="ds-stage">
  <div class="ds-canvas-host" id="ds-canvas-host"></div>
</div>
<header class="ds-topbar">
  <div class="ds-brand">
    <span class="ds-brand-mark">⚔️</span>
    <span class="ds-brand-name">地牢围攻</span>
    <span class="ds-brand-tag">CodeDungeon · 用代码指挥英雄</span>
  </div>
  <div class="ds-topbar-right">
    <span class="ds-progress" id="ds-progress"></span>
    <span class="ds-status" id="ds-status">准备就绪</span>
    <button id="ds-mute" class="ds-mini" title="音效开关">🔊</button>
  </div>
</header>
<div class="ds-navbar">
  <nav class="ds-chapters" id="ds-chapters" aria-label="章节"></nav>
  <nav class="ds-level-list" id="ds-level-list" aria-label="关卡"></nav>
</div>
<aside class="ds-side">
  <section class="ds-panel ds-briefing">
    <h2 id="ds-level-name">第 1 关</h2>
    <p class="ds-subtitle" id="ds-level-subtitle"></p>
    <h3>任务目标</h3>
    <p id="ds-objective"></p>
    <p class="ds-syntax" id="ds-syntax"></p>
    <h3>本关新指令</h3>
    <ul class="ds-command-list" id="ds-commands"></ul>
    <details id="ds-hint-box">
      <summary>卡住了？看提示</summary>
      <ul id="ds-hints"></ul>
    </details>
    <h3>英雄状态</h3>
    <div class="ds-stats" id="ds-stats"></div>
  </section>
  <section class="ds-panel ds-coding">
    <div class="ds-panel-head">
      <h3>我的代码</h3>
      <span class="ds-hint-inline">Tab 缩进 · ⌘/Ctrl+Enter 运行</span>
    </div>
    <div class="ds-editor-host" id="ds-editor-host"></div>
    <div class="ds-panel-head">
      <h3>控制台</h3>
      <button id="ds-clear-console" class="ds-mini">清空</button>
    </div>
    <div class="ds-console" id="ds-console"></div>
  </section>
</aside>
<div class="ds-controls">
  <button id="ds-run" class="ds-btn ds-primary">▶ 运行 <kbd>⌘/Ctrl</kbd>+<kbd>Enter</kbd></button>
  <button id="ds-stop" class="ds-btn">⏹ 停止</button>
  <button id="ds-reset" class="ds-btn">↺ 重置</button>
  <button id="ds-answer" class="ds-btn">💡 看答案</button>
</div>
<div class="ds-overlay hidden" id="ds-overlay">
  <div class="ds-dialog" id="ds-dialog"></div>
</div>
`
