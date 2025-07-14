import React, { useState, useEffect } from 'react';
import { TelegramProvider, useTelegram } from './components/TelegramProvider';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ParcelForm } from './components/ParcelForm';
import { ParcelList } from './components/ParcelList';
import { AllRequests } from './components/AllRequests';
import { UserProfile } from './components/UserProfile';
import { ValidationErrors } from './components/ValidationErrors';
import { Navbar } from './components/Navbar';
import { FormData, ParcelRequest } from './types';
import { apiService } from './services/api';
import ApiTest from './components/ApiTest';
import { ToastContainer, useToast } from './components/ToastContainer';
import { ToastTest } from './components/ToastTest';

const AppContent: React.FC = () => {
  const { user: telegramUser, isReady } = useTelegram();
  const { user: authUser, isAuthenticated, isLoading: authLoading, refreshUser } = useAuth();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'create' | 'my-requests' | 'all-requests' | 'profile' | 'api-test' | 'toast-test'>('create');
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]> | null>(null);
  const [requests, setRequests] = useState<ParcelRequest[]>([]);
  const [allRequests, setAllRequests] = useState<ParcelRequest[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);



  // Функция для обновления списка заявок с дебаунсингом
  const refreshRequests = async () => {
    if (isRefreshing) return; // Предотвращаем множественные запросы
    
    if (isReady && isAuthenticated && authUser) {
      setIsRefreshing(true);
      try {
        // Загружаем заявки пользователя
        const userRequests = await apiService.getParcelRequestsByUserId(authUser.id.toString());
        setRequests(userRequests);

        // Если мы на вкладке "Все заявки", обновляем список
        if (activeTab === 'all-requests' && allRequests.length > 0) {
          const allRequestsResponse = await apiService.getParcelRequests(1, 20);
          setAllRequests(allRequestsResponse.data);
          setCurrentPage(1);
          setHasMore(allRequestsResponse.current_page < allRequestsResponse.last_page);
        }
      } catch (error: any) {
        console.error('Ошибка при загрузке заявок:', error);
        
        // Обработка ошибки превышения лимита запросов
        if (error.message && error.message.includes('слишком много запросов')) {
          showToast({ type: 'error', text: 'Слишком много запросов. Попробуйте через несколько секунд.' });
        } else {
          showToast({ type: 'error', text: 'Ошибка при загрузке заявок' });
        }
      } finally {
        setIsRefreshing(false);
      }
    }
  };

  // Загрузка заявок с бэкенда
  useEffect(() => {
    refreshRequests();
  }, [isReady, isAuthenticated, authUser]);

  const handleSubmit = async (formData: FormData) => {
    setLoading(true);
    setValidationErrors(null);

    try {
      // Формируем имя пользователя
      const getUserDisplayName = () => {
        if (!authUser) return 'Пользователь';
        
        const firstName = authUser.first_name || '';
        const lastName = authUser.last_name || '';
        const username = authUser.username ? `@${authUser.username}` : '';
        
        if (firstName && lastName) {
          return `${firstName} ${lastName}${username ? ` (${username})` : ''}`;
        } else if (firstName) {
          return `${firstName}${username ? ` (${username})` : ''}`;
        } else if (username) {
          return username;
        }
        
        return authUser.name || 'Пользователь';
      };

      // Собираем данные для API, исключая пустые поля
      const requestData = {
        ...formData,
        contactName: getUserDisplayName(),
        userId: authUser?.id.toString(),
        // createdAt и status выставляются на бэкенде
      };

      // Удаляем пустые поля, чтобы избежать ошибок валидации
      if (!requestData.tripDate || requestData.tripDate === '') {
        delete requestData.tripDate;
      }

      await apiService.createParcelRequest(requestData);

      showToast({ type: 'success', text: 'Заявка успешно создана!' });
      
      // Задержка перед обновлением списка и переходом на вкладку
      setTimeout(async () => {
        await refreshRequests();
        // Обновляем данные пользователя для отображения актуальных кредитов
        await refreshUser();
        setActiveTab('my-requests');
      }, 1000);
    } catch (error: any) {
      // Обработка ошибок валидации
      if (error.validationErrors) {
        setValidationErrors(error.validationErrors);
        showToast({ type: 'error', text: 'Пожалуйста, исправьте ошибки в форме' });
      } else if (error.message && error.message.includes('слишком много запросов')) {
        showToast({ type: 'error', text: 'Слишком много запросов. Попробуйте через несколько секунд.' });
      } else {
        showToast({ type: 'error', text: error.message || 'Ошибка при создании заявки. Попробуйте еще раз.' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    setLoading(true);
    try {
      // Обновляем статус заявки на сервере
      await apiService.updateParcelRequest(requestId, { status: 'completed' });
      
      // Обновляем списки заявок
      await refreshRequests();
      // Обновляем данные пользователя для отображения актуальных кредитов
      await refreshUser();
      
      showToast({ type: 'success', text: 'Заявка завершена!' });
    } catch (error: any) {
      if (error.message && error.message.includes('слишком много запросов')) {
        showToast({ type: 'error', text: 'Слишком много запросов. Попробуйте через несколько секунд.' });
      } else {
        showToast({ type: 'error', text: 'Ошибка при завершении заявки.' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    setLoading(true);
    try {
      // Обновляем статус заявки на сервере
      await apiService.updateParcelRequest(requestId, { status: 'cancelled' });
      
      // Обновляем списки заявок
      await refreshRequests();
      // Обновляем данные пользователя для отображения актуальных кредитов
      await refreshUser();
      
      showToast({ type: 'success', text: 'Заявка отменена.' });
    } catch (error: any) {
      if (error.message && error.message.includes('слишком много запросов')) {
        showToast({ type: 'error', text: 'Слишком много запросов. Попробуйте через несколько секунд.' });
      } else {
        showToast({ type: 'error', text: 'Ошибка при отмене заявки.' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRequest = async (requestId: string) => {
    setLoading(true);
    try {
      // Удаляем заявку с сервера
      await apiService.deleteParcelRequest(requestId);
      
      // Обновляем списки заявок
      await refreshRequests();
      // Обновляем данные пользователя для отображения актуальных кредитов
      await refreshUser();
      
      showToast({ type: 'success', text: 'Заявка удалена.' });
    } catch (error: any) {
      if (error.message && error.message.includes('слишком много запросов')) {
        showToast({ type: 'error', text: 'Слишком много запросов. Попробуйте через несколько секунд.' });
      } else {
        showToast({ type: 'error', text: 'Ошибка при удалении заявки.' });
      }
    } finally {
      setLoading(false);
    }
  };

  // Функция для загрузки следующей страницы заявок
  const loadMoreRequests = async () => {
    if (loadingMore || !hasMore) return;
    
    if (isReady && isAuthenticated && authUser) {
      setLoadingMore(true);
      try {
        const nextPage = currentPage + 1;
        const allRequestsResponse = await apiService.getParcelRequests(nextPage, 20);
        
        // Добавляем новые заявки к существующим
        setAllRequests(prev => [...prev, ...allRequestsResponse.data]);
        setCurrentPage(nextPage);
        setHasMore(allRequestsResponse.current_page < allRequestsResponse.last_page);
      } catch (error: any) {
        console.error('Ошибка при загрузке дополнительных заявок:', error);
        
        if (error.message && error.message.includes('слишком много запросов')) {
          showToast({ type: 'error', text: 'Слишком много запросов. Попробуйте через несколько секунд.' });
        } else {
          showToast({ type: 'error', text: 'Ошибка при загрузке дополнительных заявок' });
        }
      } finally {
        setLoadingMore(false);
      }
    }
  };

  // Обработчик переключения на вкладку "Все заявки"
  const handleAllRequestsTab = async () => {
    setActiveTab('all-requests');
    // Сбрасываем состояние пагинации при переключении на вкладку
    setCurrentPage(1);
    setHasMore(true);
    setAllRequests([]);
    
    // Загружаем первую страницу, если пользователь аутентифицирован
    if (isReady && isAuthenticated && authUser) {
      try {
        const allRequestsResponse = await apiService.getParcelRequests(1, 20);
        setAllRequests(allRequestsResponse.data);
        setCurrentPage(1);
        setHasMore(allRequestsResponse.current_page < allRequestsResponse.last_page);
      } catch (error: any) {
        console.error('Ошибка при загрузке заявок:', error);
        if (error.message && error.message.includes('слишком много запросов')) {
          showToast({ type: 'error', text: 'Слишком много запросов. Попробуйте через несколько секунд.' });
        } else {
          showToast({ type: 'error', text: 'Ошибка при загрузке заявок' });
        }
      }
    }
  };

  if (!isReady || authLoading) {
    return (
      <div className="max-w-2xl mx-auto p-4 w-full">
        <div className="text-center py-10 px-5">
          <div className="text-lg">Загрузка приложения...</div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="max-w-2xl mx-auto p-4 w-full">
        <div className="text-center py-10 px-5">
          <div className="text-lg">Ошибка аутентификации</div>
          <p className="text-tg-hint text-sm mt-2">Не удалось войти в систему</p>
          <button
            className="mt-4 btn bg-tg-button text-tg-button-text hover:opacity-80"
            onClick={() => window.location.reload()}
          >
            На главную
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <ToastContainer position="top-right" />
      <div className="max-w-2xl mx-auto p-4 w-full min-h-screen flex flex-col pb-20">
        <div className="header text-center mb-4">
          <h1 className="text-xl font-semibold">✈️ Сабай посылка</h1>
          <p className="text-tg-hint text-xs">Доставка посылок</p>
        </div>

        {validationErrors && (
          <ValidationErrors errors={validationErrors} className="mb-4" />
        )}

      <Navbar 
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onAllRequestsTab={handleAllRequestsTab}
      />

      <div className="tab-content flex-1">
        {activeTab === 'create' && (
          <ParcelForm onSubmit={handleSubmit} loading={loading} />
        )}
        
        {activeTab === 'my-requests' && (
          <ParcelList 
            requests={requests} 
            onAccept={handleAcceptRequest}
            onCancel={handleCancelRequest}
            onDelete={handleDeleteRequest}
            currentUserId={authUser?.id.toString()}
            loading={loading}
          />
        )}
        
        {activeTab === 'all-requests' && (
          <AllRequests 
            requests={allRequests} 
            onAccept={handleAcceptRequest}
            onCancel={handleCancelRequest}
            onDelete={handleDeleteRequest}
            onLoadMore={loadMoreRequests}
            currentUserId={authUser?.id.toString()}
            loading={loading}
            hasMore={hasMore}
            loadingMore={loadingMore}
          />
        )}
        
        {activeTab === 'profile' && (
          <UserProfile user={authUser} />
        )}
        
        {activeTab === 'api-test' && (
          <ApiTest />
        )}
        
        {activeTab === 'toast-test' && (
          <ToastTest />
        )}
        

      </div>
    </div>
    </>
  );
};

const App: React.FC = () => {
  return (
    <TelegramProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </TelegramProvider>
  );
};

export default App; 