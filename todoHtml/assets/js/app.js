// app.js
// ---------------
// This file contains all the JavaScript logic for the Todo App.
// It is written with clean, modern ES6+ syntax and heavily commented
// so that beginners can understand each step.

// ==========================
// 1. Configuration & Helpers
// ==========================

// We use a single key for localStorage so it is easy to find and manage.
const STORAGE_KEY = 'todo_app_items_v1';

// Small helper to create unique IDs for todos.
// In a real backend we would let the database handle IDs.
const createId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

// A helper to trim and normalize user input.
const normalizeText = (text) => text.trim();

// =====================
// 2. State Management
// =====================

// The "source of truth" for all todos in memory.
// We keep an array of objects: { id, text, isCompleted, createdAt }
let todos = [];

// The current filter for list view: 'all' | 'active' | 'completed'
let currentFilter = 'all';

// -------------
// Local Storage
// -------------

/**
 * Safely load todos from localStorage.
 * - Uses try/catch to avoid breaking the app if stored data is invalid.
 * - Returns an empty array as a safe default.
 */
const loadTodosFromStorage = () => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);

    // If nothing is stored yet, simply return an empty array.
    if (!raw) return [];

    const parsed = JSON.parse(raw);

    // Basic validation to ensure we always work with an array.
    if (!Array.isArray(parsed)) {
      console.warn('Unexpected data in localStorage for', STORAGE_KEY);
      return [];
    }

    return parsed;
  } catch (error) {
    // We log the error for debugging, but do NOT break the UI.
    console.error('Failed to parse todos from localStorage', error);
    return [];
  }
};

/**
 * Save the current `todos` array into localStorage.
 * - Uses try/catch to avoid throwing in cases like private browsing issues.
 */
const saveTodosToStorage = () => {
  try {
    const serialized = JSON.stringify(todos);
    window.localStorage.setItem(STORAGE_KEY, serialized);
  } catch (error) {
    // If saving fails, we inform the developer and optionally the user.
    console.error('Failed to save todos to localStorage', error);
    showAlert(
      'We could not save your changes. Please check your browser storage settings.',
      'error'
    );
  }
};

// =====================
// 3. DOM References
// =====================

// We keep all important DOM elements in variables so we:
// - Avoid calling document.getElementById many times
// - Make it easier to see what the app depends on
const elements = {
  todoInput: document.getElementById('todoInput'),
  addTodoButton: document.getElementById('addTodoButton'),
  todoList: document.getElementById('todoList'),
  todoListContainer: document.getElementById('todoListContainer'),
  alertContainer: document.getElementById('alertContainer'),
  todoCountLabel: document.getElementById('todoCountLabel'),
  todoCompletedLabel: document.getElementById('todoCompletedLabel'),
  filterButtons: document.querySelectorAll('.filter-button'),
  showAllButton: document.getElementById('showAllButton'),
  showActiveButton: document.getElementById('showActiveButton'),
  showCompletedButton: document.getElementById('showCompletedButton'),
  clearCompletedButton: document.getElementById('clearCompletedButton')
};

// Guard against missing elements in case the HTML changes.
// This makes the file more resilient and easier to debug.
Object.entries(elements).forEach(([key, value]) => {
  if (!value || (value instanceof NodeList && value.length === 0)) {
    console.warn(`Expected DOM element(s) for "${key}" not found.`);
  }
});

// =====================
// 4. Alert / Feedback
// =====================

/**
 * Display a temporary message to the user.
 * - type: 'error' | 'info' (could be extended later)
 */
