import React, { useEffect, useState } from 'react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  text: string;
  duration?: number;
}

interface ToastNotificationProps {
  message: ToastMessage;
  onClose: (id: string) => void;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

export const ToastNotification: React.FC<ToastNotificationProps> = ({
  message,
  onClose,
  position = 'top-right'
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Анимация появления
    const showTimer = setTimeout(() => setIsVisible(true), 100);
    
    // Автоматическое скрытие
    const hideTimer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => onClose(message.id), 300);
    }, message.duration || 5000);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, [message.id, message.duration, onClose]);

  const getIcon = () => {
    switch (message.type) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      default:
        return '📢';
    }
  };

  const getToastClasses = () => {
    switch (message.type) {
      case 'success':
        return 'bg-toast-success-bg text-toast-success-text border-toast-success-border';
      case 'error':
        return 'bg-toast-error-bg text-toast-error-text border-toast-error-border';
      case 'warning':
        return 'bg-toast-warning-bg text-toast-warning-text border-toast-warning-border';
      case 'info':
        return 'bg-toast-info-bg text-toast-info-text border-toast-info-border';
      default:
        return 'bg-gray-500 text-white border-gray-400';
    }
  };

  const getPositionClasses = () => {
    switch (position) {
      case 'top-right':
        return 'top-4 right-4';
      case 'top-left':
        return 'top-4 left-4';
      case 'bottom-right':
        return 'bottom-4 right-4';
      case 'bottom-left':
        return 'bottom-4 left-4';
      default:
        return 'top-4 right-4';
    }
  };

  return (
    <div
      className={`fixed ${getPositionClasses()} z-50 w-[70vw] max-w-sm transform transition-all duration-300 ease-in-out ${
        isVisible && !isExiting
          ? 'translate-x-0 opacity-100 scale-100'
          : 'translate-x-full opacity-0 scale-95'
      }`}
    >
      <div
        className={`${getToastClasses()} border-l-4 p-4 rounded-lg shadow-lg backdrop-blur-sm bg-opacity-95`}
      >
        <div className="flex items-start">
          <div className="flex-shrink-0 mr-3">
            <span className="text-lg">{getIcon()}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium leading-5">{message.text}</p>
          </div>
        </div>
      </div>
    </div>
  );
}; 