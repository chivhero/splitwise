'use client';

import { useState, useEffect } from 'react';
import { Crown, X } from 'lucide-react';
import { openPremiumInvoice, hapticFeedback, getTelegramUser } from '@/lib/telegram';
import { useLanguage } from '@/contexts/LanguageContext';

export default function PremiumBanner() {
  const { t, locale } = useLanguage();
  const [isPremium, setIsPremium] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Логируем загруженные переводы для диагностики
    console.log('🌍 i18n loaded:', {
      locale,
      bannerDescription: t('premium.bannerDescription'),
      activateButton: t('premium.activateButton'),
    });

    const checkPremiumStatus = async () => {
      const tgUser = getTelegramUser();
      if (tgUser) {
        try {
          const response = await fetch(`/api/users/premium-status?telegramId=${tgUser.id}`);
          const data = await response.json();
          setIsPremium(data.isPremium || false);
        } catch (error) {
          console.error('Failed to check premium status:', error);
        }
      }
    };
    
    checkPremiumStatus();
  }, []);

  if (isPremium || dismissed) {
    return null;
  }

  const handleUpgrade = () => {
    hapticFeedback('light');
    setLoading(true);
    
    openPremiumInvoice(async (status) => {
      setLoading(false);
      if (status === 'paid') {
        // Ждём немного, чтобы webhook успел обработаться
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Проверяем статус премиума
        const tgUser = getTelegramUser();
        if (tgUser) {
          try {
            const response = await fetch(`/api/users/premium-status?telegramId=${tgUser.id}`);
            const data = await response.json();
            setIsPremium(data.isPremium || false);
            hapticFeedback('success');
          } catch (error) {
            console.error('Failed to check premium status:', error);
            setIsPremium(true); // Fallback
            hapticFeedback('success');
          }
        }
      }
    });
  };

  return (
    <div key={locale} className="backdrop-blur-2xl bg-gradient-to-br from-white/15 to-white/5 rounded-2xl p-5 text-white relative overflow-hidden shadow-glass-xl border border-white/20 group z-10">
      <button
        onClick={() => {
          setDismissed(true);
          hapticFeedback('light');
        }}
        className="absolute top-3 right-3 text-white/60 hover:text-white transition-all hover:bg-white/10 p-1.5 rounded-lg z-10"
      >
        <X size={20} />
      </button>

      <div className="flex items-start gap-4 relative z-10">
        <div className="backdrop-blur-xl bg-white/20 p-3 rounded-xl border border-white/30 shadow-glass group-hover:scale-110 transition-transform duration-300">
          <Crown size={28} className="animate-float" />
        </div>
        <div className="flex-1 pt-1">
          <h3 className="font-bold text-lg mb-1.5">{t('premium.bannerTitle')}</h3>
          <p className="text-sm text-white/80 mb-4 leading-relaxed">
            {t('premium.bannerDescription')}
          </p>
          <button
            onClick={handleUpgrade}
            disabled={loading}
            className="backdrop-blur-xl bg-white/20 hover:bg-white/30 text-white font-semibold px-5 py-2.5 rounded-xl text-sm border border-white/30 hover:border-white/50 transition-all shadow-glass active:scale-95 disabled:opacity-50"
          >
            {loading ? t('common.loading') : t('premium.activateButton')}
          </button>
        </div>
      </div>

      {/* Glassmorphism декор */}
      <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/5 rounded-full blur-3xl group-hover:bg-white/10 transition-all"></div>
      <div className="absolute -left-8 -top-8 w-40 h-40 bg-white/5 rounded-full blur-3xl group-hover:bg-white/10 transition-all"></div>
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
    </div>
  );
}








