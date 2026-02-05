// app.js
// ------------------------------
// This is the main entry point for the Todo application.
//
// Responsibilities:
// - Hold the in-memory state for todos, filters, and search term
// - Wire up DOM events (form submit, clicks, keyboard interactions)
// - Delegate persistence to storage.js and rendering to ui.js
//
// Design goals:
// - Keep functions small and focused
// - Prefer pure functions for state transitions where possible
// - Make it easy for a beginner to trace the data flow end-to-end

import {
  loadTodos,
  saveTodos,
  generateId,
  clearCompletedTodos,
  loadThemePreference,
  saveThemePreference
} from "./storage.js";
import {
  renderTodoList,
  renderCounters,
  renderFilterTabs,
  renderAlert,
  renderTodayLabel,
  openDialog
} from "./ui.js";

// Application state lives in a single object.
// It is module-scoped (not global) thanks to ES modules.
const state = {
  todos: [],
  filter: "all", // "all" | "active" | "completed"
  search: "",
  storageError: null,
  theme: "light" // "light" | "dark"
};

/**
 * Derive the visible todos based on the current filter and search term.
 *
 * WHAT: Returns a filtered, searched subset of state.todos.
 * WHY: Keeping this logic in one place makes it easy to change the
 *      behavior later (e.g. add tag filters, sorting, etc.).
 */
function getVisibleTodos() {
  const term = state.search.trim().toLowerCase();

  return state.todos.filter((todo) => {
    if (state.filter === "active" && todo.completed) return false;
    if (state.filter === "completed" && !todo.completed) return false;

    if (term.length > 0) {
      return todo.title.toLowerCase().includes(term);
    }

    return true;
  });
}

/**
 * Re-render the entire screen based on current state.
 * This keeps the mental model simple: mutate state -> call render().
 */
function render() {
  const visibleTodos = getVisibleTodos();
  const activeCount = state.todos.filter((t) => !t.completed).length;
  const completedCount = state.todos.filter((t) => t.completed).length;

  renderTodoList(visibleTodos, {
    onToggle: handleToggleTodo,
    onEdit: handleEditTodo,
    onDelete: handleDeleteTodo
  });

  renderCounters({ activeCount, completedCount });
  renderFilterTabs(state.filter);
  renderAlert(state.storageError);
}

/**
 * Initialize state from localStorage and set up event listeners.
 */
function init() {
  // Apply persisted or system theme before we render anything,
  // so users do not see a flash of incorrect colors.
  initTheme();

  const { todos, error } = loadTodos();
  state.todos = todos;
  state.storageError = error;

  renderTodayLabel();
  setupEventListeners();
  render();
}

/**
 * Wire up all interactive elements once DOM is ready.
 */
function setupEventListeners() {
  const form = document.getElementById("todo-form");
  const input = document.getElementById("todo-input");
  const search = document.getElementById("todo-search");
  const clearCompletedBtn = document.getElementById("clear-completed");
  const emptyStateAddBtn = document.getElementById("empty-state-add");
  const themeToggleBtn = document.getElementById("theme-toggle");

  // Create new todo on submit.
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const title = input.value.trim();
    if (!title) {
      // No need to show an error dialog; a gentle nudge is enough.
      input.focus();
      return;
    }

    const now = new Date().toISOString();
    state.todos.unshift({
      id: generateId(),
      title,
      completed: false,
      createdAt: now,
      updatedAt: now
    });

    input.value = "";
    saveTodos(state.todos);
    render();
  });

  // Filter tabs
  const filterTabs = document.querySelectorAll(".filter-tab");
  filterTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const newFilter = tab.dataset.filter;
      if (!newFilter || newFilter === state.filter) return;
      state.filter = newFilter;
      render();
    });
  });

  // Search input debounced (simple approach using input event).
  let searchTimeout = null;
  search.addEventListener("input", () => {
    const value = search.value;
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      state.search = value;
      render();
    }, 80);
  });

  // Clear completed action, with a confirmation dialog to prevent accidents.
  clearCompletedBtn.addEventListener("click", () => {
    const hasCompleted = state.todos.some((t) => t.completed);
    if (!hasCompleted) return;

    openDialog({
      title: "Clear completed tasks?",
      description:
        "This will permanently remove all tasks that are marked as done. Active tasks will stay.",
      mode: "confirm",
      onConfirm: () => {
        state.todos = clearCompletedTodos(state.todos);
        render();
      }
    });
  });

  // Empty state shortcut to focus the main input.
  emptyStateAddBtn.addEventListener("click", () => {
    input.focus();
  });

  // Theme toggle button: switches between light and dark modes.
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener("click", () => {
      const nextTheme = state.theme === "dark" ? "light" : "dark";
      setTheme(nextTheme);
    });
  }
}

