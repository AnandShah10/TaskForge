import * as vscode from 'vscode';
import {
  Note, Task, Goal, Plan, Todo,
  STORAGE_KEYS, SINGULAR_TO_PLURAL
} from './models';

type RefreshFn = (viewType?: string) => void;

function getNonce(): string {
  let text = '';
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return text;
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttr(value: unknown): string {
  return escapeHtml(value);
}

function newId(): string {
  return Date.now().toString() + Math.floor(Math.random() * 1000).toString();
}

/** Shared boilerplate injected into every page's inline script: the VS Code
 * API handle, a small toast helper, and a dependency-free markdown-ish
 * renderer used by the Notes preview (kept local so the webview never has
 * to reach out to a CDN). */
const COMMON_SCRIPT = `
const vscode = acquireVsCodeApi();

function tfToast(msg) {
  let el = document.getElementById('tf-toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'tf-toast';
    el.className = 'tf-toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add('tf-show');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('tf-show'), 1800);
}

function tfEscape(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function tfMarkdown(src) {
  let s = tfEscape(src || '');
  s = s.replace(/^### (.*)$/gm, '<h3>$1</h3>')
       .replace(/^## (.*)$/gm, '<h2>$1</h2>')
       .replace(/^# (.*)$/gm, '<h1>$1</h1>')
       .replace(/\\*\\*(.+?)\\*\\*/g, '<strong>$1</strong>')
       .replace(/\\*(.+?)\\*/g, '<em>$1</em>')
       .replace(/\`(.+?)\`/g, '<code>$1</code>')
       .replace(/\\[(.+?)\\]\\((https?:[^\\s)]+)\\)/g, '<a href="$2">$1</a>')
       .replace(/^\\s*[-*] (.*)$/gm, '<li>$1</li>');
  s = s.replace(/(<li>[\\s\\S]*?<\\/li>)(\\n(?!<li>))/g, '$1');
  s = s.replace(/(<li>[\\s\\S]+?<\\/li>)/g, m => '<ul>' + m + '</ul>');
  s = s.split(/\\n{2,}/).map(p => /^<h[1-3]>|^<ul>/.test(p.trim()) ? p : (p.trim() ? '<p>' + p.replace(/\\n/g, '<br>') + '</p>' : '')).join('\\n');
  return s;
}
`;

export class TaskForgeWebview {
  private panel: vscode.WebviewPanel | undefined;
  private context: vscode.ExtensionContext;
  private storage: vscode.Memento;
  private refresh: RefreshFn;

  constructor(context: vscode.ExtensionContext, storage: vscode.Memento, refresh: RefreshFn) {
    this.context = context;
    this.storage = storage;
    this.refresh = refresh;
  }

  public show(viewTypeRaw: string, itemId?: string) {
    if (this.panel) {
      this.panel.dispose();
    }

    const viewType = this.normalize(viewTypeRaw, itemId);

    const title = this.titleFor(viewType);
    this.panel = vscode.window.createWebviewPanel(
      'taskForgeEditor',
      title,
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [vscode.Uri.joinPath(this.context.extensionUri, 'media')]
      }
    );

    this.panel.webview.html = this.getWebviewContent(this.panel.webview, viewType, itemId);

    this.panel.webview.onDidReceiveMessage(message => {
      switch (message.command) {
        case 'saveTodo': this.saveTodo(message.data); break;
        case 'saveNote': this.saveNote(message.data); break;
        case 'saveTask': this.saveTask(message.data); break;
        case 'saveGoal': this.saveGoal(message.data); break;
        case 'savePlan': this.savePlan(message.data); break;
        case 'updateTaskStatus': this.updateTaskStatus(message.data); break;
        case 'deleteItem':
          vscode.commands.executeCommand('taskForge.deleteItem', message.id, message.viewType);
          break;
        case 'openEditor':
          this.show(message.viewType, message.id);
          break;
        case 'closePanel':
          this.panel?.dispose();
          break;
      }
    }, undefined, this.context.subscriptions);

    this.panel.onDidDispose(() => { this.panel = undefined; });
  }

  /** Normalizes the many spellings viewType arrives in ('todos' from a tree
   * click, 'todo' for a fresh single-item editor, 'kanban'/'goalsChart' for
   * the full-board commands, and 'mixed' from global search) down to a
   * small, predictable set the renderer switches on. */
  private normalize(viewTypeRaw: string, itemId?: string): string {
    if (viewTypeRaw === 'kanban' || viewTypeRaw === 'goalsChart') { return viewTypeRaw; }
    if (viewTypeRaw === 'mixed' && itemId) {
      return this.detectTypeById(itemId) ?? 'mixed';
    }
    const plural = SINGULAR_TO_PLURAL[viewTypeRaw] ? viewTypeRaw : undefined;
    if (plural) {
      // already singular key like 'todo' -> keep, we standardize on singular below
    }
    const singularFromPlural: Record<string, string> = { todos: 'todo', notes: 'note', tasks: 'task', goals: 'goal', plans: 'plan' };
    return singularFromPlural[viewTypeRaw] ?? viewTypeRaw;
  }

  private detectTypeById(id: string): string | undefined {
    const stores: [string, string][] = [
      [STORAGE_KEYS.TODOS, 'todo'], [STORAGE_KEYS.NOTES, 'note'],
      [STORAGE_KEYS.TASKS, 'task'], [STORAGE_KEYS.GOALS, 'goal'], [STORAGE_KEYS.PLANS, 'plan']
    ];
    for (const [key, type] of stores) {
      const data: any[] = this.storage.get(key) || [];
      if (data.some(i => i.id === id)) { return type; }
    }
    return undefined;
  }

  private titleFor(viewType: string): string {
    const map: Record<string, string> = {
      todo: 'Todo', note: 'Note', task: 'Task', goal: 'Goal', plan: 'Plan',
      kanban: 'Kanban Board', goalsChart: 'Goals Dashboard'
    };
    return (map[viewType] ?? viewType) + ' · TaskForge';
  }

  // ---------- HTML shell ----------

  private shell(webview: vscode.Webview, bodyHtml: string, script: string): string {
    const nonce = getNonce();
    const cssUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'media', 'webview.css'));
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} data:; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; font-src ${webview.cspSource};">
<link href="${cssUri}" rel="stylesheet">
</head>
<body>
${bodyHtml}
<script nonce="${nonce}">
${COMMON_SCRIPT}
${script}
</script>
</body>
</html>`;
  }

  private getWebviewContent(webview: vscode.Webview, viewType: string, itemId?: string): string {
    switch (viewType) {
      case 'todo': return this.renderTodo(webview, itemId);
      case 'note': return this.renderNote(webview, itemId);
      case 'task': return this.renderTask(webview, itemId);
      case 'kanban': return this.renderKanban(webview);
      case 'goal': return this.renderGoal(webview, itemId);
      case 'goalsChart': return this.renderGoalsChart(webview);
      case 'plan': return this.renderPlan(webview, itemId);
      default:
        return this.shell(webview, `<h1>Nothing to show</h1><p class="tf-subtitle">Unknown editor type "${escapeHtml(viewType)}".</p>`, '');
    }
  }

  // ---------- Todo ----------

  private renderTodo(webview: vscode.Webview, itemId?: string): string {
    const todos: Todo[] = this.storage.get(STORAGE_KEYS.TODOS) || [];
    const todo = itemId ? todos.find(t => t.id === itemId) : undefined;
    const isNew = !todo;

    const body = `
      <h1>✅ ${isNew ? 'New Todo' : 'Edit Todo'}</h1>
      <p class="tf-subtitle">${isNew ? 'Add a quick todo item.' : 'Update the details below.'}</p>

      <label for="text">What needs to be done?</label>
      <input id="text" type="text" value="${escapeAttr(todo?.text)}" placeholder="e.g. Reply to design review">

      <div class="tf-row">
        <div>
          <label for="priority">Priority</label>
          <select id="priority">
            <option value="low" ${todo?.priority === 'low' ? 'selected' : ''}>Low</option>
            <option value="medium" ${!todo || todo.priority === 'medium' ? 'selected' : ''}>Medium</option>
            <option value="high" ${todo?.priority === 'high' ? 'selected' : ''}>High</option>
          </select>
        </div>
        <div>
          <label for="dueDate">Due date</label>
          <input id="dueDate" type="date" value="${escapeAttr(todo?.dueDate ?? '')}">
        </div>
      </div>

      <label for="tags">Tags (comma-separated)</label>
      <input id="tags" type="text" value="${escapeAttr((todo?.tags ?? []).join(', '))}" placeholder="e.g. work, urgent">

      <div class="tf-checkbox-row">
        <input id="completed" type="checkbox" ${todo?.completed ? 'checked' : ''}>
        <label for="completed">Completed</label>
      </div>

      <div class="tf-actions">
        <button id="btn-save">Save</button>
        ${!isNew ? `<button class="tf-danger" id="btn-delete">Delete</button>` : ''}
      </div>
    `;

    const script = `
      document.getElementById('btn-save').addEventListener('click', () => {
        const text = document.getElementById('text').value.trim();
        if (!text) { tfToast('A todo needs some text.'); return; }
        const tags = document.getElementById('tags').value.split(',').map(t => t.trim()).filter(Boolean);
        vscode.postMessage({
          command: 'saveTodo',
          data: {
            id: '${escapeAttr(todo?.id ?? '')}',
            text,
            priority: document.getElementById('priority').value,
            dueDate: document.getElementById('dueDate').value || undefined,
            tags,
            completed: document.getElementById('completed').checked
          }
        });
        tfToast('Todo saved');
      });
      ${!isNew ? `
      document.getElementById('btn-delete').addEventListener('click', () => {
        vscode.postMessage({ command: 'deleteItem', id: '${escapeAttr(todo?.id)}', viewType: 'todos' });
        vscode.postMessage({ command: 'closePanel' });
      });` : ''}
    `;

    return this.shell(webview, body, script);
  }

  private saveTodo(data: Partial<Todo> & { id?: string }) {
    const todos: Todo[] = this.storage.get(STORAGE_KEYS.TODOS) || [];
    const now = new Date();
    if (data.id) {
      const index = todos.findIndex(t => t.id === data.id);
      if (index !== -1) {
        todos[index] = { ...todos[index], ...data, updatedAt: now } as Todo;
      }
    } else {
      todos.unshift({
        id: newId(),
        text: data.text ?? '',
        completed: !!data.completed,
        priority: data.priority ?? 'medium',
        dueDate: data.dueDate,
        tags: data.tags ?? [],
        createdAt: now,
        updatedAt: now
      });
    }
    this.storage.update(STORAGE_KEYS.TODOS, todos);
    this.refresh('todos');
  }

  // ---------- Note ----------

  private renderNote(webview: vscode.Webview, itemId?: string): string {
    const notes: Note[] = this.storage.get(STORAGE_KEYS.NOTES) || [];
    const note = itemId ? notes.find(n => n.id === itemId) : undefined;
    const isNew = !note;

    const body = `
      <h1>📝 ${isNew ? 'New Note' : 'Edit Note'}</h1>
      <p class="tf-subtitle">Markdown-ish formatting supported: **bold**, *italic*, \`code\`, # headings, - lists, [links](url).</p>

      <label for="title">Title</label>
      <input id="title" type="text" value="${escapeAttr(note?.title)}" placeholder="Note title">

      <label for="tags">Tags (comma-separated)</label>
      <input id="tags" type="text" value="${escapeAttr((note?.tags ?? []).join(', '))}" placeholder="e.g. ideas, meeting">

      <div class="tf-checkbox-row">
        <input id="pinned" type="checkbox" ${note?.pinned ? 'checked' : ''}>
        <label for="pinned">Pin to top</label>
      </div>

      <div class="tf-toolbar" style="margin-top:14px;">
        <label style="margin:0;">Content</label>
        <button class="tf-secondary" id="btn-toggle-preview">Toggle preview</button>
      </div>
      <textarea id="content" rows="12">${escapeHtml(note?.content)}</textarea>
      <div id="tf-preview" style="display:none;"></div>

      <div class="tf-actions">
        <button id="btn-save">Save</button>
        ${!isNew ? `<button class="tf-danger" id="btn-delete">Delete</button>` : ''}
      </div>
    `;

    const script = `
      const contentEl = document.getElementById('content');
      const previewEl = document.getElementById('tf-preview');
      let previewOn = false;
      document.getElementById('btn-toggle-preview').addEventListener('click', () => {
        previewOn = !previewOn;
        previewEl.style.display = previewOn ? 'block' : 'none';
        contentEl.style.display = previewOn ? 'none' : 'block';
        if (previewOn) { previewEl.innerHTML = tfMarkdown(contentEl.value); }
      });
      document.getElementById('btn-save').addEventListener('click', () => {
        const title = document.getElementById('title').value.trim();
        if (!title) { tfToast('Give the note a title.'); return; }
        const tags = document.getElementById('tags').value.split(',').map(t => t.trim()).filter(Boolean);
        vscode.postMessage({
          command: 'saveNote',
          data: {
            id: '${escapeAttr(note?.id ?? '')}',
            title,
            content: contentEl.value,
            tags,
            pinned: document.getElementById('pinned').checked
          }
        });
        tfToast('Note saved');
      });
      ${!isNew ? `
      document.getElementById('btn-delete').addEventListener('click', () => {
        vscode.postMessage({ command: 'deleteItem', id: '${escapeAttr(note?.id)}', viewType: 'notes' });
        vscode.postMessage({ command: 'closePanel' });
      });` : ''}
    `;

    return this.shell(webview, body, script);
  }

  private saveNote(data: Partial<Note> & { id?: string }) {
    const notes: Note[] = this.storage.get(STORAGE_KEYS.NOTES) || [];
    const now = new Date();
    if (data.id) {
      const index = notes.findIndex(n => n.id === data.id);
      if (index !== -1) {
        notes[index] = { ...notes[index], ...data, updatedAt: now } as Note;
      }
    } else {
      notes.unshift({
        id: newId(),
        title: data.title ?? '',
        content: data.content ?? '',
        tags: data.tags ?? [],
        pinned: !!data.pinned,
        createdAt: now,
        updatedAt: now
      });
    }
    this.storage.update(STORAGE_KEYS.NOTES, notes);
    this.refresh('notes');
  }

  // ---------- Task (single editor) ----------

  private renderTask(webview: vscode.Webview, itemId?: string): string {
    const tasks: Task[] = this.storage.get(STORAGE_KEYS.TASKS) || [];
    const task = itemId ? tasks.find(t => t.id === itemId) : undefined;
    const isNew = !task;

    const body = `
      <h1>🧩 ${isNew ? 'New Task' : 'Edit Task'}</h1>
      <p class="tf-subtitle">For a drag-and-drop view of all tasks, open the Kanban Board.</p>

      <label for="description">Description</label>
      <input id="description" type="text" value="${escapeAttr(task?.description)}" placeholder="e.g. Wire up the settings page">

      <div class="tf-row">
        <div>
          <label for="status">Status</label>
          <select id="status">
            <option value="todo" ${!task || task.status === 'todo' ? 'selected' : ''}>Todo</option>
            <option value="in-progress" ${task?.status === 'in-progress' ? 'selected' : ''}>In Progress</option>
            <option value="done" ${task?.status === 'done' ? 'selected' : ''}>Done</option>
          </select>
        </div>
        <div>
          <label for="priority">Priority</label>
          <select id="priority">
            <option value="low" ${task?.priority === 'low' ? 'selected' : ''}>Low</option>
            <option value="medium" ${!task || task.priority === 'medium' ? 'selected' : ''}>Medium</option>
            <option value="high" ${task?.priority === 'high' ? 'selected' : ''}>High</option>
          </select>
        </div>
      </div>

      <label for="assignee">Assignee</label>
      <input id="assignee" type="text" value="${escapeAttr(task?.assignee ?? '')}" placeholder="optional">

      <label for="dependencies">Dependencies (comma-separated task IDs)</label>
      <input id="dependencies" type="text" value="${escapeAttr((task?.dependencies ?? []).join(', '))}">

      <div class="tf-actions">
        <button id="btn-save">Save</button>
        <button class="tf-secondary" id="btn-kanban">Open Kanban Board</button>
        ${!isNew ? `<button class="tf-danger" id="btn-delete">Delete</button>` : ''}
      </div>
    `;

    const script = `
      document.getElementById('btn-save').addEventListener('click', () => {
        const description = document.getElementById('description').value.trim();
        if (!description) { tfToast('Describe the task first.'); return; }
        const dependencies = document.getElementById('dependencies').value.split(',').map(t => t.trim()).filter(Boolean);
        vscode.postMessage({
          command: 'saveTask',
          data: {
            id: '${escapeAttr(task?.id ?? '')}',
            description,
            status: document.getElementById('status').value,
            priority: document.getElementById('priority').value,
            assignee: document.getElementById('assignee').value.trim() || undefined,
            dependencies
          }
        });
        tfToast('Task saved');
      });
      document.getElementById('btn-kanban').addEventListener('click', () => {
        vscode.postMessage({ command: 'openEditor', viewType: 'kanban' });
      });
      ${!isNew ? `
      document.getElementById('btn-delete').addEventListener('click', () => {
        vscode.postMessage({ command: 'deleteItem', id: '${escapeAttr(task?.id)}', viewType: 'tasks' });
        vscode.postMessage({ command: 'closePanel' });
      });` : ''}
    `;

    return this.shell(webview, body, script);
  }

  private saveTask(data: Partial<Task> & { id?: string }) {
    const tasks: Task[] = this.storage.get(STORAGE_KEYS.TASKS) || [];
    const now = new Date();
    if (data.id) {
      const index = tasks.findIndex(t => t.id === data.id);
      if (index !== -1) {
        tasks[index] = { ...tasks[index], ...data, updatedAt: now } as Task;
      } else {
        // id was generated client-side (e.g. from the Kanban "add task" form)
        tasks.unshift({
          id: data.id,
          description: data.description ?? '',
          status: data.status ?? 'todo',
          priority: data.priority ?? 'medium',
          assignee: data.assignee,
          dependencies: data.dependencies ?? [],
          createdAt: now,
          updatedAt: now
        });
      }
    } else {
      tasks.unshift({
        id: newId(),
        description: data.description ?? '',
        status: data.status ?? 'todo',
        priority: data.priority ?? 'medium',
        assignee: data.assignee,
        dependencies: data.dependencies ?? [],
        createdAt: now,
        updatedAt: now
      });
    }
    this.storage.update(STORAGE_KEYS.TASKS, tasks);
    this.refresh('tasks');
  }

  private updateTaskStatus(task: Task) {
    const tasks: Task[] = this.storage.get(STORAGE_KEYS.TASKS) || [];
    const index = tasks.findIndex(t => t.id === task.id);
    if (index !== -1) {
      tasks[index] = { ...tasks[index], ...task, updatedAt: new Date() };
      this.storage.update(STORAGE_KEYS.TASKS, tasks);
      this.refresh('tasks');
    }
  }

  // ---------- Kanban board ----------

  private renderKanban(webview: vscode.Webview): string {
    const tasks: Task[] = this.storage.get(STORAGE_KEYS.TASKS) || [];

    const body = `
      <div class="tf-toolbar">
        <h1>📋 Kanban Board</h1>
        <button id="btn-add-task">+ Add Task</button>
      </div>
      <p class="tf-subtitle">Drag cards between columns to change status. Click a card's ✎ to edit its details.</p>

      <div id="add-form" class="tf-card" style="display:none;">
        <label for="new-desc">Description</label>
        <input id="new-desc" type="text" placeholder="What needs doing?">
        <div class="tf-row">
          <div>
            <label for="new-priority">Priority</label>
            <select id="new-priority">
              <option value="low">Low</option>
              <option value="medium" selected>Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          <div>
            <label for="new-assignee">Assignee</label>
            <input id="new-assignee" type="text" placeholder="optional">
          </div>
        </div>
        <div class="tf-actions">
          <button id="btn-confirm-add">Add</button>
          <button class="tf-secondary" id="btn-cancel-add">Cancel</button>
        </div>
      </div>

      <div class="tf-board">
        <div class="tf-column" data-status="todo">
          <div class="tf-column-header"><h3>Todo</h3><span class="tf-count" id="count-todo"></span></div>
          <div class="tasks" id="col-todo"></div>
        </div>
        <div class="tf-column" data-status="in-progress">
          <div class="tf-column-header"><h3>In Progress</h3><span class="tf-count" id="count-in-progress"></span></div>
          <div class="tasks" id="col-in-progress"></div>
        </div>
        <div class="tf-column" data-status="done">
          <div class="tf-column-header"><h3>Done</h3><span class="tf-count" id="count-done"></span></div>
          <div class="tasks" id="col-done"></div>
        </div>
      </div>
    `;

    const priorityColors: Record<string, string> = { low: '#89d185', medium: '#cca700', high: '#f14c4c' };

    const script = `
      let tasks = ${JSON.stringify(tasks)};
      const priorityColors = ${JSON.stringify(priorityColors)};

      function render() {
        ['todo', 'in-progress', 'done'].forEach(status => {
          const col = document.getElementById('col-' + status);
          col.innerHTML = '';
          const inStatus = tasks.filter(t => t.status === status);
          document.getElementById('count-' + status).textContent = inStatus.length;
          if (inStatus.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'tf-empty';
            empty.textContent = 'No tasks';
            col.appendChild(empty);
            return;
          }
          inStatus.forEach(task => {
            const div = document.createElement('div');
            div.className = 'tf-task-card';
            div.draggable = true;
            div.dataset.id = task.id;
            div.style.setProperty('--tf-priority-color', priorityColors[task.priority] || priorityColors.medium);
            div.innerHTML = '<div class="tf-card-title"></div>' +
              '<div class="tf-card-meta"><span></span><span><button class="tf-icon" data-act="edit" title="Edit">✎</button>' +
              '<button class="tf-icon" data-act="delete" title="Delete">🗑</button></span></div>';
            div.querySelector('.tf-card-title').textContent = task.description;
            div.querySelector('.tf-card-meta span').textContent = task.priority + (task.assignee ? ' · @' + task.assignee : '');
            div.addEventListener('dragstart', e => e.dataTransfer.setData('text/plain', task.id));
            div.querySelector('[data-act="edit"]').addEventListener('click', () => {
              vscode.postMessage({ command: 'openEditor', viewType: 'task', id: task.id });
            });
            div.querySelector('[data-act="delete"]').addEventListener('click', () => {
              tasks = tasks.filter(t => t.id !== task.id);
              vscode.postMessage({ command: 'deleteItem', id: task.id, viewType: 'tasks' });
              render();
              tfToast('Task deleted');
            });
            col.appendChild(div);
          });
        });
      }

      document.querySelectorAll('.tf-column').forEach(col => {
        col.addEventListener('dragover', e => { e.preventDefault(); col.classList.add('tf-dragover'); });
        col.addEventListener('dragleave', () => col.classList.remove('tf-dragover'));
        col.addEventListener('drop', e => {
          e.preventDefault();
          col.classList.remove('tf-dragover');
          const id = e.dataTransfer.getData('text/plain');
          const task = tasks.find(t => t.id === id);
          if (task && task.status !== col.dataset.status) {
            task.status = col.dataset.status;
            vscode.postMessage({ command: 'updateTaskStatus', data: task });
            render();
          }
        });
      });

      document.getElementById('btn-add-task').addEventListener('click', () => {
        document.getElementById('add-form').style.display = 'block';
        document.getElementById('new-desc').focus();
      });
      document.getElementById('btn-cancel-add').addEventListener('click', () => {
        document.getElementById('add-form').style.display = 'none';
      });
      document.getElementById('btn-confirm-add').addEventListener('click', () => {
        const description = document.getElementById('new-desc').value.trim();
        if (!description) { tfToast('Describe the task first.'); return; }
        const task = {
          id: Date.now().toString() + Math.floor(Math.random() * 1000),
          description,
          status: 'todo',
          priority: document.getElementById('new-priority').value,
          assignee: document.getElementById('new-assignee').value.trim() || undefined,
          dependencies: []
        };
        tasks.unshift(task);
        vscode.postMessage({ command: 'saveTask', data: task });
        document.getElementById('new-desc').value = '';
        document.getElementById('new-assignee').value = '';
        document.getElementById('add-form').style.display = 'none';
        render();
        tfToast('Task added');
      });

      render();
    `;

    return this.shell(webview, body, script);
  }

  // ---------- Goal (single editor) ----------

  private renderGoal(webview: vscode.Webview, itemId?: string): string {
    const goals: Goal[] = this.storage.get(STORAGE_KEYS.GOALS) || [];
    const goal = itemId ? goals.find(g => g.id === itemId) : undefined;
    const isNew = !goal;

    const body = `
      <h1>🎯 ${isNew ? 'New Goal' : 'Edit Goal'}</h1>

      <label for="title">Title</label>
      <input id="title" type="text" value="${escapeAttr(goal?.title)}" placeholder="e.g. Ship v2.0">

      <label for="description">Description</label>
      <textarea id="description" rows="4" placeholder="optional">${escapeHtml(goal?.description)}</textarea>

      <div class="tf-row">
        <div>
          <label for="progress">Progress: <span id="progress-label">${goal?.progress ?? 0}%</span></label>
          <input id="progress" type="range" min="0" max="100" value="${goal?.progress ?? 0}">
        </div>
        <div>
          <label for="deadline">Deadline</label>
          <input id="deadline" type="date" value="${escapeAttr(goal?.deadline ?? '')}">
        </div>
      </div>

      <div class="tf-actions">
        <button id="btn-save">Save</button>
        <button class="tf-secondary" id="btn-dashboard">Open Goals Dashboard</button>
        ${!isNew ? `<button class="tf-danger" id="btn-delete">Delete</button>` : ''}
      </div>
    `;

    const script = `
      document.getElementById('progress').addEventListener('input', e => {
        document.getElementById('progress-label').textContent = e.target.value + '%';
      });
      document.getElementById('btn-save').addEventListener('click', () => {
        const title = document.getElementById('title').value.trim();
        if (!title) { tfToast('Give the goal a title.'); return; }
        vscode.postMessage({
          command: 'saveGoal',
          data: {
            id: '${escapeAttr(goal?.id ?? '')}',
            title,
            description: document.getElementById('description').value,
            progress: parseInt(document.getElementById('progress').value, 10),
            deadline: document.getElementById('deadline').value || undefined
          }
        });
        tfToast('Goal saved');
      });
      document.getElementById('btn-dashboard').addEventListener('click', () => {
        vscode.postMessage({ command: 'openEditor', viewType: 'goalsChart' });
      });
      ${!isNew ? `
      document.getElementById('btn-delete').addEventListener('click', () => {
        vscode.postMessage({ command: 'deleteItem', id: '${escapeAttr(goal?.id)}', viewType: 'goals' });
        vscode.postMessage({ command: 'closePanel' });
      });` : ''}
    `;

    return this.shell(webview, body, script);
  }

  private saveGoal(data: Partial<Goal> & { id?: string }) {
    const goals: Goal[] = this.storage.get(STORAGE_KEYS.GOALS) || [];
    const now = new Date();
    if (data.id) {
      const index = goals.findIndex(g => g.id === data.id);
      if (index !== -1) {
        goals[index] = { ...goals[index], ...data, updatedAt: now } as Goal;
      } else {
        goals.unshift({
          id: data.id, title: data.title ?? '', description: data.description ?? '',
          progress: data.progress ?? 0, deadline: data.deadline, createdAt: now, updatedAt: now
        });
      }
    } else {
      goals.unshift({
        id: newId(), title: data.title ?? '', description: data.description ?? '',
        progress: data.progress ?? 0, deadline: data.deadline, createdAt: now, updatedAt: now
      });
    }
    this.storage.update(STORAGE_KEYS.GOALS, goals);
    this.refresh('goals');
  }

  // ---------- Goals dashboard ----------

  private renderGoalsChart(webview: vscode.Webview): string {
    const goals: Goal[] = this.storage.get(STORAGE_KEYS.GOALS) || [];

    const body = `
      <div class="tf-toolbar">
        <h1>📊 Goals Dashboard</h1>
        <button id="btn-add-goal">+ Add Goal</button>
      </div>
      <p class="tf-subtitle">Visual progress tracking with donut + bar chart overview. Drag sliders to update (auto-saves).</p>

      <div id="add-form" class="tf-card" style="display:none;">
        <label for="new-title">Title</label>
        <input id="new-title" type="text" placeholder="e.g. Learn Rust">
        <div class="tf-actions">
          <button id="btn-confirm-add">Add</button>
          <button class="tf-secondary" id="btn-cancel-add">Cancel</button>
        </div>
      </div>

      <div id="overview" class="tf-chart-overview"></div>
      <div id="goal-list"></div>
    `;

    const script = `
      let goals = ${JSON.stringify(goals)};
      let saveTimer;

      function getProgressClass(p) {
        if (p >= 75) return 'high';
        if (p >= 40) return 'medium';
        return 'low';
      }

      function renderOverview() {
        const overview = document.getElementById('overview');
        if (goals.length === 0) {
          overview.innerHTML = '<div style="color:var(--fg-secondary);padding:20px;text-align:center;">Add goals to see charts</div>';
          return;
        }
        const avg = Math.round(goals.reduce((sum, g) => sum + g.progress, 0) / goals.length);
        const barsHtml = goals.map(g => \`
          <div class="tf-bar-row">
            <div class="tf-bar-label" title="\${g.title}">\${g.title}</div>
            <div class="tf-bar"><div class="tf-bar-fill" style="width:\${g.progress}%"></div></div>
            <div style="width:42px;text-align:right;font-weight:600;color:var(--success)">\${g.progress}%</div>
          </div>
        \`).join('');

        overview.innerHTML = \`
          <div class="tf-donut" style="--progress-pct: \${avg}%;">
            <div class="tf-donut-inner">
              \${avg}<span style="font-size:0.5em;">%</span>
              <div class="tf-donut-label">AVG</div>
            </div>
          </div>
          <div style="flex:1;">
            <div style="margin-bottom:12px;font-weight:600;color:var(--fg-secondary);">Progress Overview</div>
            <div class="tf-bar-chart">\${barsHtml}</div>
          </div>
        \`;
      }

      function render() {
        renderOverview();
        const list = document.getElementById('goal-list');
        list.innerHTML = '';
        if (goals.length === 0) {
          list.innerHTML = '<div class="tf-empty">No goals yet — add one above.</div>';
          return;
        }
        goals.forEach(goal => {
          const card = document.createElement('div');
          card.className = 'tf-card';
          const progClass = getProgressClass(goal.progress);
          card.innerHTML = \`
            <div class="tf-card-header">
              <div style="flex:1;">
                <div class="tf-card-title"></div>
                <div class="tf-card-meta"></div>
                <div class="tf-goal-bar-track"><div class="tf-goal-bar-fill \${progClass}" style="width:\${goal.progress}%"></div></div>
                <input type="range" min="0" max="100" value="\${goal.progress}" style="width:100%; margin-top:6px;">
              </div>
              <div class="tf-card-actions">
                <button class="tf-icon" data-act="edit" title="Edit details">✎</button>
                <button class="tf-icon" data-act="delete" title="Delete">🗑</button>
              </div>
            </div>
          \`;
          card.querySelector('.tf-card-title').textContent = goal.title;
          card.querySelector('.tf-card-meta').textContent = goal.progress + '%' + (goal.deadline ? ' · due ' + goal.deadline : '');
          const slider = card.querySelector('input[type=range]');
          const fill = card.querySelector('.tf-goal-bar-fill');
          const meta = card.querySelector('.tf-card-meta');
          slider.addEventListener('input', () => {
            goal.progress = parseInt(slider.value, 10);
            fill.style.width = goal.progress + '%';
            fill.className = 'tf-goal-bar-fill ' + getProgressClass(goal.progress);
            meta.textContent = goal.progress + '%' + (goal.deadline ? ' · due ' + goal.deadline : '');
            clearTimeout(saveTimer);
            saveTimer = setTimeout(() => {
              vscode.postMessage({ command: 'saveGoal', data: goal });
              tfToast('Progress updated');
              renderOverview(); // refresh chart
            }, 400);
          });
          card.querySelector('[data-act="edit"]').addEventListener('click', () => {
            vscode.postMessage({ command: 'openEditor', viewType: 'goal', id: goal.id });
          });
          card.querySelector('[data-act="delete"]').addEventListener('click', () => {
            goals = goals.filter(g => g.id !== goal.id);
            vscode.postMessage({ command: 'deleteItem', id: goal.id, viewType: 'goals' });
            render();
            tfToast('Goal deleted');
          });
          list.appendChild(card);
        });
      }

      document.getElementById('btn-add-goal').addEventListener('click', () => {
        document.getElementById('add-form').style.display = 'block';
        document.getElementById('new-title').focus();
      });
      document.getElementById('btn-cancel-add').addEventListener('click', () => {
        document.getElementById('add-form').style.display = 'none';
      });
      document.getElementById('btn-confirm-add').addEventListener('click', () => {
        const title = document.getElementById('new-title').value.trim();
        if (!title) { tfToast('Give the goal a title.'); return; }
        const goal = { id: Date.now().toString() + Math.floor(Math.random() * 1000), title, description: '', progress: 0 };
        goals.unshift(goal);
        vscode.postMessage({ command: 'saveGoal', data: goal });
        document.getElementById('new-title').value = '';
        document.getElementById('add-form').style.display = 'none';
        render();
        tfToast('Goal added');
      });

      render();
    `;

    return this.shell(webview, body, script);
  }

  // ---------- Plan (single editor with a step list) ----------

  private renderPlan(webview: vscode.Webview, itemId?: string): string {
    const plans: Plan[] = this.storage.get(STORAGE_KEYS.PLANS) || [];
    const plan = itemId ? plans.find(p => p.id === itemId) : undefined;
    const isNew = !plan;
    const steps = plan?.steps ?? [];

    const body = `
      <h1>🗺️ ${isNew ? 'New Plan' : 'Edit Plan'}</h1>

      <label for="title">Title</label>
      <input id="title" type="text" value="${escapeAttr(plan?.title)}" placeholder="e.g. Launch roadmap">

      <label for="description">Description</label>
      <textarea id="description" rows="3" placeholder="optional">${escapeHtml(plan?.description)}</textarea>

      <div class="tf-row">
        <div>
          <label for="start">Start</label>
          <input id="start" type="date" value="${escapeAttr(plan?.timeline?.start ?? '')}">
        </div>
        <div>
          <label for="end">End</label>
          <input id="end" type="date" value="${escapeAttr(plan?.timeline?.end ?? '')}">
        </div>
      </div>

      <div class="tf-toolbar" style="margin-top:14px;">
        <label style="margin:0;">Steps</label>
        <button class="tf-secondary" id="btn-add-step">+ Add Step</button>
      </div>
      <div id="steps"></div>

      <div class="tf-actions">
        <button id="btn-save">Save</button>
        ${!isNew ? `<button class="tf-danger" id="btn-delete">Delete</button>` : ''}
      </div>
    `;

    const script = `
      let steps = ${JSON.stringify(steps)};

      function renderSteps() {
        const container = document.getElementById('steps');
        container.innerHTML = '';
        if (steps.length === 0) {
          container.innerHTML = '<div class="tf-empty">No steps yet.</div>';
        }
        steps.forEach((step, i) => {
          const row = document.createElement('div');
          row.className = 'tf-step';
          row.innerHTML = '<span class="tf-step-num"></span><input type="text">' +
            '<button class="tf-icon" data-act="up" title="Move up">↑</button>' +
            '<button class="tf-icon" data-act="down" title="Move down">↓</button>' +
            '<button class="tf-icon" data-act="remove" title="Remove">✕</button>';
          row.querySelector('.tf-step-num').textContent = (i + 1) + '.';
          const input = row.querySelector('input');
          input.value = step;
          input.addEventListener('input', () => { steps[i] = input.value; });
          row.querySelector('[data-act="up"]').addEventListener('click', () => {
            if (i > 0) { [steps[i-1], steps[i]] = [steps[i], steps[i-1]]; renderSteps(); }
          });
          row.querySelector('[data-act="down"]').addEventListener('click', () => {
            if (i < steps.length - 1) { [steps[i+1], steps[i]] = [steps[i], steps[i+1]]; renderSteps(); }
          });
          row.querySelector('[data-act="remove"]').addEventListener('click', () => {
            steps.splice(i, 1); renderSteps();
          });
          container.appendChild(row);
        });
      }

      document.getElementById('btn-add-step').addEventListener('click', () => {
        steps.push('');
        renderSteps();
        const inputs = document.querySelectorAll('#steps input');
        if (inputs.length) { inputs[inputs.length - 1].focus(); }
      });

      document.getElementById('btn-save').addEventListener('click', () => {
        const title = document.getElementById('title').value.trim();
        if (!title) { tfToast('Give the plan a title.'); return; }
        vscode.postMessage({
          command: 'savePlan',
          data: {
            id: '${escapeAttr(plan?.id ?? '')}',
            title,
            description: document.getElementById('description').value,
            steps: steps.filter(s => s.trim().length > 0),
            timeline: { start: document.getElementById('start').value, end: document.getElementById('end').value }
          }
        });
        tfToast('Plan saved');
      });
      ${!isNew ? `
      document.getElementById('btn-delete').addEventListener('click', () => {
        vscode.postMessage({ command: 'deleteItem', id: '${escapeAttr(plan?.id)}', viewType: 'plans' });
        vscode.postMessage({ command: 'closePanel' });
      });` : ''}

      renderSteps();
    `;

    return this.shell(webview, body, script);
  }

  private savePlan(data: Partial<Plan> & { id?: string }) {
    const plans: Plan[] = this.storage.get(STORAGE_KEYS.PLANS) || [];
    const now = new Date();
    if (data.id) {
      const index = plans.findIndex(p => p.id === data.id);
      if (index !== -1) {
        plans[index] = { ...plans[index], ...data, updatedAt: now } as Plan;
      }
    } else {
      plans.unshift({
        id: newId(),
        title: data.title ?? '',
        description: data.description ?? '',
        steps: data.steps ?? [],
        timeline: data.timeline ?? { start: '', end: '' },
        createdAt: now,
        updatedAt: now
      });
    }
    this.storage.update(STORAGE_KEYS.PLANS, plans);
    this.refresh('plans');
  }
}