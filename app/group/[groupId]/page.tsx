'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Group, Expense } from '@/types';
import { getTelegramUser, hapticFeedback, shareGroupLink, isTelegramWebApp } from '@/lib/telegram';
import { ArrowLeft, Plus, Users, TrendingUp, UserPlus } from 'lucide-react';
import ExpenseList from '@/components/ExpenseList';
import AddExpenseModal from '@/components/AddExpenseModal';
import AddMemberModal from '@/components/AddMemberModal';
import SettlementsView from '@/components/SettlementsView';
import { useLanguage } from '@/contexts/LanguageContext';

export default function GroupPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const params = useParams();
  const groupId = params?.groupId as string;

  const [group, setGroup] = useState<Group | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [activeTab, setActiveTab] = useState<'expenses' | 'settlements'>('expenses');
  const [telegramId, setTelegramId] = useState<number | null>(null);

  useEffect(() => {
    const tgUser = getTelegramUser();
    if (tgUser) {
      setTelegramId(tgUser.id);
    } else {
      // Для тестирования вне Telegram
      setTelegramId(123456789);
    }
    loadGroupData();
  }, [groupId]);

  const loadGroupData = async () => {
    try {
      const [groupRes, expensesRes] = await Promise.all([
        fetch(`/api/groups/${groupId}`),
        fetch(`/api/groups/${groupId}/expenses`),
      ]);

      const groupData = await groupRes.json();
      const expensesData = await expensesRes.json();

      setGroup(groupData.group);
      setExpenses(expensesData.expenses || []);
    } catch (error) {
      console.error('Failed to load group:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddExpense = () => {
    hapticFeedback('light');
    setShowAddExpense(true);
  };

  const handleExpenseAdded = (expense: Expense) => {
    setExpenses([expense, ...expenses]);
    setShowAddExpense(false);
    hapticFeedback('success');
    loadGroupData(); // Перезагружаем данные для обновления балансов
  };

  const handleAddMember = () => {
    hapticFeedback('light');
    setShowAddMember(true);
  };

  const handleMemberAdded = () => {
    setShowAddMember(false);
    loadGroupData();
    hapticFeedback('success');
  };

  const handleShareLink = () => {
    shareGroupLink(groupId);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">{t('common.error')}</h2>
          <button onClick={() => router.push('/')} className="btn-primary">
            {t('common.back')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-600 text-white p-6 rounded-b-3xl shadow-xl">
        <div className="flex items-center gap-3 mb-4">
        <button
            onClick={() => router.push('/')}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors active:scale-95"
        >
            <ArrowLeft size={24} />
        </button>
          <h1 className="text-2xl font-bold flex-1">{group.name}</h1>
        </div>

        {group.description && (
          <p className="text-purple-100 text-sm mb-4">{group.description}</p>
        )}

        <div className="flex gap-2 overflow-x-auto">
          <button
            onClick={handleAddMember}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors whitespace-nowrap"
          >
            <UserPlus size={18} />
            <span className="text-sm">{t('createGroup.addMembers')}</span>
          </button>
          <button
            onClick={handleShareLink}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors whitespace-nowrap"
          >
            <Users size={18} />
            <span className="text-sm">{t('common.share')}</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 px-4 mt-4">
          <button
            onClick={() => {
              setActiveTab('expenses');
              hapticFeedback('light');
            }}
          className={`flex-1 py-3 rounded-lg font-medium transition-all ${
              activeTab === 'expenses'
              ? 'bg-white shadow-lg text-purple-600'
              : 'bg-white/50 text-gray-600 hover:bg-white/80'
            }`}
          >
          <div className="flex items-center justify-center gap-2">
            <TrendingUp size={18} />
            {t('expenses.title')}
          </div>
          </button>
          <button
            onClick={() => {
              setActiveTab('settlements');
              hapticFeedback('light');
            }}
          className={`flex-1 py-3 rounded-lg font-medium transition-all ${
              activeTab === 'settlements'
              ? 'bg-white shadow-lg text-purple-600'
              : 'bg-white/50 text-gray-600 hover:bg-white/80'
            }`}
          >
          <div className="flex items-center justify-center gap-2">
            <Users size={18} />
            {t('settlements.title')}
          </div>
          </button>
      </div>

      {/* Content */}
      <div className="px-4 mt-4">
        {activeTab === 'expenses' ? (
          expenses.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl shadow-sm">
              <div className="text-6xl mb-4">💳</div>
              <h3 className="text-xl font-semibold mb-2">{t('expenses.noExpenses')}</h3>
              <p className="text-gray-600 mb-6">{t('expenses.addFirst')}</p>
              <button onClick={handleAddExpense} className="btn-primary inline-flex items-center gap-2">
                <Plus size={20} />
                {t('expenses.add')}
              </button>
            </div>
          ) : (
            <ExpenseList expenses={expenses} group={group} />
          )
        ) : (
          <SettlementsView groupId={groupId} group={group} />
        )}
      </div>

      {/* Floating Action Button */}
      {activeTab === 'expenses' && expenses.length > 0 && (
        <button
          onClick={handleAddExpense}
          className="fixed bottom-6 right-6 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white w-14 h-14 rounded-full shadow-xl hover:shadow-2xl flex items-center justify-center transition-all active:scale-95"
        >
          <Plus size={24} />
        </button>
      )}

      {/* Modals */}
      {showAddExpense && group && telegramId && (
        <AddExpenseModal
          group={group}
          telegramId={telegramId}
          onClose={() => setShowAddExpense(false)}
          onExpenseAdded={handleExpenseAdded}
        />
      )}

      {showAddMember && (
        <AddMemberModal
          groupId={groupId}
          onClose={() => setShowAddMember(false)}
          onMemberAdded={handleMemberAdded}
        />
      )}
    </div>
  );
}
