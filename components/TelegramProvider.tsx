// Telegram WebApp Provider Component
// Author: @V_day0 (https://x.com/V_day0)
// Updated by Cursor agent per RULES
// Security: HIGH - sends validated initData to backend for HMAC-SHA256 verification

'use client';

import { useEffect } from 'react';
import { initTelegramWebApp, getTelegramInitData, isTelegramWebApp } from '@/lib/telegram';

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
          
          // Get initData string for backend validation (SECURITY: HMAC-SHA256)
          const initData = getTelegramInitData();
          console.log('[TelegramProvider] initData length:', initData.length);
          
          if (!initData || initData.length === 0) {
            console.warn('[TelegramProvider] initData is empty - app not opened in Telegram');
            if (window.Telegram?.WebApp) {
              window.Telegram.WebApp.showAlert(
                'Пожалуйста, откройте это приложение через официального бота @SplitWisedbot'
              );
            }
            return;
          }
          
          console.log('[TelegramProvider] Authenticating with initData (secure)...');
          
          // Аутентифицируем пользователя через API с валидацией HMAC-SHA256
          fetch('/api/auth/telegram', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ initData }),
          })
            .then(async res => {
              if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || 'Authentication failed');
              }
              return res.json();
            })
            .then(data => {
              console.log('[TelegramProvider] Auth success:', data);
              // Сохраняем данные пользователя в localStorage для использования
              if (data.user) {
                localStorage.setItem('telegram_user', JSON.stringify(data.user));
              }
            })
            .catch(err => {
              console.error('[TelegramProvider] Auth error:', err);
              // Show error to user if in Telegram
              if (window.Telegram?.WebApp) {
                window.Telegram.WebApp.showAlert(
                  'Ошибка авторизации. Попробуйте перезапустить приложение.'
                );
              }
            });
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