const showAlert = (message, type = 'error') => {
  if (!elements.alertContainer) return;

  elements.alertContainer.textContent = message;
  elements.alertContainer.classList.remove('hidden');

  // Adjust style based on message type.
  if (type === 'error') {
    elements.alertContainer.classList.remove('bg-sky-500/10', 'border-sky-500/40', 'text-sky-200');
    elements.alertContainer.classList.add('bg-red-500/10', 'border-red-500/40', 'text-red-200');
  } else {
    elements.alertContainer.classList.remove('bg-red-500/10', 'border-red-500/40', 'text-red-200');
    elements.alertContainer.classList.add('bg-sky-500/10', 'border-sky-500/40', 'text-sky-200');
  }

  // Hide message after a few seconds so it does not stick forever.
  window.clearTimeout(showAlert._timeoutId);
  showAlert._timeoutId = window.setTimeout(() => {
    elements.alertContainer.classList.add('hidden');
  }, 4000);
};

/**
 * Hide the alert area immediately.
 */
const clearAlert = () => {
  if (!elements.alertContainer) return;
  elements.alertContainer.classList.add('hidden');
  elements.alertContainer.textContent = '';
};

// =====================
// 5. Core CRUD Actions
// =====================

/**
 * Add a new todo to state and re-render.
 */
const addTodo = (rawText) => {
  const text = normalizeText(rawText);

  // Basic validation: avoid empty or too short tasks.
  if (!text) {
    showAlert('Please enter a task before adding.', 'error');
    return;
  }

  if (text.length < 3) {
    showAlert('Task description should be at least 3 characters.', 'error');
    return;
  }

  // Optional guard on max length to keep UI tidy.
  if (text.length > 120) {
    showAlert('Task description is too long. Please keep it under 120 characters.', 'error');
    return;
  }

  const newTodo = {
    id: createId(),
    text,
    isCompleted: false,
    createdAt: new Date().toISOString()
  };

  // We create a new array instead of mutating in place.
  // This pattern is inspired by React/Redux and makes debugging easier.
  todos = [newTodo, ...todos];

  // Persist changes and refresh UI.
  saveTodosToStorage();
  renderTodos();
  clearAlert();
};

/**
 * Toggle the completed state of a todo by id.
 */
const toggleTodoCompletion = (id) => {
  todos = todos.map((todo) =>
    todo.id === id ? { ...todo, isCompleted: !todo.isCompleted } : todo
  );

  saveTodosToStorage();
  renderTodos();
};

/**
 * Edit an existing todo text by id.
 */
const editTodo = (id, newTextRaw) => {
  const newText = normalizeText(newTextRaw);

  if (!newText) {
    showAlert('Task text cannot be empty after editing.', 'error');
    return;
  }

  if (newText.length < 3) {
    showAlert('Task description should be at least 3 characters.', 'error');
    return;
  }

  if (newText.length > 120) {
    showAlert('Task description is too long. Please keep it under 120 characters.', 'error');
    return;
  }

  todos = todos.map((todo) =>
    todo.id === id ? { ...todo, text: newText } : todo
  );

  saveTodosToStorage();
  renderTodos();
  clearAlert();
};

/**
 * Remove a todo from state by id.
 */
const deleteTodo = (id) => {
  todos = todos.filter((todo) => todo.id !== id);

  saveTodosToStorage();
  renderTodos();
};

/**
 * Remove all todos that are currently marked as completed.
 */
const clearCompletedTodos = () => {
  const hasCompleted = todos.some((todo) => todo.isCompleted);
  if (!hasCompleted) {
    showAlert('There are no completed tasks to clear.', 'info');
    return;
  }

  todos = todos.filter((todo) => !todo.isCompleted);
  saveTodosToStorage();
  renderTodos();
  clearAlert();
};

// =====================
// 6. Filtering Helpers
// =====================

const setFilter = (filter) => {
  currentFilter = filter;
  updateFilterButtonsUI();
  renderTodos();
};

// Return a new array based on the currently selected filter.
const getVisibleTodos = () => {
  if (currentFilter === 'active') {
    return todos.filter((todo) => !todo.isCompleted);
  }
  if (currentFilter === 'completed') {
    return todos.filter((todo) => todo.isCompleted);
  }
  return todos;
};

/**
 * Update the UI state of the filter buttons (All / Active / Completed).
 * We use a data attribute so the CSS logic can stay in the HTML file.
 */
