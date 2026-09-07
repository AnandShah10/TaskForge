import * as vscode from 'vscode';
import { StateManager } from './stateManager';

function getReactPanelHtml(webview: vscode.Webview, extensionUri: vscode.Uri, nonce: string): string {
  // The Vite entry is named `main`, so its stylesheet is emitted as `main.css`.
  const scriptUri = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, 'out', 'webview', 'assets', 'index.js')
  );
  const styleUri = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, 'out', 'webview', 'assets', 'main.css')
  );

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}' ${webview.cspSource};">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TaskForge</title>
    <link rel="stylesheet" href="${styleUri}">
</head>
<body>
    <div id="root"></div>
    <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
}

function getNonce(): string {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

export class TaskForgePanel {
  public static current: TaskForgePanel | undefined;
  private readonly panel: vscode.WebviewPanel;
  private readonly disposables: vscode.Disposable[] = [];

  public static show(context: vscode.ExtensionContext, state: StateManager) {
    if (TaskForgePanel.current) {
      TaskForgePanel.current.panel.reveal(vscode.ViewColumn.One);
      return;
    }
    const panel = vscode.window.createWebviewPanel(
      'taskForgePanel',
      'TaskForge',
      vscode.ViewColumn.One,
      { enableScripts: true, retainContextWhenHidden: true }
    );
    panel.iconPath = vscode.Uri.joinPath(context.extensionUri, 'media', 'icon.png');
    TaskForgePanel.current = new TaskForgePanel(panel, state, context);
  }

  private constructor(panel: vscode.WebviewPanel, private state: StateManager, private context: vscode.ExtensionContext) {
    this.panel = panel;
    const nonce = getNonce();
    // React webview using Vite-built assets (legacy vanilla fully replaced)
    this.panel.webview.html = getReactPanelHtml(panel.webview, context.extensionUri, nonce);

    this.panel.webview.onDidReceiveMessage(async (message) => {
      await this.handleMessage(message);
    }, null, this.disposables);

    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
  }

  public postState() {
    this.panel.webview.postMessage({ type: 'state', data: this.state.getAll() });
  }

  private toast(message: string) {
    this.panel.webview.postMessage({ type: 'toast', message });
  }

  private async handleMessage(message: any) {
    const s = this.state;
    switch (message.type) {
      case 'ready':
        this.postState();
        return;

      // Todos
      case 'replaceAll':
        await s.replaceAll(message.data || {});
        break;

      // Todos
      case 'addTodo':
        await s.addTodo(message.text, message.priority, message.dueDate);
        break;
      case 'toggleTodo':
        await s.toggleTodo(message.id);
        break;
      case 'updateTodo':
        await s.updateTodo(message.id, message.patch);
        break;
      case 'deleteTodo':
        await s.deleteTodo(message.id);
        break;

      // Notes
      case 'addNote':
        await s.addNote(message.title, message.content, message.tags, message.pinned);
        break;
      case 'updateNote':
        await s.updateNote(message.id, message.patch);
        break;
      case 'deleteNote':
        await s.deleteNote(message.id);
        break;

      // Tasks
      case 'addTask':
        await s.addTask(message.description, message.assignee);
        break;
      case 'updateTask':
        await s.updateTask(message.id, message.patch);
        break;
      case 'deleteTask':
        await s.deleteTask(message.id);
        break;

      // Goals
      case 'addGoal':
        await s.addGoal(message.title, message.description, message.deadline);
        break;
      case 'updateGoal':
        await s.updateGoal(message.id, message.patch);
        break;
      case 'deleteGoal':
        await s.deleteGoal(message.id);
        break;

      // Plans
      case 'addPlan':
        await s.addPlan(message.title, message.start, message.end);
        break;
      case 'updatePlan':
        await s.updatePlan(message.id, message.patch);
        break;
      case 'deletePlan':
        await s.deletePlan(message.id);
        break;
      case 'addPlanStep':
        await s.addPlanStep(message.id, message.step);
        break;
      case 'removePlanStep':
        await s.removePlanStep(message.id, message.stepIndex);
        break;

      // Import/export handled via commands so both sidebar & panel stay in sync
      case 'exportToGit':
        await vscode.commands.executeCommand('taskForge.exportToGit');
        break;
      case 'importFromGit':
        await vscode.commands.executeCommand('taskForge.importFromGit');
        break;

      default:
        return;
    }
    this.postState();
  }

  public dispose() {
    TaskForgePanel.current = undefined;
    this.panel.dispose();
    while (this.disposables.length) {
      const d = this.disposables.pop();
      if (d) d.dispose();
    }
  }
}
