'use client';

import { useState } from 'react';
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

      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end justify-center z-50">
          <div className="bg-black/30 backdrop-blur-xl border border-white/10 border-b-0 w-full max-w-md rounded-t-3xl shadow-2xl animate-slide-up pb-safe">
            <div className="flex items-center justify-between p-6 pb-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="bg-white/10 p-2 rounded-lg border border-white/20">
                  <Ticket className="text-white" size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Активировать промокод</h2>
                  <p className="text-xs text-white/60">Получите Premium бесплатно</p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-white/60 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleRedeem} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-white/80">
                  Промокод
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="ВВЕДИТЕ_ПРОМОКОД"
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-center text-lg font-bold placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all uppercase"
                  maxLength={20}
                  autoFocus
                  disabled={loading}
                />
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                <p className="text-xs text-white/60 text-center">
                  ✨ Промокоды дают доступ к Premium функциям бесплатно
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all"
                  disabled={loading}
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 rounded-xl bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-all disabled:opacity-50"
                  disabled={loading}
                >
                  {loading ? 'Активация...' : 'Активировать'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