const updateFilterButtonsUI = () => {
  elements.filterButtons.forEach((button) => {
    const filter = button.dataset.filter;
    const isActive = filter === currentFilter;
    button.setAttribute('data-active', isActive ? 'true' : 'false');
  });
};

// =====================
// 7. Rendering Logic
// =====================

/**
 * Render all todos into the DOM based on current filter.
 */
const renderTodos = () => {
  if (!elements.todoList) return;

  const visibleTodos = getVisibleTodos();

  // Clear existing list items before re-rendering.
  elements.todoList.innerHTML = '';

  // When there are no todos, we display a friendly empty state instead of blank space.
  if (todos.length === 0) {
    const emptyMessage = document.createElement('div');
    emptyMessage.className =
      'text-xs sm:text-sm text-slate-500 px-3 py-4 text-center rounded-lg bg-slate-900/60 border border-dashed border-slate-800';
    emptyMessage.textContent = 'No tasks yet. Add your first todo above to get started!';
    elements.todoList.appendChild(emptyMessage);
  } else if (visibleTodos.length === 0) {
    // When there are todos but none match the current filter.
    const emptyFilteredMessage = document.createElement('div');
    emptyFilteredMessage.className =
      'text-xs sm:text-sm text-slate-500 px-3 py-4 text-center rounded-lg bg-slate-900/60 border border-dashed border-slate-800';
    emptyFilteredMessage.textContent =
      currentFilter === 'active'
        ? 'All tasks are completed. Switch to "All" or "Completed" to see them.'
        : 'No tasks match this filter.';
    elements.todoList.appendChild(emptyFilteredMessage);
  } else {
    // Render each visible todo as a list item.
    visibleTodos.forEach((todo) => {
      const listItem = createTodoListItem(todo);
      elements.todoList.appendChild(listItem);
    });
  }

  // Update footer labels (count and completed).
  updateSummaryLabels();
};

/**
 * Create a single <li> DOM node to represent a todo item.
 */
const createTodoListItem = (todo) => {
  const li = document.createElement('li');

  // We use Tailwind classes to style the item.
  li.className =
    'group flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm transition hover:border-brand/60 hover:bg-slate-900';

  // Checkbox: used to mark as completed.
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = todo.isCompleted;
  checkbox.className =
    'mt-0.5 h-4 w-4 rounded border-slate-600 bg-slate-900 text-brand focus:ring-1 focus:ring-brand/60';
  checkbox.addEventListener('change', () => toggleTodoCompletion(todo.id));

  // Text container supports edit mode.
  const textWrapper = document.createElement('div');
  textWrapper.className = 'flex-1 min-w-0';

  const textSpan = document.createElement('span');
  textSpan.className =
    'block truncate text-slate-100 group-hover:text-slate-50 transition ' +
    (todo.isCompleted ? 'line-through text-slate-500' : '');
  textSpan.textContent = todo.text;

  textWrapper.appendChild(textSpan);

  // Action buttons container (Edit / Delete).
  const actions = document.createElement('div');
  actions.className = 'flex items-center gap-1 sm:gap-2 ml-1';

  const editButton = document.createElement('button');
  editButton.type = 'button';
  editButton.className =
    'rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-200 hover:border-brand/70 hover:text-brand-light';
  editButton.textContent = 'Edit';

  // When user clicks edit, we swap the text span for a small inline form.
  editButton.addEventListener('click', () => enterEditMode(li, todo));

  const deleteButton = document.createElement('button');
  deleteButton.type = 'button';
  deleteButton.className =
    'rounded-md border border-red-500/40 bg-red-500/10 px-2 py-1 text-[11px] text-red-200 hover:bg-red-500/20';
  deleteButton.textContent = 'Delete';
  deleteButton.addEventListener('click', () => deleteTodo(todo.id));

  actions.appendChild(editButton);
  actions.appendChild(deleteButton);

  li.appendChild(checkbox);
  li.appendChild(textWrapper);
  li.appendChild(actions);

  return li;
};

