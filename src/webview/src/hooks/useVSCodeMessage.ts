import { useState, useEffect, useCallback, useRef } from 'react';

export interface FullState {
  todos: any[];
  notes: any[];
  tasks: any[];
  goals: any[];
  plans: any[];
}

export interface Toast {
  id: string;
  message: string;
  type?: 'success' | 'error' | 'info';
}

export interface VSCodeMessage {
  type: string;
  data?: FullState;
  message?: string;
  [key: string]: any;
}

declare global {
  interface Window {
    acquireVsCodeApi: () => {
      postMessage: (message: any) => void;
      getState: () => any;
      setState: (state: any) => void;
    };
  }
}

export function useVSCodeMessage() {
  const vscodeRef = useRef<any>(null);
  const [state, setState] = useState<FullState>({
    todos: [],
    notes: [],
    tasks: [],
    goals: [],
    plans: [],
  });
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [isReady, setIsReady] = useState(false);

  // Initialize vscode API
  useEffect(() => {
    if (window.acquireVsCodeApi) {
      vscodeRef.current = window.acquireVsCodeApi();
    } else {
      console.warn('VS Code API not available - running in browser?');
    }
  }, []);

  // Listen for messages from extension
  useEffect(() => {
    const messageHandler = (event: MessageEvent<VSCodeMessage>) => {
      const message = event.data;
      
      if (message.type === 'state' && message.data) {
        setState(message.data);
      } else if (message.type === 'toast' && message.message) {
        const newToast: Toast = {
          id: Date.now().toString(),
          message: message.message,
          type: message.type as any || 'info'
        };
        setToasts(prev => [...prev, newToast]);
        
        // Auto dismiss after 4s
        setTimeout(() => {
          setToasts(prev => prev.filter(t => t.id !== newToast.id));
        }, 4000);
      }
    };

    window.addEventListener('message', messageHandler);
    
    // Notify extension that we're ready
    if (vscodeRef.current) {
      vscodeRef.current.postMessage({ type: 'ready' });
      setIsReady(true);
    }

    return () => {
      window.removeEventListener('message', messageHandler);
    };
  }, []);

  const postMessage = useCallback((message: any) => {
    if (vscodeRef.current) {
      vscodeRef.current.postMessage(message);
    } else {
      console.log('Would post message to VS Code:', message);
    }
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return { state, postMessage, isReady, toasts, dismissToast };
}