// Event handlers used by ui.js callbacks
// ------------------------------

function handleToggleTodo(id) {
  const idx = state.todos.findIndex((t) => t.id === id);
  if (idx === -1) return;

  const todo = state.todos[idx];
  const updated = {
    ...todo,
    completed: !todo.completed,
    updatedAt: new Date().toISOString()
  };

  // Replace in place to avoid re-ordering.
  state.todos.splice(idx, 1, updated);
  saveTodos(state.todos);
  render();
}

function handleEditTodo(todo) {
  openDialog({
    title: "Edit task",
    description: "Keep titles short and action-oriented for better focus.",
    mode: "edit",
    initialValue: todo.title,
    onConfirm: (newTitle) => {
      const idx = state.todos.findIndex((t) => t.id === todo.id);
      if (idx === -1) return;

      state.todos[idx] = {
        ...state.todos[idx],
        title: newTitle,
        updatedAt: new Date().toISOString()
      };
      saveTodos(state.todos);
      render();
    }
  });
}

function handleDeleteTodo(todo) {
  openDialog({
    title: "Delete this task?",
    description: `“${todo.title}” will be removed from your list. This action cannot be undone.`,
    mode: "confirm",
    onConfirm: () => {
      state.todos = state.todos.filter((t) => t.id !== todo.id);
      saveTodos(state.todos);
      render();
    }
  });
}

// Theme helpers
// ------------------------------

/**
 * Decide which theme to start with and apply it.
 *
 * Preference order:
 * 1) Explicit saved preference ("light" or "dark")
 * 2) System preference using prefers-color-scheme
 * 3) Fallback to light
 */
function initTheme() {
  let theme = loadThemePreference();

  if (!theme) {
    const prefersDark =
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;
    theme = prefersDark ? "dark" : "light";
  }

  setTheme(theme, { persist: false });
}

/**
 * Apply the given theme to the document and update the toggle UI.
 */
function setTheme(theme, { persist = true } = {}) {
  state.theme = theme;

  // Tailwind is configured for class-based dark mode.
  // We toggle the "dark" class on the <html> element so all
  // `dark:` utilities become active.
  if (theme === "dark") {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }

  // Reflect the state in the toggle button (icon + label + aria).
  const toggleBtn = document.getElementById("theme-toggle");
  if (toggleBtn) {
    const isDark = theme === "dark";
    toggleBtn.setAttribute("aria-pressed", String(isDark));
    toggleBtn.setAttribute(
      "aria-label",
      isDark ? "Switch to light mode" : "Switch to dark mode"
    );

    const iconSpan = toggleBtn.querySelector("[data-theme-icon]");
    const labelSpan = toggleBtn.querySelector("[data-theme-label]");

    if (iconSpan) {
      iconSpan.textContent = isDark ? "🌙" : "☀️";
    }
    if (labelSpan) {
      labelSpan.textContent = isDark ? "Dark" : "Light";
    }
  }

  if (persist) {
    saveThemePreference(theme);
  }
}

// Boot the app once the DOM is ready.
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

