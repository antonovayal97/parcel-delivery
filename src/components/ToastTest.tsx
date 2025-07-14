import React from 'react';
import { useToast } from './ToastContainer';

export const ToastTest: React.FC = () => {
  const { showToast } = useToast();

  const handleTestSuccess = () => {
    showToast({
      type: 'success',
      text: 'Это тестовое уведомление об успехе!',
      duration: 3000
    });
  };

  const handleTestError = () => {
    showToast({
      type: 'error',
      text: 'Это тестовое уведомление об ошибке!',
      duration: 4000
    });
  };

  const handleTestWarning = () => {
    showToast({
      type: 'warning',
      text: 'Это тестовое предупреждение!',
      duration: 5000
    });
  };

  const handleTestInfo = () => {
    showToast({
      type: 'info',
      text: 'Это информационное уведомление!',
      duration: 6000
    });
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold mb-4">Тест уведомлений</h2>
      
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={handleTestSuccess}
          className="btn bg-toast-success-bg text-toast-success-text hover:opacity-80"
        >
          Успех
        </button>
        
        <button
          onClick={handleTestError}
          className="btn bg-toast-error-bg text-toast-error-text hover:opacity-80"
        >
          Ошибка
        </button>
        
        <button
          onClick={handleTestWarning}
          className="btn bg-toast-warning-bg text-toast-warning-text hover:opacity-80"
        >
          Предупреждение
        </button>
        
        <button
          onClick={handleTestInfo}
          className="btn bg-toast-info-bg text-toast-info-text hover:opacity-80"
        >
          Информация
        </button>
      </div>
      
      <div className="mt-6 p-4 bg-tg-secondary-bg rounded-lg border border-tg-hint">
        <p className="text-sm text-tg-hint">
          Нажмите на кнопки выше, чтобы протестировать различные типы уведомлений.
          Уведомления будут появляться в правом верхнем углу экрана.
        </p>
      </div>
    </div>
  );
}; 