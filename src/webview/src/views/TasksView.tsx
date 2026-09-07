import React, { useState, useMemo } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Plus, Trash2, User, Layout } from 'lucide-react';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import { FullState } from '../hooks/useVSCodeMessage';

interface TasksViewProps {
  state: FullState;
  searchTerm: string;
  onAction: (type: string, payload?: any) => void;
}

const statusConfig = {
  todo: { label: 'To Do', color: 'todo' },
  'in-progress': { label: 'In Progress', color: 'in-progress' },
  done: { label: 'Done', color: 'done' },
} as const;

type Status = keyof typeof statusConfig;

const TasksView: React.FC<TasksViewProps> = ({ state, searchTerm, onAction }) => {
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newAssignee, setNewAssignee] = useState('');
  const [editingTask, setEditingTask] = useState<any>(null);
  const [editDesc, setEditDesc] = useState('');
  const [editAssignee, setEditAssignee] = useState('');
  const [editDeps, setEditDeps] = useState<string[]>([]);
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);

  // Filter and group tasks
  const filteredTasks = useMemo(() => {
    return state.tasks
      .filter((task: any) => 
        task.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (task.assignee && task.assignee.toLowerCase().includes(searchTerm.toLowerCase()))
      )
      .sort((a: any, b: any) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
  }, [state.tasks, searchTerm]);

  const tasksByStatus = useMemo(() => {
    const grouped: Record<Status, any[]> = {
      todo: [],
      'in-progress': [],
      done: [],
    };
    
    filteredTasks.forEach((task: any) => {
      const status = (task.status || 'todo') as Status;
      if (grouped[status]) {
        grouped[status].push(task);
      } else {
        grouped.todo.push(task);
      }
    });
    
    return grouped;
  }, [filteredTasks]);

  const handleDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;
    
    if (!destination || 
        (destination.droppableId === source.droppableId && 
         destination.index === source.index)) {
      return;
    }

    const newStatus = destination.droppableId as Status;
    const taskId = draggableId;
    
    onAction('updateTask', { 
      id: taskId, 
      patch: { status: newStatus } 
    });
  };

  const handleAddTask = () => {
    if (!newTaskDesc.trim()) return;
    
    onAction('addTask', { 
      description: newTaskDesc.trim(), 
      assignee: newAssignee.trim() || undefined 
    });
    
    setNewTaskDesc('');
    setNewAssignee('');
  };

  const handleDeleteTask = (id: string) => {
    setDeleteTaskId(id);
  };

  const openEditModal = (task: any) => {
    setEditingTask(task);
    setEditDesc(task.description);
    setEditAssignee(task.assignee || '');
    setEditDeps([...(task.dependencies || [])]);
  };

  const handleSaveEdit = () => {
    if (!editingTask) return;
    
    const patch: any = { description: editDesc.trim() };
    if (editAssignee.trim()) {
      patch.assignee = editAssignee.trim();
    } else {
      patch.assignee = undefined;
    }
    patch.dependencies = editDeps;
    
    onAction('updateTask', { 
      id: editingTask.id, 
      patch 
    });
    
    setEditingTask(null);
    setEditDesc('');
    setEditAssignee('');
    setEditDeps([]);
  };

  const addDependency = (dep: string) => {
    if (dep.trim() && !editDeps.includes(dep.trim())) {
      setEditDeps([...editDeps, dep.trim()]);
    }
  };

  const removeDependency = (index: number) => {
    setEditDeps(editDeps.filter((_, i) => i !== index));
  };

  const columnOrder: Status[] = ['todo', 'in-progress', 'done'];

  return (
    <div className="tasks-view">
      <div className="kanban-add">
        <input
          type="text"
          value={newTaskDesc}
          onChange={(e) => setNewTaskDesc(e.target.value)}
          placeholder="New task description..."
          onKeyPress={(e) => e.key === 'Enter' && handleAddTask()}
        />
        <input
          type="text"
          value={newAssignee}
          onChange={(e) => setNewAssignee(e.target.value)}
          placeholder="Assignee (optional)"
          style={{ width: '160px' }}
          onKeyPress={(e) => e.key === 'Enter' && handleAddTask()}
        />
        <button className="btn" onClick={handleAddTask}>
          <Plus size={16} /> Add Task
        </button>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="kanban">
          {columnOrder.map((status) => {
            const tasks = tasksByStatus[status];
            const config = statusConfig[status];
            
            return (
              <div key={status} className="kanban-column">
                <div className={`column-header ${status}`}>
                  <div>{config.label}</div>
                  <div className="count">{tasks.length}</div>
                </div>
                
                <Droppable droppableId={status}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="kanban-list"
                      style={{
                        background: snapshot.isDraggingOver 
                          ? 'rgba(47, 111, 237, 0.08)' 
                          : 'transparent'
                      }}
                    >
                      {tasks.map((task: any, index: number) => (
                        <Draggable 
                          key={task.id} 
                          draggableId={task.id} 
                          index={index}
                        >
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`task-card ${task.status || 'todo'}`}
                              style={provided.draggableProps.style}
                              onClick={() => openEditModal(task)}
                            >
                              <div className="task-status">
                                {config.label}
                              </div>
                              <h4>{task.description}</h4>
                              
                              {task.assignee && (
                                <div className="task-assignee">
                                  <User size={13} />
                                  {task.assignee}
                                </div>
                              )}
                              
                              {task.dependencies && task.dependencies.length > 0 && (
                                <div style={{ 
                                  marginTop: '10px', 
                                  fontSize: '11px', 
                                  color: 'var(--muted)' 
                                }}>
                                  Deps: {task.dependencies.join(', ')}
                                </div>
                              )}
                              
                              <button 
                                className="delete-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteTask(task.id);
                                }}
                                title="Delete task"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>

      {/* Edit Modal */}
      <Modal
        isOpen={!!editingTask}
        onClose={() => setEditingTask(null)}
        title="Edit Task"
        footer={
          <>
            <button className="btn secondary" onClick={() => setEditingTask(null)}>
              Cancel
            </button>
            <button className="btn" onClick={handleSaveEdit}>
              Save Changes
            </button>
          </>
        }
      >
        <div>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: 'var(--muted)' }}>
            Description
          </label>
          <input
            type="text"
            value={editDesc}
            onChange={(e) => setEditDesc(e.target.value)}
            style={{ width: '100%', marginBottom: '16px' }}
          />
          
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: 'var(--muted)' }}>
            Assignee
          </label>
          <input
            type="text"
            value={editAssignee}
            onChange={(e) => setEditAssignee(e.target.value)}
            placeholder="e.g. @alice"
            style={{ width: '100%', marginBottom: '16px' }}
          />
          
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: 'var(--muted)' }}>
            Dependencies (task IDs or names)
          </label>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            <input
              type="text"
              id="dep-input"
              placeholder="Add dependency..."
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  const input = e.currentTarget;
                  addDependency(input.value);
                  input.value = '';
                }
              }}
              style={{ flex: 1 }}
            />
            <button 
              className="btn secondary" 
              onClick={() => {
                const input = document.getElementById('dep-input') as HTMLInputElement;
                if (input) {
                  addDependency(input.value);
                  input.value = '';
                }
              }}
            >
              Add
            </button>
          </div>
          
          <div style={{ marginBottom: '16px' }}>
            {editDeps.map((dep, index) => (
              <div key={index} style={{
                display: 'inline-flex',
                alignItems: 'center',
                background: 'var(--hover)',
                padding: '4px 10px',
                borderRadius: '999px',
                fontSize: '12px',
                margin: '4px 4px 4px 0',
                gap: '6px'
              }}>
                {dep}
                <button 
                  onClick={() => removeDependency(index)}
                  style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '14px', padding: '0 4px' }}
                >
                  ×
                </button>
              </div>
            ))}
            {editDeps.length === 0 && (
              <div style={{ color: 'var(--muted)', fontSize: '12px', fontStyle: 'italic' }}>
                No dependencies
              </div>
            )}
          </div>
          
          <div style={{ fontSize: '11px', color: 'var(--muted)', background: 'var(--hover)', padding: '10px', borderRadius: '6px' }}>
            Drag cards between columns to update status. Click cards to edit details.
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTaskId}
        message="Delete this task? This action cannot be undone."
        onCancel={() => setDeleteTaskId(null)}
        onConfirm={() => {
          if (deleteTaskId) onAction('deleteTask', { id: deleteTaskId });
          setDeleteTaskId(null);
        }}
      />

      {filteredTasks.length === 0 && state.tasks.length > 0 && (
        <div className="empty-state" style={{ marginTop: '40px' }}>
          No tasks match your search.
        </div>
      )}
      
      {state.tasks.length === 0 && (
        <div className="empty-state">
          <Layout size={42} style={{ marginBottom: '16px', opacity: 0.6 }} />
          <h3>No tasks yet</h3>
          <p>Use the form above to create your first kanban task.</p>
          <p style={{ fontSize: '12px', maxWidth: '340px', margin: '16px auto 0' }}>
            Drag &amp; drop between columns • Supports assignees and dependencies
          </p>
        </div>
      )}
    </div>
  );
};

export default TasksView;
