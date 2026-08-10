import * as vscode from 'vscode';
import {
  Todo, Note, Task, Goal, Plan,
  STORAGE_KEYS, PRIORITY_ORDER, PRIORITY_COLORS,
  formatDate, isOverdue
} from './models';

export class TaskForgeProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<vscode.TreeItem | undefined | null | void> = new vscode.EventEmitter<vscode.TreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<vscode.TreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

  private viewType: string;
  private storage: vscode.Memento;

  constructor(storage: vscode.Memento, viewType: string = 'todos') {
    this.storage = storage;
    this.viewType = viewType;
  }

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: vscode.TreeItem): Thenable<vscode.TreeItem[]> {
    if (element) {
      return Promise.resolve([]);
    }

    if (this.viewType === 'hub') {
      return Promise.resolve(this.buildHub());
    }

    const data = this.getSortedData();

    if (data.length === 0) {
      return Promise.resolve([this.buildEmptyPlaceholder()]);
    }

    return Promise.resolve(data.map(item => this.buildTreeItem(item)));
  }

  private getSortedData(): any[] {
    switch (this.viewType) {
      case 'todos': {
        const data: Todo[] = this.storage.get(STORAGE_KEYS.TODOS) || [];
        return [...data].sort((a, b) => {
          if (a.completed !== b.completed) { return a.completed ? 1 : -1; }
          const pDiff = PRIORITY_ORDER[a.priority ?? 'medium'] - PRIORITY_ORDER[b.priority ?? 'medium'];
          if (pDiff !== 0) { return pDiff; }
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        });
      }
      case 'notes': {
        const data: Note[] = this.storage.get(STORAGE_KEYS.NOTES) || [];
        return [...data].sort((a, b) => {
          if (a.pinned !== b.pinned) { return a.pinned ? -1 : 1; }
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        });
      }
      case 'tasks': {
        const data: Task[] = this.storage.get(STORAGE_KEYS.TASKS) || [];
        const statusOrder = { 'in-progress': 0, 'todo': 1, 'done': 2 };
        return [...data].sort((a, b) => {
          const sDiff = statusOrder[a.status] - statusOrder[b.status];
          if (sDiff !== 0) { return sDiff; }
          const pDiff = PRIORITY_ORDER[a.priority ?? 'medium'] - PRIORITY_ORDER[b.priority ?? 'medium'];
          if (pDiff !== 0) { return pDiff; }
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        });
      }
      case 'goals': {
        const data: Goal[] = this.storage.get(STORAGE_KEYS.GOALS) || [];
        return [...data].sort((a, b) => {
          const aDone = a.progress >= 100, bDone = b.progress >= 100;
          if (aDone !== bDone) { return aDone ? 1 : -1; }
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        });
      }
      case 'plans': {
        const data: Plan[] = this.storage.get(STORAGE_KEYS.PLANS) || [];
        return [...data].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      }
      default:
        return [];
    }
  }

  private buildHub(): vscode.TreeItem[] {
    const todos: Todo[] = this.storage.get(STORAGE_KEYS.TODOS) || [];
    const notes: Note[] = this.storage.get(STORAGE_KEYS.NOTES) || [];
    const tasks: Task[] = this.storage.get(STORAGE_KEYS.TASKS) || [];
    const goals: Goal[] = this.storage.get(STORAGE_KEYS.GOALS) || [];
    const plans: Plan[] = this.storage.get(STORAGE_KEYS.PLANS) || [];

    const items: vscode.TreeItem[] = [];

    const openTodos = todos.filter(t => !t.completed).length;
    const openTasks = tasks.filter(t => t.status !== 'done').length;
    const avgGoalProgress = goals.length
      ? Math.round(goals.reduce((s, g) => s + g.progress, 0) / goals.length)
      : 0;

    const summary = new vscode.TreeItem(
      `${openTodos} open todo${openTodos === 1 ? '' : 's'} · ${openTasks} open task${openTasks === 1 ? '' : 's'} · ${notes.length} note${notes.length === 1 ? '' : 's'}`
    );
    summary.iconPath = new vscode.ThemeIcon('graph');
    summary.tooltip = `Goals average ${avgGoalProgress}% complete · ${plans.length} plan${plans.length === 1 ? '' : 's'}`;
    items.push(summary);

    const quickAdd = (label: string, icon: string, command: string) => {
      const ti = new vscode.TreeItem(label, vscode.TreeItemCollapsibleState.None);
      ti.command = { command, title: label };
      ti.iconPath = new vscode.ThemeIcon(icon);
      return ti;
    };

    items.push(quickAdd('Add Todo', 'add', 'taskForge.addTodo'));
    items.push(quickAdd('Add Note', 'add', 'taskForge.addNote'));
    items.push(quickAdd('Add Task', 'add', 'taskForge.addTask'));
    items.push(quickAdd('Add Goal', 'add', 'taskForge.addGoal'));
    items.push(quickAdd('Add Plan', 'add', 'taskForge.addPlan'));
    items.push(quickAdd('Open Kanban Board', 'project', 'taskForge.openKanban'));
    items.push(quickAdd('View Goals Chart', 'graph-line', 'taskForge.viewGoalsChart'));
    items.push(quickAdd('Search Items', 'search', 'taskForge.searchItems'));

    return items;
  }

  private buildEmptyPlaceholder(): vscode.TreeItem {
    const config: Record<string, { text: string; command: string }> = {
      todos: { text: 'No todos yet — click to add your first one', command: 'taskForge.addTodo' },
      notes: { text: 'No notes yet — click to add one', command: 'taskForge.addNote' },
      tasks: { text: 'No tasks yet — click to add one, or open the Kanban board', command: 'taskForge.addTask' },
      goals: { text: 'No goals yet — click to add one', command: 'taskForge.addGoal' },
      plans: { text: 'No plans yet — click to add one', command: 'taskForge.addPlan' }
    };
    const cfg = config[this.viewType] ?? { text: 'No items yet.', command: '' };
    const placeholder = new vscode.TreeItem(cfg.text);
    if (cfg.command) {
      placeholder.command = { command: cfg.command, title: 'Add' };
    }
    placeholder.iconPath = new vscode.ThemeIcon('sparkle');
    return placeholder;
  }

  private buildTreeItem(item: any): vscode.TreeItem {
    const label = item.text || item.title || item.description || 'Untitled';
    const treeItem = new vscode.TreeItem(label, vscode.TreeItemCollapsibleState.None);
    treeItem.id = item.id;
    treeItem.contextValue = `${this.viewType}.item`;

    const editCommand: vscode.Command = {
      command: 'taskForge.editItem',
      title: 'Edit',
      arguments: [item.id, this.viewType, item]
    };

    let icon: vscode.ThemeIcon = new vscode.ThemeIcon('symbol-field');
    let toggleCommand: vscode.Command | undefined;
    let description = '';

    if (this.viewType === 'todos') {
      const todo = item as Todo;
      icon = new vscode.ThemeIcon(
        todo.completed ? 'check' : 'circle-large-outline',
        todo.completed ? undefined : new vscode.ThemeColor(PRIORITY_COLORS[todo.priority ?? 'medium'])
      );
      toggleCommand = { command: 'taskForge.toggleItem', title: 'Toggle Complete', arguments: [item.id, this.viewType, item] };
      treeItem.command = toggleCommand;
      const overdue = !todo.completed && isOverdue(todo.dueDate);
      const parts: string[] = [todo.priority ?? 'medium'];
      if (todo.dueDate) { parts.push(overdue ? `overdue ${todo.dueDate}` : `due ${todo.dueDate}`); }
      description = parts.join(' · ');
      if (overdue) { treeItem.description = `⚠ ${description}`; } else { treeItem.description = description; }
      treeItem.tooltip = new vscode.MarkdownString(
        `**${label}**\n\nPriority: ${todo.priority ?? 'medium'}${todo.dueDate ? `  \nDue: ${todo.dueDate}` : ''}${(todo.tags?.length) ? `  \nTags: ${todo.tags.join(', ')}` : ''}\n\nUpdated: ${formatDate(todo.updatedAt)}\n\n*Click to toggle · right-click for more*`
      );
    } else if (this.viewType === 'tasks') {
      const task = item as Task;
      const statusIcon: Record<string, string> = { 'todo': 'circle-large-outline', 'in-progress': 'sync', 'done': 'pass-filled' };
      icon = new vscode.ThemeIcon(statusIcon[task.status] || 'symbol-field', new vscode.ThemeColor(PRIORITY_COLORS[task.priority ?? 'medium']));
      toggleCommand = { command: 'taskForge.toggleItem', title: 'Cycle Status', arguments: [item.id, this.viewType, item] };
      treeItem.command = toggleCommand;
      const parts: string[] = [task.status, task.priority ?? 'medium'];
      if (task.assignee) { parts.push(`@${task.assignee}`); }
      treeItem.description = parts.join(' · ');
      treeItem.tooltip = new vscode.MarkdownString(
        `**${label}**\n\nStatus: ${task.status}  \nPriority: ${task.priority ?? 'medium'}${task.assignee ? `  \nAssignee: ${task.assignee}` : ''}${task.dependencies?.length ? `  \nDepends on: ${task.dependencies.join(', ')}` : ''}\n\nUpdated: ${formatDate(task.updatedAt)}\n\n*Click to cycle status · right-click for more*`
      );
    } else if (this.viewType === 'notes') {
      const note = item as Note;
      icon = new vscode.ThemeIcon(note.pinned ? 'pinned' : 'note');
      treeItem.description = note.tags?.length ? note.tags.join(', ') : '';
      treeItem.tooltip = new vscode.MarkdownString(
        `**${label}**${note.pinned ? ' 📌' : ''}\n\n${note.tags?.length ? `Tags: ${note.tags.join(', ')}\n\n` : ''}Updated: ${formatDate(note.updatedAt)}\n\n*Right-click to edit or delete*`
      );
    } else if (this.viewType === 'goals') {
      const goal = item as Goal;
      const complete = goal.progress >= 100;
      icon = new vscode.ThemeIcon(complete ? 'check-all' : 'target', complete ? new vscode.ThemeColor('charts.green') : undefined);
      treeItem.description = `${goal.progress}%${goal.deadline ? ` · due ${goal.deadline}` : ''}`;
      treeItem.tooltip = new vscode.MarkdownString(
        `**${label}**\n\nProgress: ${goal.progress}%${goal.deadline ? `  \nDeadline: ${goal.deadline}` : ''}${goal.description ? `\n\n${goal.description}` : ''}\n\nUpdated: ${formatDate(goal.updatedAt)}`
      );
    } else if (this.viewType === 'plans') {
      const plan = item as Plan;
      icon = new vscode.ThemeIcon('checklist');
      treeItem.description = `${plan.steps?.length ?? 0} step${(plan.steps?.length ?? 0) === 1 ? '' : 's'}`;
      treeItem.tooltip = new vscode.MarkdownString(
        `**${label}**\n\n${plan.steps?.length ?? 0} steps${plan.timeline?.start ? `  \n${plan.timeline.start} → ${plan.timeline.end || '?'}` : ''}\n\nUpdated: ${formatDate(plan.updatedAt)}`
      );
    }

    treeItem.iconPath = icon;
    if (!toggleCommand) {
      treeItem.command = editCommand;
    }

    return treeItem;
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }
}