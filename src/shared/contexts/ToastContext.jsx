import React, { createContext, useContext, useState, useCallback } from 'react';
import { Alert } from '../components/ui/alert.tsx';

const ToastContext = createContext();

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, variant = 'default', duration = 5000) => {
    const id = Date.now().toString();
    const toast = {
      id,
      message,
      variant,
      duration
    };

    setToasts(prevToasts => [...prevToasts, toast]);

    // Auto-dismiss after duration
    setTimeout(() => {
      dismissToast(id);
    }, duration);

    return id;
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts(prevToasts => prevToasts.filter(toast => toast.id !== id));
  }, []);

  const success = useCallback((message, duration) => showToast(message, 'success', duration), [showToast]);
  const error = useCallback((message, duration) => showToast(message, 'destructive', duration), [showToast]);
  const warning = useCallback((message, duration) => showToast(message, 'warning', duration), [showToast]);
  const info = useCallback((message, duration) => showToast(message, 'info', duration), [showToast]);

  const value = {
    showToast,
    dismissToast,
    success,
    error,
    warning,
    info,
    toasts
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
};

const ToastContainer = ({ toasts, onDismiss }) => {
  return (
    <div className="fixed top-4 right-4 z-[100] space-y-2">
      {toasts.map((toast, index) => (
        <Alert
          key={toast.id}
          variant={toast.variant}
          isToast={true}
          toastId={toast.id}
          onDismiss={() => onDismiss(toast.id)}
          style={{
            transform: `translateY(${index * 4}px)`,
            zIndex: 100 - index
          }}
        >
          {toast.message}
        </Alert>
      ))}
    </div>
  );
};