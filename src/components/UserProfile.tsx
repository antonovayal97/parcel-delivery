import React, { useState, useEffect } from 'react';
import { User } from '../services/api';
import { apiService } from '../services/api';

interface UserProfileProps {
  user: User | null;
}

export const UserProfile: React.FC<UserProfileProps> = ({ user }) => {
  const [credits, setCredits] = useState<number | null>(null);
  const [isLoadingCredits, setIsLoadingCredits] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Функция для обновления кредитов
  const refreshCredits = async () => {
    if (!user) return;
    
    setIsLoadingCredits(true);
    try {
      const balance = await apiService.getUserCreditsBalance(user.id.toString());
      setCredits(balance.credits);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Ошибка при загрузке кредитов:', error);
    } finally {
      setIsLoadingCredits(false);
    }
  };

  // Загружаем кредиты при изменении пользователя
  useEffect(() => {
    if (user) {
      refreshCredits();
    }
  }, [user]);

  if (!user) {
    return (
      <div className="bg-tg-secondary-bg rounded-lg p-4 mb-4">
        <div className="text-center text-tg-hint">
          Данные пользователя недоступны
        </div>
      </div>
    );
  }

  const getUserDisplayName = () => {
    const firstName = user.first_name || '';
    const lastName = user.last_name || '';
    if (firstName && lastName) {
      return `${firstName} ${lastName}`;
    } else if (firstName) {
      return firstName;
    }
    return user.name || 'Пользователь';
  };

  // Определяем статус кредитов
  const getCreditsStatus = () => {
    const currentCredits = credits !== null ? credits : user.credits;
    if (currentCredits === 0) {
      return { 
        text: 'Нет кредитов', 
        class: 'credits-status credits-zero'
      };
    } else if (currentCredits < 5) {
      return { 
        text: 'Мало кредитов', 
        class: 'credits-status credits-low'
      };
    } else {
      return { 
        text: 'Достаточно кредитов', 
        class: 'credits-status credits-good'
      };
    }
  };

  const creditsStatus = getCreditsStatus();
  const currentCredits = credits !== null ? credits : user.credits;

  return (
    <div className="bg-tg-secondary-bg rounded-lg p-4 mb-4 border border-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20">
      <div className="flex items-center mb-3">
        {/* Фото профиля или инициал */}
        <div className="w-12 h-12 bg-tg-button rounded-full flex items-center justify-center mr-3">
          <span className="text-tg-button-text text-lg font-semibold">
            {getUserDisplayName().charAt(0).toUpperCase()}
          </span>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-tg-text">
            {getUserDisplayName()}
          </h3>
          {/* Username из Telegram */}
          {user.username && (
            <p className="text-sm text-tg-hint">@{user.username}</p>
          )}
        </div>
      </div>
      {/* Блок с кредитами */}
      <div className={`${creditsStatus.class} p-3 mb-3`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div>
              <div className="flex items-center">
                <p className="text-sm text-tg-hint mr-2">Кредиты</p>
                {isLoadingCredits && (
                  <div className="w-4 h-4 border-2 border-tg-hint border-t-transparent rounded-full animate-spin"></div>
                )}
              </div>
              <p className="text-lg font-bold text-tg-text">{currentCredits}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-tg-hint">Статус</p>
            <p className="text-xs text-tg-text font-medium">{creditsStatus.text}</p>
          </div>
        </div>
        {/* Кнопка обновления */}
        <div className="mt-2 flex justify-between items-center">
          <button
            onClick={refreshCredits}
            disabled={isLoadingCredits}
            className="text-xs text-tg-hint hover:text-tg-text transition-colors disabled:opacity-50"
          >
            {isLoadingCredits ? 'Обновление...' : 'Обновить'}
          </button>
          {lastUpdated && (
            <span className="text-xs text-tg-hint">
              Обновлено: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}; 