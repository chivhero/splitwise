'use client';

import { useState, useEffect } from 'react';
import { Crown, X } from 'lucide-react';
import { useWebApp, useHapticFeedback } from '@/lib/telegram';
import { useLanguage } from '@/contexts/LanguageContext';

export default function PremiumBanner() {
  const { t } = useLanguage();
  const [isPremium, setIsPremium] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(false);

  const webApp = useWebApp();
  const hapticFeedback = useHapticFeedback();

  useEffect(() => {
    const tgUser = webApp?.initDataUnsafe?.user;
    if (tgUser) {
      // setIsPremium(tgUser.is_premium || false);
    }
  }, [webApp]);

  if (isPremium || dismissed) {
    return null;
  }

  const handleUpgrade = () => {
    hapticFeedback.impactOccurred('light');
    setLoading(true);
    
    // The logic for opening an invoice would be here.
    // For now, we'll just simulate a successful payment.
    setTimeout(() => {
      setLoading(false);
      setIsPremium(true);
      hapticFeedback.notificationOccurred('success');
    }, 2000);
  };

  return (
    <div className="bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-600 rounded-2xl p-4 text-white relative overflow-hidden shadow-xl">
      <button
        onClick={() => {
          setDismissed(true);
          hapticFeedback.impactOccurred('light');
        }}
        className="absolute top-2 right-2 text-white/80 hover:text-white"
      >
        <X size={20} />
      </button>

      <div className="flex items-start gap-3">
        <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
          <Crown size={24} />
        </div>
        <div className="flex-1">
               <h3 className="font-bold mb-1">{t('premium.bannerTitle')}</h3>
          <p className="text-sm text-white/90 mb-3">
                 {t('premium.bannerDescription')}
          </p>
          <button
            onClick={handleUpgrade}
            disabled={loading}
                 className="bg-white text-purple-600 font-semibold px-4 py-2 rounded-lg text-sm hover:bg-white/90 transition-all shadow-md active:scale-95 disabled:opacity-50"
          >
                 {loading ? t('common.loading') : t('premium.activateButton')}
          </button>
        </div>
      </div>

      {/* Декоративные элементы */}
      <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
      <div className="absolute -left-4 -top-4 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
    </div>
  );
}
