'use client';

import { useEffect } from 'react';
import { initTelegramWebApp, getTelegramUser, isTelegramWebApp } from '@/lib/telegram';

export default function TelegramProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Небольшая задержка чтобы убедиться что Telegram SDK загрузился
    const timer = setTimeout(() => {
      try {
        console.log('[TelegramProvider] Checking Telegram WebApp...');
        console.log('[TelegramProvider] window.Telegram:', typeof window !== 'undefined' ? window.Telegram : 'undefined');
        
        if (isTelegramWebApp()) {
          console.log('[TelegramProvider] Telegram WebApp detected!');
          try {
            initTelegramWebApp();
            console.log('[TelegramProvider] Telegram WebApp initialized');
          } catch (error) {
            console.error('[TelegramProvider] Failed to init Telegram WebApp:', error);
          }
          
          const tgUser = getTelegramUser();
          console.log('[TelegramProvider] Telegram user:', tgUser);
          
          if (tgUser) {
            // Аутентифицируем пользователя через API
            fetch('/api/auth/telegram', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ telegramUser: tgUser }),
            })
              .then(res => res.json())
              .then(data => {
                console.log('[TelegramProvider] Auth success:', data);
              })
              .catch(err => {
                console.error('[TelegramProvider] Auth error:', err);
              });
          }
        } else {
          console.log('[TelegramProvider] Running outside Telegram WebApp');
        }
      } catch (error) {
        console.error('[TelegramProvider] Critical error:', error);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // Не блокируем рендеринг - показываем приложение сразу
  return <>{children}</>;
}
