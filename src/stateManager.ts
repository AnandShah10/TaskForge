import * as vscode from 'vscode';
import { Todo, Note, Task, Goal, Plan, STORAGE_KEYS, FullState } from './models';

function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/**
 * Central owner of all TaskForge data. The webview never touches storage
 * directly - it sends intents here, and StateManager persists + returns
 * the fresh state so the UI can re-render.
 */
export class StateManager {
  constructor(private storage: vscode.Memento) {}

  private clampToMax<T>(items: T[]): T[] {
    const max = vscode.workspace.getConfiguration('taskForge').get<number>('maxItems', 100);
    return items.length > max ? items.slice(0, max) : items;
  }

  getAll(): FullState {
    return {
      todos: this.storage.get<Todo[]>(STORAGE_KEYS.TODOS) || [],
      notes: this.storage.get<Note[]>(STORAGE_KEYS.NOTES) || [],
      tasks: this.storage.get<Task[]>(STORAGE_KEYS.TASKS) || [],
      goals: this.storage.get<Goal[]>(STORAGE_KEYS.GOALS) || [],
      plans: this.storage.get<Plan[]>(STORAGE_KEYS.PLANS) || []
    };
  }

  async replaceAll(data: Partial<FullState>) {
    if (data.todos) await this.storage.update(STORAGE_KEYS.TODOS, data.todos);
    if (data.notes) await this.storage.update(STORAGE_KEYS.NOTES, data.notes);
    if (data.tasks) await this.storage.update(STORAGE_KEYS.TASKS, data.tasks);
    if (data.goals) await this.storage.update(STORAGE_KEYS.GOALS, data.goals);
    if (data.plans) await this.storage.update(STORAGE_KEYS.PLANS, data.plans);
  }

  // ---------- Todos ----------
  async addTodo(text: string, priority: Todo['priority'] = 'medium', dueDate?: string): Promise<Todo> {
    const todos = this.getAll().todos;
    const todo: Todo = { id: genId(), text, completed: false, priority, dueDate, createdAt: new Date(), updatedAt: new Date() };
    todos.unshift(todo);
    await this.storage.update(STORAGE_KEYS.TODOS, this.clampToMax(todos));
    return todo;
  }

  async updateTodo(id: string, patch: Partial<Todo>) {
    const todos = this.getAll().todos;
    const i = todos.findIndex(t => t.id === id);
    if (i !== -1) {
      todos[i] = { ...todos[i], ...patch, updatedAt: new Date() };
      await this.storage.update(STORAGE_KEYS.TODOS, todos);
    }
  }

  async toggleTodo(id: string) {
    const todos = this.getAll().todos;
    const i = todos.findIndex(t => t.id === id);
    if (i !== -1) {
      todos[i].completed = !todos[i].completed;
      todos[i].updatedAt = new Date();
      await this.storage.update(STORAGE_KEYS.TODOS, todos);
    }
  }

  async deleteTodo(id: string) {
    const todos = this.getAll().todos.filter(t => t.id !== id);
    await this.storage.update(STORAGE_KEYS.TODOS, todos);
  }

  // ---------- Notes ----------
  async addNote(title: string, content: string, tags: string[] = [], pinned: boolean = false): Promise<Note> {
    const notes = this.getAll().notes;
    const note: Note = { id: genId(), title, content, tags, createdAt: new Date(), updatedAt: new Date(), pinned };
    notes.unshift(note);
    await this.storage.update(STORAGE_KEYS.NOTES, this.clampToMax(notes));
    return note;
  }

  async updateNote(id: string, patch: Partial<Note>) {
    const notes = this.getAll().notes;
    const i = notes.findIndex(n => n.id === id);
    if (i !== -1) {
      notes[i] = { ...notes[i], ...patch, updatedAt: new Date() };
      await this.storage.update(STORAGE_KEYS.NOTES, notes);
    }
  }

  async deleteNote(id: string) {
    const notes = this.getAll().notes.filter(n => n.id !== id);
    await this.storage.update(STORAGE_KEYS.NOTES, notes);
  }

