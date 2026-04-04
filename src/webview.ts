import * as path from 'path';
import * as vscode from 'vscode';
import { Note, Task, Goal, STORAGE_KEYS } from './models';

export class TaskForgeWebview {
  private panel: vscode.WebviewPanel | undefined;
  private context: vscode.ExtensionContext;
  private storage: vscode.Memento;

  constructor(context: vscode.ExtensionContext, storage: vscode.Memento) {
    this.context = context;
    this.storage = storage;
  }

  public show(viewType: string, itemId?: string) {
    if (this.panel) {
      this.panel.dispose();
    }

    const title = viewType.charAt(0).toUpperCase() + viewType.slice(1) + ' Editor';
    this.panel = vscode.window.createWebviewPanel(
      'taskForgeEditor',
      title,
      vscode.ViewColumn.One,
      { enableScripts: true, retainContextWhenHidden: true }
    );

    this.panel.webview.html = this.getWebviewContent(viewType, itemId);

    this.panel.webview.onDidReceiveMessage(message => {
      switch (message.command) {
        case 'saveNote':
          this.saveNote(message.data);
          break;
        case 'updateTaskStatus':
          this.updateTaskStatus(message.data);
          break;
        case 'updateGoalProgress':
          this.updateGoalProgress(message.data);
          break;
        case 'deleteItem':
          vscode.commands.executeCommand('taskForge.deleteItem', message.id, viewType);
          break;
      }
    }, undefined, this.context.subscriptions);

    this.panel.onDidDispose(() => { this.panel = undefined; });
  }

