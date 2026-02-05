'use client';

// Main dashboard shell composing layout, state, and interactions.
// This file intentionally focuses on UI orchestration; low-level logic lives in hooks/lib.

import * as React from "react";
import { useDashboardState } from "@/hooks/useDashboardState";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import type { Task, TaskStatus, TaskPriority } from "@/lib/types";
import { BarChart3, CheckCircle2, Circle, LayoutDashboard, ListChecks, Moon, SunMedium } from "lucide-react";
import { useTheme } from "next-themes";

type StatusFilter = TaskStatus | "all";
type SortKey = "createdAt" | "priority" | "dueDate";

function useKeyboardShortcuts(actions: {
  newTask: () => void;
  openShortcuts: () => void;
  focusSearch: () => void;
  undoDelete: () => void;
}) {
  const searchRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        actions.focusSearch();
        searchRef.current?.focus();
      }

      if (event.key === "n") {
        event.preventDefault();
        actions.newTask();
      }

      if (event.key === "?") {
        event.preventDefault();
        actions.openShortcuts();
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        actions.undoDelete();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [actions]);

  return { searchRef };
}

function priorityLabel(priority: TaskPriority) {
  switch (priority) {
    case "high":
      return "High";
    case "medium":
      return "Medium";
    case "low":
      return "Low";
  }
}

function statusLabel(status: TaskStatus) {
  switch (status) {
    case "todo":
      return "To do";
    case "in-progress":
      return "In progress";
    case "done":
      return "Done";
    case "archived":
      return "Archived";
  }
}

