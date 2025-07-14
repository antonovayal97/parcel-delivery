import React, { createContext, useContext, useEffect, useState } from 'react';
import { TelegramUser } from '../types/telegram';
// Удаляю: import { getUserForDevelopment } from '../utils/mockUser';

interface TelegramContextType {
  user: TelegramUser | null;
  isReady: boolean;
  webApp: any;
}

const TelegramContext = createContext<TelegramContextType>({
  user: null,
  isReady: false,
  webApp: null,
});

export const useTelegram = () => useContext(TelegramContext);

interface TelegramProviderProps {
  children: React.ReactNode;
}

export const TelegramProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<TelegramUser | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [webApp, setWebApp] = useState<any>(null);

  useEffect(() => {
    // Проверяем, что мы в Telegram Web App
    if (window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      setWebApp(tg);
      tg.ready();
      tg.expand();
      if (tg.initDataUnsafe?.user) {
        setUser(tg.initDataUnsafe.user);
      }
      setIsReady(true);
    } else {
      // Удаляю режим разработки с мок-юзером
      setIsReady(true);
    }
  }, []);

  return (
    <TelegramContext.Provider value={{ user, isReady, webApp }}>
      {children}
    </TelegramContext.Provider>
  );
}; 