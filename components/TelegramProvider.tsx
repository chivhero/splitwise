'use client';

import { useEffect, useState } from 'react';
import { initTelegramWebApp, getTelegramUser, isTelegramWebApp } from '@/lib/telegram';
import { User } from '@/types';

export default function TelegramProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Инициализируем Telegram Web App
    if (isTelegramWebApp()) {
      initTelegramWebApp();
      
      const tgUser = getTelegramUser();
      if (tgUser) {
        // Аутентифицируем пользователя через API
        fetch('/api/auth/telegram', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ telegramUser: tgUser }),
        })
          .then(res => res.json())
          .then(data => {
            setUser(data.user);
            setIsReady(true);
          })
          .catch(err => {
            console.error('Auth error:', err);
            setIsReady(true);
          });
      } else {
        setIsReady(true);
      }
    } else {
      // Для разработки вне Telegram
      console.log('Running outside Telegram WebApp');
      setIsReady(true);
    }
  }, []);

  if (!isReady) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  return <>{children}</>;
}












