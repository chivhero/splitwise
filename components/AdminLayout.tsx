'use client';

import { useEffect, useState } from 'react';
import { getTelegramWebApp } from '@/lib/telegram';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Получаем initData от Telegram
    const webApp = getTelegramWebApp();
    
    if (!webApp) {
      setError('Telegram Web App not detected. Please open through bot.');
      return;
    }

    const initData = webApp.initData;
    
    if (!initData) {
      setError('No Telegram authentication data. Please restart the bot.');
      return;
    }

    // Сохраняем initData в cookie для middleware
    document.cookie = `tg-init-data=${encodeURIComponent(initData)}; path=/; max-age=86400; SameSite=Lax`;
    
    // Также добавляем в localStorage как backup
    try {
      localStorage.setItem('tg-init-data', initData);
    } catch (e) {
      console.warn('Failed to save to localStorage:', e);
    }

    console.log('✅ Telegram initData saved to cookie');
    setIsReady(true);
  }, []);

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-900 via-red-800 to-orange-900 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 max-w-md">
          <h2 className="text-2xl font-bold text-white mb-4">❌ Ошибка доступа</h2>
          <p className="text-red-200 mb-4">{error}</p>
          <a href="/" className="btn-primary w-full text-center block">
            Вернуться на главную
          </a>
        </div>
      </div>
    );
  }

  if (!isReady) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-white border-t-transparent mx-auto mb-4"></div>
          <p className="text-white text-lg">Инициализация...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}


