// models.ts - Data model definitions shared across TaskForge

export type Priority = 'low' | 'medium' | 'high';
export type TaskStatus = 'todo' | 'in-progress' | 'done';

export interface Todo {
  id: string;
  text: string;
  completed: boolean;
  dueDate?: string;
  priority: Priority;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  pinned: boolean;
}

export interface Task {
  id: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  assignee?: string;
  dependencies: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  progress: number;
  deadline?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Plan {
  id: string;
  title: string;
  description: string;
  steps: string[];
  timeline: { start: string; end: string };
  createdAt: Date;
  updatedAt: Date;
}

export const STORAGE_KEYS = {
  TODOS: 'taskForge.todos',
  NOTES: 'taskForge.notes',
  TASKS: 'taskForge.tasks',
  GOALS: 'taskForge.goals',
  PLANS: 'taskForge.plans'
} as const;

// Maps the lowercase, plural viewType strings used throughout the tree
// providers/commands directly to their storage key. This replaces the old
// (broken) pattern of indexing STORAGE_KEYS with a lowercase key, which
// silently failed because STORAGE_KEYS' own keys are uppercase.
export const VIEW_TYPE_TO_STORAGE_KEY: Record<string, string> = {
  todos: STORAGE_KEYS.TODOS,
  notes: STORAGE_KEYS.NOTES,
  tasks: STORAGE_KEYS.TASKS,
  goals: STORAGE_KEYS.GOALS,
  plans: STORAGE_KEYS.PLANS
};

// Singular <-> plural mapping used by the webview to normalize the many
// viewType spellings that flow in from tree items ('todos'), direct
// commands ('kanban', 'goalsChart'), and single-item edits ('todo').
export const SINGULAR_TO_PLURAL: Record<string, string> = {
  todo: 'todos',
  note: 'notes',
  task: 'tasks',
  goal: 'goals',
  plan: 'plans'
};

export type ItemType = Todo | Note | Task | Goal | Plan;

export const PRIORITY_ORDER: Record<Priority, number> = { high: 0, medium: 1, low: 2 };

export const PRIORITY_COLORS: Record<Priority, string> = {
  high: 'charts.red',
  medium: 'charts.yellow',
  low: 'charts.green'
};

export function safeDate(value: unknown): Date | undefined {
  if (!value) { return undefined; }
  const d = new Date(value as string);
  return isNaN(d.getTime()) ? undefined : d;
}

export function formatDate(value: unknown): string {
  const d = safeDate(value);
  return d ? d.toLocaleDateString() : 'Unknown';
}

export function isOverdue(dueDate?: string): boolean {
  if (!dueDate) { return false; }
  const d = safeDate(dueDate);
  if (!d) { return false; }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d.getTime() < today.getTime();
}