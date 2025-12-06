'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { Globe } from 'lucide-react';
import { useHapticFeedback } from '@/lib/telegram';

export default function LanguageSwitcher() {
  const { locale, setLocale } = useLanguage();
  const hapticFeedback = useHapticFeedback();

  const handleToggle = () => {
    hapticFeedback.impactOccurred('light');
    setLocale(locale === 'en' ? 'ru' : 'en');
  };

  return (
    <button
      onClick={handleToggle}
      className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full transition-colors text-sm"
      title={locale === 'en' ? 'Switch to Russian' : 'Переключить на английский'}
    >
      <Globe size={16} />
      <span className="font-medium">{locale === 'en' ? 'EN' : 'RU'}</span>
    </button>
  );
}