  // ---------- Tasks ----------
  async addTask(description: string, assignee?: string, priority: Task['priority'] = 'medium'): Promise<Task> {
    const tasks = this.getAll().tasks;
    const task: Task = { id: genId(), description, status: 'todo', assignee, priority, dependencies: [], createdAt: new Date(), updatedAt: new Date() };
    tasks.unshift(task);
    await this.storage.update(STORAGE_KEYS.TASKS, this.clampToMax(tasks));
    return task;
  }

  async updateTask(id: string, patch: Partial<Task>) {
    const tasks = this.getAll().tasks;
    const i = tasks.findIndex(t => t.id === id);
    if (i !== -1) {
      tasks[i] = { ...tasks[i], ...patch, updatedAt: new Date() };
      await this.storage.update(STORAGE_KEYS.TASKS, tasks);
    }
  }

  async deleteTask(id: string) {
    const tasks = this.getAll().tasks.filter(t => t.id !== id);
    await this.storage.update(STORAGE_KEYS.TASKS, tasks);
  }

  // ---------- Goals ----------
  async addGoal(title: string, description = '', deadline?: string): Promise<Goal> {
    const goals = this.getAll().goals;
    const goal: Goal = { id: genId(), title, description, progress: 0, deadline, createdAt: new Date(), updatedAt: new Date() };
    goals.unshift(goal);
    await this.storage.update(STORAGE_KEYS.GOALS, this.clampToMax(goals));
    return goal;
  }

  async updateGoal(id: string, patch: Partial<Goal>) {
    const goals = this.getAll().goals;
    const i = goals.findIndex(g => g.id === id);
    if (i !== -1) {
      goals[i] = { ...goals[i], ...patch, updatedAt: new Date() };
      await this.storage.update(STORAGE_KEYS.GOALS, goals);
    }
  }

  async deleteGoal(id: string) {
    const goals = this.getAll().goals.filter(g => g.id !== id);
    await this.storage.update(STORAGE_KEYS.GOALS, goals);
  }

  // ---------- Plans ----------
  async addPlan(title: string, start = '', end = ''): Promise<Plan> {
    const plans = this.getAll().plans;
    const plan: Plan = { id: genId(), title, steps: [], timeline: { start, end }, createdAt: new Date(), updatedAt: new Date() };
    plans.unshift(plan);
    await this.storage.update(STORAGE_KEYS.PLANS, this.clampToMax(plans));
    return plan;
  }

  async updatePlan(id: string, patch: Partial<Plan>) {
    const plans = this.getAll().plans;
    const i = plans.findIndex(p => p.id === id);
    if (i !== -1) {
      plans[i] = { ...plans[i], ...patch, updatedAt: new Date() };
      await this.storage.update(STORAGE_KEYS.PLANS, plans);
    }
  }

  async deletePlan(id: string) {
    const plans = this.getAll().plans.filter(p => p.id !== id);
    await this.storage.update(STORAGE_KEYS.PLANS, plans);
  }

  async addPlanStep(id: string, step: string) {
    const plans = this.getAll().plans;
    const i = plans.findIndex(p => p.id === id);
    if (i !== -1) {
      plans[i].steps.push(step);
      plans[i].updatedAt = new Date();
      await this.storage.update(STORAGE_KEYS.PLANS, plans);
    }
  }

  async removePlanStep(id: string, stepIndex: number) {
    const plans = this.getAll().plans;
    const i = plans.findIndex(p => p.id === id);
    if (i !== -1) {
      plans[i].steps.splice(stepIndex, 1);
      plans[i].updatedAt = new Date();
      await this.storage.update(STORAGE_KEYS.PLANS, plans);
    }
  }

  // ---------- Generic ----------
  async deleteItem(id: string, viewType: string) {
    switch (viewType) {
      case 'todos': return this.deleteTodo(id);
      case 'notes': return this.deleteNote(id);
      case 'tasks': return this.deleteTask(id);
      case 'goals': return this.deleteGoal(id);
      case 'plans': return this.deletePlan(id);
    }
  }
}
