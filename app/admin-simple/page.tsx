'use client';

import { useEffect, useState } from 'react';
import { getTelegramUser } from '@/lib/telegram';
import { Users, DollarSign, TrendingUp, Crown } from 'lucide-react';
import Link from 'next/link';

const ADMIN_IDS = [409627169];

interface Stats {
  totalUsers: number;
  totalGroups: number;
  totalExpenses: number;
  totalPremiumUsers: number;
}

export default function SimpleAdminDashboard() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Проверяем админа
    const tgUser = getTelegramUser();
    const userId = tgUser?.id;
    
    if (!userId || !ADMIN_IDS.includes(userId)) {
      window.location.href = '/';
      return;
    }
    
    setIsAdmin(true);
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await fetch('/api/admin/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-white border-t-transparent"></div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-white border-t-transparent mx-auto mb-4"></div>
          <p className="text-white text-lg">Загрузка...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900">
      {/* Header */}
      <div className="bg-black/20 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Crown className="text-yellow-400" size={32} />
            Админ-панель
          </h1>
          <p className="text-purple-200 mt-2">Управление SplitWise</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Users */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-blue-500/20 p-3 rounded-xl">
                <Users className="text-blue-300" size={24} />
              </div>
            </div>
            <h3 className="text-white/60 text-sm font-medium mb-1">Всего пользователей</h3>
            <p className="text-4xl font-bold text-white">{stats?.totalUsers || 0}</p>
          </div>

          {/* Premium Users */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-yellow-500/20 p-3 rounded-xl">
                <Crown className="text-yellow-300" size={24} />
              </div>
            </div>
            <h3 className="text-white/60 text-sm font-medium mb-1">Premium</h3>
            <p className="text-4xl font-bold text-white">{stats?.totalPremiumUsers || 0}</p>
          </div>

          {/* Total Groups */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-purple-500/20 p-3 rounded-xl">
                <Users className="text-purple-300" size={24} />
              </div>
            </div>
            <h3 className="text-white/60 text-sm font-medium mb-1">Групп</h3>
            <p className="text-4xl font-bold text-white">{stats?.totalGroups || 0}</p>
          </div>

          {/* Total Expenses */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-green-500/20 p-3 rounded-xl">
                <DollarSign className="text-green-300" size={24} />
              </div>
            </div>
            <h3 className="text-white/60 text-sm font-medium mb-1">Расходов</h3>
            <p className="text-4xl font-bold text-white">{stats?.totalExpenses || 0}</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Link href="/admin-simple/premium">
            <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-xl p-6 hover:bg-yellow-500/30 transition-all cursor-pointer">
              <Crown className="text-yellow-300 mb-3" size={28} />
              <h3 className="text-lg font-bold text-white mb-1">Выдать Premium</h3>
              <p className="text-yellow-200 text-sm">Выдать подписку пользователю</p>
            </div>
          </Link>

          <div className="bg-purple-500/20 border border-purple-500/30 rounded-xl p-6 opacity-50">
            <DollarSign className="text-purple-300 mb-3" size={28} />
            <h3 className="text-lg font-bold text-white mb-1">Промо-коды</h3>
            <p className="text-purple-200 text-sm">Скоро...</p>
          </div>
        </div>

        {/* Info */}
        <div className="bg-blue-500/20 backdrop-blur-sm border border-blue-500/30 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-white mb-3">👑 Добро пожаловать, админ!</h3>
          <p className="text-blue-200 mb-4">
            Это упрощённая версия админ-панели. Здесь ты можешь видеть основную статистику.
          </p>
          <div className="space-y-2 text-blue-200 text-sm">
            <p>• Всего пользователей: {stats?.totalUsers || 0}</p>
            <p>• Premium подписок: {stats?.totalPremiumUsers || 0}</p>
            <p>• Создано групп: {stats?.totalGroups || 0}</p>
            <p>• Добавлено расходов: {stats?.totalExpenses || 0}</p>
          </div>
        </div>

        {/* Back */}
        <div className="mt-8 text-center">
          <Link href="/" className="text-purple-200 hover:text-white transition-colors">
            ← Вернуться на главную
          </Link>
        </div>
      </div>
    </div>
  );
}

