/**
 * @deprecated
 * This file contains the legacy ~850-line monolithic vanilla JS + inline CSS/HTML implementation.
 * It has been fully replaced by the React + Vite webview in `src/webview/`.
 * 
 * The React version provides better maintainability, TypeScript safety, modern UX (modals, dnd, charts),
 * and is loaded via `getReactPanelHtml()` in `panel.ts`.
 * 
 * This file is kept for reference only and can be safely deleted.
 * See MIGRATION_REPORT.md and CHANGELOG.md for v1.0.0 details.
 */
export function getPanelHtml(nonce: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}'; font-src data:;">
<title>TaskForge</title>
<style>
  :root {
    --bg: var(--vscode-editor-background);
    --fg: var(--vscode-editor-foreground);
    --border: var(--vscode-panel-border, rgba(128,128,128,0.25));
    --card: var(--vscode-sideBar-background, var(--vscode-editor-background));
    --accent: var(--vscode-button-background, #2f6fed);
    --accent-fg: var(--vscode-button-foreground, #ffffff);
    --accent-hover: var(--vscode-button-hoverBackground, var(--accent));
    --muted: var(--vscode-descriptionForeground, #8a8a8a);
    --hover: var(--vscode-list-hoverBackground, rgba(128,128,128,0.08));
    --active: var(--vscode-list-activeSelectionBackground, rgba(128,128,128,0.16));
    --input-bg: var(--vscode-input-background);
    --input-fg: var(--vscode-input-foreground);
    --input-border: var(--vscode-input-border, var(--border));
    --focus: var(--vscode-focusBorder, var(--accent));
    --radius: 12px;
    --radius-sm: 8px;
    --shadow: 0 8px 24px rgba(0,0,0,0.20);
    --high: #e5484d;
    --medium: #d99a2b;
    --low: #3fb950;
    --danger: #e5484d;
  }
  * { box-sizing: border-box; }
  html, body { height: 100%; }
  body {
    margin: 0;
    font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif);
    font-size: 13px;
    color: var(--fg);
    background: var(--bg);
    overflow: hidden;
  }
  button { font-family: inherit; cursor: pointer; }
  input, textarea, select { font-family: inherit; font-size: inherit; color: var(--input-fg); background: var(--input-bg); border: 1px solid var(--input-border); border-radius: var(--radius-sm); padding: 7px 10px; outline: none; }
  input:focus, textarea:focus, select:focus { border-color: var(--focus); }
  ::-webkit-scrollbar { width: 10px; height: 10px; }
  ::-webkit-scrollbar-thumb { background: rgba(128,128,128,0.35); border-radius: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }

  .app { display: flex; height: 100vh; }

  /* ---------- Rail nav ---------- */
  .rail { width: 76px; flex-shrink: 0; display: flex; flex-direction: column; align-items: center; padding: 16px 0; border-right: 1px solid var(--border); gap: 4px; }
  .rail-logo { font-size: 20px; margin-bottom: 18px; user-select: none; }
  .rail-btn { width: 52px; height: 52px; border: none; background: transparent; border-radius: var(--radius-sm); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; color: var(--muted); transition: background .15s, color .15s; }
  .rail-btn svg { width: 19px; height: 19px; }
  .rail-btn span { font-size: 10px; letter-spacing: .2px; }
  .rail-btn:hover { background: var(--hover); color: var(--fg); }
  .rail-btn.active { background: var(--active); color: var(--accent); }
  .rail-spacer { flex: 1; }

  /* ---------- Main ---------- */
  .main { flex: 1; display: flex; flex-direction: column; min-width: 0; }
  .topbar { display: flex; align-items: center; gap: 12px; padding: 14px 28px; border-bottom: 1px solid var(--border); }
  .topbar h1 { font-size: 17px; margin: 0; font-weight: 600; flex-shrink: 0; }
  .searchbox { flex: 1; max-width: 380px; position: relative; }
  .searchbox svg { position: absolute; left: 9px; top: 50%; transform: translateY(-50%); width: 14px; height: 14px; color: var(--muted); }
  .searchbox input { width: 100%; padding-left: 30px; }
  .top-actions { display: flex; gap: 8px; margin-left: auto; }
  .icon-btn { display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; border: 1px solid var(--border); background: var(--card); border-radius: var(--radius-sm); color: var(--fg); }
  .icon-btn:hover { background: var(--hover); }
  .icon-btn svg { width: 15px; height: 15px; }
  .btn { display: inline-flex; align-items: center; gap: 6px; border: 1px solid transparent; background: var(--accent); color: var(--accent-fg); padding: 7px 14px; border-radius: var(--radius-sm); font-weight: 500; }
  .btn:hover { background: var(--accent-hover); }
  .btn svg { width: 14px; height: 14px; }
  .btn.secondary { background: transparent; border-color: var(--border); color: var(--fg); }
  .btn.secondary:hover { background: var(--hover); }
  .btn.danger { background: var(--danger); color: #fff; }

  .content { flex: 1; overflow-y: auto; padding: 24px 28px 60px; }
  .view { display: none; }
  .view.active { display: block; animation: fadein .18s ease; }
  @keyframes fadein { from { opacity: 0; transform: translateY(4px);} to { opacity: 1; transform: translateY(0);} }

  .section-head { display: flex; align-items: center; margin-bottom: 18px; gap: 10px; }
  .section-head h2 { font-size: 15px; margin: 0; font-weight: 600; }
  .section-head .count { color: var(--muted); font-size: 12px; background: var(--hover); padding: 2px 8px; border-radius: 999px; }
  .section-head .filler { flex: 1; }
  .chips { display: flex; gap: 6px; }
  .chip { border: 1px solid var(--border); background: var(--card); padding: 4px 10px; border-radius: 999px; font-size: 11.5px; color: var(--muted); }
  .chip.active { background: var(--accent); color: var(--accent-fg); border-color: transparent; }

  /* ---------- Hub ---------- */
  .stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 14px; margin-bottom: 26px; }
  .stat-card { background: var(--card); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px; position: relative; overflow: hidden; }
  .stat-card .n { font-size: 26px; font-weight: 700; }
  .stat-card .l { color: var(--muted); font-size: 12px; margin-top: 2px; }
  .stat-card .bar { height: 4px; border-radius: 2px; margin-top: 12px; background: var(--hover); overflow: hidden; }
  .stat-card .bar i { display: block; height: 100%; background: var(--accent); }
  .hub-grid { display: grid; grid-template-columns: 1.3fr 1fr; gap: 20px; }
  @media (max-width: 820px) { .hub-grid { grid-template-columns: 1fr; } }
  .panel-box { background: var(--card); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px 18px; }
  .panel-box h3 { margin: 0 0 12px; font-size: 13px; font-weight: 600; }
  .activity-row { display: flex; gap: 10px; align-items: flex-start; padding: 8px 0; border-bottom: 1px solid var(--border); font-size: 12.5px; }
  .activity-row:last-child { border-bottom: none; }
  .activity-row .tag { flex-shrink: 0; font-size: 10px; text-transform: uppercase; letter-spacing: .4px; color: var(--muted); width: 44px; }
  .quick-add-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .quick-add-grid button { display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-radius: var(--radius-sm); border: 1px dashed var(--border); background: transparent; color: var(--fg); text-align: left; }
  .quick-add-grid button:hover { background: var(--hover); border-style: solid; }

  /* ---------- Todos ---------- */
  .add-row { display: flex; gap: 8px; margin-bottom: 18px; }
  .add-row input[type=text] { flex: 1; }
  .list { display: flex; flex-direction: column; gap: 8px; }
  .todo-item { display: flex; align-items: center; gap: 12px; background: var(--card); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 10px 12px; }
  .todo-item.completed { opacity: .55; }
  .todo-item.completed .text { text-decoration: line-through; }
  .checkbox { width: 18px; height: 18px; border-radius: 5px; border: 1.5px solid var(--muted); flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
  .checkbox.checked { background: var(--accent); border-color: var(--accent); }
  .checkbox.checked svg { width: 12px; height: 12px; color: var(--accent-fg); }
  .todo-item .text { flex: 1; }
  .prio-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
  .due-badge { font-size: 11px; color: var(--muted); border: 1px solid var(--border); padding: 2px 7px; border-radius: 999px; flex-shrink: 0; }
  .row-actions { display: flex; gap: 4px; opacity: 0; transition: opacity .12s; }
  .todo-item:hover .row-actions, .note-card:hover .row-actions, .plan-card:hover .row-actions, .goal-card:hover .row-actions { opacity: 1; }
  .mini-btn { width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; border: none; background: transparent; border-radius: 6px; color: var(--muted); }
  .mini-btn:hover { background: var(--hover); color: var(--fg); }
  .mini-btn svg { width: 14px; height: 14px; }
  .empty-state { text-align: center; padding: 60px 20px; color: var(--muted); }
  .empty-state svg { width: 42px; height: 42px; margin-bottom: 12px; opacity: .5; }

  /* ---------- Notes ---------- */
  .note-grid { columns: 3 280px; column-gap: 14px; }
  @media (max-width: 900px) { .note-grid { columns: 2 260px; } }
  .note-card { break-inside: avoid; background: var(--card); border: 1px solid var(--border); border-radius: var(--radius); padding: 14px; margin-bottom: 14px; cursor: pointer; transition: transform .12s, box-shadow .12s; }
  .note-card:hover { box-shadow: var(--shadow); transform: translateY(-1px); }
  .note-card .nhead { display: flex; align-items: flex-start; gap: 6px; }
  .note-card .ntitle { font-weight: 600; flex: 1; word-break: break-word; }
  .note-card .nbody { color: var(--muted); font-size: 12px; margin-top: 6px; max-height: 140px; overflow: hidden; line-height: 1.5; }
  .note-card .ntags { margin-top: 10px; display: flex; gap: 5px; flex-wrap: wrap; }
  .tag-pill { background: var(--hover); color: var(--muted); font-size: 10.5px; padding: 2px 8px; border-radius: 999px; }
  .pin-icon { width: 14px; height: 14px; color: var(--medium); flex-shrink: 0; }

  /* ---------- Kanban ---------- */
  .board { display: flex; gap: 16px; align-items: flex-start; height: 100%; }
  .col { flex: 1; min-width: 0; background: var(--card); border: 1px solid var(--border); border-radius: var(--radius); padding: 12px; min-height: 200px; }
  .col-head { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; padding: 0 2px; }
  .col-dot { width: 8px; height: 8px; border-radius: 50%; }
  .col-head b { font-size: 12.5px; font-weight: 600; }
  .col-head .cnt { margin-left: auto; color: var(--muted); font-size: 11.5px; }
  .col-drop { min-height: 60px; display: flex; flex-direction: column; gap: 8px; border-radius: var(--radius-sm); transition: background .12s; padding: 2px; }
  .col-drop.dragover { background: var(--hover); }
  .kcard { background: var(--bg); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 10px 11px; cursor: grab; }
  .kcard:active { cursor: grabbing; }
  .kcard .kdesc { font-size: 12.5px; line-height: 1.4; }
  .kcard .kmeta { display: flex; align-items: center; gap: 6px; margin-top: 8px; }
  .avatar { width: 18px; height: 18px; border-radius: 50%; background: var(--accent); color: var(--accent-fg); font-size: 9.5px; display: flex; align-items: center; justify-content: center; font-weight: 600; }

  /* ---------- Goals ---------- */
  .chart-box { background: var(--card); border: 1px solid var(--border); border-radius: var(--radius); padding: 18px; margin-bottom: 20px; }
  .goal-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 14px; }
  .goal-card { background: var(--card); border: 1px solid var(--border); border-radius: var(--radius); padding: 14px; }
  .goal-card .ghead { display: flex; align-items: flex-start; gap: 8px; }
  .goal-card .gtitle { font-weight: 600; flex: 1; }
  .goal-card .gdesc { color: var(--muted); font-size: 12px; margin-top: 4px; }
  .progress-track { height: 8px; border-radius: 4px; background: var(--hover); margin-top: 12px; overflow: hidden; }
  .progress-fill { height: 100%; background: linear-gradient(90deg, var(--accent), var(--low)); border-radius: 4px; transition: width .2s; }
  .goal-foot { display: flex; align-items: center; margin-top: 10px; gap: 8px; }
  .goal-foot input[type=range] { flex: 1; }
  .goal-foot .pct { font-size: 12px; font-weight: 600; width: 34px; text-align: right; }
  .deadline-badge { font-size: 11px; color: var(--muted); }

  /* ---------- Plans ---------- */
  .plan-card { background: var(--card); border: 1px solid var(--border); border-radius: var(--radius); padding: 14px 16px; margin-bottom: 12px; }
  .plan-head { display: flex; align-items: center; gap: 10px; cursor: pointer; }
  .plan-head .ptitle { font-weight: 600; flex: 1; }
  .plan-head .prange { font-size: 11.5px; color: var(--muted); }
  .chevron { width: 14px; height: 14px; transition: transform .15s; color: var(--muted); }
  .plan-card.open .chevron { transform: rotate(90deg); }
  .plan-body { display: none; margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border); }
  .plan-card.open .plan-body { display: block; }
  .step-row { display: flex; align-items: center; gap: 8px; padding: 5px 0; font-size: 12.5px; }
  .step-row .dot { width: 5px; height: 5px; border-radius: 50%; background: var(--accent); flex-shrink: 0; }
  .step-row .stext { flex: 1; }
  .step-add { display: flex; gap: 6px; margin-top: 8px; }
  .step-add input { flex: 1; }
  .timeline-row { display: flex; gap: 8px; margin-top: 10px; }
  .timeline-row input { flex: 1; }
  .timeline-row label { font-size: 11px; color: var(--muted); display: block; margin-bottom: 3px; }

  /* ---------- Modal ---------- */
  .overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.45); display: none; align-items: center; justify-content: center; z-index: 50; }
  .overlay.show { display: flex; animation: fadein .12s ease; }
  .modal { background: var(--card); border: 1px solid var(--border); border-radius: var(--radius); width: 480px; max-width: 92vw; max-height: 86vh; overflow-y: auto; box-shadow: var(--shadow); }
  .modal-head { display: flex; align-items: center; padding: 16px 18px; border-bottom: 1px solid var(--border); }
  .modal-head h3 { margin: 0; font-size: 14px; font-weight: 600; flex: 1; }
  .modal-body { padding: 18px; display: flex; flex-direction: column; gap: 12px; }
  .field label { display: block; font-size: 11.5px; color: var(--muted); margin-bottom: 5px; }
  .field input, .field textarea, .field select { width: 100%; }
  .field textarea { min-height: 90px; resize: vertical; }
  .field-row { display: flex; gap: 10px; }
  .field-row .field { flex: 1; }
  .modal-foot { display: flex; justify-content: flex-end; gap: 8px; padding: 14px 18px; border-top: 1px solid var(--border); }
  .md-preview { border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 10px; font-size: 12.5px; line-height: 1.6; max-height: 200px; overflow-y: auto; }
  .md-preview h1, .md-preview h2, .md-preview h3 { margin: 8px 0 4px; }
  .md-preview code { background: var(--hover); padding: 1px 5px; border-radius: 4px; }
  .tabs2 { display: flex; gap: 6px; margin-bottom: 6px; }
  .tabs2 button { background: transparent; border: 1px solid var(--border); color: var(--muted); padding: 4px 10px; border-radius: 999px; font-size: 11.5px; }
  .tabs2 button.active { background: var(--accent); color: var(--accent-fg); border-color: transparent; }

  .toast-wrap { position: fixed; bottom: 18px; right: 18px; display: flex; flex-direction: column; gap: 8px; z-index: 100; }
  .toast { background: var(--card); border: 1px solid var(--border); box-shadow: var(--shadow); padding: 10px 14px; border-radius: var(--radius-sm); font-size: 12.5px; animation: fadein .15s ease; }
