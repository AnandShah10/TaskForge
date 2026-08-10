# Changelog

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