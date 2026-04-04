# TaskForge

A customizable VS Code extension for forging productivity: todos, notes, tasks (Kanban), goals (charts), plans with Git sync.

## Features
- **Todos/Notes/Plans**: Tree views, add/edit, persistence.
- **Tasks**: Kanban board (drag-drop status).
- **Goals**: Interactive progress charts (Chart.js).
- **Git Sync**: Export/import to `.taskforge.json` (commit manually).
- **Search/Delete**: Global search, context delete.
- **Customization**: Themes, auto-save/export, max items.

## Setup
1. Install .vsix or from Marketplace.
2. Commands: "TaskForge: Add ..." or "Open Kanban".
3. Sidebar: "TaskForge" icon.
4. Git: Run export → commit `.taskforge.json`.

## Development
- `npm install && npm run compile`
- F5 to debug.
- Settings: `taskForge.*`

## Publishing
`npx vsce package` / `npx vsce publish`

MIT License