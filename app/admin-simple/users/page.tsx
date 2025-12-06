'use client';

import { useState, useEffect } from 'react';
import { getTelegramUser } from '@/lib/telegram';
import { Users, ArrowLeft, Crown, Copy, Check } from 'lucide-react';
import Link from 'next/link';

const ADMIN_IDS = [409627169];

interface User {
  id: string;
  telegramId: number;
  firstName: string;
  lastName?: string;
  username?: string;
  isPremium: boolean;
  premiumExpiresAt?: string;
  createdAt: string;
}

export default function AdminUsersPage() {
  const [adminId, setAdminId] = useState<number | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const tgUser = getTelegramUser();
    const userId = tgUser?.id;
    
    if (!userId || !ADMIN_IDS.includes(userId)) {
      window.location.href = '/';
      return;
    }
    
    setAdminId(userId);
    loadUsers(userId);
  }, []);

  const loadUsers = async (adminTelegramId: number) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin-simple/users?adminTelegramId=${adminTelegramId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      
      const data = await response.json();
      setUsers(data.users || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyUserId = (userId: string) => {
    navigator.clipboard.writeText(userId);
    setCopiedId(userId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!adminId) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 flex items-center justify-center">
        <div className="text-red-300 text-center">
          <p className="text-xl font-bold mb-2">❌ Ошибка</p>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900">
      {/* Header */}
      <div className="bg-black/20 backdrop-blur-sm border-b border-white/10 p-4">
        <Link href="/admin-simple" className="text-purple-200 hover:text-white flex items-center gap-2 mb-3">
          <ArrowLeft size={20} />
          Назад
        </Link>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Users className="text-purple-300" size={28} />
          Все пользователи ({users.length})
        </h1>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20">
            <p className="text-purple-200 text-sm mb-1">Всего пользователей</p>
            <p className="text-3xl font-bold text-white">{users.length}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20">
            <p className="text-yellow-200 text-sm mb-1">Premium</p>
            <p className="text-3xl font-bold text-yellow-400">
              {users.filter(u => u.isPremium).length}
            </p>
          </div>
        </div>

        {/* Users List */}
        <div className="space-y-3">
          {users.map((user) => (
            <div
              key={user.id}
              className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-white font-bold">
                      {user.firstName} {user.lastName || ''}
                    </h3>
                    {user.isPremium && (
                      <Crown className="text-yellow-400" size={16} />
                    )}
                  </div>
                  {user.username && (
                    <p className="text-purple-200 text-sm">@{user.username}</p>
                  )}
                </div>
              </div>

              <div className="space-y-1 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-purple-200">User ID:</span>
                  <button
                    onClick={() => copyUserId(user.id)}
                    className="flex items-center gap-1 text-white bg-white/10 px-2 py-1 rounded hover:bg-white/20 transition-colors"
                  >
                    {copiedId === user.id ? (
                      <>
                        <Check size={14} className="text-green-400" />
                        <span className="text-green-400">Скопировано!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={14} />
                        <span className="font-mono text-xs">{user.id}</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-purple-200">Telegram ID:</span>
                  <span className="text-white">{user.telegramId}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-purple-200">Регистрация:</span>
                  <span className="text-white">
                    {new Date(user.createdAt).toLocaleDateString('ru-RU')}
                  </span>
                </div>

                {user.isPremium && user.premiumExpiresAt && (
                  <div className="flex items-center justify-between">
                    <span className="text-yellow-200">Premium до:</span>
                    <span className="text-yellow-400 font-bold">
                      {new Date(user.premiumExpiresAt).toLocaleDateString('ru-RU')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {users.length === 0 && (
          <div className="text-center text-purple-200 py-12">
            <Users size={48} className="mx-auto mb-4 opacity-50" />
            <p>Пользователей пока нет</p>
          </div>
        )}
      </div>
    </div>
  );
}

