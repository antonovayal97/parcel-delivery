import React, { useState, useCallback } from 'react';
import { ToastNotification, ToastMessage } from './ToastNotification';

interface ToastContainerProps {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  maxToasts?: number;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({
  position = 'top-right',
  maxToasts = 5
}) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((message: Omit<ToastMessage, 'id'>) => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const newToast: ToastMessage = { ...message, id };
    
    setToasts(prev => {
      const updated = [newToast, ...prev];
      // Ограничиваем количество уведомлений
      return updated.slice(0, maxToasts);
    });
  }, [maxToasts]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  // Экспортируем функцию для использования в других компонентах
  React.useEffect(() => {
    (window as any).showToast = addToast;
    return () => {
      delete (window as any).showToast;
    };
  }, [addToast]);

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <ToastNotification
          key={toast.id}
          message={toast}
          onClose={removeToast}
          position={position}
        />
      ))}
    </div>
  );
};

// Хук для использования уведомлений в компонентах
export const useToast = () => {
  const showToast = useCallback((message: Omit<ToastMessage, 'id'>) => {
    if ((window as any).showToast) {
      (window as any).showToast(message);
    }
  }, []);

  return { showToast };
}; 