export function AppShell() {
  const { state, analytics, actions } = useDashboardState();
  const { push } = useToast();
  const { theme, setTheme } = useTheme();

  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("all");
  const [sortKey, setSortKey] = React.useState<SortKey>("createdAt");
  const [query, setQuery] = React.useState("");
  const [selectedTaskIds, setSelectedTaskIds] = React.useState<string[]>([]);
  const [isShortcutsOpen, setIsShortcutsOpen] = React.useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = React.useState(state.settings.showOnboarding);

  const { searchRef } = useKeyboardShortcuts({
    newTask: () => {
      composerRef.current?.focus();
    },
    openShortcuts: () => setIsShortcutsOpen(true),
    focusSearch: () => {
      // focus handled by ref in effect
    },
    undoDelete: () => {
      actions.restoreLastDeleted();
      push({
        title: "Task restored",
        description: "The last deleted task was brought back.",
        variant: "success",
      });
    },
  });

  const composerRef = React.useRef<HTMLInputElement | null>(null);

  const isLoading = !state || state.tasks.length === 0; // after hydration we still may have sample task

  const filteredTasks = React.useMemo(() => {
    const term = query.trim().toLowerCase();
    return state.tasks
      .filter((task) => {
        if (statusFilter !== "all" && task.status !== statusFilter) return false;
        if (!term) return true;
        return (
          task.title.toLowerCase().includes(term) ||
          (task.description ?? "").toLowerCase().includes(term)
        );
      })
      .sort((a, b) => {
        if (sortKey === "createdAt") {
          return b.createdAt.localeCompare(a.createdAt);
        }
        if (sortKey === "dueDate") {
          return (a.dueDate ?? "").localeCompare(b.dueDate ?? "");
        }
        if (sortKey === "priority") {
          const order: TaskPriority[] = ["high", "medium", "low"];
          return order.indexOf(a.priority) - order.indexOf(b.priority);
        }
        return 0;
      });
  }, [state.tasks, statusFilter, sortKey, query]);

  const allSelected =
    filteredTasks.length > 0 && selectedTaskIds.length === filteredTasks.length;

  function toggleSelectAll() {
    setSelectedTaskIds(allSelected ? [] : filteredTasks.map((t) => t.id));
  }

  function toggleSelection(id: string) {
    setSelectedTaskIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function handleCreateTask(title: string) {
    const trimmed = title.trim();
    if (!trimmed) return;
    actions.createTask({ title: trimmed });
    push({
      title: "Task created",
      description: "Your new task was added to the top of the list.",
    });
  }

  function handleBulkStatus(status: TaskStatus) {
    if (selectedTaskIds.length === 0) return;
    actions.bulkUpdateStatus(selectedTaskIds, status);
    push({
      title: "Tasks updated",
      description: `${selectedTaskIds.length} task(s) marked as ${statusLabel(status).toLowerCase()}.`,
    });
    setSelectedTaskIds([]);
  }

  function handleDelete(task: Task) {
    actions.deleteTask(task.id);
    push({
      title: "Task deleted",
      description: "Press Ctrl+Z / Cmd+Z to undo.",
      variant: "destructive",
    });
  }

  function handleComplete(task: Task) {
    const status: TaskStatus = task.status === "done" ? "todo" : "done";
    actions.updateTask(task.id, {
      status,
      completedAt: status === "done" ? new Date().toISOString() : null,
    });
  }

  function handleOnboardingDismiss() {
    setIsOnboardingOpen(false);
    actions.updateSettings({ showOnboarding: false });
  }

  const isOffline = typeof navigator !== "undefined" && !navigator.onLine;

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-semibold leading-none">FocusFlow</p>
              <p className="text-xs text-muted-foreground">
                A calm productivity dashboard for real work.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Toggle theme"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              <SunMedium className="h-4 w-4 dark:hidden" />
              <Moon className="hidden h-4 w-4 dark:block" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsShortcutsOpen(true)}
            >
              <kbd className="mr-2 rounded border bg-muted px-1 text-[10px]">?</kbd>
              Shortcuts
            </Button>
          </div>
        </div>
        {isOffline && (
          <div className="border-t bg-amber-50 px-4 py-1 text-center text-xs text-amber-900 dark:bg-amber-950 dark:text-amber-100">
            You&apos;re offline. Changes are kept locally and will sync when you&apos;re back.
          </div>
        )}
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 px-4 py-4 md:flex-row">
        <section className="flex-1 space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ListChecks className="h-4 w-4 text-primary" aria-hidden="true" />
                  Today&apos;s tasks
                </CardTitle>
                <CardDescription>
                  Capture, organise, and complete tasks with keyboard-first workflows.
                </CardDescription>
              </div>
              <Button
                size="sm"
                onClick={() => composerRef.current?.focus()}
              >
                <span className="hidden sm:inline">New task</span>
                <span className="sm:hidden">Add</span>
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <Input
                    ref={composerRef}
                    placeholder="Quick add (press N anywhere)…"
                    aria-label="Create a new task"
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        handleCreateTask(event.currentTarget.value);
                        event.currentTarget.value = "";
                      }
                    }}
                  />
                </div>
                <div className="flex flex-1 items-center gap-2">
                  <Input
                    ref={searchRef}
                    placeholder="Search tasks (Ctrl/⌘ + K)…"
                    aria-label="Search tasks"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant={statusFilter === "all" ? "secondary" : "ghost"}
                    onClick={() => setStatusFilter("all")}
                  >
                    All
                  </Button>
                  <Button
                    size="sm"
                    variant={statusFilter === "todo" ? "secondary" : "ghost"}
                    onClick={() => setStatusFilter("todo")}
                  >
                    To do
                  </Button>
                  <Button
                    size="sm"
                    variant={statusFilter === "in-progress" ? "secondary" : "ghost"}
                    onClick={() => setStatusFilter("in-progress")}
                  >
                    In progress
                  </Button>
                  <Button
                    size="sm"
                    variant={statusFilter === "done" ? "secondary" : "ghost"}
                    onClick={() => setStatusFilter("done")}
                  >
                    Done
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        Sort by
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Sort tasks</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuCheckboxItem
                        checked={sortKey === "createdAt"}
                        onCheckedChange={() => setSortKey("createdAt")}
                      >
                        Created
                      </DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem
                        checked={sortKey === "priority"}
                        onCheckedChange={() => setSortKey("priority")}
                      >
                        Priority
                      </DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem
                        checked={sortKey === "dueDate"}
                        onCheckedChange={() => setSortKey("dueDate")}
                      >
                        Due date
                      </DropdownMenuCheckboxItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={selectedTaskIds.length === 0}
                      >
                        Bulk actions
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Bulk update</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onSelect={() => handleBulkStatus("in-progress")}>
                        Mark as in progress
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => handleBulkStatus("done")}>
                        Mark as done
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => handleBulkStatus("todo")}>
                        Reset to to-do
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              <div className="mt-2 rounded-lg border bg-muted/40">
                <div className="flex items-center gap-3 border-b bg-muted/60 px-3 py-2 text-[11px] text-muted-foreground">
                  <Checkbox
                    checked={allSelected}
                    aria-label="Select all tasks"
                    onCheckedChange={toggleSelectAll}
                  />
                  <span className="w-6" aria-hidden="true" />
                  <span className="flex-1">Task</span>
                  <span className="w-20 text-center">Status</span>
                  <span className="w-20 text-center">Priority</span>
                  <span className="w-20 text-right">Actions</span>
                </div>

                <ul className="divide-y">
                  {isLoading && (
                    <div className="space-y-1 p-3">
                      <Skeleton className="h-8 w-full" />
                      <Skeleton className="h-8 w-11/12" />
                      <Skeleton className="h-8 w-4/5" />
                    </div>
                  )}

                  {!isLoading && filteredTasks.length === 0 && (
                    <li className="px-3 py-6 text-center text-xs text-muted-foreground">
                      <p className="font-medium">No tasks match your filters.</p>
                      <p>Try clearing the search or status filters.</p>
                    </li>
                  )}

                  {filteredTasks.map((task) => {
                    const selected = selectedTaskIds.includes(task.id);
                    const isDone = task.status === "done";
                    return (
                      <li
                        key={task.id}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 text-xs transition-colors",
                          selected && "bg-primary/5",
                        )}
                      >
                        <Checkbox
                          checked={selected}
                          aria-label={`Select task ${task.title}`}
                          onCheckedChange={() => toggleSelection(task.id)}
                        />
                        <button
                          type="button"
                          onClick={() => handleComplete(task)}
                          className={cn(
                            "flex h-5 w-5 items-center justify-center rounded-full border text-muted-foreground transition-colors",
                            isDone && "border-emerald-500 bg-emerald-500/10 text-emerald-600",
                          )}
                          aria-label={isDone ? "Mark as to do" : "Mark as done"}
                        >
                          {isDone ? (
                            <CheckCircle2 className="h-3 w-3" />
                          ) : (
                            <Circle className="h-3 w-3" />
                          )}
                        </button>
                        <div className="flex flex-1 flex-col">
                          <p
                            className={cn(
                              "truncate text-xs font-medium",
                              isDone && "text-muted-foreground line-through",
                            )}
                          >
                            {task.title}
                          </p>
                          {task.description && (
                            <p className="truncate text-[11px] text-muted-foreground">
                              {task.description}
                            </p>
                          )}
                        </div>
                        <span className="w-20 text-center">
                          <span
                            className={cn(
                              "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium",
                              task.status === "done"
                                ? "bg-emerald-500/10 text-emerald-600"
                                : task.status === "in-progress"
                                ? "bg-amber-500/10 text-amber-700"
                                : "bg-slate-500/5 text-slate-600",
                            )}
                          >
                            {statusLabel(task.status)}
                          </span>
                        </span>
                        <span className="w-20 text-center">
                          <span
                            className={cn(
                              "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium",
                              task.priority === "high"
                                ? "bg-rose-500/10 text-rose-600"
                                : task.priority === "medium"
                                ? "bg-sky-500/10 text-sky-600"
                                : "bg-emerald-500/10 text-emerald-600",
                            )}
                          >
                            {priorityLabel(task.priority)}
                          </span>
                        </span>
                        <span className="flex w-20 justify-end">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" aria-label="Task actions">
                                ⋯
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onSelect={() => handleComplete(task)}>
                                {isDone ? "Mark as to do" : "Mark as done"}
                                <DropdownMenuShortcut>⏎</DropdownMenuShortcut>
                              </DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => handleDelete(task)}>
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </CardContent>
          </Card>
        </section>

        <aside className="w-full space-y-4 md:w-80">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" aria-hidden="true" />
                Analytics
              </CardTitle>
              <CardDescription>
                Lightweight insights that encourage consistent progress.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <MetricPill
                  label="Active tasks"
                  value={analytics.activeTasks}
                />
                <MetricPill
                  label="Completed"
                  value={analytics.completedTasks}
                />
                <MetricPill
                  label="Completion rate"
                  value={`${Math.round(analytics.completionRate * 100)}%`}
                />
                <MetricPill
                  label="Today"
                  value={analytics.tasksCompletedToday}
                />
              </div>
              <div className="rounded-lg bg-muted/60 p-3 text-xs">
                <p className="mb-1 flex items-center justify-between text-[11px] uppercase tracking-wide text-muted-foreground">
                  Streak
                  <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600">
                    {analytics.streakDays} day
                    {analytics.streakDays === 1 ? "" : "s"}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">
                  Keep your streak alive by completing at least one task every day.
                  Focus on &ldquo;done&rdquo;, not perfection.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tips</CardTitle>
              <CardDescription>
                Designed for keyboard lovers and calm productivity.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-xs text-muted-foreground">
              <p>
                Press <kbd className="rounded border bg-muted px-1 text-[10px]">N</kbd> anywhere to
                jump into the quick-add box.
              </p>
              <p>
                Use <kbd className="rounded border bg-muted px-1 text-[10px]">Ctrl</kbd>/
                <kbd className="rounded border bg-muted px-1 text-[10px]">⌘</kbd>+
                <kbd className="rounded border bg-muted px-1 text-[10px]">K</kbd> to search.
              </p>
              <p>
                Accidentally deleted something? Press{" "}
                <kbd className="rounded border bg-muted px-1 text-[10px]">Ctrl</kbd>/
                <kbd className="rounded border bg-muted px-1 text-[10px]">⌘</kbd>+
                <kbd className="rounded border bg-muted px-1 text-[10px]">Z</kbd> to undo.
              </p>
            </CardContent>
          </Card>
        </aside>
      </main>

      <ShortcutsDialog open={isShortcutsOpen} onOpenChange={setIsShortcutsOpen} />
      <OnboardingDialog open={isOnboardingOpen} onDismiss={handleOnboardingDismiss} />
    </div>
  );
}

