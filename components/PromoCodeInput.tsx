'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Ticket, X } from 'lucide-react';
import { hapticFeedback, showTelegramPopup, getTelegramUser } from '@/lib/telegram';
import { useLanguage } from '@/contexts/LanguageContext';

interface PromoCodeInputProps {
  onSuccess?: () => void;
}

export default function PromoCodeInput({ onSuccess }: PromoCodeInputProps) {
  const { t } = useLanguage();
  const [showModal, setShowModal] = useState(false);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Для Portal - ждём монтирования на клиенте
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!code.trim()) {
      showTelegramPopup('Введите промокод');
      return;
    }

    const tgUser = getTelegramUser();
    if (!tgUser) {
      showTelegramPopup('Авторизуйтесь через Telegram');
      return;
    }

    setLoading(true);
    hapticFeedback('light');

    try {
      const response = await fetch('/api/promo-codes/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegramId: tgUser.id,
          code: code.trim(),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        showTelegramPopup(data.message || '🎉 Промокод активирован!');
        hapticFeedback('success');
        setShowModal(false);
        setCode('');
        onSuccess?.();
      } else {
        showTelegramPopup(data.error || 'Ошибка активации промокода');
        hapticFeedback('error');
      }
    } catch (error) {
      console.error('Failed to redeem promo:', error);
      showTelegramPopup('Ошибка подключения');
      hapticFeedback('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => {
          setShowModal(true);
          hapticFeedback('light');
        }}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all text-sm"
      >
        <Ticket size={18} />
        <span>Промокод</span>
      </button>

      {showModal && mounted && createPortal(
        <div 
          className="fixed inset-0 flex items-center justify-center p-4"
          style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0,
            zIndex: 99999 
          }}
        >
          {/* Overlay - кликабельный для закрытия */}
          <div 
            className="absolute inset-0 bg-black/95"
            onClick={() => setShowModal(false)}
          />
          
          {/* Модальное окно - по центру */}
          <div className="relative w-full max-w-sm bg-gradient-to-b from-[#1f1f1f] to-[#141414] border border-white/10 rounded-3xl shadow-2xl overflow-hidden">
            {/* Декоративные элементы */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-amber-500/20 rounded-full blur-3xl" />
            <div className="absolute -top-4 -right-4 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl" />
            
            {/* Кнопка закрытия */}
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors z-20 p-1"
            >
              <X size={22} />
            </button>

            {/* Контент */}
            <div className="relative z-10 p-6 pt-8">
              {/* Иконка */}
              <div className="flex justify-center mb-4">
                <div className="bg-gradient-to-br from-amber-400/20 to-orange-500/20 p-4 rounded-2xl border border-amber-500/30">
                  <Ticket className="text-amber-400" size={32} />
                </div>
              </div>

              {/* Заголовок */}
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-white mb-1">🎟️ Промокод</h2>
                <p className="text-sm text-white/50">Введите код для активации Premium</p>
              </div>

              {/* Форма */}
              <form onSubmit={handleRedeem} className="space-y-4">
                <div>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase().replace(/\s/g, ''))}
                    placeholder="ВВЕДИТЕ КОД"
                    className="w-full px-4 py-4 rounded-2xl bg-black/40 border-2 border-white/10 text-white text-center text-xl font-bold placeholder:text-white/30 focus:outline-none focus:border-amber-500/50 focus:bg-black/60 transition-all uppercase tracking-[0.2em]"
                    maxLength={20}
                    autoFocus
                    disabled={loading}
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="characters"
                    spellCheck={false}
                  />
                </div>

                {/* Инфо */}
                <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                  <p className="text-xs text-white/40 text-center">
                    ✨ Промокоды дают бесплатный доступ к Premium
                  </p>
                </div>

                {/* Кнопки */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-4 py-3.5 rounded-xl bg-white/5 text-white/70 hover:bg-white/10 hover:text-white transition-all font-medium"
                    disabled={loading}
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold hover:from-amber-400 hover:to-orange-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-amber-500/20"
                    disabled={loading || !code.trim()}
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Проверка...
                      </span>
                    ) : 'Активировать'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
