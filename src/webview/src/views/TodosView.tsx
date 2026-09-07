import React, { useState } from 'react';
import { FullState } from '../hooks/useVSCodeMessage';
import { CheckSquare, Square, Trash2, Calendar, Flag } from 'lucide-react';
import ConfirmDialog from '../components/ConfirmDialog';

interface TodosViewProps {
  state: FullState;
  searchTerm: string;
  onAction: (type: string, payload?: any) => void;
}

interface Todo {
  id: string;
  text: string;
  completed: boolean;
  priority: 'high' | 'medium' | 'low';
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
}

const priorityColors = {
  high: '#e5484d',
  medium: '#d99a2b',
  low: '#3fb950',
};

const TodosView: React.FC<TodosViewProps> = ({ state, searchTerm, onAction }) => {
  const [newTodoText, setNewTodoText] = useState('');
  const [newPriority, setNewPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [newDueDate, setNewDueDate] = useState('');
  const [filter, setFilter] = useState<'all' | 'open' | 'completed'>('all');
  const [deleteTodoId, setDeleteTodoId] = useState<string | null>(null);

  const todos = state.todos as Todo[];

  // Filter todos
  const filteredTodos = todos
    .filter(todo => {
      const matchesSearch = todo.text.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = 
        filter === 'all' || 
        (filter === 'open' && !todo.completed) || 
        (filter === 'completed' && todo.completed);
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      // Sort by priority then date
      const prioOrder = { high: 0, medium: 1, low: 2 };
      if (prioOrder[a.priority] !== prioOrder[b.priority]) {
        return prioOrder[a.priority] - prioOrder[b.priority];
      }
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

  const handleAddTodo = () => {
    if (!newTodoText.trim()) return;
    onAction('addTodo', { 
      text: newTodoText.trim(), 
      priority: newPriority,
      dueDate: newDueDate || undefined 
    });
    setNewTodoText('');
    setNewDueDate('');
  };

  const handleToggle = (id: string) => {
    onAction('toggleTodo', { id });
  };

  const handleDelete = (id: string) => {
    setDeleteTodoId(id);
  };

  const handleUpdatePriority = (id: string, priority: 'high' | 'medium' | 'low') => {
    onAction('updateTodo', { id, patch: { priority } });
  };

  const openCount = todos.filter(t => !t.completed).length;
  const completedCount = todos.length - openCount;

  return (
    <div className="todos-view">
      {/* Add New Todo Form */}
      <div className="add-form">
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
          <input
            type="text"
            value={newTodoText}
            onChange={(e) => setNewTodoText(e.target.value)}
            placeholder="What needs to be done?"
            onKeyPress={(e) => e.key === 'Enter' && handleAddTodo()}
            style={{ flex: 1 }}
          />
          <select 
            value={newPriority} 
            onChange={(e) => setNewPriority(e.target.value as 'high' | 'medium' | 'low')}
            style={{ width: '110px' }}
          >
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <input
            type="date"
            value={newDueDate}
            onChange={(e) => setNewDueDate(e.target.value)}
            style={{ width: '140px' }}
          />
          <button className="btn" onClick={handleAddTodo}>
            Add Todo
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="section-head">
        <h2>Todos</h2>
        <div className="count">{openCount} open • {completedCount} done</div>
        
        <div className="chips" style={{ marginLeft: 'auto' }}>
          <button 
            className={`chip ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All
          </button>
          <button 
            className={`chip ${filter === 'open' ? 'active' : ''}`}
            onClick={() => setFilter('open')}
          >
            Open
          </button>
          <button 
            className={`chip ${filter === 'completed' ? 'active' : ''}`}
            onClick={() => setFilter('completed')}
          >
            Completed
          </button>
        </div>
      </div>

      {/* Todos List */}
      <div className="todo-list">
        {filteredTodos.length > 0 ? (
          filteredTodos.map((todo) => (
            <div key={todo.id} className={`todo-item ${todo.completed ? 'completed' : ''}`}>
              <button 
                className="todo-check"
                onClick={() => handleToggle(todo.id)}
                style={{ color: todo.completed ? 'var(--accent)' : 'var(--muted)' }}
              >
                {todo.completed ? <CheckSquare size={18} /> : <Square size={18} />}
              </button>
              
              <div className="todo-content" style={{ flex: 1 }}>
                <div className={`todo-text ${todo.completed ? 'completed' : ''}`}>
                  {todo.text}
                </div>
                {todo.dueDate && (
                  <div className="todo-due" style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '4px', 
                    fontSize: '11px', 
                    color: new Date(todo.dueDate) < new Date() && !todo.completed ? 'var(--high)' : 'var(--muted)' 
                  }}>
                    <Calendar size={12} />
                    {new Date(todo.dueDate).toLocaleDateString()}
                  </div>
                )}
              </div>

              <div className="todo-priority">
                <div 
                  className="priority-badge"
                  style={{ 
                    backgroundColor: `${priorityColors[todo.priority]}20`,
                    color: priorityColors[todo.priority],
                    border: `1px solid ${priorityColors[todo.priority]}40`
                  }}
                  onClick={() => {
                    const nextPrio = todo.priority === 'high' ? 'medium' : todo.priority === 'medium' ? 'low' : 'high';
                    handleUpdatePriority(todo.id, nextPrio);
                  }}
                  title="Click to cycle priority"
                >
                  <Flag size={12} />
                  {todo.priority}
                </div>
              </div>

              <button 
                className="icon-btn delete-btn"
                onClick={() => handleDelete(todo.id)}
                title="Delete todo"
                style={{ marginLeft: '8px', color: 'var(--muted)' }}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))
        ) : (
          <div className="empty-state">
            <CheckSquare size={48} strokeWidth={1} />
            <p>No todos match your filters.</p>
            {searchTerm && <p style={{ fontSize: '12px' }}>Try clearing the search term.</p>}
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={!!deleteTodoId}
        message="Delete this todo? This action cannot be undone."
        onCancel={() => setDeleteTodoId(null)}
        onConfirm={() => {
          if (deleteTodoId) onAction('deleteTodo', { id: deleteTodoId });
          setDeleteTodoId(null);
        }}
      />

      {/* Summary footer */}
      <div style={{ 
        marginTop: '32px', 
        padding: '16px', 
        background: 'var(--card)', 
        borderRadius: 'var(--radius)', 
        fontSize: '12px', 
        color: 'var(--muted)',
        textAlign: 'center'
      }}>
        {todos.length} total todos • React-powered list with live sync to extension
      </div>
    </div>
  );
};

export default TodosView;
