'use client';

import { useEffect, useState } from 'react';
import { Group, Settlement, Balance } from '@/types';
import { ArrowRight, CheckCircle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

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

  const getUserName = (userId: string) => {
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
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-purple-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="text-center py-12 text-gray-600">
        {t('common.loadFailed')}
      </div>
    );
  }

  if (summary.expensesCount === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">📊</div>
        <h2 className="text-xl font-semibold mb-2">{t('settlements.noExpenses')}</h2>
        <p className="text-gray-600">
          {t('settlements.addExpensesToSee')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <div className="card bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50 border-purple-200 shadow-md">
        <div className="text-center">
          <p className="text-sm text-purple-600 mb-1">{t('settlements.totalSpent')}</p>
          <p className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent mb-1">
            {summary.totalAmount.toFixed(2)} {group.currency}
          </p>
          <p className="text-xs text-purple-500">
            {getExpensesCountText(summary.expensesCount)}
          </p>
        </div>
      </div>

      {/* Settlements */}
      {summary.settlements.length === 0 ? (
        <div className="card text-center py-8">
          <div className="text-5xl mb-3">
            <CheckCircle size={48} className="inline text-green-500" />
          </div>
          <h3 className="text-lg font-semibold mb-2">{t('settlements.allSettled')}</h3>
          <p className="text-gray-600 text-sm">
            {t('settlements.noDebts')}
          </p>
        </div>
      ) : (
        <div>
          <h3 className="font-semibold mb-3 text-purple-700">
            {t('settlements.necessaryTransfers')} ({summary.settlements.length})
          </h3>
          <div className="space-y-3">
            {summary.settlements.map((settlement, index) => (
              <div key={index} className="card bg-white border-l-4 border-pink-400 shadow-md hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="font-semibold text-purple-900">
                      {getUserName(settlement.from)}
                    </div>
                    <ArrowRight size={20} className="text-purple-400" />
                    <div className="font-semibold text-purple-900">
                      {getUserName(settlement.to)}
                    </div>
                  </div>
                  <div className="font-bold text-pink-600 text-lg">
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
        <h3 className="font-semibold mb-3 text-purple-700">{t('settlements.membersBalance')}</h3>
        <div className="space-y-2">
          {summary.balances.map((balance) => (
            <div key={balance.userId} className="card">
              <div className="flex items-center justify-between">
                <span className="font-medium text-purple-900">{getUserName(balance.userId)}</span>
                <span
                  className={`font-semibold ${
                    balance.balance > 0.01
                      ? 'text-green-600'
                      : balance.balance < -0.01
                      ? 'text-pink-600'
                      : 'text-purple-600'
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
                <p className="text-xs text-purple-500 mt-1">{t('settlements.owesYou')}</p>
              )}
              {balance.balance < -0.01 && (
                <p className="text-xs text-purple-500 mt-1">{t('settlements.youOwe')}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}








