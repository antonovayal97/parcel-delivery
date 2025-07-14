import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiService, User } from '../services/api';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  login: async () => {},
  logout: async () => {},
  refreshUser: async () => {},
});

export const useAuth = () => useContext(AuthContext);

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastLoginRequest, setLastLoginRequest] = useState<any>(null); // Для вывода на экран
  const [lastLoginResponse, setLastLoginResponse] = useState<any>(null); // Новый стейт для ответа сервера

  const isAuthenticated = apiService.isAuthenticated();

  const login = async () => {
    try {
      apiService.onRequest = (info) => setLastLoginRequest(info);
      const response = await apiService.login();
      apiService.setToken(response.token);
      setUser(response.user);
      setLastLoginResponse(response); // Сохраняем успешный ответ
    } catch (error: any) {
      // Сохраняем ошибку сервера (если есть)
      if (error.response) {
        setLastLoginResponse(error.response.data);
      } else if (error.message) {
        setLastLoginResponse({ error: error.message });
      } else {
        setLastLoginResponse(error);
      }
      throw error;
    } finally {
      apiService.onRequest = undefined;
    }
  };

  const logout = async () => {
    try {
      await apiService.logout();
      setUser(null);
    } catch (error) {
      console.error('Ошибка при выходе:', error);
    }
  };

  const refreshUser = async () => {
    try {
      if (isAuthenticated) {
        const currentUser = await apiService.getCurrentUser();
        setUser(currentUser);
      }
    } catch (error) {
      console.error('Ошибка при обновлении пользователя:', error);
      // Если токен недействителен, очищаем состояние
      apiService.clearToken();
      setUser(null);
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        if (isAuthenticated) {
          await refreshUser();
        } else {
          // Проверяем наличие Telegram WebApp и initData
          if (!(window.Telegram?.WebApp && window.Telegram.WebApp.initData && window.Telegram.WebApp.initDataUnsafe?.user)) {
            setIsLoading(false);
            setLastLoginResponse({ error: 'Откройте приложение через Telegram. Данные авторизации не получены.' });
            return;
          }
          await login();
        }
      } catch (error) {
        console.error('Ошибка инициализации аутентификации:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  if (!isAuthenticated) {
    // Отладочный вывод
    console.log('AuthContext: isAuthenticated = false');
    console.log('AuthContext: lastLoginRequest =', lastLoginRequest);
    console.log('AuthContext: lastLoginResponse =', lastLoginResponse);
    
    return (
      <div className="max-w-2xl mx-auto p-4 w-full">
        <div className="text-center py-10 px-5">
          <div className="text-lg">Ошибка аутентификации</div>
          <p className="text-tg-hint text-sm mt-2">Не удалось войти в систему</p>
          {/* Отладочная информация */}
          <div style={{ background: '#f0f0f0', padding: 10, margin: 10, fontSize: 12, border: '1px solid #ccc', borderRadius: 4, textAlign: 'left' }}>
            <b>Отладочная информация:</b>
            <p>lastLoginRequest существует: {lastLoginRequest ? 'ДА' : 'НЕТ'}</p>
            <p>Тип lastLoginRequest: {typeof lastLoginRequest}</p>
            {lastLoginRequest && (
              <div>
                <p>URL: {String(lastLoginRequest.url)}</p>
                <p>Метод: {lastLoginRequest.method || 'не указан'}</p>
                <p>Заголовки: {lastLoginRequest.headers ? 'есть' : 'нет'}</p>
              </div>
            )}
          </div>
          {/* Выводим отправленный login-запрос при ошибке аутентификации */}
          {lastLoginRequest && (
            <div style={{ background: '#eee', color: '#222', padding: 10, margin: 10, fontSize: 12, border: '1px solid #ccc', borderRadius: 4, textAlign: 'left' }}>
              <b>Отправленный запрос на login:</b>
              <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                {(() => {
                  try {
                    return JSON.stringify(lastLoginRequest, null, 2);
                  } catch (e: any) {
                    return 'Ошибка сериализации: ' + (e?.message || e);
                  }
                })()}
              </pre>
            </div>
          )}
          {/* Выводим ответ сервера на login */}
          {lastLoginResponse && (
            <div style={{ background: '#ffe', color: '#222', padding: 10, margin: 10, fontSize: 12, border: '1px solid #ccc', borderRadius: 4, textAlign: 'left' }}>
              <b>Ответ сервера на login:</b>
              <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                {(() => {
                  try {
                    return JSON.stringify(lastLoginResponse, null, 2);
                  } catch (e: any) {
                    return 'Ошибка сериализации: ' + (e?.message || e);
                  }
                })()}
              </pre>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        login,
        logout,
        refreshUser,
      }}
    >
      {/* Выводим отправленный login-запрос и ответ сервера только в режиме разработки */}
      {lastLoginRequest && window.location.hostname === 'localhost' && (
        <div style={{ background: '#eee', color: '#222', padding: 10, margin: 10, fontSize: 12, border: '1px solid #ccc', borderRadius: 4 }}>
          <b>Отправленный запрос на login:</b>
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
            {(() => {
              try {
                return JSON.stringify(lastLoginRequest, null, 2);
              } catch (e: any) {
                return 'Ошибка сериализации: ' + (e?.message || e);
              }
            })()}
          </pre>
        </div>
      )}
      {lastLoginResponse && window.location.hostname === 'localhost' && (
        <div style={{ background: '#ffe', color: '#222', padding: 10, margin: 10, fontSize: 12, border: '1px solid #ccc', borderRadius: 4 }}>
          <b>Ответ сервера на login:</b>
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
            {(() => {
              try {
                return JSON.stringify(lastLoginResponse, null, 2);
              } catch (e: any) {
                return 'Ошибка сериализации: ' + (e?.message || e);
              }
            })()}
          </pre>
        </div>
      )}
      {children}
    </AuthContext.Provider>
  );
}; 