// models.ts - Updated for TaskForge

export interface Todo {
  id: string;
  text: string;
  completed: boolean;
  dueDate?: string;
  priority: 'low' | 'medium' | 'high';
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
  status: 'todo' | 'in-progress' | 'done';
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

export type ItemType = Todo | Note | Task | Goal | Plan;