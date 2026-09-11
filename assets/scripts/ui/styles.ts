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
  --ds-teacher-width: 320px;
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
  padding-left: var(--ds-teacher-width);
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
.ds-profile {
  display: flex; align-items: center; gap: 6px;
  font-family: var(--ds-ui); font-size: 13px; color: var(--ds-text);
  background: transparent; border: 0; cursor: pointer; padding: 2px 6px;
}
.ds-profile:hover { color: var(--ds-accent); }
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

.ds-teacher-panel {
  position: absolute; left: 0; top: 96px; bottom: 0; width: var(--ds-teacher-width);
  display: flex; flex-direction: column; align-items: center; gap: 10px;
  padding: 20px 16px; overflow-y: auto;
  background: linear-gradient(180deg, rgba(24, 31, 48, 0.92), rgba(13, 16, 23, 0.96));
  border-right: 1px solid var(--ds-line);
  pointer-events: auto;
}
.ds-teacher-portrait {
  width: 128px; height: 128px; flex: 0 0 auto;
  border-radius: 50%; overflow: hidden;
  box-shadow: 0 8px 26px rgba(0, 0, 0, 0.45), 0 0 0 2px var(--ds-accent-strong);
  animation: ds-bob 3.2s ease-in-out infinite;
}
.ds-teacher-portrait svg { width: 100%; height: 100%; display: block; }
.ds-teacher-name { font-size: 16px; font-weight: 700; color: var(--ds-text); }
.ds-teacher-title { font-size: 12px; color: var(--ds-accent); letter-spacing: 2px; margin-top: -4px; }
.ds-teacher-bubble {
  width: 100%; box-sizing: border-box; position: relative;
  margin-top: 8px; padding: 12px 14px; min-height: 108px;
  background: #10151f; border: 1px solid var(--ds-line); border-radius: 14px;
  font-size: 13px; line-height: 1.75; color: #d7def2; cursor: pointer;
}
.ds-teacher-bubble::before {
  content: ''; position: absolute; top: -8px; left: 50%; transform: translateX(-50%);
  border-left: 8px solid transparent; border-right: 8px solid transparent;
  border-bottom: 8px solid #10151f;
}
.ds-teacher-caret {
  display: inline-block; color: var(--ds-accent); margin-left: 1px;
  animation: ds-caret 0.8s steps(2) infinite;
}
@keyframes ds-bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
@keyframes ds-caret { 0%, 49% { opacity: 1; } 50%, 100% { opacity: 0; } }

.ds-panel {
  background: var(--ds-panel);
  border: 1px solid var(--ds-line);
  border-radius: 12px;
  padding: 12px;
  min-height: 0;
  display: flex; flex-direction: column; gap: 8px;
  overflow: auto;
}
.ds-briefing { flex: 0 1 auto; max-height: 36%; }
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
  position: absolute; left: var(--ds-teacher-width); right: var(--ds-side-width); bottom: 18px;
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
.ds-logout {
  font-family: var(--ds-ui); font-size: 12px; color: var(--ds-muted);
  background: transparent; border: 1px solid var(--ds-line); border-radius: 6px;
  padding: 3px 9px; cursor: pointer;
}
.ds-logout:hover { color: var(--ds-error); border-color: var(--ds-error); }
.ds-about-btn {
  font-family: var(--ds-ui); font-size: 12px; color: var(--ds-muted);
  background: transparent; border: 1px solid var(--ds-line); border-radius: 6px;
  padding: 3px 9px; cursor: pointer;
}
.ds-about-btn:hover { color: var(--ds-accent); border-color: var(--ds-accent); }
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

/* ---------------------------------------------------------------- 登录/选人 */

