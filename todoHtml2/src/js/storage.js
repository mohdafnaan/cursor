// storage.js
// ------------------------------
// This module owns all interaction with localStorage.
// Keeping storage logic here makes it easier to:
// - Change the persistence mechanism later (e.g. to an API)
// - Safely recover from corrupted data without breaking the UI

const STORAGE_KEY = "focuslist.todos.v1";
const THEME_STORAGE_KEY = "focuslist.theme.v1";

/**
 * Generate a reasonably unique, human-inspectable id for a todo.
 * Using timestamp + random keeps it simple and avoids external deps.
 */
export function generateId() {
  return `todo_${Date.now().toString(36)}_${Math.random()
    .toString(16)
    .slice(2, 8)}`;
}

/**
 * Load todos from localStorage.
 *
 * WHAT: Returns a safe array of todos plus an optional error message.
 * WHY: localStorage can be empty or contain invalid JSON. We never want
 *      that to crash the app; instead we surface a soft warning.
 */
export function loadTodos() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { todos: [], error: null };
    }

    const parsed = JSON.parse(raw);

    // Guard against unexpected shapes by falling back to an empty array.
    if (!Array.isArray(parsed)) {
      return {
        todos: [],
        error: "Stored data had an unexpected format and was reset."
      };
    }

    // Basic normalization in case older versions stored slightly different fields.
    const normalized = parsed.map((item) => ({
      id: typeof item.id === "string" ? item.id : generateId(),
      title: typeof item.title === "string" ? item.title : "",
      completed: Boolean(item.completed),
      createdAt: item.createdAt || new Date().toISOString(),
      updatedAt: item.updatedAt || item.createdAt || new Date().toISOString()
    }));

    return { todos: normalized, error: null };
  } catch (err) {
    console.error("Failed to read todos from localStorage", err);
    return {
      todos: [],
      error: "We had to reset your data because it looked corrupted."
    };
  }
}

/**
 * Save todos to localStorage.
 *
 * WHAT: Persists the full todo list as JSON.
 * WHY: Centralized saving means the rest of the app can assume persistence
 *      succeeds and keep the UI logic clean. We still log errors for debugging.
 */
export function saveTodos(todos) {
  try {
    const toStore = JSON.stringify(todos);
    window.localStorage.setItem(STORAGE_KEY, toStore);
  } catch (err) {
    console.error("Failed to save todos to localStorage", err);
    // We intentionally do not throw: the UI should still work in-memory.
  }
}

/**
 * Remove all completed todos and persist the remaining ones.
 */
export function clearCompletedTodos(todos) {
  const remaining = todos.filter((todo) => !todo.completed);
  saveTodos(remaining);
  return remaining;
}

/**
 * Load the user's preferred color theme from localStorage.
 *
 * WHAT: Returns "light", "dark", or null if no preference is stored.
 * WHY: This keeps theme persistence logic in one place and allows
 *      the app to fall back to the system preference when needed.
 */
export function loadThemePreference() {
  try {
    const value = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (value === "light" || value === "dark") {
      return value;
    }
    return null;
  } catch (err) {
    console.error("Failed to read theme preference from localStorage", err);
    return null;
  }
}

/**
 * Save the user's preferred color theme to localStorage.
 */
export function saveThemePreference(theme) {
  try {
    if (theme === "light" || theme === "dark") {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    }
  } catch (err) {
    console.error("Failed to save theme preference to localStorage", err);
  }
}


