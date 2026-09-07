import * as vscode from 'vscode';
import { STORAGE_KEYS } from './models';
import { StateManager } from './stateManager';
import { TaskForgePanel } from './panel';
import { TaskForgeSidebarProvider } from './sidebarView';

export function activate(context: vscode.ExtensionContext) {
  const storage = context.globalState;
  const state = new StateManager(storage);

  // Initialize storage keys if they don't exist.
  Object.values(STORAGE_KEYS).forEach(key => {
    if (storage.get(key) === undefined) {
      storage.update(key, []);
    }
  });

  // Trim any oversized legacy data to the configured max.
  const maxItems = vscode.workspace.getConfiguration('taskForge').get<number>('maxItems', 100);
  Object.values(STORAGE_KEYS).forEach(key => {
    const data: any[] = storage.get(key) || [];
    if (data.length > maxItems) {
      storage.update(key, data.slice(0, maxItems));
    }
  });

  const sidebarProvider = new TaskForgeSidebarProvider(state);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(TaskForgeSidebarProvider.viewType, sidebarProvider)
  );

  function refreshAll() {
    sidebarProvider.refresh();
    TaskForgePanel.current?.postState();
  }

  const open = vscode.commands.registerCommand('taskForge.open', () => {
    TaskForgePanel.show(context, state);
  });

  const exportToGit = vscode.commands.registerCommand('taskForge.exportToGit', async () => {
    if (!vscode.workspace.workspaceFolders?.[0]) {
      vscode.window.showErrorMessage('No workspace open for export.');
      return;
    }
    const data = state.getAll();
    const uri = vscode.Uri.file(vscode.workspace.workspaceFolders[0].uri.fsPath + '/.taskforge.json');
    await vscode.workspace.fs.writeFile(uri, Buffer.from(JSON.stringify(data, null, 2), 'utf8'));
    vscode.window.showInformationMessage('.taskforge.json exported! Commit via Git.');
  });

  const importFromGit = vscode.commands.registerCommand('taskForge.importFromGit', async () => {
    if (!vscode.workspace.workspaceFolders?.[0]) {
      vscode.window.showErrorMessage('No workspace open for import.');
      return;
    }
    const uri = vscode.Uri.file(vscode.workspace.workspaceFolders[0].uri.fsPath + '/.taskforge.json');
    try {
      const content = await vscode.workspace.fs.readFile(uri);
      const data = JSON.parse(content.toString());
      await state.replaceAll(data);
      refreshAll();
      vscode.window.showInformationMessage('Data imported from .taskforge.json!');
    } catch (err) {
      vscode.window.showErrorMessage('Import failed: No .taskforge.json or invalid JSON.');
    }
  });

  const refresh = vscode.commands.registerCommand('taskForge.refresh', () => {
    refreshAll();
    vscode.window.showInformationMessage('TaskForge refreshed!');
  });

  context.subscriptions.push(open, exportToGit, importFromGit, refresh);
}

export function deactivate() {}
