import * as vscode from 'vscode';
import { Todo, Note, Task, Goal, Plan, STORAGE_KEYS } from './models';

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
    if (!element) {
      const items: vscode.TreeItem[] = [];
      let data: any[] = [];
      let key: string;

      switch (this.viewType) {
        case 'hub':
          // Static hub actions as TreeItems
          const quickTodo = new vscode.TreeItem('➕ Quick Add Todo', vscode.TreeItemCollapsibleState.None);
          quickTodo.command = { command: 'taskForge.addTodo', title: 'Add Todo' };
          items.push(quickTodo);
          const quickNote = new vscode.TreeItem('📝 Quick Add Note', vscode.TreeItemCollapsibleState.None);
          quickNote.command = { command: 'taskForge.addNote', title: 'Add Note' };
          items.push(quickNote);
          const openKanbanItem = new vscode.TreeItem('📋 Open Kanban', vscode.TreeItemCollapsibleState.None);
          openKanbanItem.command = { command: 'taskForge.openKanban', title: 'Open Kanban' };
          items.push(openKanbanItem);
          const viewChartItem = new vscode.TreeItem('📊 View Goals Chart', vscode.TreeItemCollapsibleState.None);
          viewChartItem.command = { command: 'taskForge.viewGoalsChart', title: 'View Chart' };
          items.push(viewChartItem);
          return Promise.resolve(items);
        case 'todos':
          key = STORAGE_KEYS.TODOS;
          data = this.storage.get<Todo[]>(key) || [];
          break;
        case 'notes':
          key = STORAGE_KEYS.NOTES;
          data = this.storage.get<Note[]>(key) || [];
          break;
        case 'tasks':
          key = STORAGE_KEYS.TASKS;
          data = this.storage.get<Task[]>(key) || [];
          break;
        case 'goals':
          key = STORAGE_KEYS.GOALS;
          data = this.storage.get<Goal[]>(key) || [];
          break;
        case 'plans':
          key = STORAGE_KEYS.PLANS;
          data = this.storage.get<Plan[]>(key) || [];
          break;
        default:
          return Promise.resolve([]);
      }

      if (data.length === 0) {
        // Actionable placeholder
        let placeholderText = 'No items yet.';
        let placeholderCommand: vscode.Command | undefined = undefined;
        switch (this.viewType) {
          case 'todos': 
            placeholderText = 'No todos. Click to add your first!'; 
            placeholderCommand = { command: 'taskForge.addTodo', title: 'Add Todo' }; 
            break;
          case 'notes': 
            placeholderText = 'No notes. Click to add!'; 
            placeholderCommand = { command: 'taskForge.addNote', title: 'Add Note' }; 
            break;
          case 'tasks': 
            placeholderText = 'No tasks. Add one or open Kanban.'; 
            placeholderCommand = { command: 'taskForge.addTask', title: 'Add Task' }; 
            break;
          case 'goals': 
            placeholderText = 'No goals. Add one or view chart.'; 
            placeholderCommand = { command: 'taskForge.addGoal', title: 'Add Goal' }; 
            break;
          case 'plans': 
            placeholderText = 'No plans. Click to add!'; 
            placeholderCommand = { command: 'taskForge.addPlan', title: 'Add Plan' }; 
            break;
        }
        const placeholder = new vscode.TreeItem(placeholderText);
        placeholder.command = placeholderCommand;
        placeholder.iconPath = new vscode.ThemeIcon('plus');
        items.push(placeholder);
        return Promise.resolve(items);
      }

      data.forEach(item => {
        const label = item.text || item.title || item.description || 'Untitled';
        const treeItem = new vscode.TreeItem(label, vscode.TreeItemCollapsibleState.None);
        treeItem.id = item.id;
        treeItem.contextValue = `${this.viewType}.item`; // For context menus
        // Default edit command
        let editCommand: vscode.Command = { 
          command: 'taskForge.editItem', 
          title: 'Edit', 
          arguments: [item.id, this.viewType, item] 
        };
        // Icons and toggle
        let icon = new vscode.ThemeIcon('symbol-field');
        let toggleCommand: vscode.Command | undefined;
        if (this.viewType === 'todos') {
          icon = new vscode.ThemeIcon((item as Todo).completed ? 'check' : 'circle-outline');
          toggleCommand = { command: 'taskForge.toggleItem', title: 'Toggle Complete', arguments: [item.id, this.viewType, item] };
          treeItem.command = toggleCommand; // Click to toggle
        } else if (this.viewType === 'tasks') {
          const statusIcon = { 'todo': 'symbol-field', 'in-progress': 'sync', 'done': 'pass' }[(item as Task).status] || 'symbol-field';
          icon = new vscode.ThemeIcon(statusIcon as any);
          toggleCommand = { command: 'taskForge.toggleItem', title: 'Cycle Status', arguments: [item.id, this.viewType, item] };
          treeItem.command = toggleCommand; // Click to cycle
        } else if (this.viewType === 'notes' && (item as Note).pinned) {
          icon = new vscode.ThemeIcon('pin');
        }
        treeItem.iconPath = icon;
        if (!toggleCommand) {
          treeItem.command = editCommand; // Edit for non-toggleable
        }
        // Fixed: Safe date formatting for tooltip (handle string from storage)
        const updatedAt = (item as any).updatedAt;
        let dateStr = 'Unknown';
        if (updatedAt) {
          const dateObj = new Date(updatedAt); // Parse string to Date
          if (!isNaN(dateObj.getTime())) {
            dateStr = dateObj.toLocaleDateString();
          }
        }
        treeItem.tooltip = `Updated: ${dateStr} | Right-click for more`;
        items.push(treeItem);
      });

      return Promise.resolve(items);
    }
    return Promise.resolve([]);
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }
}