.ds-login {
  position: absolute; inset: 0; z-index: 40;
  display: flex; align-items: center; justify-content: center;
  background: radial-gradient(circle at 50% 35%, #1d2434, #0b0e14 78%);
}
.ds-login.hidden { display: none; }
.ds-login-card {
  width: min(360px, 90vw); padding: 28px 26px; text-align: center;
  background: var(--ds-panel); border: 1px solid var(--ds-line); border-radius: 16px;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.55);
}
.ds-login-mark { font-size: 40px; }
.ds-login-card h2 { margin: 8px 0 2px; font-size: 22px; letter-spacing: 2px; }
.ds-login-sub { color: var(--ds-muted); font-size: 12px; margin: 0 0 18px; }
.ds-login-name {
  width: 100%; box-sizing: border-box; padding: 10px 12px;
  font-size: 15px; font-family: var(--ds-ui); text-align: center;
  background: #0b0f17; border: 1px solid var(--ds-line); border-radius: 10px;
  color: var(--ds-text); outline: none;
}
.ds-login-name:focus { border-color: var(--ds-accent); }
.ds-gender-picker { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 14px 0; }
.ds-gender-card {
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  padding: 12px; font-size: 28px; line-height: 1;
  background: #10151f; border: 1px solid var(--ds-line); border-radius: 12px;
  color: var(--ds-text); cursor: pointer; font-family: var(--ds-ui);
}
.ds-gender-card span { font-size: 13px; color: var(--ds-muted); }
.ds-gender-card:hover { border-color: #3b4762; }
.ds-gender-card.is-active { border-color: var(--ds-accent); background: rgba(110, 168, 254, 0.16); }
.ds-gender-card.is-active span { color: var(--ds-text); }
.ds-login-start { width: 100%; }

/* ---------------------------------------------------------------- 关于 */

.ds-about {
  position: absolute; inset: 0; z-index: 45;
  display: flex; align-items: center; justify-content: center;
  background: rgba(6, 9, 14, 0.78);
  padding: 24px;
}
.ds-about.hidden { display: none; }
.ds-about-card {
  width: min(620px, 94vw); max-height: 88vh;
  display: flex; flex-direction: column;
  background: var(--ds-panel); border: 1px solid var(--ds-line); border-radius: 16px;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.6);
  overflow: hidden;
}
.ds-about-head {
  display: flex; align-items: flex-start; justify-content: space-between; gap: 12px;
  padding: 20px 22px 12px;
  border-bottom: 1px solid var(--ds-line);
}
.ds-about-head h2 { margin: 0; font-size: 20px; }
.ds-about-sub { margin: 4px 0 0; font-size: 12px; color: var(--ds-muted); }
.ds-about-close {
  font-size: 14px; color: var(--ds-muted); background: transparent;
  border: 1px solid var(--ds-line); border-radius: 8px;
  width: 28px; height: 28px; cursor: pointer; flex: 0 0 auto;
}
.ds-about-close:hover { color: var(--ds-text); border-color: #3b4762; }
.ds-about-body {
  padding: 16px 22px; overflow-y: auto;
  font-size: 13.5px; line-height: 1.9; color: #d7def2;
}
.ds-about-body p { margin: 0 0 12px; }
.ds-about-body p:last-child { margin-bottom: 0; }
.ds-about-body .ds-about-hi { color: var(--ds-accent); font-weight: 600; }
.ds-about-foot {
  display: flex; align-items: center; justify-content: space-between; gap: 16px;
  padding: 14px 22px; border-top: 1px solid var(--ds-line);
  background: #10151f;
}
.ds-about-meta { font-size: 13px; color: var(--ds-muted); line-height: 1.9; }
.ds-about-meta b { color: var(--ds-text); }
.ds-about-meta a { color: var(--ds-accent); text-decoration: none; }
.ds-about-meta a:hover { text-decoration: underline; }
.ds-about-donate { text-align: center; flex: 0 0 auto; }
.ds-about-donate img {
  width: 132px; height: 132px; display: block; border-radius: 10px;
  background: #ffffff; border: 1px solid var(--ds-line);
}
.ds-about-donate-title { margin-top: 6px; font-size: 12px; color: var(--ds-text); }
.ds-about-donate-note { font-size: 11px; color: var(--ds-muted); max-width: 150px; margin: 2px auto 0; line-height: 1.5; }
.ds-about-ok { margin: 0 22px 20px; }

@media (max-height: 620px) {
  .ds-about-donate img { width: 104px; height: 104px; }
}

@media (max-width: 1080px) {
  :root { --ds-side-width: 0px; --ds-teacher-width: 0px; }
  .ds-topbar, .ds-navbar { right: 0; }
  .ds-teacher-panel { display: none; }
  .ds-side {
    top: auto; left: 0; right: 0; bottom: 0; width: auto; height: 58%;
    border-left: 0; border-top: 1px solid var(--ds-line);
  }
  .ds-stage { padding-left: 0; padding-right: 0; padding-top: 96px; padding-bottom: 58%; }
  .ds-controls { left: 0; right: 0; bottom: calc(58% + 12px); }
}
`
