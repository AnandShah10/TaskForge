import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useVSCodeMessage, FullState } from './hooks/useVSCodeMessage';
import RailNav from './components/RailNav';
import HubView from './views/HubView';
import TodosView from './views/TodosView';
import NotesView from './views/NotesView';
import TasksView from './views/TasksView';
import GoalsView from './views/GoalsView';
import PlansView from './views/PlansView';
import ToastContainer from './components/ToastContainer';
import './index.css';

const VIEWS = ['hub', 'todos', 'notes', 'tasks', 'goals', 'plans'] as const;
type View = typeof VIEWS[number];

const viewTitles: Record<View, string> = {
  hub: 'Hub',
  todos: 'Todos',
  notes: 'Notes',
  tasks: 'Tasks · Kanban',
  goals: 'Goals',
  plans: 'Plans',
};

const cloneState = (value: FullState): FullState => JSON.parse(JSON.stringify(value));

function App() {
  const { state, postMessage, isReady, toasts, dismissToast } = useVSCodeMessage();
  const [currentView, setCurrentView] = useState<View>('hub');
  const [searchTerm, setSearchTerm] = useState('');
  const [history, setHistory] = useState<FullState[]>([]);
  const [future, setFuture] = useState<FullState[]>([]);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const canUndo = history.length > 0;
  const canRedo = future.length > 0;

  const pushToHistory = useCallback(() => {
    setHistory(prev => [...prev, cloneState(state)]);
    setFuture([]);
  }, [state]);

  const handleAction = useCallback((type: string, payload: any = {}) => {
    if (!['ready', 'exportToGit', 'importFromGit', 'replaceAll'].includes(type)) {
      pushToHistory();
    }
    postMessage({ type, ...payload });
  }, [postMessage, pushToHistory]);

  const undo = useCallback(() => {
    if (!canUndo) return;
    const previous = history[history.length - 1];
    const current = cloneState(state);
    setHistory(prev => prev.slice(0, -1));
    setFuture(prev => [current, ...prev]);
    postMessage({ type: 'replaceAll', data: previous });
  }, [canUndo, history, postMessage, state]);

  const redo = useCallback(() => {
    if (!canRedo) return;
    const next = future[0];
    const current = cloneState(state);
    setHistory(prev => [...prev, current]);
    setFuture(prev => prev.slice(1));
    postMessage({ type: 'replaceAll', data: next });
  }, [canRedo, future, postMessage, state]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isModifier = event.metaKey || event.ctrlKey;
      if (!isModifier) return;

      const key = event.key.toLowerCase();

      if (key === 'z' && !event.shiftKey) {
        event.preventDefault();
        undo();
        return;
      }

      if ((key === 'z' && event.shiftKey) || key === 'y') {
        event.preventDefault();
        redo();
        return;
      }

      if (key === 'k') {
        event.preventDefault();
        searchInputRef.current?.focus();
        return;
      }

      const viewMap: Record<string, View> = {
        '1': 'hub',
        '2': 'todos',
        '3': 'notes',
        '4': 'tasks',
        '5': 'goals',
        '6': 'plans',
      };

      if (viewMap[key]) {
        event.preventDefault();
        setCurrentView(viewMap[key]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [redo, undo]);

  if (!isReady) {
    return <div className="app" style={{ padding: '20px' }}>Loading TaskForge...</div>;
  }

  return (
    <div className="app">
      <RailNav 
        currentView={currentView} 
        onNavClick={setCurrentView} 
      />
      
      <div className="main">
        <div className="topbar">
          <h1>{viewTitles[currentView]}</h1>
          
          <div className="searchbox">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input 
              ref={searchInputRef}
              type="text" 
              placeholder="Search everything..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="top-actions">
            <button
              className="icon-btn"
              onClick={undo}
              title="Undo (Ctrl/Cmd+Z)"
              disabled={!canUndo}
              style={{ opacity: canUndo ? 1 : 0.4 }}
            >
              ↶
            </button>
            <button
              className="icon-btn"
              onClick={redo}
              title="Redo (Ctrl/Cmd+Shift+Z)"
              disabled={!canRedo}
              style={{ opacity: canRedo ? 1 : 0.4 }}
            >
              ↷
            </button>
            <button 
              className="icon-btn" 
              onClick={() => handleAction('exportToGit')}
              title="Export to .taskforge.json"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M5 21h14"/>
              </svg>
            </button>
            <button 
              className="icon-btn" 
              onClick={() => handleAction('importFromGit')}
              title="Import from .taskforge.json"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 15V3"/><path d="M7 8l5-5 5 5"/><path d="M5 21h14"/>
              </svg>
            </button>
          </div>
        </div>

        <div className="content">
          {currentView === 'hub' && (
            <HubView 
              state={state} 
              searchTerm={searchTerm}
              onAction={handleAction}
              onNavigate={setCurrentView}
            />
          )}
          
          {currentView === 'todos' && (
            <TodosView 
              state={state} 
              searchTerm={searchTerm}
              onAction={handleAction}
            />
          )}
          
          {currentView === 'notes' && (
            <NotesView 
              state={state} 
              searchTerm={searchTerm}
              onAction={handleAction}
            />
          )}
          
          {currentView === 'tasks' && (
            <TasksView 
              state={state} 
              searchTerm={searchTerm}
              onAction={handleAction}
            />
          )}
          
          {currentView === 'goals' && (
            <GoalsView 
              state={state} 
              searchTerm={searchTerm}
              onAction={handleAction}
            />
          )}
          
          {currentView === 'plans' && (
            <PlansView 
              state={state} 
              searchTerm={searchTerm}
              onAction={handleAction}
            />
          )}
        </div>
      </div>

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

export default App;
