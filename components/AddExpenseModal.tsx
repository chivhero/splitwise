'use client';

import { useState } from 'react';
import { Expense, Group } from '@/types';
import { X } from 'lucide-react';
import { hapticFeedback, showTelegramPopup } from '@/lib/telegram';
import { useLanguage } from '@/contexts/LanguageContext';

interface AddExpenseModalProps {
  telegramId: number;
  group: Group;
  onClose: () => void;
  onExpenseAdded: (expense: Expense) => void;
}

export default function AddExpenseModal({ telegramId, group, onClose, onExpenseAdded }: AddExpenseModalProps) {
  const { t } = useLanguage();
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  
  // Находим текущего пользователя
  const currentUserMember = group.members.find(m => m.user?.telegramId === telegramId);
  const currentUserId = currentUserMember?.userId;
  
  const [paidBy, setPaidBy] = useState<string>(currentUserId || '');
  const [splitBetween, setSplitBetween] = useState<string[]>(currentUserId ? [currentUserId] : []);
  const [category, setCategory] = useState('other');
  const [loading, setLoading] = useState(false);

  const categories = [
    { id: 'food', emoji: '🍔' },
    { id: 'transport', emoji: '🚗' },
    { id: 'entertainment', emoji: '🎉' },
    { id: 'accommodation', emoji: '🏠' },
    { id: 'shopping', emoji: '🛍️' },
    { id: 'other', emoji: '💰' },
  ];

  const toggleMember = (userId: string) => {
    if (splitBetween.includes(userId)) {
      if (splitBetween.length > 1) {
        setSplitBetween(splitBetween.filter(id => id !== userId));
      }
    } else {
      setSplitBetween([...splitBetween, userId]);
    }
    hapticFeedback('light');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!description.trim()) {
      showTelegramPopup(t('expenses.descriptionRequired'));
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      showTelegramPopup(t('expenses.amountRequired'));
      return;
    }

    if (splitBetween.length === 0) {
      showTelegramPopup(t('expenses.splitBetweenRequired'));
      return;
    }

    setLoading(true);
    hapticFeedback('light');

    try {
      const response = await fetch(`/api/groups/${group.id}/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: description.trim(),
          amount: amountNum,
          paidByUserId: paidBy,
          splitBetweenUserIds: splitBetween,
          telegramId,
          category,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        onExpenseAdded(data.expense);
        hapticFeedback('success');
      } else {
        showTelegramPopup(data.error || t('expenses.error'));
        hapticFeedback('error');
      }
    } catch (error) {
      console.error('Failed to add expense:', error);
      showTelegramPopup(t('expenses.connectionError'));
      hapticFeedback('error');
    } finally {
      setLoading(false);
    }
  };

  const getMemberName = (member: any) => {
    const firstName = member.user?.firstName || t('expenses.member');
    const lastName = member.user?.lastName || '';
    return lastName ? `${firstName} ${lastName}` : firstName;
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in p-4">
      <div className="bg-black/30 backdrop-blur-xl border border-white/10 w-full max-w-lg rounded-3xl shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4 border-b border-white/10 flex-shrink-0">
          <h2 className="text-xl font-bold text-white">{t('expenses.add')}</h2>
          <button onClick={onClose} className="text-white/60 hover:text-white">
            <X size={24} />
          </button>
        </div>

        {/* Form - scrollable */}
        <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto px-6 py-4 flex-1">
          <div>
            <label className="block text-sm font-medium mb-2 text-white/80">{t('expenses.description')} *</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('expenses.descriptionPlaceholder')}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all"
              maxLength={100}
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-white/80">{t('expenses.amount')} ({group.currency}) *</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              step="0.01"
              min="0"
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-white/80">{t('expenses.category')}</label>
            <div className="grid grid-cols-3 gap-2">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setCategory(cat.id);
                    hapticFeedback('light');
                  }}
                  className={`p-3 rounded-xl border-2 text-sm transition-all ${
                    category === cat.id
                      ? 'border-white/40 bg-white/10'
                      : 'border-white/10 hover:border-white/20 hover:bg-white/5'
                  }`}
                  disabled={loading}
                >
                  <div className="text-2xl mb-1">{cat.emoji}</div>
                  <div className="text-xs text-white/80">{t(`expenses.categories.${cat.id}`)}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-white/80">{t('expenses.paidByLabel')} *</label>
            <div className="space-y-2">
              {group.members.map((member) => {
                const memberName = getMemberName(member);
                const isSelected = paidBy === member.userId;
                
                return (
                  <button
                    key={member.userId}
                    type="button"
                    onClick={() => {
                      setPaidBy(member.userId);
                      hapticFeedback('light');
                    }}
                    className={`w-full p-3 rounded-xl border-2 text-left transition-all ${
                      isSelected
                        ? 'border-white/40 bg-white/10 font-semibold'
                        : 'border-white/10 hover:border-white/20 hover:bg-white/5'
                    }`}
                    disabled={loading}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-white">{memberName}</span>
                      {isSelected && <span className="text-white text-xl">✓</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-white/80">
              {t('expenses.splitBetweenLabel')} *
            </label>
            <div className="space-y-2">
              {group.members.map((member) => {
                const isSelected = splitBetween.includes(member.userId);
                return (
                  <button
                    key={member.userId}
                    type="button"
                    onClick={() => toggleMember(member.userId)}
                    className={`w-full p-3 rounded-xl border-2 text-left transition-all ${
                      isSelected
                        ? 'border-white/40 bg-white/10'
                        : 'border-white/10 hover:border-white/20 hover:bg-white/5'
                    }`}
                    disabled={loading}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-white">{getMemberName(member)}</span>
                      {isSelected && (
                        <span className="text-white">✓</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
            {splitBetween.length > 0 && (
              <p className="text-xs text-white/60 mt-2">
                {(parseFloat(amount) / splitBetween.length || 0).toFixed(2)} {group.currency} {t('expenses.perPerson')}
              </p>
            )}
          </div>

        </form>

        {/* Actions - fixed at bottom */}
        <div className="flex gap-3 p-6 pt-4 border-t border-white/10 flex-shrink-0">
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
            onClick={(e) => {
              e.preventDefault();
              const form = e.currentTarget.closest('div')?.previousElementSibling as HTMLFormElement;
              if (form) {
                form.requestSubmit();
              }
            }}
            className="flex-1 px-6 py-3 rounded-xl bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-all disabled:opacity-50" 
            disabled={loading}
          >
            {loading ? t('expenses.adding') : t('expenses.add')}
            </button>
          </div>
      </div>
    </div>
  );
}








