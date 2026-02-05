// Safe LocalStorage helpers and initial state factory.
// WHAT: Centralised persistence layer for the app.
// WHY: Keeps LocalStorage access in one place and makes it easier to handle
//      corrupted data, schema changes, and future migrations.

import type { PersistedState, AppSettings, Task, Project, CompletionEntry } from "./types";

const STORAGE_KEY = "focusflow-state-v1";
const CURRENT_VERSION = 1;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

// Very lightweight runtime validation to protect against corrupted LocalStorage.
function coerceArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function coerceSettings(value: unknown): AppSettings {
  if (!isObject(value)) {
    return {
      confirmBeforeDelete: true,
      enableSounds: false,
      showOnboarding: true,
      defaultProjectId: null,
    };
  }

  return {
    confirmBeforeDelete:
      typeof value.confirmBeforeDelete === "boolean" ? value.confirmBeforeDelete : true,
    enableSounds: typeof value.enableSounds === "boolean" ? value.enableSounds : false,
    showOnboarding: typeof value.showOnboarding === "boolean" ? value.showOnboarding : true,
    defaultProjectId:
      typeof value.defaultProjectId === "string" || value.defaultProjectId === null
        ? (value.defaultProjectId as string | null)
        : null,
  };
}

export function getInitialState(): PersistedState {
  const now = new Date().toISOString();

  // Smart defaults: create a first project and a sample task to guide the user.
  const defaultProject: Project = {
    id: "inbox",
    name: "Inbox",
    color: "sky",
    createdAt: now,
  };

  const sampleTask: Task = {
    id: "welcome-task",
    title: "Welcome to FocusFlow",
    description: "Edit or complete this task to get a feel for the workflow.",
    status: "todo",
    priority: "medium",
    projectId: defaultProject.id,
    createdAt: now,
    updatedAt: now,
    completedAt: null,
    isPinned: true,
    tags: ["getting-started"],
  };

  const settings: AppSettings = {
    confirmBeforeDelete: true,
    enableSounds: false,
    showOnboarding: true,
    defaultProjectId: defaultProject.id,
  };

  const completionHistory: CompletionEntry[] = [];

  return {
    version: CURRENT_VERSION,
    tasks: [sampleTask],
    projects: [defaultProject],
    settings,
    completionHistory,
  };
}

export function loadState(): PersistedState {
  if (typeof window === "undefined") {
    // On the server we always return a fresh initial state.
    return getInitialState();
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return getInitialState();

    const parsed = JSON.parse(raw) as unknown;
    if (!isObject(parsed)) return getInitialState();

    const version =
      typeof parsed.version === "number" && Number.isFinite(parsed.version)
        ? parsed.version
        : CURRENT_VERSION;

    const tasks = coerceArray<Task>(parsed.tasks);
    const projects = coerceArray<Project>(parsed.projects);
    const completionHistory = coerceArray<CompletionEntry>(parsed.completionHistory);
    const settings = coerceSettings(parsed.settings);

    const state: PersistedState = {
      version,
      tasks,
      projects,
      settings,
      completionHistory,
    };

    return state;
  } catch {
    // If JSON is corrupted or incompatible, fall back to a clean initial state.
    return getInitialState();
  }
}

export function saveState(next: PersistedState) {
  if (typeof window === "undefined") return;

  try {
    const serialised = JSON.stringify(next);
    window.localStorage.setItem(STORAGE_KEY, serialised);
  } catch {
    // Swallow errors: failure to persist should not break the UI.
    // In a real backend-backed app we could surface this via logging.
  }
}

