/**
 * 界面样式（CSS 文本）。
 *
 * 之所以写成字符串而不是 .css 文件：这套界面既要给浏览器预览用，
 * 也要给 Cocos 的 Web 构建用。写成模块可以保证两边只有一份样式，
 * 而且不依赖打包器把 css 打进产物。
 */

export const UI_STYLES = `
:root {
  --ds-bg: #0d1017;
  --ds-panel: rgba(22, 27, 38, 0.94);
  --ds-panel-soft: #1d2331;
  --ds-line: #262d3d;
  --ds-text: #e8ecf7;
  --ds-muted: #94a0bb;
  --ds-accent: #6ea8fe;
  --ds-accent-strong: #3a7bfd;
  --ds-gold: #ffd166;
  --ds-success: #5ce27a;
  --ds-warn: #ffcf6b;
  --ds-error: #ff7b7b;
  --ds-mono: "SF Mono", "JetBrains Mono", "Menlo", "Consolas", monospace;
  --ds-ui: "PingFang SC", "Microsoft YaHei", system-ui, sans-serif;
  --ds-side-width: 520px;
}

.ds-app {
  position: fixed;
  inset: 0;
  overflow: hidden;
  background: var(--ds-bg);
  color: var(--ds-text);
  font-family: var(--ds-ui);
  font-size: 14px;
  z-index: 10;
}

.ds-stage {
  position: absolute;
  inset: 0;
  padding-right: var(--ds-side-width);
  padding-top: 96px;
  padding-bottom: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(circle at 45% 45%, #1b2130, #0e121b 70%);
}

.ds-canvas-host {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

#ds-stage-canvas {
  border-radius: 6px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.45);
}

.ds-topbar {
  position: absolute;
  top: 0;
  left: 0;
  right: var(--ds-side-width);
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 0 16px;
  background: linear-gradient(180deg, rgba(21, 27, 40, 0.95), rgba(17, 21, 31, 0.7));
  border-bottom: 1px solid var(--ds-line);
  pointer-events: auto;
}

.ds-brand { display: flex; align-items: baseline; gap: 8px; white-space: nowrap; }
.ds-brand-mark { font-size: 20px; }
.ds-brand-name { font-size: 17px; font-weight: 700; letter-spacing: 1px; }
.ds-brand-tag { font-size: 12px; color: var(--ds-muted); }

.ds-navbar {
  position: absolute;
  top: 50px;
  left: 0;
  right: var(--ds-side-width);
  height: 46px;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 0 16px;
  background: rgba(17, 21, 31, 0.88);
  border-bottom: 1px solid var(--ds-line);
  pointer-events: auto;
}

.ds-level-list { display: flex; gap: 6px; overflow-x: auto; flex: 1 1 auto; min-width: 0; }

.ds-chapters { display: flex; gap: 4px; flex: 0 0 auto; }
.ds-chapter-chip {
  font-family: var(--ds-ui); font-size: 12px; color: var(--ds-muted);
  background: #10151f; border: 1px solid var(--ds-line); border-radius: 999px;
  padding: 4px 10px; cursor: pointer; white-space: nowrap;
}
.ds-chapter-chip:hover { border-color: #3b4762; color: var(--ds-text); }
.ds-chapter-chip.is-active { background: rgba(58, 123, 253, 0.2); border-color: var(--ds-accent); color: var(--ds-text); }

.ds-topbar-right { display: flex; align-items: baseline; gap: 12px; }
.ds-progress { font-size: 11px; color: var(--ds-muted); white-space: nowrap; }

.ds-level-chip {
  display: flex; flex-direction: column; align-items: center; gap: 1px;
  min-width: 60px; padding: 4px 8px;
  border: 1px solid var(--ds-line); border-radius: 8px;
  background: var(--ds-panel-soft); color: var(--ds-muted);
  cursor: pointer; font-size: 12px; font-family: var(--ds-ui);
}
.ds-level-chip:hover { border-color: #3b4762; }
.ds-level-chip.is-active { border-color: var(--ds-accent); background: rgba(110, 168, 254, 0.16); color: var(--ds-text); }
.ds-level-chip .ds-stars { font-size: 10px; letter-spacing: 1px; color: var(--ds-gold); }

.ds-status { font-size: 13px; color: var(--ds-muted); white-space: nowrap; }
.ds-status.is-win { color: var(--ds-success); }
.ds-status.is-lose { color: var(--ds-error); }

.ds-side {
  position: absolute;
  top: 0; right: 0; bottom: 0;
  width: var(--ds-side-width);
  display: flex; flex-direction: column; gap: 10px;
  padding: 12px;
  background: linear-gradient(180deg, rgba(16, 20, 29, 0.96), rgba(13, 16, 23, 0.98));
  border-left: 1px solid var(--ds-line);
  backdrop-filter: blur(8px);
  pointer-events: auto;
}

.ds-panel {
  background: var(--ds-panel);
  border: 1px solid var(--ds-line);
  border-radius: 12px;
  padding: 12px;
  min-height: 0;
  display: flex; flex-direction: column; gap: 8px;
  overflow: auto;
}
.ds-briefing { flex: 0 0 auto; max-height: 46%; }
.ds-coding { flex: 1 1 auto; overflow: hidden; }

.ds-panel h2 { margin: 0; font-size: 16px; }
.ds-panel h3 { margin: 6px 0 0; font-size: 12px; color: var(--ds-muted); font-weight: 600; letter-spacing: 0.5px; }
.ds-panel p { margin: 0; font-size: 13px; line-height: 1.6; color: #cdd6ea; }
.ds-subtitle { color: var(--ds-accent) !important; font-size: 12px !important; }
.ds-syntax {
  font-size: 12px !important; color: var(--ds-muted) !important;
  background: #10151f; border: 1px solid var(--ds-line); border-radius: 8px; padding: 6px 8px;
}
.ds-syntax .ds-lock { color: var(--ds-warn); }

.ds-command-list { margin: 0; padding: 0; list-style: none; display: flex; flex-wrap: wrap; gap: 6px; }
.ds-command-list li {
  font-family: var(--ds-mono); font-size: 12px; padding: 4px 7px;
  background: #10151f; border: 1px solid var(--ds-line); border-radius: 6px;
  color: #9fd0ff; cursor: pointer;
}
.ds-command-list li:hover { border-color: var(--ds-accent); }

.ds-panel details { background: #10151f; border: 1px solid var(--ds-line); border-radius: 8px; padding: 8px 10px; }
.ds-panel summary { cursor: pointer; font-size: 13px; color: var(--ds-warn); }
#ds-hints { margin: 6px 0 0; padding-left: 18px; color: #c3cce0; font-size: 13px; line-height: 1.7; }

.ds-stats { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; font-size: 12px; }
.ds-stat { background: #10151f; border: 1px solid var(--ds-line); border-radius: 8px; padding: 5px 8px; display: flex; justify-content: space-between; gap: 6px; }
.ds-stat span:first-child { color: var(--ds-muted); }
.ds-hp-bar { grid-column: span 2; height: 10px; background: #10151f; border: 1px solid var(--ds-line); border-radius: 6px; overflow: hidden; }
.ds-hp-fill { height: 100%; background: linear-gradient(90deg, #3ecf6b, #7ef0a0); transition: width 0.18s ease; }

.ds-panel-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.ds-hint-inline { font-size: 11px; color: var(--ds-muted); }

.ds-editor-host {
  position: relative;
  flex: 1 1 52%;
  min-height: 170px;
  background: #0b0f17;
  border: 1px solid var(--ds-line);
  border-radius: 10px;
  overflow: hidden;
  font-family: var(--ds-mono);
  font-size: 13px;
  line-height: 20px;
}
.ds-gutter {
  position: absolute; inset: 0 auto 0 0; width: 3em; padding: 10px 0;
  overflow: hidden; text-align: right; color: #4a5570;
  background: #0d121b; border-right: 1px solid #1b2130;
  font-size: 12px; line-height: 20px; z-index: 2;
}
.ds-gutter-line { padding-right: 8px; }
.ds-gutter-line.is-active { color: var(--ds-accent); background: rgba(110, 168, 254, 0.12); }
.ds-gutter-line.is-error { color: var(--ds-error); background: rgba(255, 123, 123, 0.16); }

.ds-highlight, .ds-input {
  position: absolute; inset: 0; margin: 0;
  padding: 10px 12px 10px 3.6em;
  font-family: inherit; font-size: inherit; line-height: inherit;
  tab-size: 2; white-space: pre; border: 0; overflow: auto;
}
.ds-highlight { overflow: hidden; color: #d6deee; pointer-events: none; z-index: 1; }
.ds-line { min-height: 20px; }
.ds-line.is-active { background: rgba(110, 168, 254, 0.13); }
.ds-line.is-error { background: rgba(255, 123, 123, 0.16); box-shadow: inset 2px 0 0 var(--ds-error); }
.ds-input { background: transparent; color: transparent; caret-color: var(--ds-accent); resize: none; outline: none; z-index: 3; }
.ds-input::selection { background: rgba(110, 168, 254, 0.35); }

.ds-tok-keyword { color: #c792ea; }
.ds-tok-string { color: #a5e075; }
.ds-tok-number { color: #ffb86b; }
.ds-tok-comment { color: #5f6b85; font-style: italic; }
.ds-tok-function { color: #82d2ff; }
.ds-tok-property { color: #ffd166; }
.ds-tok-ident { color: #d6deee; }
.ds-tok-operator { color: #89ddff; }
.ds-tok-punct { color: #9aa6c2; }

.ds-console {
  flex: 0 0 32%; min-height: 110px; overflow: auto;
  background: #0b0f17; border: 1px solid var(--ds-line); border-radius: 10px;
  padding: 8px 10px;
  font-family: var(--ds-mono); font-size: 12px; line-height: 1.7;
}
.ds-log { display: flex; gap: 6px; color: #cdd6ea; word-break: break-word; }
.ds-log::before { content: '·'; color: #4a5570; }
.ds-log-hero::before { content: '💬'; }
.ds-log-success { color: var(--ds-success); }
.ds-log-success::before { content: '✔'; color: var(--ds-success); }
.ds-log-warn { color: var(--ds-warn); }
.ds-log-warn::before { content: '!'; color: var(--ds-warn); }
.ds-log-error { color: var(--ds-error); }
.ds-log-error::before { content: '✖'; color: var(--ds-error); }

.ds-controls {
  position: absolute; left: 0; right: var(--ds-side-width); bottom: 18px;
  display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;
  pointer-events: auto;
}

.ds-btn {
  font-family: var(--ds-ui); font-size: 13px; color: var(--ds-text);
  background: var(--ds-panel-soft); border: 1px solid var(--ds-line);
  border-radius: 9px; padding: 9px 14px; cursor: pointer;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.35);
  transition: transform 0.08s ease, background 0.15s ease;
}
.ds-btn:hover:not(:disabled) { background: #263048; }
.ds-btn:active:not(:disabled) { transform: translateY(1px); }
.ds-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.ds-btn.ds-primary { background: var(--ds-accent-strong); border-color: var(--ds-accent-strong); font-weight: 600; }
.ds-btn.ds-primary:hover:not(:disabled) { background: #4f8bff; }
.ds-mini { font-family: var(--ds-ui); font-size: 12px; color: var(--ds-text); background: var(--ds-panel-soft); border: 1px solid var(--ds-line); border-radius: 6px; padding: 3px 8px; cursor: pointer; }
.ds-btn kbd { font-family: var(--ds-mono); font-size: 11px; background: rgba(255, 255, 255, 0.12); border-radius: 4px; padding: 1px 4px; }

.ds-overlay {
  position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
  background: rgba(6, 9, 14, 0.72); z-index: 30;
}
.ds-overlay.hidden { display: none; }
.ds-dialog {
  width: min(430px, 88vw); padding: 22px; text-align: center;
  background: #161b26; border: 1px solid var(--ds-line); border-radius: 16px;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.6);
}
.ds-dialog h2 { margin: 0 0 6px; font-size: 20px; }
.ds-dialog .ds-dialog-stars { font-size: 30px; letter-spacing: 6px; color: #39415a; margin: 10px 0; }
.ds-dialog .ds-dialog-stars .on { color: var(--ds-gold); text-shadow: 0 0 12px rgba(255, 209, 102, 0.5); }
.ds-dialog p { color: var(--ds-muted); font-size: 13px; line-height: 1.7; }
.ds-dialog .ds-actions { display: flex; gap: 8px; justify-content: center; margin-top: 16px; }

@media (max-width: 1080px) {
  :root { --ds-side-width: 0px; }
  .ds-topbar, .ds-navbar { right: 0; }
  .ds-side {
    top: auto; left: 0; right: 0; bottom: 0; width: auto; height: 58%;
    border-left: 0; border-top: 1px solid var(--ds-line);
  }
  .ds-stage { padding-right: 0; padding-top: 96px; padding-bottom: 58%; }
  .ds-controls { right: 0; bottom: calc(58% + 12px); }
}
`
