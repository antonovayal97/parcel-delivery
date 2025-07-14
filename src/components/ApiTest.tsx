import React, { useState } from 'react';
import { apiService } from '../services/api';

const ApiTest: React.FC = () => {
  const [healthStatus, setHealthStatus] = useState<string>('');
  const [tgInfo, setTgInfo] = useState<any>(null);
  const [loginResult, setLoginResult] = useState<any>(null);
  const [loginError, setLoginError] = useState<string>('');
  const [creditsResult, setCreditsResult] = useState<any>(null);
  const [creditsError, setCreditsError] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // Проверка наличия Telegram WebApp
  React.useEffect(() => {
    const tg = (window as any).Telegram;
    const webApp = tg?.WebApp;
    setTgInfo({
      hasTelegram: !!tg,
      hasWebApp: !!webApp,
      initData: webApp?.initData,
      initDataUnsafe: webApp?.initDataUnsafe,
      user: webApp?.initDataUnsafe?.user,
    });
  }, []);

  const testHealthCheck = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8001/api/health');
      const data = await response.json();
      setHealthStatus(JSON.stringify(data, null, 2));
    } catch (error) {
      setHealthStatus(`Ошибка: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const testLogin = async () => {
    setLoading(true);
    setLoginResult(null);
    setLoginError('');
    try {
      const tg = (window as any).Telegram;
      const webApp = tg?.WebApp;
      const user = webApp?.initDataUnsafe?.user;
      const initData = webApp?.initData;
      setLoginResult({
        sentUser: user,
        sentInitData: initData,
      });
      if (!user || !initData) {
        setLoginError('Нет данных Telegram WebApp!');
        setLoading(false);
        return;
      }
      // Формируем FormData
      const formData = new FormData();
      formData.append('telegram_user', JSON.stringify(user));
      formData.append('init_data', initData);
      const response = await fetch('http://localhost:8001/api/auth/login', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      setLoginResult((prev: any) => ({ ...prev, response: data }));
    } catch (error: any) {
      setLoginError(error.message || String(error));
    } finally {
      setLoading(false);
    }
  };

  const testCredits = async () => {
    setLoading(true);
    setCreditsResult(null);
    setCreditsError('');
    try {
      // Сначала получаем текущего пользователя
      const currentUser = await apiService.getCurrentUser();
      setCreditsResult({ currentUser });
      
      // Получаем баланс кредитов
      const balance = await apiService.getUserCreditsBalance(currentUser.id.toString());
      setCreditsResult((prev: any) => ({ ...prev, balance }));
      
    } catch (error: any) {
      setCreditsError(error.message || String(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Тест API и Telegram WebApp</h2>
      <button 
        onClick={testHealthCheck}
        disabled={loading}
        className="btn bg-toast-info-bg text-toast-info-text hover:opacity-80 mr-2"
      >
        {loading ? 'Тестируем...' : 'Проверить Health Check'}
      </button>
      <button 
        onClick={testLogin}
        disabled={loading}
        className="btn bg-toast-success-bg text-toast-success-text hover:opacity-80 mr-2"
      >
        {loading ? 'Пробуем логин...' : 'Проверить Telegram Login'}
      </button>
      <button 
        onClick={testCredits}
        disabled={loading}
        className="btn bg-type-receive-bg text-type-receive-text hover:opacity-80"
      >
        {loading ? 'Проверяем кредиты...' : 'Проверить API Кредитов'}
      </button>

      <div className="mt-4">
        <h3 className="font-bold mb-2">Информация о Telegram WebApp:</h3>
        <pre className="bg-tg-secondary-bg p-4 rounded text-sm overflow-auto border border-tg-hint">
{JSON.stringify(tgInfo, null, 2)}
        </pre>
      </div>

      {healthStatus && (
        <div className="mt-4">
          <h3 className="font-bold mb-2">Health Check:</h3>
          <pre className="bg-tg-secondary-bg p-4 rounded text-sm overflow-auto border border-tg-hint">
            {healthStatus}
          </pre>
        </div>
      )}

      <div className="mt-4">
        <h3 className="font-bold mb-2">Тест логина через Telegram:</h3>
        {loginError && <div className="text-status-cancelled-text mb-2">Ошибка: {loginError}</div>}
        {loginResult && (
          <pre className="bg-tg-secondary-bg p-4 rounded text-sm overflow-auto border border-tg-hint">
{JSON.stringify(loginResult, null, 2)}
          </pre>
        )}
      </div>

      <div className="mt-4">
        <h3 className="font-bold mb-2">Тест API Кредитов:</h3>
        {creditsError && <div className="text-status-cancelled-text mb-2">Ошибка: {creditsError}</div>}
        {creditsResult && (
          <pre className="bg-tg-secondary-bg p-4 rounded text-sm overflow-auto border border-tg-hint">
{JSON.stringify(creditsResult, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
};

export default ApiTest; 