  private getWebviewContent(viewType: string, itemId?: string): string {
    const theme = vscode.workspace.getConfiguration('taskForge').get<string>('theme', 'default');
    const cssClass = theme !== 'default' ? `${theme}-theme` : '';

    let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: var(--vscode-font-family); padding: 20px; }
        .${cssClass} { background: var(--vscode-${theme}-editor-background, #fff); color: var(--vscode-${theme}-editor-foreground, #000); }
        button { background: var(--vscode-button-background); color: var(--vscode-button-foreground); padding: 8px; }
        #preview { border: 1px solid; padding: 10px; }
      </style>
    `;

    if (viewType === 'note') {
      html += `<script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>`;
    } else if (viewType === 'kanban') {
      html += `<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>`; // For potential charts in kanban
    } else if (viewType === 'goalsChart') {
      html += `<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>`;
    }

    html += `</head><body class="${cssClass}">`;

    switch (viewType) {
      case 'note':
        const notes: Note[] = this.storage.get(STORAGE_KEYS.NOTES) || [];
        const note = itemId ? (notes.find(n => n.id === itemId) || { title: '', content: '' }) : { title: '', content: '' }; // Fixed: Always defined
        html += `
          <h1>Edit Note</h1>
          <input id="title" value="${note.title}" placeholder="Title"><br>
          <textarea id="content">${note.content}</textarea><br>
          <button onclick="save()">Save</button>
          <button onclick="preview()">Preview</button>
          <div id="preview"></div>
          <script>
            const vscode = acquireVsCodeApi();
            function save() {
              vscode.postMessage({command: 'saveNote', data: {title: document.getElementById('title').value, content: document.getElementById('content').value, id: '${itemId || ''}'}});
            }
            function preview() {
              document.getElementById('preview').innerHTML = marked.parse(document.getElementById('content').value);
            }
          </script>
        `;
        break;

      case 'kanban':
        const tasks: Task[] = this.storage.get(STORAGE_KEYS.TASKS) || [];
        html += `
          <h1>Kanban Board</h1>
          <div id="kanban" style="display: flex; gap: 20px;">
            <div class="column" data-status="todo"><h3>Todo</h3><div class="tasks"></div></div>
            <div class="column" data-status="in-progress"><h3>In Progress</h3><div class="tasks"></div></div>
            <div class="column" data-status="done"><h3>Done</h3><div class="tasks"></div></div>
          </div>
          <script>
            const vscode = acquireVsCodeApi();
            let tasks = ${JSON.stringify(tasks)};
            function render() {
              document.querySelectorAll('.column .tasks').forEach(col => col.innerHTML = '');
              tasks.forEach(task => {
                const div = document.createElement('div');
                div.draggable = true;
                div.textContent = task.description;
                div.dataset.id = task.id;
                div.ondragstart = (e) => e.dataTransfer.setData('text/plain', task.id);
                document.querySelector(\`.column[data-status="\${task.status}"] .tasks\`).appendChild(div);
              });
            }
            document.addEventListener('dragover', e => e.preventDefault());
            document.addEventListener('drop', e => {
              e.preventDefault();
              const id = e.dataTransfer.getData('text/plain');
              const col = e.target.closest('.column');
              if (col) {
                const task = tasks.find(t => t.id === id);
                if (task) {
                  task.status = col.dataset.status;
                  task.updatedAt = new Date().toISOString();
                  vscode.postMessage({command: 'updateTaskStatus', data: task});
                  render();
                }
              }
            });
            render();
          </script>
          <style>.column { border: 1px solid; padding: 10px; min-width: 200px; } .tasks div { padding: 5px; border: 1px dashed; margin: 5px 0; }</style>
        `;
        break;

      case 'goalsChart':
        const goals: Goal[] = this.storage.get(STORAGE_KEYS.GOALS) || [];
        html += `
          <h1>Goals Progress Chart</h1>
          <canvas id="chart" width="400" height="200"></canvas>
          <script>
            const vscode = acquireVsCodeApi();
            const ctx = document.getElementById('chart').getContext('2d');
            new Chart(ctx, {
              type: 'bar',
              data: {
                labels: ${JSON.stringify(goals.map(g => g.title))},
                datasets: [{ label: 'Progress %', data: ${JSON.stringify(goals.map(g => g.progress))}, backgroundColor: 'rgba(75,192,192,0.2)' }]
              },
              options: { scales: { y: { beginAtZero: true, max: 100 } } }
            });
            // Update progress input (simple)
            document.body.innerHTML += '<br><input id="progress" type="number" min="0" max="100" placeholder="Update progress for selected goal"><button onclick="update()">Update</button>';
            function update() {
              const prog = document.getElementById('progress').value;
              if (prog && goals.length > 0) { // Assume first goal for simplicity
                vscode.postMessage({command: 'updateGoalProgress', data: {id: goals[0].id, progress: parseInt(prog)}});
              }
            }
          </script>
        `;
        break;

      default:
        html += `<p>Editor for ${viewType} coming soon!</p>`;
    }

    html += '</body></html>';
    return html;
  }

  private saveNote(data: { title: string; content: string; id?: string }) {
    const notes: Note[] = this.storage.get(STORAGE_KEYS.NOTES) || [];
    if (data.id) {
      const index = notes.findIndex(n => n.id === data.id);
      if (index !== -1) {
        notes[index] = { ...notes[index], title: data.title, content: data.content, updatedAt: new Date() };
      }
    } else {
      const newNote: Note = { id: Date.now().toString(), title: data.title, content: data.content, tags: [], createdAt: new Date(), updatedAt: new Date(), pinned: false };
      notes.unshift(newNote);
    }
    this.storage.update(STORAGE_KEYS.NOTES, notes);
    vscode.window.showInformationMessage('Note saved!');
  }

  private updateTaskStatus(task: Task) {
    const tasks: Task[] = this.storage.get(STORAGE_KEYS.TASKS) || [];
    const index = tasks.findIndex(t => t.id === task.id);
    if (index !== -1) {
      tasks[index] = { ...task, updatedAt: new Date() };
      this.storage.update(STORAGE_KEYS.TASKS, tasks);
      vscode.window.showInformationMessage('Task status updated!');
    }
  }

  private updateGoalProgress(data: { id: string; progress: number }) {
    const goals: Goal[] = this.storage.get(STORAGE_KEYS.GOALS) || [];
    const index = goals.findIndex(g => g.id === data.id);
    if (index !== -1) {
      goals[index] = { ...goals[index], progress: data.progress, updatedAt: new Date() };
      this.storage.update(STORAGE_KEYS.GOALS, goals);
      vscode.window.showInformationMessage('Goal progress updated!');
    }
  }
}