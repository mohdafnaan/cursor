// Analytics helpers for the premium part of the app.
// WHAT: Pure functions computing stats from the in-memory state.
// WHY: Keeps business logic separate from UI and easy to test.

import type { CompletionEntry, Task } from "./types";

export interface AnalyticsSummary {
  totalTasks: number;
  completedTasks: number;
  activeTasks: number;
  completionRate: number; // 0-1
  streakDays: number;
  tasksCompletedToday: number;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function computeCompletionHistory(tasks: Task[]): CompletionEntry[] {
  const byDate = new Map<string, number>();

  for (const task of tasks) {
    if (!task.completedAt) continue;
    const dateKey = task.completedAt.slice(0, 10);
    byDate.set(dateKey, (byDate.get(dateKey) ?? 0) + 1);
  }

  return Array.from(byDate.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, count]) => ({ date, count }));
}

export function computeAnalytics(tasks: Task[], history: CompletionEntry[]): AnalyticsSummary {
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === "done").length;
  const activeTasks = tasks.filter((t) => t.status === "todo" || t.status === "in-progress").length;
  const completionRate = totalTasks === 0 ? 0 : completedTasks / totalTasks;

  const today = startOfDay(new Date());
  const todayKey = toDateKey(today);

  const tasksCompletedToday =
    history.find((entry) => entry.date === todayKey)?.count ??
    tasks.filter(
      (t) => t.completedAt && t.completedAt.slice(0, 10) === todayKey
    ).length;

  // Streak: how many consecutive days (including today) with at least one completed task.
  let streakDays = 0;
  const historySet = new Set(history.map((h) => h.date));

  for (let offset = 0; offset < 365; offset++) {
    const d = new Date(today);
    d.setDate(today.getDate() - offset);
    const key = toDateKey(d);
    const hasCompletion =
      historySet.has(key) ||
      tasks.some(
        (t) => t.completedAt && t.completedAt.slice(0, 10) === key
      );

    if (hasCompletion) {
      streakDays += 1;
    } else {
      break;
    }
  }

  return {
    totalTasks,
    completedTasks,
    activeTasks,
    completionRate,
    streakDays,
    tasksCompletedToday,
  };
}

