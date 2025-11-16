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
  const [paidBy, setPaidBy] = useState<number>(telegramId);
  const [splitBetween, setSplitBetween] = useState<number[]>([telegramId]);
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

  const toggleMember = (memberTgId: number) => {
    if (splitBetween.includes(memberTgId)) {
      if (splitBetween.length > 1) {
        setSplitBetween(splitBetween.filter(id => id !== memberTgId));
      }
    } else {
      setSplitBetween([...splitBetween, memberTgId]);
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
          paidByTelegramId: paidBy,
          splitBetweenTelegramIds: splitBetween,
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
    return member.user?.firstName || t('expenses.member');
  };

  const getMemberTgId = (member: any) => {
    return member.user?.telegramId;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in p-4">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="text-xl font-bold">{t('expenses.add')}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        {/* Form - scrollable */}
        <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto px-6 py-4 flex-1">
          <div>
            <label className="block text-sm font-medium mb-2">{t('expenses.description')} *</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('expenses.descriptionPlaceholder')}
              className="input"
              maxLength={100}
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t('expenses.amount')} ({group.currency}) *</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              step="0.01"
              min="0"
              className="input"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t('expenses.category')}</label>
            <div className="grid grid-cols-3 gap-2">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setCategory(cat.id);
                    hapticFeedback('light');
                  }}
                  className={`p-3 rounded-xl border-2 text-sm transition-colors ${
                    category === cat.id
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-purple-200 hover:border-purple-300'
                  }`}
                  disabled={loading}
                >
                  <div className="text-2xl mb-1">{cat.emoji}</div>
                  <div className="text-xs">{t(`expenses.categories.${cat.id}`)}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t('expenses.paidByLabel')} *</label>
            <div className="space-y-2">
              {group.members.map((member) => {
                const tgId = getMemberTgId(member);
                const memberName = getMemberName(member);
                const isSelected = paidBy === tgId;
                
                return (
                  <button
                    key={member.userId}
                    type="button"
                    onClick={() => {
                      setPaidBy(tgId);
                      hapticFeedback('light');
                    }}
                    className={`w-full p-3 rounded-xl border-2 text-left transition-colors ${
                      isSelected
                        ? 'border-purple-500 bg-purple-50 font-semibold'
                        : 'border-purple-200 hover:border-purple-300'
                    }`}
                    disabled={loading}
                  >
                    <div className="flex items-center justify-between">
                      <span>{memberName}</span>
                      {isSelected && <span className="text-purple-600 text-xl">✓</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              {t('expenses.splitBetweenLabel')} *
            </label>
            <div className="space-y-2">
              {group.members.map((member) => {
                const tgId = getMemberTgId(member);
                const isSelected = splitBetween.includes(tgId);
                return (
                  <button
                    key={member.userId}
                    type="button"
                    onClick={() => toggleMember(tgId)}
                    className={`w-full p-3 rounded-xl border-2 text-left transition-colors ${
                      isSelected
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-purple-200 hover:border-purple-300'
                    }`}
                    disabled={loading}
                  >
                    <div className="flex items-center justify-between">
                      <span>{getMemberName(member)}</span>
                      {isSelected && (
                        <span className="text-purple-600">✓</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
            {splitBetween.length > 0 && (
              <p className="text-xs text-gray-600 mt-2">
                {(parseFloat(amount) / splitBetween.length || 0).toFixed(2)} {group.currency} {t('expenses.perPerson')}
              </p>
            )}
          </div>

        </form>

        {/* Actions - fixed at bottom */}
        <div className="flex gap-3 p-6 pt-4 border-t border-gray-100 flex-shrink-0">
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
            onClick={(e) => {
              e.preventDefault();
              const form = e.currentTarget.closest('div')?.previousElementSibling as HTMLFormElement;
              if (form) {
                form.requestSubmit();
              }
            }}
            className="btn-primary flex-1" 
            disabled={loading}
          >
            {loading ? t('expenses.adding') : t('expenses.add')}
            </button>
          </div>
      </div>
    </div>
  );
}








