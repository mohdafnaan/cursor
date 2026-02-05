## FocusFlow – Modern Productivity Dashboard

FocusFlow is a small but production-grade SaaS-style web app built with **Next.js**, **TypeScript**, **Tailwind CSS**, and **shadcn-style UI components**.

It is designed for:

- **Portfolio pieces** – shows real-world engineering and UX decisions
- **Client demos / MVPs** – easy to customise for new projects
- **Real users** – keyboard-friendly, accessible, and persistent

---

## 1. Project Overview

- **Problem**: Many todo apps are either too basic or too heavy. FocusFlow aims to be a calm, focused dashboard for planning the day, with just enough analytics to feel like a real SaaS product.
- **Solution**: A single-page dashboard with:
  - Task inbox with **full CRUD**, search, filters, sort, bulk actions, undo, and toasts
  - **Analytics sidebar** with completion rate, activity today, and streaks
  - **Onboarding dialog**, offline banner, and keyboard shortcuts
  - **LocalStorage persistence** with defensive parsing and safe fallbacks

---

## 2. Tech Stack

- **Framework**: Next.js 16 (App Router, TypeScript)
- **Language**: TypeScript (strict, React 19)
- **Styling**: Tailwind CSS v4 with design tokens
- **UI Kit**: shadcn-style components built on:
  - `@radix-ui/react-dialog`
  - `@radix-ui/react-dropdown-menu`
  - `@radix-ui/react-tabs`
  - `@radix-ui/react-toast`
- **Icons**: `lucide-react`
- **Theming**: `next-themes` (light / dark mode via `class="dark"`)
- **Persistence**: `localStorage` (browser only, via a small storage layer)

---

## 3. Folder Structure

The interesting parts of the app live under `src/`:

- `src/app/`
  - `layout.tsx` – global fonts, theme provider, toast provider
  - `page.tsx` – thin entry that renders the dashboard shell
- `src/components/`
  - `dashboard/app-shell.tsx` – main layout, composed of:
    - Header (branding, theme toggle, shortcuts)
    - Task card (quick add, search, filters, bulk actions, list)
    - Analytics card (metrics + streak)
    - Tips card (onboarding hints)
    - Onboarding dialog + shortcuts dialog
  - `ui/` – shadcn-style primitives:
    - `button.tsx`, `input.tsx`, `card.tsx`, `checkbox.tsx`
    - `dialog.tsx`, `dropdown-menu.tsx`, `tabs.tsx`
    - `toast.tsx`, `skeleton.tsx`
  - `theme-provider.tsx` – wraps `next-themes`
- `src/hooks/`
  - `useDashboardState.ts` – centralised state (tasks, settings, analytics)
- `src/lib/`
  - `types.ts` – domain types (`Task`, `Project`, `AppSettings`, `PersistedState`)
  - `storage.ts` – LocalStorage read/write with validation and fallbacks
  - `analytics.ts` – pure functions for metrics and streaks
  - `utils.ts` – shared helpers (`cn`)

This separation keeps **UI**, **business logic**, and **data persistence** decoupled.

---

## 4. Data Flow & State Management

### 4.1 Core Ideas

- The dashboard is **client-side stateful** (no backend), perfect for MVPs and demos.
- All essential state (tasks, projects, settings, completion history) is stored in a single object.
- **`useDashboardState`** is the only hook that can mutate this state:
  - Internally it uses `useReducer` to keep updates predictable.
  - Every successful update triggers a LocalStorage write.

### 4.2 State Shape

- `tasks: Task[]`
  - `status: "todo" | "in-progress" | "done" | "archived"`
  - `priority: "low" | "medium" | "high"`
  - timestamps for lifecycle events (`createdAt`, `updatedAt`, `completedAt`)
- `projects: Project[]`
  - Currently only an `Inbox` project is used (easy to extend later)
- `settings: AppSettings`
  - `confirmBeforeDelete`, `enableSounds`, `showOnboarding`, `defaultProjectId`
- `completionHistory: CompletionEntry[]`
  - Derived from tasks; used for analytics and streaks

### 4.3 Persistence Layer

- `storage.ts` encapsulates LocalStorage logic:
  - `loadState()` – parses JSON, defends against:
    - Missing keys
    - Wrong types
    - Corrupted JSON
  - `saveState()` – serialises minimal state; errors are swallowed so the UI never crashes
  - `getInitialState()` – smart defaults:
    - An `Inbox` project
    - A friendly welcome task
    - Onboarding enabled

### 4.4 Business Logic

- `useDashboardState` defines actions:
  - `createTask`, `updateTask`, `deleteTask`
  - `bulkUpdateStatus` (used for bulk actions)
  - `restoreLastDeleted` (supports undo)
  - `createProject`, `updateSettings`
- `analytics.ts` exposes pure functions:
  - `computeCompletionHistory(tasks)`
  - `computeAnalytics(tasks, history)` → totals, completion rate, streak days, today count

---

## 5. UI & UX Decisions

- **Dashboard layout**
  - Main column: tasks (primary job of the user)
  - Sidebar: analytics + tips (secondary / supporting information)
  - Sticky top bar with brand, offline indicator, theme toggle, and shortcuts entry
- **Empty / loading / error**
  - Skeleton loaders while data hydrates
  - Friendly empty-state message when filters produce no results
  - Defensive LocalStorage parsing: if anything is broken, the app falls back to a clean, usable state
- **Keyboard-first design**
  - `N` – focus quick-add
  - `Ctrl/Cmd + K` – focus search
  - `?` – open keyboard reference
  - `Ctrl/Cmd + Z` – undo last delete
- **Micro-interactions**
  - Soft shadows on cards, hover states, subtle rounded corners
  - Smooth toast animations, focus-ring styles, and state badges for status/priority
- **Accessibility**
  - Semantic layout (`header`, `main`, `section`, `aside`)
  - Radix-powered dialogs and menus with ARIA attributes
  - High-contrast theme tokens (light & dark)
  - Full keyboard navigation, visible focus outlines

---

## 6. Running the App Locally

From the `saas-dashboard` folder:

```bash
npm install
npm run dev
```

Then open `http://localhost:3000` in your browser.

### Recommended checks

- **Lint**: `npm run lint`
- **TypeScript**: Next.js runs type-checking during `next build`

---

## 7. Deployment Guide

FocusFlow is a standard Next.js App Router app, so you can deploy it like any other Next.js project.

### 7.1 Vercel (recommended)

1. Push the repository to GitHub/GitLab/Bitbucket.
2. Create a new project on Vercel and import the repo.
3. Use the default settings:
   - Framework: Next.js
   - Build command: `next build`
   - Output: `.next`
4. Click **Deploy** – Vercel will handle builds, previews, and production deployments.

### 7.2 Custom Node / Docker

1. Build the app:

   ```bash
   npm run build
   ```

2. Start it:

   ```bash
   npm start
   ```

3. Behind a reverse proxy (NGINX, Caddy, etc.), point traffic to port `3000`.

Because FocusFlow stores data in the browser only (LocalStorage), there is:

- No database to provision
- No server-side session storage
- No environment variables required

---

## 8. How to Extend This App

Here are natural next steps if you want to grow this into a more full SaaS:

- **User accounts** (e.g. Auth.js / NextAuth + a database)
- **Team workspaces** and shared projects
- **Server-side analytics** with real charts and cohort tracking
- **Background jobs** to send email digests or reminders
- **AI assistant** to triage tasks and suggest priorities

The current architecture (centralised state, clear types, small pure helper modules) is intentionally chosen so that adding these features later remains straightforward.

