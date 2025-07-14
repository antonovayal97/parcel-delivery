import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ParcelRequest } from '../types';
import { getCityById, getCitiesByCountry } from '../data/cities';
import { CustomSelect } from './CustomSelect';

interface AllRequestsProps {
  requests: ParcelRequest[];
  onAccept?: (requestId: string) => void;
  onCancel?: (requestId: string) => void;
  onDelete?: (requestId: string) => void;
  onLoadMore?: () => void;
  currentUserId?: string;
  loading?: boolean;
  hasMore?: boolean;
  loadingMore?: boolean;
}

export const AllRequests: React.FC<AllRequestsProps> = ({ 
  requests, 
  onAccept, 
  onCancel,
  onDelete,
  onLoadMore,
  currentUserId,
  loading = false,
  hasMore = false,
  loadingMore = false
}) => {
  const [filterRoute, setFilterRoute] = useState<'all' | 'from-russia' | 'from-thailand'>('all');
  const [filterCity, setFilterCity] = useState<string>('');
  const [filterType, setFilterType] = useState<'all' | 'send' | 'receive'>('all');

  const russianCities = getCitiesByCountry('russia');
  const thaiCities = getCitiesByCountry('thailand');

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

  // Фильтрация заявок
  const filteredRequests = requests.filter(request => {
    // Исключаем отмененные и завершенные заявки из общего списка
    if (request.status === 'cancelled' || request.status === 'completed') return false;
    
    // Показываем только активные заявки (pending и accepted)
    if (request.status !== 'pending' && request.status !== 'accepted') return false;
    
    // Фильтр по типу
    if (filterType !== 'all' && request.type !== filterType) return false;
    
    // Фильтр по маршруту
    if (filterRoute !== 'all') {
      {/* @ts-expect-error: временно поддерживаем snake_case для совместимости с API */}
      const fromCity = getCityById(request.from_city || request.fromCity);
      
      if (filterRoute === 'from-russia') {
        if (fromCity?.country !== 'russia') return false;
      } else if (filterRoute === 'from-thailand') {
        if (fromCity?.country !== 'thailand') return false;
      }
    }
    
    // Фильтр по городу
    if (filterCity) {
      {/* @ts-expect-error: временно поддерживаем snake_case для совместимости с API */}
      const fromCity = getCityById(request.from_city || request.fromCity);
      {/* @ts-expect-error: временно поддерживаем snake_case для совместимости с API */}
      const toCity = getCityById(request.to_city || request.toCity);
      
      if (fromCity?.id !== filterCity && toCity?.id !== filterCity) return false;
    }
    
    return true;
  });

  const availableCities = filterRoute === 'from-russia' ? russianCities : 
                         filterRoute === 'from-thailand' ? thaiCities : 
                         [...russianCities, ...thaiCities];

  const listRef = useRef<HTMLDivElement>(null);

  // Обработчик скролла для бесконечной прокрутки
  const handleScroll = useCallback(() => {
    if (!listRef.current || loadingMore || !hasMore) return;
    const { scrollTop, scrollHeight, clientHeight } = listRef.current;
    // Если прокрутили до 90% списка — подгружаем еще
    if (scrollTop + clientHeight >= scrollHeight - 100) {
      if (onLoadMore) onLoadMore();
    }
  }, [loadingMore, hasMore, onLoadMore]);

  useEffect(() => {
    const ref = listRef.current;
    if (!ref) return;
    ref.addEventListener('scroll', handleScroll);
    return () => {
      ref.removeEventListener('scroll', handleScroll);
    };
  }, [handleScroll]);

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
          Пока нет доступных заявок
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
        {/* Фильтры */}
      <div className="card mb-4">
        <h4 className="mb-3 font-medium">🔍 Фильтры</h4>
        
        <div className="form-group">
          <label className="form-label">Тип заявки</label>
          <div className="tabs">
            <div 
              className={`tab ${filterType === 'all' ? 'active' : ''}`}
              onClick={() => setFilterType('all')}
            >
              Все
            </div>
            <div 
              className={`tab ${filterType === 'send' ? 'active' : ''}`}
              onClick={() => setFilterType('send')}
            >
              Отправка
            </div>
            <div 
              className={`tab ${filterType === 'receive' ? 'active' : ''}`}
              onClick={() => setFilterType('receive')}
            >
              Доставка
            </div>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Маршрут</label>
          <div className="tabs">
            <div 
              className={`tab ${filterRoute === 'all' ? 'active' : ''}`}
              onClick={() => {
                setFilterRoute('all');
                setFilterCity('');
              }}
            >
              Все
            </div>
            <div 
              className={`tab ${filterRoute === 'from-russia' ? 'active' : ''}`}
              onClick={() => {
                setFilterRoute('from-russia');
                setFilterCity('');
              }}
            >
              Из России
            </div>
            <div 
              className={`tab ${filterRoute === 'from-thailand' ? 'active' : ''}`}
              onClick={() => {
                setFilterRoute('from-thailand');
                setFilterCity('');
              }}
            >
              Из Таиланда
            </div>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Город</label>
          <CustomSelect
            options={[
              { value: '', label: 'Все города' },
              ...availableCities.map(city => ({
                value: city.id,
                label: city.name
              }))
            ]}
            value={filterCity}
            onChange={setFilterCity}
            placeholder="Все города"
          />
        </div>

        <div className="text-sm text-tg-hint text-center mt-3">
          Найдено: {filteredRequests.length} заявок
          {requests.length > filteredRequests.length && (
            <span className="block text-xs">
              Загружено: {requests.length} из {filteredRequests.length + (hasMore ? '...' : '')}
            </span>
          )}
        </div>
      </div>

      {/* Список заявок */}
      {filteredRequests.length === 0 ? (
        <div className="card">
          <p className="text-center text-tg-hint">
            По выбранным фильтрам заявок не найдено
          </p>
        </div>
      ) : (
        <div
          className="space-y-4"
          ref={listRef}
        >
          {filteredRequests.map((request) => {
            // @ts-expect-error: временно поддерживаем snake_case для совместимости с API
            console.log('user_id:', request.user_id, 'userId:', request.userId, 'currentUserId:', currentUserId);
            {/* @ts-expect-error: временно поддерживаем snake_case для совместимости с API */}
            const fromCity = getCityById(request.from_city || request.fromCity);
            {/* @ts-expect-error: временно поддерживаем snake_case для совместимости с API */}
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
      )}

      {/* Кнопка "Загрузить еще" как fallback */}
      {hasMore && (
        <div className="text-center mt-4">
          <button
            onClick={onLoadMore}
            disabled={loadingMore}
            className="btn btn-secondary"
          >
            {loadingMore ? 'Загрузка...' : 'Загрузить еще'}
          </button>
        </div>
      )}
    </div>
  );
}; 