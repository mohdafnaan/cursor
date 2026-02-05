// ui.js
// ------------------------------
// This module is responsible for:
// - Rendering todos into the DOM
// - Updating counters and empty states
// - Managing the lightweight dialog system (edit + confirm delete)
//
// The DOM-manipulation code lives here so that the main app logic
// (in app.js) can stay focused on state transitions and event wiring.

/**
 * Render the current list of visible todos.
 *
 * @param {Object[]} todos - array of todo objects to display
 * @param {Object} options - additional UI options
 * @param {Function} options.onToggle - handler when a todo checkbox is toggled
 * @param {Function} options.onEdit - handler when the edit action is triggered
 * @param {Function} options.onDelete - handler when the delete action is triggered
 */
export function renderTodoList(todos, { onToggle, onEdit, onDelete }) {
  const listEl = document.getElementById("todo-list");
  const emptyStateEl = document.getElementById("empty-state");

  // Clear previous content
  listEl.innerHTML = "";

  if (!todos.length) {
    // Show a friendly empty state instead of a blank area.
    emptyStateEl.classList.remove("hidden");
    return;
  }

  emptyStateEl.classList.add("hidden");

  const fragment = document.createDocumentFragment();

  todos.forEach((todo) => {
    const li = document.createElement("li");
    li.className =
      "group flex items-center justify-between gap-3 py-2.5 sm:py-3 fade-in-up";

    // Left side: checkbox + title
    const left = document.createElement("div");
    left.className = "flex items-start gap-3 flex-1 min-w-0";

    const checkboxWrapper = document.createElement("div");
    checkboxWrapper.className = "pt-0.5";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className =
      "h-4 w-4 mt-0.5 rounded border-slate-300 text-brand-600 focus:ring-brand-500 cursor-pointer";
    checkbox.checked = todo.completed;
    checkbox.setAttribute("aria-label", `Mark "${todo.title}" as completed`);

    checkbox.addEventListener("change", () => {
      onToggle(todo.id);
    });

    checkboxWrapper.appendChild(checkbox);

    const content = document.createElement("div");
    content.className = "flex-1 min-w-0";

    const title = document.createElement("p");
    title.className =
      "text-sm sm:text-[15px] text-slate-800 break-words" +
      (todo.completed ? " line-through text-slate-400" : "");
    title.textContent = todo.title || "(Untitled task)";

    content.appendChild(title);

    left.appendChild(checkboxWrapper);
    left.appendChild(content);

    // Right side: actions + timestamp
    const right = document.createElement("div");
    right.className =
      "flex items-center gap-2 text-xs text-slate-400 shrink-0 ml-2";

    const updatedLabel = document.createElement("span");
    updatedLabel.className = "hidden sm:inline";
    updatedLabel.textContent = formatUpdatedLabel(todo.updatedAt);

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className =
      "inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface transition-colors";
    editBtn.innerHTML = `<span aria-hidden="true">✏️</span><span class="hidden sm:inline">Edit</span>`;
    editBtn.setAttribute("aria-label", `Edit "${todo.title}"`);
    editBtn.addEventListener("click", () => {
      onEdit(todo);
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className =
      "inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-rose-500 hover:text-rose-600 hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface transition-colors";
    deleteBtn.innerHTML = `<span aria-hidden="true">🗑</span><span class="hidden sm:inline">Delete</span>`;
    deleteBtn.setAttribute("aria-label", `Delete "${todo.title}"`);
    deleteBtn.addEventListener("click", () => {
      onDelete(todo);
    });

    right.appendChild(updatedLabel);
    right.appendChild(editBtn);
    right.appendChild(deleteBtn);

    li.appendChild(left);
    li.appendChild(right);

    fragment.appendChild(li);
  });

  listEl.appendChild(fragment);
}

/**
 * Update the counters and the clear-completed button state.
 */
export function renderCounters({ activeCount, completedCount }) {
  const activeEl = document.getElementById("counter-active");
  const completedEl = document.getElementById("counter-completed");
  const clearBtn = document.getElementById("clear-completed");

  activeEl.textContent = `${activeCount} active`;
  completedEl.textContent = `${completedCount} done`;

  if (completedCount === 0) {
    clearBtn.disabled = true;
  } else {
    clearBtn.disabled = false;
  }
}

/**
 * Visually mark the selected filter tab.
 */
export function renderFilterTabs(currentFilter) {
  const tabs = document.querySelectorAll(".filter-tab");
  tabs.forEach((tab) => {
    const isActive = tab.dataset.filter === currentFilter;
    tab.setAttribute("aria-selected", String(isActive));

    if (isActive) {
      tab.classList.add("bg-white", "shadow-sm", "text-slate-800");
      tab.classList.remove("hover:bg-white/80", "text-slate-500");
    } else {
      tab.classList.remove("bg-white", "shadow-sm", "text-slate-800");
      tab.classList.add("hover:bg-white/80", "text-slate-500");
    }
  });
}

/**
 * Show or hide a subtle alert message (used mainly for storage issues).
 */
export function renderAlert(message) {
  const alertEl = document.getElementById("app-alert");
  if (!message) {
    alertEl.classList.add("hidden");
    alertEl.textContent = "";
    return;
  }

  alertEl.textContent = message;
  alertEl.classList.remove("hidden");
}

/**
 * Render the "today" label in the header.
 * Extracted to one place for clarity and potential future changes
 * (e.g. localization).
 */
export function renderTodayLabel() {
  const el = document.getElementById("app-date");
  if (!el) return;

  const now = new Date();
  const formatted = now.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric"
  });

  el.querySelector("span:nth-child(2)").textContent = formatted;
}

