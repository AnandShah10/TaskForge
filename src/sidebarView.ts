import * as vscode from 'vscode';
import { StateManager } from './stateManager';

function getNonce(): string {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

export class TaskForgeSidebarProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'taskForgeSidebar';
  private view?: vscode.WebviewView;

  constructor(private state: StateManager) {}

  resolveWebviewView(webviewView: vscode.WebviewView) {
    this.view = webviewView;
    webviewView.webview.options = { enableScripts: true };
    const nonce = getNonce();
    webviewView.webview.html = this.getHtml(nonce);

    webviewView.webview.onDidReceiveMessage(async (message) => {
      if (message.type === 'openPanel') {
        vscode.commands.executeCommand('taskForge.open');
      } else if (message.type === 'quickAddTodo') {
        if (message.text) {
          await this.state.addTodo(message.text, 'medium');
          this.refresh();
        }
      }
    });

    this.refresh();
  }

  public refresh() {
    if (!this.view) return;
    const all = this.state.getAll();
    this.view.webview.postMessage({
      type: 'stats',
      data: {
        todos: all.todos.filter(t => !t.completed).length,
        notes: all.notes.length,
        tasks: all.tasks.filter(t => t.status !== 'done').length,
        goals: all.goals.length,
        plans: all.plans.length
      }
    });
  }

  private getHtml(nonce: string): string {
    return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
<style>
  body { font-family: var(--vscode-font-family); color: var(--vscode-foreground); padding: 14px 12px; margin: 0; }
  .logo { font-size: 26px; text-align: center; margin-bottom: 6px; }
  h2 { font-size: 13px; text-align: center; margin: 0 0 14px; }
  .launch { display: block; width: 100%; padding: 10px; background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; border-radius: 8px; font-weight: 600; font-size: 12.5px; cursor: pointer; margin-bottom: 14px; }
  .launch:hover { background: var(--vscode-button-hoverBackground); }
  .stats { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 16px; }
  .stat { background: var(--vscode-sideBarSectionHeader-background, rgba(128,128,128,0.08)); border: 1px solid var(--vscode-panel-border, rgba(128,128,128,0.2)); border-radius: 8px; padding: 8px; text-align: center; }
  .stat .n { font-size: 17px; font-weight: 700; }
  .stat .l { font-size: 10px; color: var(--vscode-descriptionForeground); margin-top: 2px; }
  .quick { display: flex; gap: 6px; }
  .quick input { flex: 1; padding: 6px 8px; border-radius: 6px; border: 1px solid var(--vscode-input-border, transparent); background: var(--vscode-input-background); color: var(--vscode-input-foreground); font-size: 12px; }
  .quick button { padding: 6px 10px; border-radius: 6px; border: none; background: var(--vscode-button-secondaryBackground, rgba(128,128,128,0.2)); color: var(--vscode-button-secondaryForeground, var(--vscode-foreground)); font-size: 12px; }
  .hint { font-size: 10.5px; color: var(--vscode-descriptionForeground); text-align: center; margin-top: 14px; }
</style>
</head>
<body>
  <div class="logo">🛠️</div>
  <h2>TaskForge</h2>
  <button class="launch" id="launchBtn">Open TaskForge</button>
  <div class="stats" id="stats"></div>
  <div class="quick">
    <input id="quickTodo" type="text" placeholder="Quick todo...">
    <button id="quickAddBtn">Add</button>
  </div>
  <div class="hint">Full board, notes &amp; charts open in a tab.</div>
<script nonce="${nonce}">
  var vscode = acquireVsCodeApi();
  document.getElementById('launchBtn').addEventListener('click', function () {
    vscode.postMessage({ type: 'openPanel' });
  });
  document.getElementById('quickAddBtn').addEventListener('click', addIt);
  document.getElementById('quickTodo').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') addIt();
  });
  function addIt() {
    var input = document.getElementById('quickTodo');
    var text = input.value.trim();
    if (!text) return;
    vscode.postMessage({ type: 'quickAddTodo', text: text });
    input.value = '';
  }
  window.addEventListener('message', function (event) {
    var msg = event.data;
    if (msg.type === 'stats') {
      var d = msg.data;
      var items = [
        [d.todos, 'Todos'], [d.notes, 'Notes'], [d.tasks, 'Tasks'], [d.goals, 'Goals'], [d.plans, 'Plans']
      ];
      document.getElementById('stats').innerHTML = items.map(function (i) {
        return '<div class="stat"><div class="n">' + i[0] + '</div><div class="l">' + i[1] + '</div></div>';
      }).join('');
    }
  });
</script>
</body>
</html>`;
  }
}
