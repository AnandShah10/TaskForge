import React from 'react';
import { X } from 'lucide-react';
import { Toast } from '../hooks/useVSCodeMessage';

interface ToastContainerProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div 
          key={toast.id} 
          className="toast"
          style={{ 
            borderLeft: `4px solid ${toast.type === 'error' ? 'var(--danger)' : 'var(--accent)'}` 
          }}
        >
          <span>{toast.message}</span>
          <button 
            onClick={() => onDismiss(toast.id)}
            style={{ 
              background: 'none', 
              border: 'none', 
              color: 'var(--muted)', 
              cursor: 'pointer',
              padding: '2px',
              marginLeft: 'auto',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
};

export default ToastContainer;
