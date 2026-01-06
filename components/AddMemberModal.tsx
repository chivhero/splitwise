'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { hapticFeedback, showTelegramPopup } from '@/lib/telegram';
import { useLanguage } from '@/contexts/LanguageContext';

interface AddMemberModalProps {
  groupId: string;
  onClose: () => void;
  onMemberAdded: () => void;
}

export default function AddMemberModal({ groupId, onClose, onMemberAdded }: AddMemberModalProps) {
  const { t } = useLanguage();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!firstName.trim()) {
      showTelegramPopup(t('addMember.firstNameRequired'));
      return;
    }

    setLoading(true);
    hapticFeedback('light');

    try {
      // Генерируем случайный Telegram ID для тестирования
      const fakeTelegramId = Math.floor(Math.random() * 900000000) + 100000000;

      // Создаём пользователя
      const createUserResponse = await fetch('/api/users/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegramId: fakeTelegramId,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
        }),
      });

      if (!createUserResponse.ok) {
        throw new Error('Failed to create user');
      }

      // Добавляем пользователя в группу
      const joinResponse = await fetch(`/api/groups/${groupId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegramId: fakeTelegramId }),
      });

      if (joinResponse.ok) {
        onMemberAdded();
        hapticFeedback('success');
      } else {
        const data = await joinResponse.json();
        showTelegramPopup(data.error || t('addMember.error'));
        hapticFeedback('error');
      }
    } catch (error) {
      console.error('Failed to add member:', error);
      showTelegramPopup(t('addMember.connectionError'));
      hapticFeedback('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end justify-center z-50 animate-fade-in">
      <div className="bg-black/30 backdrop-blur-xl border border-white/10 w-full max-w-lg rounded-t-3xl p-6 animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">{t('addMember.title')}</h2>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Info Banner */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-3 mb-4">
          <p className="text-sm text-white/80">
            💡 <strong>{t('addMember.devMode')}:</strong> {t('addMember.devModeDescription')}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-white/80">{t('addMember.firstName')} *</label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder={t('addMember.firstNamePlaceholder')}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all"
              maxLength={50}
              disabled={loading}
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-white/80">{t('addMember.lastName')}</label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder={t('addMember.lastNamePlaceholder')}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all"
              maxLength={50}
              disabled={loading}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all"
              disabled={loading}
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 rounded-xl bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-all disabled:opacity-50"
              disabled={loading}
            >
              {loading ? t('addMember.adding') : t('expenses.add')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}




