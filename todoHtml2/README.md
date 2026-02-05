## FocusList – Modern Todo Dashboard

FocusList is a small, production-ready Todo web application built with **HTML**, **Tailwind CSS**, and **vanilla JavaScript (ES modules)**.  
It is intentionally designed to feel like a lightweight, local-first productivity app (inspired by tools like Notion, Linear, and Todoist).

---

### 1. Features

- **Core todo actions**
  - Add, edit, delete tasks
  - Mark tasks as completed
  - Clear all completed tasks (with confirmation)
- **Filtering & search**
  - Filter by **All / Active / Completed**
  - Search by task title
- **State & persistence**
  - Todos stored in **localStorage**
  - Safe handling of corrupted or missing data
  - Friendly, non-blocking alert message if storage had to be reset
- **UX details**
  - Keyboard support (`Enter` to add, `Esc` to close dialogs)
  - Empty state with a guided CTA
  - Small relative timestamps (“Just now”, “10 min ago”)
  - Soft shadows, rounded cards, and smooth hover/focus states
- **Accessibility**
  - Semantic HTML sections
  - ARIA labels for controls
  - Keyboard-focusable buttons and dialogs

---

### 2. Project Structure

```text
todoHtml2/
  index.html          # Single-page app shell and layout
  README.md           # This documentation
  styles/
    custom.css        # Small custom styles on top of Tailwind
  src/
    js/
      app.js          # Application entry: state, events, orchestration
      storage.js      # LocalStorage handling and normalization
      ui.js           # DOM rendering + dialog helpers
```

**Architecture notes**

- **Separation of concerns**
  - `storage.js`: only cares about reading/writing data.
  - `ui.js`: only cares about how things look and are rendered.
  - `app.js`: coordinates state and glue code.
- **No global variables**
  - ES modules give each file its own scope.
  - Shared state lives in `app.js` and is not attached to `window`.

---

### 3. Running the App

The app is completely static: no build step or backend is required.

- **Option 1 – Open directly**
  - Open `index.html` in a modern browser (Chrome, Edge, Firefox, Safari).
  - Because scripts use `type="module"`, some browsers may require `file://` access to allow modules; if anything looks broken, use Option 2.

- **Option 2 – Run a tiny dev server**
  - From the `todoHtml2` directory, start any static HTTP server:

    ```bash
    # Python 3
    python -m http.server 4173
    # or Node (if installed)
    npx serve .
    ```

  - Visit `http://localhost:4173` (or the URL printed by your server).

There is no separate build step because **Tailwind CSS** is loaded via CDN.  
For a production pipeline you can later:

- Replace the CDN with a precompiled Tailwind CSS bundle.
- Minify and bundle the JS modules (e.g. with Vite, esbuild, or Rollup).

---

### 4. Data Flow (Step-by-Step)

1. **App boot**
   - `app.js` runs `init()` when the DOM is ready.
   - `loadTodos()` in `storage.js` loads todos from localStorage:
     - If data is missing → returns an empty array.
     - If data is corrupted/unexpected → returns an empty array **and** an error message.
   - The error (if any) is stored in `state.storageError`.

2. **Initial render**
   - `render()` in `app.js`:
     - Computes `visibleTodos` based on the current filter + search.
     - Calls `renderTodoList()` in `ui.js` to paint the todo items.
     - Calls `renderCounters()` to update the stats.
     - Calls `renderFilterTabs()` to highlight the active filter.
     - Calls `renderAlert()` to show/hide the storage warning.

3. **User interactions**
   - **Add task**
     - User types into the main input and presses `Enter` or clicks **Add**.
     - `app.js` creates a new todo with `generateId()` and timestamps.
     - State is updated, `saveTodos()` persists it, then `render()` re-runs.
   - **Toggle completed**
     - `renderTodoList()` binds a change handler to each checkbox.
     - When toggled, `handleToggleTodo()` flips `completed` and refreshes.
   - **Edit task**
     - Clicking **Edit** opens an editable dialog via `openDialog()` in `ui.js`.
     - On confirm, the title is updated and the list re-renders.
   - **Delete task**
     - Clicking **Delete** opens a confirmation dialog.
     - On confirm, the task is removed from `state.todos` and persisted.
   - **Clear completed**
     - Clicking **Clear completed** opens a confirmation dialog.
     - On confirm, `clearCompletedTodos()` from `storage.js` removes done tasks.
   - **Filter + search**
     - Filter "tabs" switch `state.filter` between `all`, `active`, and `completed`.
     - The search bar updates `state.search` (with a small debounce) and re-renders.

---

### 5. UI & UX Decisions

- **Dashboard-style layout**
  - Centered card with a max width for comfortable reading on large screens.
  - Top header with branding + “Today” pill for quick context.
- **shadcn/ui-inspired components**
  - Filter pills mimic a tabs component with a sliding visual emphasis.
  - Dialogs share a single portal (`#dialog-root`) and are reused for:
    - Editing a todo.
    - Confirming destructive actions (deleting, clearing completed).
- **Mobile-first**
  - Layout stacks vertically on small screens.
  - Touch-friendly hit targets and spacing.
  - Typing and submitting tasks works smoothly on mobile keyboards.

---

### 6. Extending the App

Because the logic is modular, you can extend the app easily:

- **Add due dates or tags**
  - Extend the todo object shape in `app.js` and `storage.js`.
  - Render the new fields inside `renderTodoList()` in `ui.js`.
- **Add sorting (e.g. by newest / oldest)**
  - Add a `sort` property to state in `app.js`.
  - Adjust `getVisibleTodos()` to sort before returning.
  - Add a small dropdown in `index.html` and wire its change event.
- **Sync with an API**
  - Replace functions in `storage.js` with `fetch` calls and optimistic updates.
  - Keep the UI and app logic largely unchanged.

---

### 7. Accessibility & Performance Notes

- Uses semantic elements (`header`, `main`, `section`, `footer`, `ul/li`).
- Keyboard navigation:
  - All interactive elements are `<button>`s or `<input>`s.
  - Dialogs trap attention visually and support `Esc` to close and `Enter` to confirm edits.
- LocalStorage operations are very small (single JSON array) and synchronous:
  - Suitable for a todo app scale.
  - Errors are caught and logged; the UI never hard-crashes.

You can safely include this project in a **portfolio** or **client demo** as a reference implementation of a clean, local-first todo experience.

