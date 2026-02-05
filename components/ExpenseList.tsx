'use client';

import { useState } from 'react';
import { Expense, Group } from '@/types';
import { format } from 'date-fns';
import { ru, enUS } from 'date-fns/locale';
import { useLanguage } from '@/contexts/LanguageContext';
import { getTelegramUser } from '@/lib/telegram';
import ExpenseDetailsModal from './ExpenseDetailsModal';

interface ExpenseListProps {
  expenses: Expense[];
  group: Group;
  onExpenseDeleted?: () => void;
  onModalOpen?: (isOpen: boolean) => void;
}

export default function ExpenseList({ expenses, group, onExpenseDeleted, onModalOpen }: ExpenseListProps) {
  const { t, locale } = useLanguage();
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  
  // Получаем текущего пользователя
  const tgUser = getTelegramUser();
  const currentUserMember = tgUser ? group.members.find(m => m.user?.telegramId === tgUser.id) : null;
  const currentUserId = currentUserMember?.userId;
  
  const getUserName = (userId: string) => {
    // Если это текущий пользователь - показываем "Вы"/"You"
    if (userId === currentUserId) {
      return t('common.you');
    }
    const member = group.members.find(m => m.userId === userId);
    return member?.user?.firstName || t('common.unknown');
  };

  const getCategoryEmoji = (category?: string) => {
    const categories: { [key: string]: string } = {
      food: '🍔',
      transport: '🚗',
      entertainment: '🎉',
      accommodation: '🏠',
      shopping: '🛍️',
      other: '💰',
    };
    return categories[category || 'other'] || '💰';
  };

  const getSplitBetweenText = (count: number) => {
    if (locale === 'ru') {
      const lastDigit = count % 10;
      const lastTwoDigits = count % 100;
      
      if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
        return `Разделено между ${count} участниками`;
      }
      if (lastDigit === 1) {
        return `Разделено между ${count} участником`;
      }
      if (lastDigit >= 2 && lastDigit <= 4) {
        return `Разделено между ${count} участниками`;
      }
      return `Разделено между ${count} участниками`;
    } else {
      return `Split between ${count} member${count === 1 ? '' : 's'}`;
    }
  };

  const handleDeleteExpense = async () => {
    if (!selectedExpense) return;

    try {
      const res = await fetch(`/api/groups/${selectedExpense.groupId}/expenses/${selectedExpense.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setSelectedExpense(null);
        onExpenseDeleted?.();
      }
    } catch (error) {
      console.error('Failed to delete expense:', error);
    }
  };

  return (
    <>
      <div className="space-y-3">
        {expenses.map((expense) => (
          <div
            key={expense.id}
            className="card cursor-pointer hover:bg-white/10 transition"
            onClick={() => {
              setSelectedExpense(expense);
              onModalOpen?.(true);
            }}
          >
            <div className="flex items-start gap-3">
              <div className="text-2xl">{getCategoryEmoji(expense.category)}</div>
              <div className="flex-1">
                <h3 className="font-semibold mb-1 text-white">{expense.description}</h3>
                <p className="text-sm text-white/70 mb-2">
                  {t('expenses.paidByName', { name: getUserName(expense.paidBy) })}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/60">
                    {format(new Date(expense.date), 'd MMMM, HH:mm', { locale: locale === 'ru' ? ru : enUS })}
                  </span>
                  <span className="font-bold text-lg text-white">
                    {expense.amount.toFixed(2)} {expense.currency}
                  </span>
                </div>
                {expense.splitBetween.length > 1 && (
                  <p className="text-xs text-white/60 mt-1">
                    {getSplitBetweenText(expense.splitBetween.length)}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedExpense && (
        <ExpenseDetailsModal
          expense={selectedExpense}
          group={group}
          onClose={() => {
            setSelectedExpense(null);
            onModalOpen?.(false);
          }}
          onDelete={handleDeleteExpense}
          onEdit={() => {
            // TODO: Implement edit functionality
            console.log('Edit expense:', selectedExpense.id);
          }}
        />
      )}
    </>
  );
}








