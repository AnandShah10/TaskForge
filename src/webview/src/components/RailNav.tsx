import React from 'react';
import { Home, CheckSquare, FileText, Layout, Target, Calendar } from 'lucide-react';

type NavView = 'hub' | 'todos' | 'notes' | 'tasks' | 'goals' | 'plans';

interface RailNavProps {
  currentView: NavView;
  onNavClick: (view: NavView) => void;
}

const navItems: Array<{ id: NavView; label: string; icon: typeof Home }> = [
  { id: 'hub', label: 'Hub', icon: Home },
  { id: 'todos', label: 'Todos', icon: CheckSquare },
  { id: 'notes', label: 'Notes', icon: FileText },
  { id: 'tasks', label: 'Tasks', icon: Layout },
  { id: 'goals', label: 'Goals', icon: Target },
  { id: 'plans', label: 'Plans', icon: Calendar },
];

const RailNav: React.FC<RailNavProps> = ({ currentView, onNavClick }) => {
  return (
    <nav className="rail">
      <div className="rail-logo">🛠️ TaskForge</div>
      
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = currentView === item.id;
        
        return (
          <button
            key={item.id}
            className={`rail-btn ${isActive ? 'active' : ''}`}
            onClick={() => onNavClick(item.id)}
            title={item.label}
          >
            <Icon size={19} />
            <span>{item.label}</span>
          </button>
        );
      })}
      
      <div className="rail-spacer" />
    </nav>
  );
};

export default RailNav;
