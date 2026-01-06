'use client';

import { useState } from 'react';
import { Group } from '@/types';
import { X } from 'lucide-react';
import { hapticFeedback, showTelegramPopup } from '@/lib/telegram';
import { useLanguage } from '@/contexts/LanguageContext';

interface CreateGroupModalProps {
  telegramId: number;
  onClose: () => void;
  onGroupCreated: (group: Group) => void;
}

export default function CreateGroupModal({ telegramId, onClose, onGroupCreated }: CreateGroupModalProps) {
  const { t } = useLanguage();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      showTelegramPopup(t('createGroup.nameRequired'));
      return;
    }

    setLoading(true);
    hapticFeedback('light');

    try {
      const response = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          currency,
          telegramId,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        onGroupCreated(data.group);
        hapticFeedback('success');
      } else {
        showTelegramPopup(data.error || t('createGroup.error'));
        hapticFeedback('error');
      }
    } catch (error) {
      console.error('Failed to create group:', error);
      showTelegramPopup(t('createGroup.connectionError'));
      hapticFeedback('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50 animate-fade-in">
      <div className="bg-white w-full max-w-lg rounded-t-3xl p-6 animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">{t('createGroup.title')}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              {t('createGroup.nameLabel')} *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('createGroup.namePlaceholder')}
              className="input"
              maxLength={50}
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              {t('createGroup.descriptionLabel')}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('createGroup.descriptionPlaceholder')}
              className="input resize-none"
              rows={3}
              maxLength={200}
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              {t('createGroup.currencyLabel')}
            </label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="input"
              disabled={loading}
            >
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="RUB">RUB (₽)</option>
              <option value="GBP">GBP (£)</option>
            </select>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1"
              disabled={loading}
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              className="btn-primary flex-1"
              disabled={loading}
            >
              {loading ? t('createGroup.creating') : t('common.create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}











