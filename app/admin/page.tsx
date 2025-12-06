'use client';

import { useEffect, useState } from 'react';
import { adminAPI } from '@/lib/api-client';
import { Users, DollarSign, TrendingUp, Crown } from 'lucide-react';
import Link from 'next/link';

interface Stats {
  totalUsers: number;
  totalGroups: number;
  totalExpenses: number;
  totalPremiumUsers: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const data = await adminAPI.getStats();
      setStats(data.stats);
    } catch (err: any) {
      setError(err.message);
      console.error('Failed to load stats:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-white border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex items-center justify-center p-4">
        <div className="bg-red-500/20 backdrop-blur-sm border border-red-500/50 rounded-2xl p-8 max-w-md">
          <h2 className="text-2xl font-bold text-white mb-4">❌ Ошибка</h2>
          <p className="text-red-200 mb-4">{error}</p>
          <button
            onClick={loadStats}
            className="btn-primary w-full"
          >
            Попробовать снова
          </button>
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
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-blue-500/20 p-3 rounded-xl">
                <Users className="text-blue-300" size={24} />
              </div>
              <TrendingUp className="text-green-400" size={20} />
            </div>
            <h3 className="text-white/60 text-sm font-medium mb-1">Всего пользователей</h3>
            <p className="text-4xl font-bold text-white">{stats?.totalUsers || 0}</p>
          </div>

          {/* Premium Users */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-yellow-500/20 p-3 rounded-xl">
                <Crown className="text-yellow-300" size={24} />
              </div>
              <span className="text-yellow-300 text-sm font-semibold">
                {stats?.totalUsers ? Math.round((stats.totalPremiumUsers / stats.totalUsers) * 100) : 0}%
              </span>
            </div>
            <h3 className="text-white/60 text-sm font-medium mb-1">Premium подписки</h3>
            <p className="text-4xl font-bold text-white">{stats?.totalPremiumUsers || 0}</p>
          </div>

          {/* Total Groups */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-purple-500/20 p-3 rounded-xl">
                <Users className="text-purple-300" size={24} />
              </div>
            </div>
            <h3 className="text-white/60 text-sm font-medium mb-1">Всего групп</h3>
            <p className="text-4xl font-bold text-white">{stats?.totalGroups || 0}</p>
          </div>

          {/* Total Expenses */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-green-500/20 p-3 rounded-xl">
                <DollarSign className="text-green-300" size={24} />
              </div>
            </div>
            <h3 className="text-white/60 text-sm font-medium mb-1">Всего расходов</h3>
            <p className="text-4xl font-bold text-white">{stats?.totalExpenses || 0}</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link href="/admin/premium">
            <div className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/20 backdrop-blur-md rounded-2xl p-6 border border-yellow-500/30 hover:scale-105 transition-transform cursor-pointer">
              <Crown className="text-yellow-300 mb-4" size={32} />
              <h3 className="text-xl font-bold text-white mb-2">Выдать Premium</h3>
              <p className="text-yellow-200 text-sm">Управление Premium подписками</p>
            </div>
          </Link>

          <Link href="/admin/promocodes">
            <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 backdrop-blur-md rounded-2xl p-6 border border-purple-500/30 hover:scale-105 transition-transform cursor-pointer">
              <DollarSign className="text-purple-300 mb-4" size={32} />
              <h3 className="text-xl font-bold text-white mb-2">Промо-коды</h3>
              <p className="text-purple-200 text-sm">Создать и управлять промо-кодами</p>
            </div>
          </Link>

          <Link href="/admin/audit-log">
            <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 backdrop-blur-md rounded-2xl p-6 border border-blue-500/30 hover:scale-105 transition-transform cursor-pointer">
              <TrendingUp className="text-blue-300 mb-4" size={32} />
              <h3 className="text-xl font-bold text-white mb-2">Audit Log</h3>
              <p className="text-blue-200 text-sm">История действий администраторов</p>
            </div>
          </Link>
        </div>

        {/* Back to Home */}
        <div className="mt-8 text-center">
          <Link href="/" className="text-purple-200 hover:text-white transition-colors">
            ← Вернуться на главную
          </Link>
        </div>
      </div>
    </div>
  );
}

