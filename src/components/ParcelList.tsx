import React from 'react';
import { ParcelRequest } from '../types';
import { getCityById } from '../data/cities';

interface ParcelListProps {
  requests: ParcelRequest[];
  onAccept?: (requestId: string) => void;
  onCancel?: (requestId: string) => void;
  onDelete?: (requestId: string) => void;
  currentUserId?: string;
  loading?: boolean;
}

export const ParcelList: React.FC<ParcelListProps> = ({ 
  requests, 
  onAccept, 
  onCancel, 
  onDelete,
  currentUserId,
  loading = false
}) => {
  const getStatusText = (status: ParcelRequest['status']) => {
    switch (status) {
      case 'pending': return 'Ожидает';
      case 'accepted': return 'Принята';
      case 'completed': return 'Завершена';
      case 'cancelled': return 'Отменена';
      default: return status;
    }
  };

  const getStatusClass = (status: ParcelRequest['status']) => {
    switch (status) {
      case 'pending': return 'status-badge status-pending';
      case 'accepted': return 'status-badge status-accepted';
      case 'completed': return 'status-badge status-completed';
      case 'cancelled': return 'status-badge status-cancelled';
      default: return 'status-badge bg-gray-100 text-gray-800';
    }
  };

  const getTypeClass = (type: ParcelRequest['type']) => {
    switch (type) {
      case 'send': return 'type-badge type-send';
      case 'receive': return 'type-badge type-receive';
      default: return 'type-badge bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="card">
        <p className="text-center text-tg-hint">Загрузка заявок...</p>
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="card">
        <p className="text-center text-tg-hint">
          У вас пока нет заявок
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
        {requests.map((request) => {
        // @ts-expect-error: временно поддерживаем snake_case для совместимости с API
        const fromCity = getCityById(request.from_city || request.fromCity);
        // @ts-expect-error: временно поддерживаем snake_case для совместимости с API
        const toCity = getCityById(request.to_city || request.toCity);
        
        return (
          <div key={request.id} className="card">
            <div className="flex justify-between items-center mb-3">
              <span className={getTypeClass(request.type)}>
                {request.type === 'send' ? 'Отправка' : 'Доставка'}
              </span>
              <span className={getStatusClass(request.status)}>
                {getStatusText(request.status)}
              </span>
            </div>

            <div className="mb-2">
              <strong>Маршрут:</strong> {(fromCity?.name || 'Неизвестно')} → {(toCity?.name || 'Неизвестно')}
            </div>

            <div className="mb-2">
              <strong>Описание:</strong> {request.description}
            </div>

            <div className="mb-2">
              <strong>Вес:</strong> {request.weight} кг
              
            </div>

            <div className="text-xs text-tg-hint mb-3">
              {/* @ts-expect-error: временно поддерживаем snake_case для совместимости с API */}
              Создано: {isNaN(new Date(request.created_at || request.createdAt).getTime()) ? 'Неизвестно' : new Date(request.created_at || request.createdAt).toLocaleDateString('ru-RU')}
            </div>

            {request.status === 'pending' && (
              <div className="flex gap-2">
                {/* Проверяем, является ли заявка пользователя его собственной */}
                {/* @ts-expect-error: временно поддерживаем snake_case для совместимости с API */}
                {String(request.user_id || request.userId) === String(currentUserId) ? (
                  // Если это своя заявка - показываем кнопку удаления
                  onDelete && (
                    <button 
                      className="btn btn-danger flex-1" 
                      onClick={() => onDelete(request.id)}
                    >
                      Удалить
                    </button>
                  )
                ) : (
                  // Если это чужая заявка - показываем кнопку принятия
                  onAccept && (
                    <button 
                      className="btn flex-1" 
                      onClick={() => onAccept(request.id)}
                    >
                      Завершить
                    </button>
                  )
                )}
                {/* Кнопка "Отменить" показывается только для своих заявок */}
                {/* @ts-expect-error: временно поддерживаем snake_case для совместимости с API */}
                {request.status === 'pending' && String(request.user_id || request.userId) === String(currentUserId) && onCancel && (
                  <button 
                    className="btn btn-secondary flex-1" 
                    onClick={() => onCancel(request.id)}
                  >
                    Отменить
                  </button>
                )}
              </div>
            )}

            {/* Показываем информацию для отмененных заявок */}
            {request.status === 'cancelled' && (
              <div className="text-sm text-tg-hint text-center">
                Заявка была отменена
              </div>
            )}

            {/* Показываем информацию для завершенных заявок */}
            {request.status === 'completed' && (
              <div className="text-sm text-status-completed-text text-center">
                Заявка завершена
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}; 