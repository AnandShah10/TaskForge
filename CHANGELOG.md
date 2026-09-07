# Changelog

## 1.0.1 - UX Polish and Delete Confirmation

### Changed
- Redesigned the Notes create/edit experience with a clearer title field, pin and tag controls, Markdown editor/preview switch, and a larger writing surface.
- Added responsive behavior for the Notes editor when the VS Code panel is narrow.
- Restyled Goal and Plan delete actions as compact circular danger icon buttons.

### Fixed
- Registered the shared delete command used by legacy editor actions so deletes persist and refresh all views.
- Replaced unsupported browser `confirm()` dialogs in the VS Code webview with an in-app confirmation modal for todos, notes, tasks, goals, plans, and plan steps.

## 1.0.0 - React + Vite Migration (Complete)

### Added
- Full React 18 + TypeScript + Vite webview replacing the legacy vanilla implementation.
- All views (Hub, Todos, Notes, Kanban/Tasks, Goals with Recharts, Plans) implemented as modular TSX components.
- Shared components: Modal, RailNav, ToastContainer, useVSCodeMessage hook.
- Advanced features: Drag-and-drop Kanban (@hello-pangea/dnd), interactive charts (Recharts), live Markdown preview, global search, optimistic updates.
- Full VS Code theming support using design tokens in CSS.
- Vite build integration for optimized assets and improved dev experience (HMR).

### Changed
- **Major rewrite**: `src/panel.ts` now serves React bundle from `out/webview/assets/index.js/css`. Legacy `panelHtml.ts` deprecated.
- `FullState` interface exported from `models.ts`; TypeScript hardening across the board (no more loose `any[]`).
- Build scripts updated to include `npm run build:webview` (Vite) in compile/package.
- Sidebar stats and quick-add updated for new state.
- Documentation (README, MIGRATION_REPORT) refreshed with screenshots, architecture details, and dev instructions.
- Version bump and dependency updates (React, Recharts, lucide-react, etc.).
- Removed obsolete settings (`taskForge.autoSave`, theme vars) and old CDN dependencies.

### Fixed
- All prior issues with editing, deleting, importing, offline support, and theming from v0.4.0–0.6.0.
- Message routing now comprehensively covers every CRUD operation and view-specific actions (plan steps, etc.).
- 100% feature parity with significant UX improvements (modals, toasts, responsive design).

See [MIGRATION_REPORT.md](MIGRATION_REPORT.md) for the full migration story, file-by-file diffs, and benefits.

## 0.6.0 - Icon

### Changed
- Changed the background of logo to transparent.

## 0.5.0 — Icon & polish

### Changed
- Activity bar icon updated to SVG (`media/icon.svg` using wrench design matching the 🛠️ branding). PNG is kept only for the Marketplace extension icon (as PNG does not render reliably in the activity bar).
- Bumped version and updated changelog.

## 0.4.0 — UI/UX overhaul

### Fixed (functional bugs, not just cosmetic)
- **"Edit Item" was broken for every item type.** The tree passed plural
  view types (`todos`, `notes`, ...) into the webview, but the webview only
  recognized singular/board names (`note`, `kanban`, `goalsChart`), so
  right-click → Edit Item always rendered a "coming soon" placeholder.
  The webview now normalizes every spelling it can receive.
- **`taskForge.editItem` was never declared in `package.json`**, so the
  context-menu entry that invoked it could fail silently in some VS Code
  versions. It's now a proper contributed command.
- **Delete Item did nothing.** `deleteItem`/`toggleItem` indexed
  `STORAGE_KEYS` (whose keys are `TODOS`, `NOTES`, ...) using the lowercase
  view type (`todos`, `notes`, ...), which always missed, so the delete
  silently no-opped. Fixed with an explicit lowercase→storage-key map.
- **Import from Git did nothing.** The same lowercase/uppercase key
  mismatch meant `importFromGit` never actually wrote imported data back
  into storage, while still reporting success. Fixed with the same map.
- Webview panels loaded Chart.js and marked.js from a public CDN — this
  silently failed offline and was flagged by the extension's own CSP-less
  HTML. Replaced with a small dependency-free markdown renderer and
  CSS/DOM-based progress bars, so notes/goals work with no network access.

### Changed (UI/UX)
- Every webview editor now uses VS Code's real theme variables (the old
  `--vscode-${theme}-editor-background` variable doesn't exist, so the
  `taskForge.theme` setting never had any visual effect — it's been
  removed along with the dead `taskForge.autoSave` setting).
- Added a proper stylesheet (`media/webview.css`) shared by all editors,
  loaded under a real Content-Security-Policy with a per-render nonce.
- **Kanban board**: cards are color-accented by priority, have inline
  edit/delete buttons, and a slide-out "Add Task" form — no more needing
  to add tasks from a separate command.
- **Goals**: replaced the old "always updates the first goal" hack with a
  full dashboard — every goal gets its own progress slider, deadline, and
  delete button.
- **Plans**: previously had no editor at all ("coming soon"). Now has a
  title/description/timeline form plus an add/remove/reorder step list.
- **Todos**: gained a real single-item editor (priority, due date, tags,
  completed) instead of being toggle-only; overdue items are flagged in
  the tree.
- Tree views: sorted (incomplete/urgent first), richer descriptions and
  hover tooltips, priority-colored icons, and helpful empty-state
  "Welcome" screens with action buttons instead of a bare "coming soon".
- Added toolbar icons to view titles so Add/Open/Refresh actions show up
  as icon buttons instead of being buried in the "…" overflow menu.
- Every save now gives quiet toast-style feedback inside the webview
  rather than relying solely on top-of-window notification popups.

## 0.3.1 and earlier
See git history.