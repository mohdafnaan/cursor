// Core domain types for the productivity dashboard.
// Keeping these in one place makes it easy to evolve the data model later.

export type TaskStatus = "todo" | "in-progress" | "done" | "archived";

export type TaskPriority = "low" | "medium" | "high";

export interface Project {
  id: string;
  name: string;
  color: string; // Tailwind-compatible color token, e.g. "sky", "violet"
  createdAt: string; // ISO date
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  projectId?: string | null;
  dueDate?: string | null; // ISO date
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
  isPinned?: boolean;
  tags?: string[];
}

export interface CompletionEntry {
  date: string; // yyyy-mm-dd
  count: number;
}

export interface AppSettings {
  // UX-centric settings that we may show in a settings panel later.
  defaultProjectId?: string | null;
  confirmBeforeDelete: boolean;
  enableSounds: boolean;
  showOnboarding: boolean;
}

export interface PersistedState {
  version: number;
  tasks: Task[];
  projects: Project[];
  settings: AppSettings;
  completionHistory: CompletionEntry[];
}