</style>
</head>
<body>
<div class="app">
  <nav class="rail" id="rail"></nav>
  <div class="main">
    <div class="topbar">
      <h1 id="pageTitle">Hub</h1>
      <div class="searchbox">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input id="searchInput" type="text" placeholder="Search everything...">
      </div>
      <div class="top-actions">
        <button class="icon-btn" id="exportBtn" title="Export to .taskforge.json"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M5 21h14"/></svg></button>
        <button class="icon-btn" id="importBtn" title="Import from .taskforge.json"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 15V3"/><path d="M7 8l5-5 5 5"/><path d="M5 21h14"/></svg></button>
      </div>
    </div>
    <div class="content" id="content"></div>
  </div>
</div>
<div class="overlay" id="overlay"><div class="modal" id="modal"></div></div>
<div class="toast-wrap" id="toastWrap"></div>

<script nonce="${nonce}">
(function () {
  var vscode = acquireVsCodeApi();

  var ICONS = {
    home: '<path d="M3 11 12 4 21 11"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/>',
    check: '<polyline points="4 12 9 17 20 6"/>',
    note: '<rect x="5" y="3" width="14" height="18" rx="2"/><line x1="8" y1="8" x2="16" y2="8"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="8" y1="16" x2="13" y2="16"/>',
    kanban: '<rect x="3" y="4" width="5" height="16" rx="1"/><rect x="9.5" y="4" width="5" height="10" rx="1"/><rect x="16" y="4" width="5" height="13" rx="1"/>',
    target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="8" y1="3" x2="8" y2="7"/><line x1="16" y1="3" x2="16" y2="7"/>',
    plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
    trash: '<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
    pin: '<path d="M12 2 12 9"/><circle cx="12" cy="13" r="5"/>',
    chevron: '<polyline points="9 6 15 12 9 18"/>',
    grip: '<circle cx="9" cy="6" r="1"/><circle cx="15" cy="6" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="18" r="1"/><circle cx="15" cy="18" r="1"/>'
  };
  function icon(name, cls) {
    return '<svg class="' + (cls || '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + ICONS[name] + '</svg>';
  }

  var STATE = { todos: [], notes: [], tasks: [], goals: [], plans: [] };
  var UI = {
    view: 'hub',
    search: '',
    todoFilter: 'all',
    editingNoteId: null,
    notePreview: false,
    openPlanIds: {}
  };

  var NAV = [
    { id: 'hub', label: 'Hub', icon: 'home' },
    { id: 'todos', label: 'Todos', icon: 'check' },
    { id: 'notes', label: 'Notes', icon: 'note' },
    { id: 'tasks', label: 'Tasks', icon: 'kanban' },
    { id: 'goals', label: 'Goals', icon: 'target' },
    { id: 'plans', label: 'Plans', icon: 'calendar' }
  ];

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function mdToHtml(src) {
    var text = escapeHtml(src || '');
    text = text.replace(/^### (.*)$/gm, '<h3>$1</h3>')
               .replace(/^## (.*)$/gm, '<h2>$1</h2>')
               .replace(/^# (.*)$/gm, '<h1>$1</h1>')
               .replace(/\\*\\*(.+?)\\*\\*/g, '<b>$1</b>')
               .replace(/\\*(.+?)\\*/g, '<i>$1</i>')
               .replace(/\`(.+?)\`/g, '<code>$1</code>')
               .replace(/^- (.*)$/gm, '&bull; $1<br>')
               .replace(/\\n/g, '<br>');
    return text;
  }

  function fmtDate(d) {
    if (!d) return '';
    var dt = new Date(d);
    if (isNaN(dt.getTime())) return '';
    return dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  function daysUntil(d) {
    if (!d) return null;
    var dt = new Date(d);
    if (isNaN(dt.getTime())) return null;
    var diff = Math.ceil((dt.getTime() - Date.now()) / 86400000);
    return diff;
  }

  function toast(msg) {
    var wrap = document.getElementById('toastWrap');
    var el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    wrap.appendChild(el);
    setTimeout(function () { el.remove(); }, 2600);
  }

  // ---------------- Rail ----------------
  function renderRail() {
    var rail = document.getElementById('rail');
    var html = '<div class="rail-logo">🛠️</div>';
    NAV.forEach(function (n) {
      html += '<button class="rail-btn ' + (UI.view === n.id ? 'active' : '') + '" data-nav="' + n.id + '">' + icon(n.icon) + '<span>' + n.label + '</span></button>';
    });
    rail.innerHTML = html;
    Array.prototype.forEach.call(rail.querySelectorAll('[data-nav]'), function (btn) {
      btn.addEventListener('click', function () { setView(btn.getAttribute('data-nav')); });
    });
  }

  function setView(v) {
    UI.view = v;
    var titles = { hub: 'Hub', todos: 'Todos', notes: 'Notes', tasks: 'Tasks · Kanban', goals: 'Goals', plans: 'Plans' };
    document.getElementById('pageTitle').textContent = titles[v] || v;
    renderRail();
    render();
  }

  // ---------------- Render dispatcher ----------------
  function render() {
    var c = document.getElementById('content');
    if (UI.view === 'hub') c.innerHTML = renderHub();
    else if (UI.view === 'todos') c.innerHTML = renderTodos();
    else if (UI.view === 'notes') c.innerHTML = renderNotes();
    else if (UI.view === 'tasks') c.innerHTML = renderTasks();
    else if (UI.view === 'goals') c.innerHTML = renderGoals();
    else if (UI.view === 'plans') c.innerHTML = renderPlans();
    bindViewEvents();
  }

  // ---------------- Hub ----------------
  function renderHub() {
    var openTodos = STATE.todos.filter(function (t) { return !t.completed; }).length;
    var doneTasks = STATE.tasks.filter(function (t) { return t.status === 'done'; }).length;
    var avgGoal = STATE.goals.length ? Math.round(STATE.goals.reduce(function (a, g) { return a + g.progress; }, 0) / STATE.goals.length) : 0;

    var stats = '<div class="stat-grid">' +
      statCard(String(openTodos), 'Open Todos', STATE.todos.length ? Math.round(100 * openTodos / STATE.todos.length) : 0) +
      statCard(String(STATE.notes.length), 'Notes', null) +
      statCard(doneTasks + '/' + STATE.tasks.length, 'Tasks Done', STATE.tasks.length ? Math.round(100 * doneTasks / STATE.tasks.length) : 0) +
      statCard(avgGoal + '%', 'Avg Goal Progress', avgGoal) +
      statCard(String(STATE.plans.length), 'Active Plans', null) +
      '</div>';

    var allItems = []
      .concat(STATE.todos.map(function (i) { return { t: 'todos', label: i.text, at: i.updatedAt }; }))
      .concat(STATE.notes.map(function (i) { return { t: 'notes', label: i.title, at: i.updatedAt }; }))
      .concat(STATE.tasks.map(function (i) { return { t: 'tasks', label: i.description, at: i.updatedAt }; }))
      .concat(STATE.goals.map(function (i) { return { t: 'goals', label: i.title, at: i.updatedAt }; }))
      .concat(STATE.plans.map(function (i) { return { t: 'plans', label: i.title, at: i.updatedAt }; }));
    allItems.sort(function (a, b) { return new Date(b.at).getTime() - new Date(a.at).getTime(); });
    allItems = allItems.slice(0, 8);

    var activity = allItems.length ? allItems.map(function (i) {
      return '<div class="activity-row"><span class="tag">' + i.t + '</span><span>' + escapeHtml(i.label || 'Untitled') + '</span></div>';
    }).join('') : '<div class="empty-state" style="padding:20px;">Nothing yet — add your first item!</div>';

    var quickAdd = '<div class="quick-add-grid">' +
      qa('todos', 'check', 'Quick Todo') + qa('notes', 'note', 'Quick Note') +
      qa('tasks', 'kanban', 'Quick Task') + qa('goals', 'target', 'Quick Goal') +
      '</div>';

    return stats + '<div class="hub-grid">' +
      '<div class="panel-box"><h3>Recent Activity</h3>' + activity + '</div>' +
      '<div class="panel-box"><h3>Quick Add</h3>' + quickAdd + '</div>' +
      '</div>';
  }

  function statCard(n, l, pct) {
    var bar = pct !== null ? '<div class="bar"><i style="width:' + pct + '%"></i></div>' : '';
    return '<div class="stat-card"><div class="n">' + n + '</div><div class="l">' + l + '</div>' + bar + '</div>';
  }

  function qa(view, ic, label) {
    return '<button data-qa="' + view + '">' + icon(ic) + '<span>' + label + '</span></button>';
  }

  // ---------------- Todos ----------------
  function renderTodos() {
    var filtered = STATE.todos.filter(function (t) {
      if (UI.todoFilter !== 'all' && UI.todoFilter !== t.priority) return false;
      if (UI.search && t.text.toLowerCase().indexOf(UI.search.toLowerCase()) === -1) return false;
      return true;
    });
    var prioColor = { high: 'var(--high)', medium: 'var(--medium)', low: 'var(--low)' };

    var rows = filtered.length ? filtered.map(function (t) {
      var due = t.dueDate ? '<span class="due-badge">' + fmtDate(t.dueDate) + '</span>' : '';
      return '<div class="todo-item ' + (t.completed ? 'completed' : '') + '" data-id="' + t.id + '">' +
        '<div class="checkbox ' + (t.completed ? 'checked' : '') + '" data-toggle-todo="' + t.id + '">' + (t.completed ? icon('check') : '') + '</div>' +
        '<span class="prio-dot" style="background:' + prioColor[t.priority] + '"></span>' +
        '<span class="text">' + escapeHtml(t.text) + '</span>' + due +
        '<div class="row-actions"><button class="mini-btn" data-del-todo="' + t.id + '">' + icon('trash') + '</button></div>' +
        '</div>';
    }).join('') : emptyState('check', 'No todos match. Add one above!');

    return '<div class="add-row">' +
      '<input type="text" id="newTodoText" placeholder="What needs doing?">' +
      '<select id="newTodoPriority"><option value="low">Low</option><option value="medium" selected>Medium</option><option value="high">High</option></select>' +
      '<input type="date" id="newTodoDue">' +
      '<button class="btn" id="addTodoBtn">' + icon('plus') + 'Add</button>' +
      '</div>' +
      '<div class="section-head"><span class="count">' + filtered.length + ' shown</span><div class="filler"></div><div class="chips">' +
      ['all', 'high', 'medium', 'low'].map(function (f) { return '<button class="chip ' + (UI.todoFilter === f ? 'active' : '') + '" data-filter="' + f + '">' + f + '</button>'; }).join('') +
      '</div></div>' +
      '<div class="list">' + rows + '</div>';
  }

  function emptyState(ic, msg) {
    return '<div class="empty-state">' + icon(ic) + '<div>' + msg + '</div></div>';
  }

  // ---------------- Notes ----------------
  function renderNotes() {
    var notes = STATE.notes.filter(function (n) {
      if (!UI.search) return true;
      var q = UI.search.toLowerCase();
      return (n.title || '').toLowerCase().indexOf(q) !== -1 || (n.content || '').toLowerCase().indexOf(q) !== -1;
    });
    notes = notes.slice().sort(function (a, b) { return (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0); });

    var cards = notes.length ? notes.map(function (n) {
      var tags = (n.tags || []).map(function (t) { return '<span class="tag-pill">' + escapeHtml(t) + '</span>'; }).join('');
      return '<div class="note-card" data-open-note="' + n.id + '">' +
        '<div class="nhead">' + (n.pinned ? icon('pin', 'pin-icon') : '') +
        '<div class="ntitle">' + escapeHtml(n.title || 'Untitled') + '</div>' +
        '<div class="row-actions"><button class="mini-btn" data-del-note="' + n.id + '">' + icon('trash') + '</button></div>' +
        '</div>' +
        '<div class="nbody">' + escapeHtml((n.content || '').slice(0, 220)) + '</div>' +
        (tags ? '<div class="ntags">' + tags + '</div>' : '') +
        '</div>';
    }).join('') : emptyState('note', 'No notes yet — capture your first idea!');

    return '<div class="section-head"><h2>All Notes</h2><span class="count">' + notes.length + '</span><div class="filler"></div>' +
      '<button class="btn" id="addNoteBtn">' + icon('plus') + 'New Note</button></div>' +
      '<div class="note-grid">' + cards + '</div>';
  }

  // ---------------- Tasks / Kanban ----------------
  function renderTasks() {
    var cols = [
      { id: 'todo', label: 'To Do', color: 'var(--muted)' },
      { id: 'in-progress', label: 'In Progress', color: 'var(--accent)' },
      { id: 'done', label: 'Done', color: 'var(--low)' }
    ];
    var search = UI.search.toLowerCase();
    var tasks = STATE.tasks.filter(function (t) { return !search || t.description.toLowerCase().indexOf(search) !== -1; });

    var board = cols.map(function (col) {
      var items = tasks.filter(function (t) { return t.status === col.id; });
      var cards = items.map(function (t) {
        var initials = t.assignee ? t.assignee.slice(0, 2).toUpperCase() : '';
        return '<div class="kcard" draggable="true" data-task-id="' + t.id + '" data-open-task="' + t.id + '">' +
          '<div class="kdesc">' + escapeHtml(t.description) + '</div>' +
          '<div class="kmeta">' + (initials ? '<div class="avatar">' + initials + '</div>' : '') +
          (t.dependencies && t.dependencies.length ? '<span class="due-badge">' + t.dependencies.length + ' dep</span>' : '') +
          '</div></div>';
      }).join('');
      return '<div class="col" data-col="' + col.id + '">' +
        '<div class="col-head"><span class="col-dot" style="background:' + col.color + '"></span><b>' + col.label + '</b><span class="cnt">' + items.length + '</span></div>' +
        '<div class="col-drop" data-dropzone="' + col.id + '">' + cards + '</div>' +
        '</div>';
    }).join('');

    return '<div class="section-head"><h2>Board</h2><span class="count">' + tasks.length + ' tasks</span><div class="filler"></div>' +
      '<button class="btn" id="addTaskBtn">' + icon('plus') + 'New Task</button></div>' +
      '<div class="board">' + board + '</div>';
  }

  // ---------------- Goals ----------------
  function renderGoals() {
    var goals = STATE.goals;
    var chart = renderBarChart(goals);
    var cards = goals.length ? goals.map(function (g) {
      var du = daysUntil(g.deadline);
      var deadlineTxt = g.deadline ? (du === null ? '' : (du < 0 ? 'Overdue' : du === 0 ? 'Due today' : du + 'd left')) : '';
      return '<div class="goal-card" data-id="' + g.id + '">' +
        '<div class="ghead"><div class="gtitle">' + escapeHtml(g.title) + '</div>' +
        '<div class="row-actions"><button class="mini-btn" data-del-goal="' + g.id + '">' + icon('trash') + '</button></div></div>' +
        (g.description ? '<div class="gdesc">' + escapeHtml(g.description) + '</div>' : '') +
        '<div class="progress-track"><div class="progress-fill" style="width:' + g.progress + '%"></div></div>' +
        '<div class="goal-foot"><input type="range" min="0" max="100" value="' + g.progress + '" data-goal-slider="' + g.id + '"><span class="pct">' + g.progress + '%</span></div>' +
        (deadlineTxt ? '<div class="deadline-badge">' + deadlineTxt + '</div>' : '') +
        '</div>';
    }).join('') : emptyState('target', 'No goals yet — set your first target!');

    return '<div class="section-head"><h2>Goals</h2><span class="count">' + goals.length + '</span><div class="filler"></div>' +
      '<button class="btn" id="addGoalBtn">' + icon('plus') + 'New Goal</button></div>' +
      (goals.length ? '<div class="chart-box">' + chart + '</div>' : '') +
      '<div class="goal-grid">' + cards + '</div>';
  }

  function renderBarChart(goals) {
    if (!goals.length) return '';
    var w = 640, h = 180, pad = 28;
    var bw = Math.min(56, (w - pad * 2) / goals.length - 12);
    var bars = '';
    goals.forEach(function (g, i) {
      var x = pad + i * ((w - pad * 2) / goals.length) + 6;
      var bh = (g.progress / 100) * (h - 40);
      var y = h - 24 - bh;
      bars += '<rect x="' + x + '" y="' + y + '" width="' + bw + '" height="' + bh + '" rx="4" fill="var(--accent)" opacity="0.85"><title>' + escapeHtml(g.title) + ': ' + g.progress + '%</title></rect>';
      bars += '<text x="' + (x + bw / 2) + '" y="' + (h - 8) + '" font-size="9.5" fill="var(--muted)" text-anchor="middle">' + escapeHtml((g.title || '').slice(0, 10)) + '</text>';
      bars += '<text x="' + (x + bw / 2) + '" y="' + (y - 5) + '" font-size="10" fill="var(--fg)" text-anchor="middle">' + g.progress + '%</text>';
    });
    return '<svg viewBox="0 0 ' + w + ' ' + h + '" style="width:100%;height:170px;"><line x1="' + pad + '" y1="' + (h - 24) + '" x2="' + (w - 8) + '" y2="' + (h - 24) + '" stroke="var(--border)"/>' + bars + '</svg>';
  }

  // ---------------- Plans ----------------
  function renderPlans() {
    var plans = STATE.plans;
    var cards = plans.length ? plans.map(function (p) {
      var open = !!UI.openPlanIds[p.id];
      var steps = (p.steps || []).map(function (s, idx) {
        return '<div class="step-row"><span class="dot"></span><span class="stext">' + escapeHtml(s) + '</span>' +
          '<button class="mini-btn" data-del-step="' + p.id + '|' + idx + '">' + icon('trash') + '</button></div>';
      }).join('');
      return '<div class="plan-card ' + (open ? 'open' : '') + '" data-id="' + p.id + '">' +
        '<div class="plan-head" data-toggle-plan="' + p.id + '">' + icon('chevron', 'chevron') +
        '<div class="ptitle">' + escapeHtml(p.title) + '</div>' +
        '<div class="prange">' + (p.timeline && p.timeline.start ? fmtDate(p.timeline.start) + ' → ' + fmtDate(p.timeline.end) : 'No dates set') + '</div>' +
        '<div class="row-actions"><button class="mini-btn" data-del-plan="' + p.id + '">' + icon('trash') + '</button></div>' +
        '</div>' +
        '<div class="plan-body">' +
        '<div class="timeline-row"><div class="field"><label>Start</label><input type="date" data-plan-start="' + p.id + '" value="' + (p.timeline ? p.timeline.start : '') + '"></div>' +
        '<div class="field"><label>End</label><input type="date" data-plan-end="' + p.id + '" value="' + (p.timeline ? p.timeline.end : '') + '"></div></div>' +
        steps +
        '<div class="step-add"><input type="text" placeholder="Add a step..." data-step-input="' + p.id + '"><button class="btn secondary" data-add-step="' + p.id + '">Add</button></div>' +
        '</div></div>';
    }).join('') : emptyState('calendar', 'No plans yet — map out your next milestone!');

    return '<div class="section-head"><h2>Plans</h2><span class="count">' + plans.length + '</span><div class="filler"></div>' +
      '<button class="btn" id="addPlanBtn">' + icon('plus') + 'New Plan</button></div>' + cards;
  }

  // ---------------- Modal helpers ----------------
  function openModal(title, bodyHtml, footHtml) {
    document.getElementById('modal').innerHTML =
      '<div class="modal-head"><h3>' + title + '</h3><button class="mini-btn" id="modalClose">' + icon('trash') + '</button></div>' +
      '<div class="modal-body">' + bodyHtml + '</div>' +
      '<div class="modal-foot">' + footHtml + '</div>';
    document.getElementById('modal').querySelector('#modalClose').innerHTML = '&times;';
    document.getElementById('modal').querySelector('#modalClose').style.fontSize = '18px';
    document.getElementById('overlay').classList.add('show');
    document.getElementById('modal').querySelector('#modalClose').addEventListener('click', closeModal);
  }
  function closeModal() {
    document.getElementById('overlay').classList.remove('show');
  }
  document.getElementById('overlay').addEventListener('click', function (e) {
    if (e.target.id === 'overlay') closeModal();
  });

  function openNoteEditor(id) {
    var note = STATE.notes.find(function (n) { return n.id === id; }) || { title: '', content: '', tags: [], pinned: false };
    UI.notePreview = false;
    var body =
      '<div class="field"><label>Title</label><input type="text" id="mNoteTitle" value="' + escapeHtml(note.title) + '" placeholder="Note title"></div>' +
      '<div class="tabs2"><button class="active" data-note-tab="write">Write</button><button data-note-tab="preview">Preview</button></div>' +
      '<div class="field" id="mNoteWriteWrap"><textarea id="mNoteContent" placeholder="Write in markdown...">' + escapeHtml(note.content) + '</textarea></div>' +
      '<div class="md-preview" id="mNotePreview" style="display:none;"></div>' +
      '<div class="field"><label>Tags (comma separated)</label><input type="text" id="mNoteTags" value="' + escapeHtml((note.tags || []).join(', ')) + '"></div>' +
      '<label style="display:flex;align-items:center;gap:8px;font-size:12.5px;"><input type="checkbox" id="mNotePinned" ' + (note.pinned ? 'checked' : '') + ' style="width:auto;"> Pinned</label>';
    var foot = (id ? '<button class="btn danger" id="mNoteDelete">Delete</button>' : '') +
      '<button class="btn secondary" id="mNoteCancel">Cancel</button><button class="btn" id="mNoteSave">Save</button>';
    openModal(id ? 'Edit Note' : 'New Note', body, foot);

    document.getElementById('mNoteCancel').addEventListener('click', closeModal);
    if (id) document.getElementById('mNoteDelete').addEventListener('click', function () {
      vscode.postMessage({ type: 'deleteNote', id: id });
      closeModal();
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-note-tab]'), function (btn) {
      btn.addEventListener('click', function () {
        var tab = btn.getAttribute('data-note-tab');
        Array.prototype.forEach.call(document.querySelectorAll('[data-note-tab]'), function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        var write = document.getElementById('mNoteWriteWrap');
        var preview = document.getElementById('mNotePreview');
        if (tab === 'preview') {
          preview.innerHTML = mdToHtml(document.getElementById('mNoteContent').value);
          write.style.display = 'none'; preview.style.display = 'block';
        } else {
          write.style.display = 'block'; preview.style.display = 'none';
        }
      });
    });
    document.getElementById('mNoteSave').addEventListener('click', function () {
      var title = document.getElementById('mNoteTitle').value.trim() || 'Untitled';
      var content = document.getElementById('mNoteContent').value;
      var tags = document.getElementById('mNoteTags').value.split(',').map(function (t) { return t.trim(); }).filter(Boolean);
      var pinned = document.getElementById('mNotePinned').checked;
      if (id) vscode.postMessage({ type: 'updateNote', id: id, patch: { title: title, content: content, tags: tags, pinned: pinned } });
      else vscode.postMessage({ type: 'addNote', title: title, content: content, tags: tags });
      closeModal();
    });
  }

  function openTaskEditor(id) {
    var task = STATE.tasks.find(function (t) { return t.id === id; }) || { description: '', status: 'todo', assignee: '', dependencies: [] };
    var body =
      '<div class="field"><label>Description</label><textarea id="mTaskDesc" placeholder="What needs to happen?">' + escapeHtml(task.description) + '</textarea></div>' +
      '<div class="field-row"><div class="field"><label>Status</label><select id="mTaskStatus">' +
      ['todo', 'in-progress', 'done'].map(function (s) { return '<option value="' + s + '" ' + (task.status === s ? 'selected' : '') + '>' + s + '</option>'; }).join('') +
      '</select></div><div class="field"><label>Assignee</label><input type="text" id="mTaskAssignee" value="' + escapeHtml(task.assignee || '') + '"></div></div>' +
      '<div class="field"><label>Dependencies (comma separated)</label><input type="text" id="mTaskDeps" value="' + escapeHtml((task.dependencies || []).join(', ')) + '"></div>';
    var foot = (id ? '<button class="btn danger" id="mTaskDelete">Delete</button>' : '') +
      '<button class="btn secondary" id="mTaskCancel">Cancel</button><button class="btn" id="mTaskSave">Save</button>';
    openModal(id ? 'Edit Task' : 'New Task', body, foot);
    document.getElementById('mTaskCancel').addEventListener('click', closeModal);
    if (id) document.getElementById('mTaskDelete').addEventListener('click', function () {
      vscode.postMessage({ type: 'deleteTask', id: id }); closeModal();
    });
    document.getElementById('mTaskSave').addEventListener('click', function () {
      var description = document.getElementById('mTaskDesc').value.trim();
      if (!description) return;
      var status = document.getElementById('mTaskStatus').value;
      var assignee = document.getElementById('mTaskAssignee').value.trim();
      var deps = document.getElementById('mTaskDeps').value.split(',').map(function (t) { return t.trim(); }).filter(Boolean);
      if (id) vscode.postMessage({ type: 'updateTask', id: id, patch: { description: description, status: status, assignee: assignee, dependencies: deps } });
      else vscode.postMessage({ type: 'addTask', description: description, assignee: assignee });
      closeModal();
    });
  }

  function openGoalEditor() {
    var body =
      '<div class="field"><label>Title</label><input type="text" id="mGoalTitle" placeholder="What are you aiming for?"></div>' +
      '<div class="field"><label>Description</label><textarea id="mGoalDesc"></textarea></div>' +
      '<div class="field"><label>Deadline</label><input type="date" id="mGoalDeadline"></div>';
    var foot = '<button class="btn secondary" id="mGoalCancel">Cancel</button><button class="btn" id="mGoalSave">Create</button>';
    openModal('New Goal', body, foot);
    document.getElementById('mGoalCancel').addEventListener('click', closeModal);
    document.getElementById('mGoalSave').addEventListener('click', function () {
      var title = document.getElementById('mGoalTitle').value.trim();
      if (!title) return;
      var description = document.getElementById('mGoalDesc').value.trim();
      var deadline = document.getElementById('mGoalDeadline').value;
      vscode.postMessage({ type: 'addGoal', title: title, description: description, deadline: deadline });
      closeModal();
    });
  }

  function openPlanEditor() {
    var body = '<div class="field"><label>Title</label><input type="text" id="mPlanTitle" placeholder="Plan name"></div>' +
      '<div class="field-row"><div class="field"><label>Start</label><input type="date" id="mPlanStart"></div><div class="field"><label>End</label><input type="date" id="mPlanEnd"></div></div>';
    var foot = '<button class="btn secondary" id="mPlanCancel">Cancel</button><button class="btn" id="mPlanSave">Create</button>';
    openModal('New Plan', body, foot);
    document.getElementById('mPlanCancel').addEventListener('click', closeModal);
    document.getElementById('mPlanSave').addEventListener('click', function () {
      var title = document.getElementById('mPlanTitle').value.trim();
      if (!title) return;
      var start = document.getElementById('mPlanStart').value;
      var end = document.getElementById('mPlanEnd').value;
      vscode.postMessage({ type: 'addPlan', title: title, start: start, end: end });
      closeModal();
    });
  }

  // ---------------- Event binding per view ----------------
  function bindViewEvents() {
    var c = document.getElementById('content');

    // Todos
    var addTodoBtn = document.getElementById('addTodoBtn');
    if (addTodoBtn) addTodoBtn.addEventListener('click', function () {
      var text = document.getElementById('newTodoText').value.trim();
      if (!text) return;
      var priority = document.getElementById('newTodoPriority').value;
      var due = document.getElementById('newTodoDue').value;
      vscode.postMessage({ type: 'addTodo', text: text, priority: priority, dueDate: due || undefined });
      document.getElementById('newTodoText').value = '';
    });
    var newTodoText = document.getElementById('newTodoText');
    if (newTodoText) newTodoText.addEventListener('keydown', function (e) { if (e.key === 'Enter') addTodoBtn.click(); });
    Array.prototype.forEach.call(c.querySelectorAll('[data-toggle-todo]'), function (el) {
      el.addEventListener('click', function () { vscode.postMessage({ type: 'toggleTodo', id: el.getAttribute('data-toggle-todo') }); });
    });
    Array.prototype.forEach.call(c.querySelectorAll('[data-del-todo]'), function (el) {
      el.addEventListener('click', function (e) { e.stopPropagation(); vscode.postMessage({ type: 'deleteTodo', id: el.getAttribute('data-del-todo') }); });
    });
    Array.prototype.forEach.call(c.querySelectorAll('[data-filter]'), function (el) {
      el.addEventListener('click', function () { UI.todoFilter = el.getAttribute('data-filter'); render(); });
    });

    // Notes
    var addNoteBtn = document.getElementById('addNoteBtn');
    if (addNoteBtn) addNoteBtn.addEventListener('click', function () { openNoteEditor(null); });
    Array.prototype.forEach.call(c.querySelectorAll('[data-open-note]'), function (el) {
      el.addEventListener('click', function () { openNoteEditor(el.getAttribute('data-open-note')); });
    });
    Array.prototype.forEach.call(c.querySelectorAll('[data-del-note]'), function (el) {
      el.addEventListener('click', function (e) { e.stopPropagation(); vscode.postMessage({ type: 'deleteNote', id: el.getAttribute('data-del-note') }); });
    });

    // Tasks
    var addTaskBtn = document.getElementById('addTaskBtn');
    if (addTaskBtn) addTaskBtn.addEventListener('click', function () { openTaskEditor(null); });
    Array.prototype.forEach.call(c.querySelectorAll('[data-open-task]'), function (el) {
      el.addEventListener('click', function () { openTaskEditor(el.getAttribute('data-open-task')); });
    });
    bindDragDrop(c);

    // Goals
    var addGoalBtn = document.getElementById('addGoalBtn');
    if (addGoalBtn) addGoalBtn.addEventListener('click', openGoalEditor);
    Array.prototype.forEach.call(c.querySelectorAll('[data-del-goal]'), function (el) {
      el.addEventListener('click', function (e) { e.stopPropagation(); vscode.postMessage({ type: 'deleteGoal', id: el.getAttribute('data-del-goal') }); });
    });
    Array.prototype.forEach.call(c.querySelectorAll('[data-goal-slider]'), function (el) {
      el.addEventListener('input', function () {
        el.parentElement.querySelector('.pct').textContent = el.value + '%';
      });
      el.addEventListener('change', function () {
        vscode.postMessage({ type: 'updateGoal', id: el.getAttribute('data-goal-slider'), patch: { progress: parseInt(el.value, 10) } });
      });
    });

    // Plans
    var addPlanBtn = document.getElementById('addPlanBtn');
    if (addPlanBtn) addPlanBtn.addEventListener('click', openPlanEditor);
    Array.prototype.forEach.call(c.querySelectorAll('[data-toggle-plan]'), function (el) {
      el.addEventListener('click', function () {
        var id = el.getAttribute('data-toggle-plan');
        UI.openPlanIds[id] = !UI.openPlanIds[id];
        render();
      });
    });
    Array.prototype.forEach.call(c.querySelectorAll('[data-del-plan]'), function (el) {
      el.addEventListener('click', function (e) { e.stopPropagation(); vscode.postMessage({ type: 'deletePlan', id: el.getAttribute('data-del-plan') }); });
    });
    Array.prototype.forEach.call(c.querySelectorAll('[data-del-step]'), function (el) {
      el.addEventListener('click', function (e) {
        e.stopPropagation();
        var parts = el.getAttribute('data-del-step').split('|');
        vscode.postMessage({ type: 'removePlanStep', id: parts[0], stepIndex: parseInt(parts[1], 10) });
      });
    });
    Array.prototype.forEach.call(c.querySelectorAll('[data-add-step]'), function (el) {
      el.addEventListener('click', function () {
        var id = el.getAttribute('data-add-step');
        var input = c.querySelector('[data-step-input="' + id + '"]');
        var val = input.value.trim();
        if (val) { vscode.postMessage({ type: 'addPlanStep', id: id, step: val }); input.value = ''; }
      });
    });
    Array.prototype.forEach.call(c.querySelectorAll('[data-plan-start]'), function (el) {
      el.addEventListener('change', function () {
        var id = el.getAttribute('data-plan-start');
        var endEl = c.querySelector('[data-plan-end="' + id + '"]');
        vscode.postMessage({ type: 'updatePlan', id: id, patch: { timeline: { start: el.value, end: endEl ? endEl.value : '' } } });
      });
    });
    Array.prototype.forEach.call(c.querySelectorAll('[data-plan-end]'), function (el) {
      el.addEventListener('change', function () {
        var id = el.getAttribute('data-plan-end');
        var startEl = c.querySelector('[data-plan-start="' + id + '"]');
        vscode.postMessage({ type: 'updatePlan', id: id, patch: { timeline: { start: startEl ? startEl.value : '', end: el.value } } });
      });
    });

    // Hub quick add
    Array.prototype.forEach.call(c.querySelectorAll('[data-qa]'), function (el) {
      el.addEventListener('click', function () {
        var target = el.getAttribute('data-qa');
        setView(target);
        setTimeout(function () {
          if (target === 'notes') openNoteEditor(null);
          else if (target === 'tasks') openTaskEditor(null);
          else if (target === 'goals') openGoalEditor();
          else if (target === 'todos') { var t = document.getElementById('newTodoText'); if (t) t.focus(); }
        }, 30);
      });
    });
  }

  function bindDragDrop(root) {
    var dragId = null;
    Array.prototype.forEach.call(root.querySelectorAll('.kcard'), function (card) {
      card.addEventListener('dragstart', function (e) {
        dragId = card.getAttribute('data-task-id');
        e.dataTransfer.setData('text/plain', dragId);
      });
    });
    Array.prototype.forEach.call(root.querySelectorAll('[data-dropzone]'), function (zone) {
      zone.addEventListener('dragover', function (e) { e.preventDefault(); zone.classList.add('dragover'); });
      zone.addEventListener('dragleave', function () { zone.classList.remove('dragover'); });
      zone.addEventListener('drop', function (e) {
        e.preventDefault();
        zone.classList.remove('dragover');
        var id = e.dataTransfer.getData('text/plain') || dragId;
        var status = zone.getAttribute('data-dropzone');
        if (id) vscode.postMessage({ type: 'updateTask', id: id, patch: { status: status } });
      });
    });
  }

  // ---------------- Global bindings ----------------
  document.getElementById('searchInput').addEventListener('input', function (e) {
    UI.search = e.target.value;
    render();
  });
  document.getElementById('exportBtn').addEventListener('click', function () { vscode.postMessage({ type: 'exportToGit' }); });
  document.getElementById('importBtn').addEventListener('click', function () { vscode.postMessage({ type: 'importFromGit' }); });

  window.addEventListener('message', function (event) {
    var msg = event.data;
    if (msg.type === 'state') {
      STATE = msg.data;
      render();
    } else if (msg.type === 'toast') {
      toast(msg.message);
    }
  });

  renderRail();
  render();
  vscode.postMessage({ type: 'ready' });
})();
</script>
</body>
</html>`;
}