// Dialog helpers
// ------------------------------
// Rather than using the native <dialog> element (which has some quirks),
// we create a small "portal" overlay and re-use it for edit + confirm flows.

/**
 * Open a dialog with custom content and primary/secondary actions.
 *
 * @param {Object} config
 * @param {string} config.title - dialog title
 * @param {string} config.description - supporting text
 * @param {string} [config.mode] - "confirm" | "edit"
 * @param {string} [config.initialValue] - initial value for edit input
 * @param {Function} config.onConfirm - called when user confirms
 * @param {Function} [config.onCancel] - called when user cancels
 */
export function openDialog({
  title,
  description,
  mode = "confirm",
  initialValue = "",
  onConfirm,
  onCancel
}) {
  const root = document.getElementById("dialog-root");
  const body = document.getElementById("dialog-body");

  root.setAttribute("aria-hidden", "false");

  // Clear previous content
  body.innerHTML = "";

  const titleEl = document.createElement("h2");
  titleEl.className = "text-sm sm:text-base font-semibold text-slate-900 mb-1";
  titleEl.textContent = title;

  const descEl = document.createElement("p");
  descEl.className = "text-xs sm:text-sm text-slate-500 mb-4";
  descEl.textContent = description;

  body.appendChild(titleEl);
  body.appendChild(descEl);

  let inputEl = null;
  if (mode === "edit") {
    inputEl = document.createElement("input");
    inputEl.type = "text";
    inputEl.className =
      "w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-1 focus:ring-offset-white mb-4";
    inputEl.value = initialValue;
    inputEl.setAttribute("aria-label", "Edit task title");

    body.appendChild(inputEl);
  }

  const actions = document.createElement("div");
  actions.className =
    "mt-1 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3";

  const cancelBtn = document.createElement("button");
  cancelBtn.type = "button";
  cancelBtn.className =
    "inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs sm:text-sm font-medium text-slate-600 shadow-sm hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white";
  cancelBtn.textContent = "Cancel";

  const confirmBtn = document.createElement("button");
  confirmBtn.type = "button";
  confirmBtn.className =
    "inline-flex items-center justify-center rounded-lg bg-brand-600 text-white px-3 py-1.5 text-xs sm:text-sm font-medium shadow-sm hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white";
  confirmBtn.textContent = mode === "edit" ? "Save changes" : "Delete task";

  const close = (trigger) => {
    root.classList.add("hidden");
    root.setAttribute("aria-hidden", "true");
    document.removeEventListener("keydown", onKeyDown);
    if (trigger === "cancel" && typeof onCancel === "function") {
      onCancel();
    }
  };

  const handleConfirm = () => {
    if (mode === "edit") {
      const trimmed = (inputEl?.value || "").trim();
      if (!trimmed) {
        // Tiny nudge to keep tasks meaningful.
        inputEl?.focus();
        return;
      }
      onConfirm(trimmed);
    } else {
      onConfirm();
    }
    close();
  };

  const onKeyDown = (event) => {
    if (event.key === "Escape") {
      close("cancel");
    }
    if (event.key === "Enter" && mode === "edit") {
      event.preventDefault();
      handleConfirm();
    }
  };

  cancelBtn.addEventListener("click", () => close("cancel"));
  confirmBtn.addEventListener("click", handleConfirm);

  actions.appendChild(cancelBtn);
  actions.appendChild(confirmBtn);
  body.appendChild(actions);

  root.classList.remove("hidden");

  document.addEventListener("keydown", onKeyDown);

  if (inputEl) {
    inputEl.focus();
    inputEl.select();
  } else {
    confirmBtn.focus();
  }
}

/**
 * Utility to format the "last updated" info.
 * Kept simple and relative for quick scanning.
 */
function formatUpdatedLabel(updatedAt) {
  if (!updatedAt) return "";

  const updated = new Date(updatedAt);
  const now = new Date();
  const diffMs = now.getTime() - updated.getTime();
  const diffMinutes = Math.round(diffMs / (1000 * 60));
  const diffHours = Math.round(diffMinutes / 60);

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes} min ago`;
  if (diffHours < 6) return `${diffHours} h ago`;

  return updated.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric"
  });
}

