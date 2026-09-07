// models.ts - Updated for TaskForge

export type Priority = 'low' | 'medium' | 'high';

export interface Todo {
  id: string;
  text: string;
  completed: boolean;
  dueDate?: string;
  priority: Priority;
  tags?: string[];
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: Date | string;
  updatedAt: Date | string;
  pinned: boolean;
}

export interface Task {
  id: string;
  description: string;
  status: 'todo' | 'in-progress' | 'done';
  assignee?: string;
  priority: Priority;
  dependencies: string[];
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  progress: number;
  deadline?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface Plan {
  id: string;
  title: string;
  description?: string;
  steps: string[];
  timeline: { start: string; end: string };
  createdAt: Date | string;
  updatedAt: Date | string;
}

export const STORAGE_KEYS = {
  TODOS: 'taskForge.todos',
  NOTES: 'taskForge.notes',
  TASKS: 'taskForge.tasks',
  GOALS: 'taskForge.goals',
  PLANS: 'taskForge.plans'
} as const;

export const PRIORITY_ORDER: Record<Priority, number> = {
  low: 0,
  medium: 1,
  high: 2
};

export const PRIORITY_COLORS: Record<Priority, string> = {
  low: 'charts.blue',
  medium: 'charts.yellow',
  high: 'charts.red'
};

export const SINGULAR_TO_PLURAL: Record<string, string> = {
  todo: 'todos',
  note: 'notes',
  task: 'tasks',
  goal: 'goals',
  plan: 'plans'
};

export function formatDate(value?: Date | string): string {
  if (!value) {
    return '—';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

export function isOverdue(date?: string): boolean {
  if (!date) {
    return false;
  }

  const due = new Date(date);
  if (Number.isNaN(due.getTime())) {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due < today;
}

export interface FullState {
  todos: Todo[];
  notes: Note[];
  tasks: Task[];
  goals: Goal[];
  plans: Plan[];
}

export type ItemType = Todo | Note | Task | Goal | Plan;