import * as vscode from 'vscode';
import {
  Todo, Note, Task, Goal, Plan, Priority,
  STORAGE_KEYS, VIEW_TYPE_TO_STORAGE_KEY, ItemType
} from './models';
import { TaskForgeProvider } from './taskForgeProvider';
import { TaskForgeWebview } from './webview';

export function activate(context: vscode.ExtensionContext) {
  console.log('TaskForge is now active!');

  const storage = context.globalState;

  // Trim each list down to the configured max, keeping the most recent
  // items (new items are always unshifted to the front).
  const keys = Object.values(STORAGE_KEYS);
  keys.forEach(key => {
    let data: any[] = storage.get(key) || [];
    const maxItems = vscode.workspace.getConfiguration('taskForge').get<number>('maxItems', 100);
    if (data.length > maxItems) {
      data = data.slice(0, maxItems);
      storage.update(key, data);
    }
  });

  const hubProvider = new TaskForgeProvider(storage, 'hub');
  const todosProvider = new TaskForgeProvider(storage, 'todos');
  const notesProvider = new TaskForgeProvider(storage, 'notes');
  const tasksProvider = new TaskForgeProvider(storage, 'tasks');
  const goalsProvider = new TaskForgeProvider(storage, 'goals');
  const plansProvider = new TaskForgeProvider(storage, 'plans');

  vscode.window.registerTreeDataProvider('hubView', hubProvider);
  vscode.window.registerTreeDataProvider('todosView', todosProvider);
  vscode.window.registerTreeDataProvider('notesView', notesProvider);
  vscode.window.registerTreeDataProvider('tasksView', tasksProvider);
  vscode.window.registerTreeDataProvider('goalsView', goalsProvider);
  vscode.window.registerTreeDataProvider('plansView', plansProvider);

  // Silently refreshes the relevant tree view(s); called both from
  // commands below and from the webview after it mutates storage directly.
  function refreshProviders(viewType?: string) {
    switch (viewType) {
      case 'todos': todosProvider.refresh(); break;
      case 'notes': notesProvider.refresh(); break;
      case 'tasks': tasksProvider.refresh(); break;
      case 'goals': goalsProvider.refresh(); break;
      case 'plans': plansProvider.refresh(); break;
      case 'hub': hubProvider.refresh(); break;
      default:
        todosProvider.refresh(); notesProvider.refresh(); tasksProvider.refresh();
        goalsProvider.refresh(); plansProvider.refresh(); hubProvider.refresh();
    }
  }

  const webviewManager = new TaskForgeWebview(context, storage, refreshProviders);

  const editItem = vscode.commands.registerCommand('taskForge.editItem', (itemId?: string, viewType?: string) => {
    if (itemId && viewType) {
      webviewManager.show(viewType, itemId);
    } else {
      vscode.window.showInformationMessage('Select an item to edit.');
    }
  });

  const deleteItem = vscode.commands.registerCommand('taskForge.deleteItem', (itemId?: string, viewType?: string) => {
    if (itemId && viewType) {
      const key = VIEW_TYPE_TO_STORAGE_KEY[viewType];
      if (!key) {
        vscode.window.showErrorMessage(`Unknown item type: ${viewType}`);
        return;
      }
      const data: any[] = storage.get(key) || [];
      const updated = data.filter(i => i.id !== itemId);
      storage.update(key, updated);
      refreshProviders(viewType);
      vscode.window.showInformationMessage(`Item deleted from ${viewType}.`);
    } else {
      vscode.window.showInformationMessage('Select an item to delete.');
    }
  });

  const toggleItem = vscode.commands.registerCommand('taskForge.toggleItem', (itemId?: string, viewType?: string) => {
    if (itemId && (viewType === 'todos' || viewType === 'tasks')) {
      const key = viewType === 'todos' ? STORAGE_KEYS.TODOS : STORAGE_KEYS.TASKS;
      const data: any[] = storage.get(key) || [];
      const index = data.findIndex(i => i.id === itemId);
      if (index !== -1) {
        if (viewType === 'todos') {
          (data[index] as Todo).completed = !(data[index] as Todo).completed;
        } else {
          const statuses = ['todo', 'in-progress', 'done'] as const;
          const current = (data[index] as Task).status;
          const nextIndex = (statuses.indexOf(current) + 1) % statuses.length;
          (data[index] as Task).status = statuses[nextIndex];
        }
        (data[index] as any).updatedAt = new Date();
        storage.update(key, data);
        refreshProviders(viewType);
      }
    } else {
      vscode.window.showInformationMessage('Select a todo or task to toggle.');
    }
  });

  async function pickPriority(): Promise<Priority | undefined> {
    const pick = await vscode.window.showQuickPick(
      [
        { label: '$(circle-filled) High', description: 'high' },
        { label: '$(circle-outline) Medium', description: 'medium' },
        { label: '$(circle-outline) Low', description: 'low' }
      ],
      { placeHolder: 'Priority' }
    );
    return pick?.description as Priority | undefined;
  }

  const addTodo = vscode.commands.registerCommand('taskForge.addTodo', async () => {
    const text = await vscode.window.showInputBox({ prompt: 'Enter todo text:', placeHolder: 'e.g. Reply to design review' });
    if (!text) { return; }
    const priority = (await pickPriority()) ?? 'medium';
    const dueDate = await vscode.window.showInputBox({ prompt: 'Due date (YYYY-MM-DD, optional):' });

    const todos: Todo[] = storage.get(STORAGE_KEYS.TODOS) || [];
    const newTodo: Todo = {
      id: Date.now().toString(),
      text,
      completed: false,
      priority,
      dueDate: dueDate || undefined,
      tags: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    todos.unshift(newTodo);
    storage.update(STORAGE_KEYS.TODOS, todos);
    refreshProviders('todos');
    if (vscode.workspace.getConfiguration('taskForge').get<boolean>('autoGitSync', false)) {
      vscode.commands.executeCommand('taskForge.exportToGit');
    }
    vscode.window.showInformationMessage('Todo added!');
  });

  const addNote = vscode.commands.registerCommand('taskForge.addNote', async () => {
    const title = await vscode.window.showInputBox({ prompt: 'Note title:' });
    if (!title) { return; }
    const content = await vscode.window.showInputBox({ prompt: 'Note content (you can add more detail later in the editor):' });
    const notes: Note[] = storage.get(STORAGE_KEYS.NOTES) || [];
    const newNote: Note = { id: Date.now().toString(), title, content: content ?? '', tags: [], createdAt: new Date(), updatedAt: new Date(), pinned: false };
    notes.unshift(newNote);
    storage.update(STORAGE_KEYS.NOTES, notes);
    refreshProviders('notes');
    vscode.window.showInformationMessage('Note added!');
  });

  const addTask = vscode.commands.registerCommand('taskForge.addTask', async () => {
    const desc = await vscode.window.showInputBox({ prompt: 'Task description:' });
    if (!desc) { return; }
    const priority = (await pickPriority()) ?? 'medium';
    const tasks: Task[] = storage.get(STORAGE_KEYS.TASKS) || [];
    const newTask: Task = { id: Date.now().toString(), description: desc, status: 'todo', priority, assignee: '', dependencies: [], createdAt: new Date(), updatedAt: new Date() };
    tasks.unshift(newTask);
    storage.update(STORAGE_KEYS.TASKS, tasks);
    refreshProviders('tasks');
    vscode.window.showInformationMessage('Task added! Open the Kanban board to manage it.');
  });

  const addGoal = vscode.commands.registerCommand('taskForge.addGoal', async () => {
    const title = await vscode.window.showInputBox({ prompt: 'Goal title:' });
    if (!title) { return; }
    const progressStr = await vscode.window.showInputBox({ prompt: 'Progress (0-100):', value: '0' });
    const progress = Math.min(100, Math.max(0, parseInt(progressStr || '0', 10) || 0));
    const goals: Goal[] = storage.get(STORAGE_KEYS.GOALS) || [];
    const newGoal: Goal = { id: Date.now().toString(), title, description: '', progress, createdAt: new Date(), updatedAt: new Date() };
    goals.unshift(newGoal);
    storage.update(STORAGE_KEYS.GOALS, goals);
    refreshProviders('goals');
    vscode.window.showInformationMessage('Goal added! View the dashboard to track it.');
  });

  const addPlan = vscode.commands.registerCommand('taskForge.addPlan', async () => {
    const title = await vscode.window.showInputBox({ prompt: 'Plan title:' });
    if (!title) { return; }
    const plans: Plan[] = storage.get(STORAGE_KEYS.PLANS) || [];
    const newPlan: Plan = { id: Date.now().toString(), title, description: '', steps: [], timeline: { start: '', end: '' }, createdAt: new Date(), updatedAt: new Date() };
    plans.unshift(newPlan);
    storage.update(STORAGE_KEYS.PLANS, plans);
    refreshProviders('plans');
    vscode.window.showInformationMessage('Plan added! Open it to add steps.');
  });

  const openKanban = vscode.commands.registerCommand('taskForge.openKanban', () => {
    webviewManager.show('kanban');
  });

  const viewGoalsChart = vscode.commands.registerCommand('taskForge.viewGoalsChart', () => {
    webviewManager.show('goalsChart');
  });

  const exportToGit = vscode.commands.registerCommand('taskForge.exportToGit', async () => {
    const data = {
      todos: storage.get(STORAGE_KEYS.TODOS),
      notes: storage.get(STORAGE_KEYS.NOTES),
      tasks: storage.get(STORAGE_KEYS.TASKS),
      goals: storage.get(STORAGE_KEYS.GOALS),
      plans: storage.get(STORAGE_KEYS.PLANS)
    };
    if (!vscode.workspace.workspaceFolders?.[0]) {
      vscode.window.showErrorMessage('No workspace open for export.');
      return;
    }
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
      const dataTyped = data as Record<string, any[]>;
      Object.entries(dataTyped).forEach(([viewType, items]) => {
        const key = VIEW_TYPE_TO_STORAGE_KEY[viewType];
        if (Array.isArray(items) && key) {
          storage.update(key, items);
        }
      });
      refreshProviders();
      vscode.window.showInformationMessage('Data imported from .taskforge.json!');
    } catch (err) {
      vscode.window.showErrorMessage('Import failed: no .taskforge.json found, or it contains invalid JSON.');
    }
  });

  const searchItems = vscode.commands.registerCommand('taskForge.searchItems', async () => {
    const query = await vscode.window.showInputBox({ prompt: 'Search across items:' });
    if (!query) { return; }
    const todos: Todo[] = storage.get(STORAGE_KEYS.TODOS) || [];
    const notes: Note[] = storage.get(STORAGE_KEYS.NOTES) || [];
    const tasks: Task[] = storage.get(STORAGE_KEYS.TASKS) || [];
    const goals: Goal[] = storage.get(STORAGE_KEYS.GOALS) || [];
    const plans: Plan[] = storage.get(STORAGE_KEYS.PLANS) || [];
    const allItems: ItemType[] = [...todos, ...notes, ...tasks, ...goals, ...plans];
    const matches = allItems.filter(item => {
      const text = (item as any).text || (item as any).title || (item as any).description || '';
      return text.toLowerCase().includes(query.toLowerCase());
    });
    if (matches.length === 0) {
      vscode.window.showInformationMessage('No matches found.');
      return;
    }
    const typeOf = (item: any): string =>
      todos.includes(item) ? 'Todo' : notes.includes(item) ? 'Note' : tasks.includes(item) ? 'Task' : goals.includes(item) ? 'Goal' : 'Plan';
    const choices = matches.map(item => ({
      label: (item as any).text || (item as any).title || (item as any).description,
      description: item.id,
      detail: `Type: ${typeOf(item)}`
    }));
    const choice = await vscode.window.showQuickPick(choices, { placeHolder: `${matches.length} match(es)` });
    if (choice) {
      vscode.commands.executeCommand('taskForge.editItem', choice.description, 'mixed');
    }
  });

  const refresh = vscode.commands.registerCommand('taskForge.refresh', (viewType?: string) => {
    refreshProviders(viewType);
    vscode.window.showInformationMessage('Views refreshed!');
  });

  context.subscriptions.push(
    editItem, deleteItem, toggleItem,
    addTodo, addNote, addTask, addGoal, addPlan,
    openKanban, viewGoalsChart, exportToGit, importFromGit, searchItems, refresh
  );
}

export function deactivate() {}