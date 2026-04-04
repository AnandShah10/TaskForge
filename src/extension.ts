import * as vscode from 'vscode';
import { Todo, Note, Task, Goal, Plan, STORAGE_KEYS, ItemType } from './models';
import { TaskForgeProvider } from './taskForgeProvider';
import { TaskForgeWebview } from './webview';

export function activate(context: vscode.ExtensionContext) {
  console.log('TaskForge is now active!');

  const storage = context.globalState;
  const webviewManager = new TaskForgeWebview(context, storage);

  // Initialize storage (as before)
  const keys = Object.values(STORAGE_KEYS);
  keys.forEach(key => {
    let data: any[] = storage.get(key) || [];
    const maxItems = vscode.workspace.getConfiguration('taskForge').get<number>('maxItems', 100);
    if (data.length > maxItems) {
      data = data.slice(0, maxItems);
      storage.update(key, data);
    }
    if (data.length === 0) {
      storage.update(key, []);
    }
  });

  // Providers (add hubProvider)
  const hubProvider = new TaskForgeProvider(storage, 'hub'); // Special for hub
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

  // Enhanced commands to handle menu args (e.g., item for context)
  const editItem = vscode.commands.registerCommand('taskForge.editItem', (itemId?: string, viewType?: string, item?: any) => {
    if (itemId && viewType) {
      webviewManager.show(viewType, itemId);
    } else {
      vscode.window.showInformationMessage('Select an item to edit.');
    }
  });

  const deleteItem = vscode.commands.registerCommand('taskForge.deleteItem', (itemId?: string, viewType?: string, item?: any) => {
    if (itemId && viewType) {
      const key = STORAGE_KEYS[viewType as keyof typeof STORAGE_KEYS];
      const data: any[] = storage.get(key) || [];
      const updated = data.filter(i => i.id !== itemId);
      storage.update(key, updated);
      // Refresh specific provider
      switch (viewType) {
        case 'todos': todosProvider.refresh(); break;
        case 'notes': notesProvider.refresh(); break;
        case 'tasks': tasksProvider.refresh(); break;
        case 'goals': goalsProvider.refresh(); break;
        case 'plans': plansProvider.refresh(); break;
      }
      vscode.window.showInformationMessage(`Item deleted from ${viewType}.`);
    } else {
      vscode.window.showInformationMessage('Select an item to delete.');
    }
  });

  // New toggle command for todos/tasks
  const toggleItem = vscode.commands.registerCommand('taskForge.toggleItem', (itemId?: string, viewType?: string, item?: any) => {
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
        // Refresh provider
        (viewType === 'todos' ? todosProvider : tasksProvider).refresh();
        vscode.window.showInformationMessage(`Item status toggled in ${viewType}.`);
      }
    } else {
      vscode.window.showInformationMessage('Select a todo or task to toggle.');
    }
  });

  // Add commands (no args from menu; just prompt)
  const addTodo = vscode.commands.registerCommand('taskForge.addTodo', async () => {
    // Same as before (input box, add to storage, refresh)
    const text = await vscode.window.showInputBox({ prompt: 'Enter todo text:' });
    if (text) {
      const todos: Todo[] = storage.get(STORAGE_KEYS.TODOS) || [];
      const newTodo: Todo = {
        id: Date.now().toString(),
        text,
        completed: false,
        priority: 'medium',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      todos.unshift(newTodo);
      storage.update(STORAGE_KEYS.TODOS, todos);
      todosProvider.refresh();
      if (vscode.workspace.getConfiguration('taskForge').get<boolean>('autoGitSync', false)) {
        vscode.commands.executeCommand('taskForge.exportToGit');
      }
      vscode.window.showInformationMessage('Todo added!');
    }
  });

  // Similar for other adds (addNote, addTask, addGoal, addPlan) - unchanged, but now callable from menus

  const addNote = vscode.commands.registerCommand('taskForge.addNote', async () => {
    const title = await vscode.window.showInputBox({ prompt: 'Note title:' });
    const content = await vscode.window.showInputBox({ prompt: 'Note content:' });
    if (title && content) {
      const notes: Note[] = storage.get(STORAGE_KEYS.NOTES) || [];
      const newNote: Note = { id: Date.now().toString(), title, content, tags: [], createdAt: new Date(), updatedAt: new Date(), pinned: false };
      notes.unshift(newNote);
      storage.update(STORAGE_KEYS.NOTES, notes);
      notesProvider.refresh();
      vscode.window.showInformationMessage('Note added!');
    }
  });

  const addTask = vscode.commands.registerCommand('taskForge.addTask', async () => {
    const desc = await vscode.window.showInputBox({ prompt: 'Task description:' });
    if (desc) {
      const tasks: Task[] = storage.get(STORAGE_KEYS.TASKS) || [];
      const newTask: Task = { id: Date.now().toString(), description: desc, status: 'todo', assignee: '', dependencies: [], createdAt: new Date(), updatedAt: new Date() };
      tasks.unshift(newTask);
      storage.update(STORAGE_KEYS.TASKS, tasks);
      tasksProvider.refresh();
      vscode.window.showInformationMessage('Task added! Open Kanban to manage.');
    }
  });

  const addGoal = vscode.commands.registerCommand('taskForge.addGoal', async () => {
    const title = await vscode.window.showInputBox({ prompt: 'Goal title:' });
    const progressStr = await vscode.window.showInputBox({ prompt: 'Progress (0-100):', value: '0' });
    const progress = parseInt(progressStr || '0');
    if (title && !isNaN(progress)) {
      const goals: Goal[] = storage.get(STORAGE_KEYS.GOALS) || [];
      const newGoal: Goal = { id: Date.now().toString(), title, description: '', progress, createdAt: new Date(), updatedAt: new Date() };
      goals.unshift(newGoal);
      storage.update(STORAGE_KEYS.GOALS, goals);
      goalsProvider.refresh();
      vscode.window.showInformationMessage('Goal added! View chart to track.');
    }
  });

  const addPlan = vscode.commands.registerCommand('taskForge.addPlan', async () => {
    const title = await vscode.window.showInputBox({ prompt: 'Plan title:' });
    if (title) {
      const plans: Plan[] = storage.get(STORAGE_KEYS.PLANS) || [];
      const newPlan: Plan = { id: Date.now().toString(), title, steps: [], timeline: { start: '', end: '' }, createdAt: new Date(), updatedAt: new Date() };
      plans.unshift(newPlan);
      storage.update(STORAGE_KEYS.PLANS, plans);
      plansProvider.refresh();
      vscode.window.showInformationMessage('Plan added!');
    }
  });

  // Kanban, Chart, Export, Import, Search, Refresh (unchanged, but now from menus)

  const openKanban = vscode.commands.registerCommand('taskForge.openKanban', () => {
    webviewManager.show('kanban');
  });

  const viewGoalsChart = vscode.commands.registerCommand('taskForge.viewGoalsChart', () => {
    webviewManager.show('goalsChart');
  });

  const exportToGit = vscode.commands.registerCommand('taskForge.exportToGit', async () => {
    // Unchanged
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
    // Unchanged (with fixes)
    if (!vscode.workspace.workspaceFolders?.[0]) {
      vscode.window.showErrorMessage('No workspace open for import.');
      return;
    }
    const uri = vscode.Uri.file(vscode.workspace.workspaceFolders[0].uri.fsPath + '/.taskforge.json');
    try {
      const content = await vscode.workspace.fs.readFile(uri);
      const data = JSON.parse(content.toString());
      const dataTyped = data as Record<string, any[]>;
      Object.entries(dataTyped).forEach(([key, items]) => {
        if (Array.isArray(items) && STORAGE_KEYS[key as keyof typeof STORAGE_KEYS]) {
          storage.update(key as keyof typeof STORAGE_KEYS, items);
        }
      });
      todosProvider.refresh(); notesProvider.refresh(); tasksProvider.refresh(); goalsProvider.refresh(); plansProvider.refresh();
      vscode.window.showInformationMessage('Data imported from .taskforge.json!');
    } catch (err) {
      vscode.window.showErrorMessage('Import failed: No .taskforge.json or invalid JSON.');
    }
  });

  const searchItems = vscode.commands.registerCommand('taskForge.searchItems', async () => {
    // Unchanged
    const query = await vscode.window.showInputBox({ prompt: 'Search across items:' });
    if (query) {
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
      if (matches.length > 0) {
        const choices = matches.map(item => ({ 
          label: (item as any).text || (item as any).title || (item as any).description, 
          description: item.id,
          detail: `Type: ${(item as Todo).text ? 'Todo' : (item as Note).title ? 'Note' : (item as Task).description ? 'Task' : (item as Goal).title ? 'Goal' : 'Plan'}` 
        }));
        const choice = await vscode.window.showQuickPick(choices);
        if (choice) {
          vscode.commands.executeCommand('taskForge.editItem', choice.description, 'mixed');
        }
      } else {
        vscode.window.showInformationMessage('No matches found.');
      }
    }
  });

  const refresh = vscode.commands.registerCommand('taskForge.refresh', (viewType?: string) => {
    if (viewType) {
      // Refresh specific if from menu
      switch (viewType) {
        case 'todos': todosProvider.refresh(); break;
        case 'notes': notesProvider.refresh(); break;
        case 'tasks': tasksProvider.refresh(); break;
        case 'goals': goalsProvider.refresh(); break;
        case 'plans': plansProvider.refresh(); break;
        case 'hub': hubProvider.refresh(); break;
      }
    } else {
      // All
      todosProvider.refresh(); notesProvider.refresh(); tasksProvider.refresh(); goalsProvider.refresh(); plansProvider.refresh(); hubProvider.refresh();
    }
    vscode.window.showInformationMessage('Views refreshed!');
  });

  context.subscriptions.push(editItem, deleteItem, toggleItem, addTodo, addNote, addTask, addGoal, addPlan, openKanban, viewGoalsChart, exportToGit, importFromGit, searchItems, refresh);
}

export function deactivate() {}