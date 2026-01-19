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
      // Добавляем cache: 'no-store' чтобы гарантировать свежие данные
      const [groupRes, expensesRes] = await Promise.all([
        fetch(`/api/groups/${groupId}`, { cache: 'no-store' }),
        fetch(`/api/groups/${groupId}/expenses`, { cache: 'no-store' }),
      ]);

      const groupData = await groupRes.json();
      const expensesData = await expensesRes.json();

      console.log('[GroupPage] Loaded group with members:', groupData.group?.members?.length);
      
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

  const handleMemberAdded = (updatedGroup?: Group) => {
    setShowAddMember(false);
    if (updatedGroup) {
      // Используем данные группы напрямую из ответа API (без проблем с read replica)
      console.log('[GroupPage] Using group from API response with', updatedGroup.members?.length, 'members');
      setGroup(updatedGroup);
    } else {
      // Fallback: перезагружаем данные
      loadGroupData();
    }
    hapticFeedback('success');
  };

  const handleShareLink = () => {
    shareGroupLink(groupId, group?.name || 'Group');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-radial from-white/5 to-transparent animate-pulse"></div>
        <div className="relative backdrop-blur-xl bg-white/10 p-8 rounded-3xl border border-white/20 shadow-glass-xl">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-white/30 border-t-white"></div>
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center backdrop-blur-2xl bg-white/10 p-10 rounded-3xl border border-white/20 shadow-glass-xl">
          <h2 className="text-2xl font-bold text-white mb-6">{t('common.error')}</h2>
          <button onClick={() => router.push('/')} className="btn-primary">
            {t('common.back')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 relative overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-white/5 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-white/3 rounded-full blur-3xl animate-float" style={{animationDelay: '1s'}}></div>
      </div>

      {/* Header with Glassmorphism */}
      <div className="relative backdrop-blur-2xl bg-gradient-to-br from-white/15 to-white/5 border-b border-white/10 shadow-glass-lg">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => router.push('/')}
              className="backdrop-blur-xl bg-white/10 hover:bg-white/20 p-2.5 rounded-xl transition-all border border-white/20 hover:border-white/30 active:scale-95"
            >
              <ArrowLeft size={24} className="text-white" />
            </button>
            <h1 className="text-2xl font-bold flex-1 text-white">{group.name}</h1>
          </div>

          {group.description && (
            <p className="text-white/70 text-sm mb-4 ml-14">{group.description}</p>
          )}

          <div className="flex gap-2 overflow-x-auto ml-14">
            <button
              onClick={handleAddMember}
              className="flex items-center gap-2 px-4 py-2.5 backdrop-blur-xl bg-white/10 hover:bg-white/20 rounded-xl transition-all border border-white/20 hover:border-white/30 whitespace-nowrap text-white"
            >
              <UserPlus size={18} />
              <span className="text-sm font-medium">{t('createGroup.addMembers')}</span>
            </button>
            <button
              onClick={handleShareLink}
              className="flex items-center gap-2 px-4 py-2.5 backdrop-blur-xl bg-white/10 hover:bg-white/20 rounded-xl transition-all border border-white/20 hover:border-white/30 whitespace-nowrap text-white"
            >
              <Users size={18} />
              <span className="text-sm font-medium">{t('common.share')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Glassmorphism Tabs */}
      <div className="flex gap-3 px-4 mt-6 relative z-10">
        <button
          onClick={() => {
            setActiveTab('expenses');
            hapticFeedback('light');
          }}
          className={`flex-1 py-3.5 rounded-xl font-semibold transition-all duration-300 ${
            activeTab === 'expenses'
              ? 'backdrop-blur-2xl bg-white/20 border-2 border-white/30 text-white shadow-glass-lg'
              : 'backdrop-blur-xl bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 hover:text-white/80'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <TrendingUp size={20} />
            {t('expenses.title')}
          </div>
        </button>
        <button
          onClick={() => {
            setActiveTab('settlements');
            hapticFeedback('light');
          }}
          className={`flex-1 py-3.5 rounded-xl font-semibold transition-all duration-300 ${
            activeTab === 'settlements'
              ? 'backdrop-blur-2xl bg-white/20 border-2 border-white/30 text-white shadow-glass-lg'
              : 'backdrop-blur-xl bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 hover:text-white/80'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <Users size={20} />
            {t('settlements.title')}
          </div>
        </button>
      </div>

      {/* Content */}
      <div className="px-4 mt-6 relative z-10">
        {activeTab === 'expenses' ? (
          expenses.length === 0 ? (
            <div className="text-center py-16 backdrop-blur-2xl bg-white/5 rounded-3xl border border-white/10 shadow-glass-xl animate-fade-in">
              <div className="text-7xl mb-6 animate-float">💳</div>
              <h3 className="text-2xl font-bold text-white mb-3">{t('expenses.noExpenses')}</h3>
              <p className="text-white/60 mb-8 max-w-md mx-auto">{t('expenses.addFirst')}</p>
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

      {/* Floating Action Button with Glass Effect */}
      {activeTab === 'expenses' && expenses.length > 0 && (
        <button
          onClick={handleAddExpense}
          className="fixed bottom-6 right-6 backdrop-blur-xl bg-white/20 hover:bg-white/30 border border-white/30 text-white w-16 h-16 rounded-2xl shadow-glass-xl hover:shadow-glass-2xl flex items-center justify-center transition-all duration-300 active:scale-95 z-50 group"
        >
          <Plus size={28} className="group-hover:rotate-90 transition-transform duration-300" />
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
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
