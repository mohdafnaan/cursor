'use client';

// Centralised state management for tasks, projects, settings and analytics.
// WHAT: A single React hook that owns the core dashboard state.
// WHY: Keeps app logic in one predictable place and avoids prop drilling.

import { useEffect, useMemo, useReducer, useRef } from "react";
import { computeAnalytics, computeCompletionHistory } from "@/lib/analytics";
import { loadState, saveState, getInitialState } from "@/lib/storage";
import type {
  PersistedState,
  Task,
  TaskStatus,
  TaskPriority,
  Project,
  AppSettings,
} from "@/lib/types";

type State = PersistedState & {
  // Undo buffer for destructive operations (e.g. delete).
  lastDeletedTask?: Task | null;
};

type CreateTaskInput = {
  title: string;
  description?: string;
  projectId?: string | null;
  priority?: TaskPriority;
  dueDate?: string | null;
};

type Action =
  | { type: "hydrate"; payload: PersistedState }
  | { type: "create-task"; payload: CreateTaskInput }
  | { type: "update-task"; payload: { id: string; patch: Partial<Task> } }
  | { type: "delete-task"; payload: { id: string } }
  | { type: "bulk-update-status"; payload: { ids: string[]; status: TaskStatus } }
  | { type: "restore-last-deleted" }
  | { type: "update-settings"; payload: Partial<AppSettings> }
  | { type: "create-project"; payload: { name: string; color: string } };

function uuid() {
  // Small, readable IDs that are still unique enough for this app.
  return Math.random().toString(36).slice(2, 10);
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "hydrate": {
      return { ...action.payload, lastDeletedTask: null };
    }
    case "create-task": {
      const now = new Date().toISOString();
      const task: Task = {
        id: uuid(),
        title: action.payload.title.trim(),
        description: action.payload.description?.trim() || "",
        status: "todo",
        priority: action.payload.priority ?? "medium",
        projectId: action.payload.projectId ?? state.settings.defaultProjectId ?? null,
        dueDate: action.payload.dueDate ?? null,
        createdAt: now,
        updatedAt: now,
        completedAt: null,
        isPinned: false,
        tags: [],
      };

      const tasks = [task, ...state.tasks];
      const completionHistory = computeCompletionHistory(tasks);

      return {
        ...state,
        tasks,
        completionHistory,
      };
    }
    case "update-task": {
      const tasks = state.tasks.map((task) =>
        task.id === action.payload.id
          ? {
              ...task,
              ...action.payload.patch,
              updatedAt: new Date().toISOString(),
            }
          : task,
      );

      const completionHistory = computeCompletionHistory(tasks);

      return {
        ...state,
        tasks,
        completionHistory,
      };
    }
    case "delete-task": {
      const task = state.tasks.find((t) => t.id === action.payload.id) ?? null;
      const tasks = state.tasks.filter((t) => t.id !== action.payload.id);
      const completionHistory = computeCompletionHistory(tasks);

      return {
        ...state,
        tasks,
        completionHistory,
        lastDeletedTask: task,
      };
    }
    case "bulk-update-status": {
      const ids = new Set(action.payload.ids);
      const now = new Date().toISOString();
      const tasks = state.tasks.map((task) => {
        if (!ids.has(task.id)) return task;
        const completedAt =
          action.payload.status === "done" ? task.completedAt ?? now : task.completedAt;
        return {
          ...task,
          status: action.payload.status,
          completedAt,
          updatedAt: now,
        };
      });
      const completionHistory = computeCompletionHistory(tasks);

      return {
        ...state,
        tasks,
        completionHistory,
      };
    }
    case "restore-last-deleted": {
      if (!state.lastDeletedTask) return state;
      const tasks = [state.lastDeletedTask, ...state.tasks];
      const completionHistory = computeCompletionHistory(tasks);

      return {
        ...state,
        tasks,
        completionHistory,
        lastDeletedTask: null,
      };
    }
    case "update-settings": {
      const settings: AppSettings = {
        ...state.settings,
        ...action.payload,
      };
      return {
        ...state,
        settings,
      };
    }
    case "create-project": {
      const now = new Date().toISOString();
      const project: Project = {
        id: uuid(),
        name: action.payload.name.trim(),
        color: action.payload.color,
        createdAt: now,
      };

      return {
        ...state,
        projects: [...state.projects, project],
      };
    }
    default:
      return state;
  }
}

export function useDashboardState() {
  const [state, dispatch] = useReducer(reducer, undefined, () => ({
    ...getInitialState(),
    lastDeletedTask: null,
  }));

  const hydratedRef = useRef(false);

  // Hydrate from LocalStorage on first client render.
  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    const persisted = loadState();
    dispatch({ type: "hydrate", payload: persisted });
  }, []);

  // Persist whenever the core state changes.
  useEffect(() => {
    saveState(state);
  }, [state]);

  const analytics = useMemo(
    () => computeAnalytics(state.tasks, state.completionHistory),
    [state.tasks, state.completionHistory],
  );

  return {
    state,
    analytics,
    actions: {
      createTask: (input: CreateTaskInput) =>
        dispatch({ type: "create-task", payload: input }),
      updateTask: (id: string, patch: Partial<Task>) =>
        dispatch({ type: "update-task", payload: { id, patch } }),
      deleteTask: (id: string) => dispatch({ type: "delete-task", payload: { id } }),
      bulkUpdateStatus: (ids: string[], status: TaskStatus) =>
        dispatch({ type: "bulk-update-status", payload: { ids, status } }),
      restoreLastDeleted: () => dispatch({ type: "restore-last-deleted" }),
      updateSettings: (patch: Partial<AppSettings>) =>
        dispatch({ type: "update-settings", payload: patch }),
      createProject: (name: string, color: string) =>
        dispatch({ type: "create-project", payload: { name, color } }),
    },
  };
}

