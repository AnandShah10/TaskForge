import React, { useState, useMemo } from 'react';
import { Plus, Trash2, Edit2, Target, Calendar } from 'lucide-react';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import { FullState } from '../hooks/useVSCodeMessage';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip 
} from 'recharts';

interface GoalsViewProps {
  state: FullState;
  searchTerm: string;
  onAction: (type: string, payload?: any) => void;
}

const GoalsView: React.FC<GoalsViewProps> = ({ state, searchTerm, onAction }) => {
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalDesc, setNewGoalDesc] = useState('');
  const [newDeadline, setNewDeadline] = useState('');
  const [editingGoal, setEditingGoal] = useState<any>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editProgress, setEditProgress] = useState(0);
  const [editDeadline, setEditDeadline] = useState('');
  const [deleteGoalId, setDeleteGoalId] = useState<string | null>(null);

  // Filter goals
  const filteredGoals = useMemo(() => {
    return state.goals
      .filter((goal: any) => 
        goal.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (goal.description && goal.description.toLowerCase().includes(searchTerm.toLowerCase()))
      )
      .sort((a: any, b: any) => (b.progress || 0) - (a.progress || 0));
  }, [state.goals, searchTerm]);

  // Chart data
  const progressData = useMemo(() => {
    const completed = filteredGoals.filter((g: any) => g.progress >= 100).length;
    const inProgress = filteredGoals.filter((g: any) => g.progress > 0 && g.progress < 100).length;
    const notStarted = filteredGoals.filter((g: any) => g.progress === 0).length;
    
    return [
      { name: 'Completed', value: completed, fill: '#16a34a' },
      { name: 'In Progress', value: inProgress, fill: '#eab308' },
      { name: 'Not Started', value: notStarted, fill: '#64748b' },
    ].filter(item => item.value > 0);
  }, [filteredGoals]);

  const avgProgress = useMemo(() => {
    if (filteredGoals.length === 0) return 0;
    return Math.round(
      filteredGoals.reduce((sum: number, g: any) => sum + (g.progress || 0), 0) / filteredGoals.length
    );
  }, [filteredGoals]);

  const handleAddGoal = () => {
    if (!newGoalTitle.trim()) return;
    
    onAction('addGoal', { 
      title: newGoalTitle.trim(), 
      description: newGoalDesc.trim(),
      deadline: newDeadline || undefined
    });
    
    setNewGoalTitle('');
    setNewGoalDesc('');
    setNewDeadline('');
  };

  const handleDeleteGoal = (id: string) => {
    setDeleteGoalId(id);
  };

  const openEditModal = (goal: any) => {
    setEditingGoal(goal);
    setEditTitle(goal.title);
    setEditDesc(goal.description || '');
    setEditProgress(goal.progress || 0);
    setEditDeadline(goal.deadline || '');
  };

  const handleSaveEdit = () => {
    if (!editingGoal) return;
    
    onAction('updateGoal', { 
      id: editingGoal.id, 
      patch: { 
        title: editTitle.trim(),
        description: editDesc.trim(),
        progress: Math.max(0, Math.min(100, parseInt(editProgress.toString()) || 0)),
        deadline: editDeadline || undefined
      } 
    });
    
    setEditingGoal(null);
  };

  const updateProgress = (id: string, newProgress: number) => {
    onAction('updateGoal', { 
      id, 
      patch: { progress: Math.max(0, Math.min(100, newProgress)) } 
    });
  };

  const isOverdue = (deadline?: string) => {
    if (!deadline) return false;
    return new Date(deadline) < new Date();
  };

  return (
    <div className="goals-view">
      <div className="kanban-add" style={{ marginBottom: '28px' }}>
        <input
          type="text"
          value={newGoalTitle}
          onChange={(e) => setNewGoalTitle(e.target.value)}
          placeholder="Goal title (e.g. Launch product v2)"
          style={{ flex: 2 }}
          onKeyPress={(e) => e.key === 'Enter' && handleAddGoal()}
        />
        <input
          type="text"
          value={newGoalDesc}
          onChange={(e) => setNewGoalDesc(e.target.value)}
          placeholder="Description (optional)"
          style={{ flex: 2 }}
        />
        <input
          type="date"
          value={newDeadline}
          onChange={(e) => setNewDeadline(e.target.value)}
          style={{ width: '160px' }}
        />
        <button className="btn" onClick={handleAddGoal}>
          <Plus size={16} /> Add Goal
        </button>
      </div>

      {state.goals.length > 0 && (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 380px', 
          gap: '24px', 
          marginBottom: '32px',
          alignItems: 'start'
        }}>
          {/* Progress Overview */}
          <div style={{ 
            background: 'var(--card)', 
            border: '1px solid var(--border)', 
            borderRadius: 'var(--radius)', 
            padding: '20px' 
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ margin: 0, fontSize: '15px' }}>Progress Overview</h2>
              <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--accent)' }}>
                {avgProgress}%
              </div>
            </div>
            
            <div style={{ height: '220px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={progressData.length > 0 ? progressData : [{name: 'No Goals', value: 1, fill: '#64748b'}]}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {progressData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginTop: '10px', fontSize: '12px' }}>
              {progressData.map((entry, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: 12, height: 12, background: entry.fill, borderRadius: 2 }}></div>
                  <span>{entry.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bar Chart for individual progress */}
          <div style={{ 
            background: 'var(--card)', 
            border: '1px solid var(--border)', 
            borderRadius: 'var(--radius)', 
            padding: '20px',
            height: '100%'
          }}>
            <h2 style={{ margin: '0 0 16px 0', fontSize: '15px' }}>Goal Progress Breakdown</h2>
            <div style={{ height: '210px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={filteredGoals.slice(0, 6)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis 
                    dataKey="title" 
                    tick={{ fontSize: 10 }} 
                    angle={-25}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis domain={[0, 100]} />
                  <Tooltip formatter={(value) => [`${value}%`, 'Progress']} />
                  <Bar dataKey="progress" fill="var(--accent)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      <div className="goals-grid">
        {filteredGoals.map((goal: any) => (
          <div key={goal.id} className="goal-card">
            <div className="goal-title">{goal.title}</div>
            {goal.description && <div className="goal-desc">{goal.description}</div>}
            
            <div className="goal-progress-container">
              <div className="goal-progress">
                <div 
                  className="goal-progress-bar" 
                  style={{ width: `${goal.progress || 0}%` }}
                />
              </div>
              <div className="goal-progress-label">
                <span>{goal.progress || 0}% complete</span>
                <span>{Math.max(0, 100 - (goal.progress || 0))}% to go</span>
              </div>
            </div>

            {goal.deadline && (
              <div className={`goal-deadline ${isOverdue(goal.deadline) ? 'past' : ''}`}>
                <Calendar size={14} />
                Due: {new Date(goal.deadline).toLocaleDateString()}
                {isOverdue(goal.deadline) && ' (overdue)'}
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px', marginTop: '20px', flexWrap: 'wrap' }}>
              <button 
                className="btn secondary"
                onClick={() => updateProgress(goal.id, (goal.progress || 0) + 10)}
                style={{ flex: 1, fontSize: '12px' }}
              >
                +10%
              </button>
              <button 
                className="btn secondary"
                onClick={() => updateProgress(goal.id, Math.max(0, (goal.progress || 0) - 10))}
                style={{ flex: 1, fontSize: '12px' }}
              >
                -10%
              </button>
              <button 
                className="btn secondary"
                onClick={() => openEditModal(goal)}
                style={{ padding: '6px 14px' }}
              >
                <Edit2 size={16} />
              </button>
              <button 
                className="icon-btn delete-btn card-delete-btn"
                onClick={() => handleDeleteGoal(goal.id)}
                title="Delete goal"
                style={{ padding: '6px 10px', opacity: 0.7 }}
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredGoals.length === 0 && state.goals.length > 0 && (
        <div className="empty-state" style={{ marginTop: '60px' }}>
          No goals match your search.
        </div>
      )}

      {state.goals.length === 0 && (
        <div className="empty-state">
          <Target size={48} style={{ marginBottom: '16px', opacity: 0.6 }} />
          <h3>No goals defined yet</h3>
          <p>Add goals with deadlines and track progress using the form above.</p>
          <p style={{ fontSize: '12px', maxWidth: '400px', margin: '20px auto 0' }}>
            Interactive charts update live • Quick +/-10% buttons • Full edit modal
          </p>
        </div>
      )}

      {/* Edit Modal */}
      <Modal
        isOpen={!!editingGoal}
        onClose={() => setEditingGoal(null)}
        title="Edit Goal"
        footer={
          <>
            <button className="btn secondary" onClick={() => setEditingGoal(null)}>
              Cancel
            </button>
            <button className="btn" onClick={handleSaveEdit}>
              Save Goal
            </button>
          </>
        }
      >
        <div>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: 'var(--muted)' }}>
            Title
          </label>
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            style={{ width: '100%', marginBottom: '16px' }}
          />
          
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: 'var(--muted)' }}>
            Description
          </label>
          <textarea
            value={editDesc}
            onChange={(e) => setEditDesc(e.target.value)}
            style={{ width: '100%', minHeight: '80px', marginBottom: '16px', resize: 'vertical' }}
          />
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: 'var(--muted)' }}>
                Progress (%)
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={editProgress}
                onChange={(e) => setEditProgress(parseInt(e.target.value))}
                style={{ width: '100%' }}
              />
              <div style={{ textAlign: 'center', fontSize: '18px', fontWeight: 600, marginTop: '4px' }}>
                {editProgress}%
              </div>
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: 'var(--muted)' }}>
                Deadline
              </label>
              <input
                type="date"
                value={editDeadline}
                onChange={(e) => setEditDeadline(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteGoalId}
        message="Delete this goal? This action cannot be undone."
        onCancel={() => setDeleteGoalId(null)}
        onConfirm={() => {
          if (deleteGoalId) onAction('deleteGoal', { id: deleteGoalId });
          setDeleteGoalId(null);
        }}
      />
    </div>
  );
};

export default GoalsView;
