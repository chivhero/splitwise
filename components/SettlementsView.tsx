'use client';

import { useEffect, useState } from 'react';
import { Group, Settlement, Balance } from '@/types';
import { ArrowRight, CheckCircle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { getTelegramUser } from '@/lib/telegram';

interface SettlementsViewProps {
  groupId: string;
  group: Group;
}

interface Summary {
  totalAmount: number;
  expensesCount: number;
  balances: Balance[];
  settlements: Settlement[];
}

export default function SettlementsView({ groupId, group }: SettlementsViewProps) {
  const { t, locale } = useLanguage();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSummary();
  }, [groupId]);

  const loadSummary = async () => {
    try {
      const response = await fetch(`/api/groups/${groupId}/summary`);
      const data = await response.json();
      setSummary(data.summary);
    } catch (error) {
      console.error('Failed to load summary:', error);
    } finally {
      setLoading(false);
    }
  };

  // Получаем текущего пользователя
  const tgUser = getTelegramUser();
  const currentUserMember = tgUser ? group.members.find(m => m.user?.telegramId === tgUser.id) : null;
  const currentUserId = currentUserMember?.userId;
  
  // Функция для получения имени из объекта user
  const getNameFromUser = (user: any) => {
    if (!user) return t('common.unknown');
    return user.firstName || user.first_name || t('common.unknown');
  };
  
  const getUserName = (userId: string, userObj?: any) => {
    // Если это текущий пользователь - показываем "Вы"/"You"
    if (userId === currentUserId) {
      return t('common.you');
    }
    
    // Сначала пробуем использовать переданный объект user (из summary)
    if (userObj) {
      return getNameFromUser(userObj);
    }
    
    // Fallback: ищем в group.members
    const member = group.members.find(m => m.userId === userId);
    return member?.user?.firstName || t('common.unknown');
  };

  const getExpensesCountText = (count: number) => {
    if (locale === 'ru') {
      const lastDigit = count % 10;
      const lastTwoDigits = count % 100;
      
      if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
        return `${count} расходов`;
      }
      if (lastDigit === 1) {
        return `${count} расход`;
      }
      if (lastDigit >= 2 && lastDigit <= 4) {
        return `${count} расхода`;
      }
      return `${count} расходов`;
    } else {
      return `${count} expense${count === 1 ? '' : 's'}`;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-white/20 border-t-white"></div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="text-center py-12 text-white/60">
        {t('common.loadFailed')}
      </div>
    );
  }

  if (summary.expensesCount === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">📊</div>
        <h2 className="text-xl font-semibold mb-2 text-white">{t('settlements.noExpenses')}</h2>
        <p className="text-white/60">
          {t('settlements.addExpensesToSee')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <div className="card">
        <div className="text-center">
          <p className="text-sm text-white/70 mb-1">{t('settlements.totalSpent')}</p>
          <p className="text-3xl font-bold text-white mb-1">
            {summary.totalAmount.toFixed(2)} {group.currency}
          </p>
          <p className="text-xs text-white/60">
            {getExpensesCountText(summary.expensesCount)}
          </p>
        </div>
      </div>

      {/* Settlements */}
      {summary.settlements.length === 0 ? (
        <div className="card text-center py-8">
          <div className="text-5xl mb-3">
            <CheckCircle size={48} className="inline text-green-400" />
          </div>
          <h3 className="text-lg font-semibold mb-2 text-white">{t('settlements.allSettled')}</h3>
          <p className="text-white/60 text-sm">
            {t('settlements.noDebts')}
          </p>
        </div>
      ) : (
        <div>
          <h3 className="font-semibold mb-3 text-white/80">
            {t('settlements.necessaryTransfers')} ({summary.settlements.length})
          </h3>
          <div className="space-y-3">
            {summary.settlements.map((settlement: any, index: number) => (
              <div key={index} className="card border-l-4 border-white/30 hover:border-white/50 transition-all">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="font-semibold text-white">
                      {getUserName(settlement.from, settlement.fromUser)}
                    </div>
                    <ArrowRight size={20} className="text-white/60" />
                    <div className="font-semibold text-white">
                      {getUserName(settlement.to, settlement.toUser)}
                    </div>
                  </div>
                  <div className="font-bold text-white text-lg">
                    {settlement.amount.toFixed(2)} {group.currency}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Balances */}
      <div>
        <h3 className="font-semibold mb-3 text-white/80">{t('settlements.membersBalance')}</h3>
        <div className="space-y-2">
          {summary.balances.map((balance: any) => (
            <div key={balance.userId} className="card">
              <div className="flex items-center justify-between">
                <span className="font-medium text-white">{getUserName(balance.userId, balance.user)}</span>
                <span
                  className={`font-semibold ${
                    balance.balance > 0.01
                      ? 'text-green-400'
                      : balance.balance < -0.01
                      ? 'text-red-400'
                      : 'text-white'
                  }`}
                >
                  {balance.balance > 0.01
                    ? `+${balance.balance.toFixed(2)}`
                    : balance.balance < -0.01
                    ? balance.balance.toFixed(2)
                    : '0.00'}{' '}
                  {group.currency}
                </span>
              </div>
              {balance.balance > 0.01 && (
                <p className="text-xs text-white/60 mt-1">{t('settlements.owesYou')}</p>
              )}
              {balance.balance < -0.01 && (
                <p className="text-xs text-white/60 mt-1">{t('settlements.youOwe')}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}








