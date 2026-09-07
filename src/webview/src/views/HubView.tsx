import React from 'react';
import { FullState } from '../hooks/useVSCodeMessage';

interface HubViewProps {
  state: FullState;
  searchTerm: string;
  onAction: (type: string, payload?: any) => void;
  onNavigate: (view: 'todos' | 'notes' | 'tasks' | 'goals') => void;
}

const HubView: React.FC<HubViewProps> = ({ state, searchTerm, onAction, onNavigate }) => {
  // Calculate stats (mirroring vanilla logic)
  const openTodos = state.todos.filter((t: any) => !t.completed).length;
  const totalTodos = state.todos.length;
  const completedTasks = state.tasks.filter((t: any) => t.status === 'done').length;
  const totalTasks = state.tasks.length;
  const avgGoalProgress = state.goals.length 
    ? Math.round(state.goals.reduce((sum: number, g: any) => sum + (g.progress || 0), 0) / state.goals.length) 
    : 0;

  const statCards = [
    { 
      value: openTodos.toString(), 
      label: 'Open Todos', 
      sub: `${totalTodos} total`,
      percent: totalTodos > 0 ? Math.round((openTodos / totalTodos) * 100) : 0 
    },
    { 
      value: state.notes.length.toString(), 
      label: 'Notes', 
      sub: 'captured ideas' 
    },
    { 
      value: `${completedTasks}/${totalTasks}`, 
      label: 'Tasks Completed', 
      percent: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0 
    },
    { 
      value: `${avgGoalProgress}%`, 
      label: 'Avg Goal Progress', 
      percent: avgGoalProgress 
    },
    { 
      value: state.plans.length.toString(), 
      label: 'Active Plans' 
    },
  ];

  // Recent activity (simple version)
  const recentItems = [
    ...state.todos.map((item: any) => ({ type: 'todo', label: item.text, time: item.updatedAt })),
    ...state.notes.map((item: any) => ({ type: 'note', label: item.title, time: item.updatedAt })),
    ...state.tasks.map((item: any) => ({ type: 'task', label: item.description, time: item.updatedAt })),
  ].sort((a, b) => new Date(b.time || 0).getTime() - new Date(a.time || 0).getTime())
    .slice(0, 5);

  const quickActions = [
    { label: 'Quick Todo', view: 'todos', icon: '✓' },
    { label: 'Quick Note', view: 'notes', icon: '📝' },
    { label: 'Quick Task', view: 'tasks', icon: '📋' },
    { label: 'Quick Goal', view: 'goals', icon: '🎯' },
  ];

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '32px' }}>
        {statCards.map((stat, index) => (
          <div key={index} className="stat-card">
            <h3>{stat.label}</h3>
            <p className="stat-value">{stat.value}</p>
            {stat.sub && <p style={{ color: 'var(--muted)', fontSize: '12px', margin: '4px 0 0' }}>{stat.sub}</p>}
            {stat.percent !== undefined && (
              <div style={{ 
                height: '6px', 
                background: 'var(--hover)', 
                borderRadius: '999px', 
                marginTop: '12px',
                overflow: 'hidden'
              }}>
                <div style={{ 
                  height: '100%', 
                  width: `${stat.percent}%`, 
                  background: 'var(--accent)',
                  transition: 'width 0.3s ease'
                }} />
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        {/* Recent Activity */}
        <div style={{ 
          background: 'var(--card)', 
          border: '1px solid var(--border)', 
          borderRadius: 'var(--radius)', 
          padding: '20px' 
        }}>
          <h2 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: 600 }}>Recent Activity</h2>
          {recentItems.length > 0 ? (
            recentItems.map((item, index) => (
              <div key={index} style={{ 
                padding: '10px 0', 
                borderBottom: index < recentItems.length - 1 ? '1px solid var(--border)' : 'none',
                display: 'flex',
                gap: '12px',
                fontSize: '13px'
              }}>
                <span style={{ 
                  background: 'var(--hover)', 
                  padding: '2px 8px', 
                  borderRadius: '12px', 
                  fontSize: '10px',
                  color: 'var(--muted)',
                  textTransform: 'uppercase',
                  alignSelf: 'flex-start',
                  marginTop: '2px'
                }}>
                  {item.type}
                </span>
                <span style={{ flex: 1, color: 'var(--fg)' }}>{item.label}</span>
              </div>
            ))
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--muted)' }}>
              No activity yet. Add some items to get started!
            </div>
          )}
        </div>

        {/* Quick Add */}
        <div style={{ 
          background: 'var(--card)', 
          border: '1px solid var(--border)', 
          borderRadius: 'var(--radius)', 
          padding: '20px' 
        }}>
          <h2 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: 600 }}>Quick Add</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
            {quickActions.map((action, index) => (
              <button
                key={index}
                onClick={() => onNavigate(action.view as 'todos' | 'notes' | 'tasks' | 'goals')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '14px',
                  background: 'transparent',
                  border: '1px dashed var(--border)',
                  borderRadius: '8px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'var(--hover)';
                  e.currentTarget.style.borderStyle = 'solid';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.borderStyle = 'dashed';
                }}
              >
                <span style={{ fontSize: '18px' }}>{action.icon}</span>
                <span>{action.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
};

export default HubView;