function MetricPill({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex flex-col rounded-md bg-muted/60 p-2">
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold">{value}</span>
    </div>
  );
}

function ShortcutsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>
            FocusFlow is designed to be fully usable without a mouse.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 space-y-2 text-xs">
          <ShortcutRow keys={["N"]} description="New task" />
          <ShortcutRow keys={["Ctrl / ⌘", "K"]} description="Search tasks" />
          <ShortcutRow keys={["?"]} description="Open this help" />
          <ShortcutRow keys={["Ctrl / ⌘", "Z"]} description="Undo last delete" />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ShortcutRow({ keys, description }: { keys: string[]; description: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-muted-foreground">{description}</span>
      <div className="flex gap-1">
        {keys.map((key) => (
          <kbd
            key={key}
            className="rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
          >
            {key}
          </kbd>
        ))}
      </div>
    </div>
  );
}

function OnboardingDialog({
  open,
  onDismiss,
}: {
  open: boolean;
  onDismiss: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onDismiss()}>
      <DialogContent aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Welcome to FocusFlow</DialogTitle>
          <DialogDescription>
            A lightweight, opinionated dashboard for managing your day like a modern SaaS tool.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 text-xs text-muted-foreground">
          <p>
            Start by adding a couple of tasks above. Use filters and bulk actions to keep your
            board tidy, and keep an eye on your streak in the analytics panel.
          </p>
          <p>
            Everything is saved locally in your browser, so you can safely refresh or go offline
            without losing work.
          </p>
        </div>
        <div className="mt-3 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onDismiss}>
            Skip for now
          </Button>
          <Button size="sm" onClick={onDismiss}>
            Let&apos;s get started
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