/**
 * Turn a list item into "edit mode" where the user can change the text inline.
 */
const enterEditMode = (listItem, todo) => {
  const textWrapper = listItem.querySelector('div.flex-1');
  const actions = listItem.querySelector('div.flex.items-center');

  if (!textWrapper || !actions) return;

  // Clear existing text content.
  textWrapper.innerHTML = '';

  // Create an input pre-filled with the current todo text.
  const input = document.createElement('input');
  input.type = 'text';
  input.value = todo.text;
  input.className =
    'w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:border-brand focus:ring-1 focus:ring-brand/40';

  textWrapper.appendChild(input);

  // Replace actions with Save / Cancel buttons for clarity.
  actions.innerHTML = '';

  const saveButton = document.createElement('button');
  saveButton.type = 'button';
  saveButton.className =
    'rounded-md border border-brand/70 bg-brand/20 px-2 py-1 text-[11px] text-brand-light hover:bg-brand/30';
  saveButton.textContent = 'Save';

  const cancelButton = document.createElement('button');
  cancelButton.type = 'button';
  cancelButton.className =
    'rounded-md border border-slate-600 bg-slate-900 px-2 py-1 text-[11px] text-slate-200 hover:bg-slate-800';
  cancelButton.textContent = 'Cancel';

  actions.appendChild(saveButton);
  actions.appendChild(cancelButton);

  // Focus the input for better UX.
  input.focus();
  input.select();

  // Handle "Save" via button or Enter key.
  const commitEdit = () => {
    editTodo(todo.id, input.value);
  };

  saveButton.addEventListener('click', commitEdit);

  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      commitEdit();
    } else if (event.key === 'Escape') {
      // Escape cancels editing, re-rendering restores original view.
      renderTodos();
    }
  });

  // Cancel button simply re-renders the list without saving changes.
  cancelButton.addEventListener('click', () => {
    renderTodos();
  });
};

/**
 * Update the labels that show number of tasks and number completed.
 */
const updateSummaryLabels = () => {
  const total = todos.length;
  const completed = todos.filter((todo) => todo.isCompleted).length;

  if (elements.todoCountLabel) {
    elements.todoCountLabel.textContent = total === 1 ? '1 task' : `${total} tasks`;
  }

  if (elements.todoCompletedLabel) {
    elements.todoCompletedLabel.textContent =
      completed === 1 ? '1 completed' : `${completed} completed`;
  }
};

// =====================
// 8. Event Wiring
// =====================

/**
 * Attach all event listeners in one place.
 * This keeps setup logic clean and easy to read.
 */
const setupEventListeners = () => {
  if (elements.addTodoButton) {
    elements.addTodoButton.addEventListener('click', () => {
      addTodo(elements.todoInput.value);
      // Clear input after successful add.
      elements.todoInput.value = '';
      elements.todoInput.focus();
    });
  }

  if (elements.todoInput) {
    // Allow pressing Enter in the input to quickly add a new task.
    elements.todoInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        addTodo(elements.todoInput.value);
        elements.todoInput.value = '';
      }
    });
  }

  // Filter buttons: All / Active / Completed
  elements.filterButtons.forEach((button) => {
    const filter = button.dataset.filter;
    button.addEventListener('click', () => setFilter(filter));
  });

  // Clear completed button
  if (elements.clearCompletedButton) {
    elements.clearCompletedButton.addEventListener('click', clearCompletedTodos);
  }
};

// =====================
// 9. Application Init
// =====================

/**
 * Initialize the app:
 * - Load todos from localStorage
 * - Render initial UI
 * - Wire up event listeners
 */
const init = () => {
  todos = loadTodosFromStorage();
  updateFilterButtonsUI();
  renderTodos();
  setupEventListeners();
};

// Run init once the DOM is fully ready.
// Because this file is loaded at the end of <body>, the DOM is already available,
// but we still use DOMContentLoaded defensively in case of future refactors.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

