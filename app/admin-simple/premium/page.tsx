'use client';

import { useState, useEffect } from 'react';
import { getTelegramUser, hapticFeedback } from '@/lib/telegram';
import { Crown, ArrowLeft, Check } from 'lucide-react';
import Link from 'next/link';

const ADMIN_IDS = [409627169];

export default function AdminPremiumPage() {
  const [adminId, setAdminId] = useState<number | null>(null);
  const [targetUserId, setTargetUserId] = useState('');
  const [days, setDays] = useState('30');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const tgUser = getTelegramUser();
    const userId = tgUser?.id;
    
    if (!userId || !ADMIN_IDS.includes(userId)) {
      window.location.href = '/';
      return;
    }
    
    setAdminId(userId);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!targetUserId || !days || !adminId) {
      setError('Заполните все поля');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(false);

      const response = await fetch('/api/admin-simple/premium', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminTelegramId: adminId,
          targetUserId,
          days: parseInt(days),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to grant premium');
      }

      setSuccess(true);
      hapticFeedback('success');
      
      setTimeout(() => {
        setTargetUserId('');
        setDays('30');
        setSuccess(false);
      }, 3000);
    } catch (err: any) {
      setError(err.message);
      hapticFeedback('error');
    } finally {
      setLoading(false);
    }
  };

  if (!adminId) {
    return null;
  }

  const quickDays = [7, 30, 90, 180, 365];

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-900 via-yellow-800 to-orange-900">
      {/* Header */}
      <div className="bg-black/20 backdrop-blur-sm border-b border-white/10 p-4">
        <Link href="/admin-simple" className="text-yellow-200 hover:text-white flex items-center gap-2 mb-3">
          <ArrowLeft size={20} />
          Назад
        </Link>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Crown className="text-yellow-400" size={28} />
          Выдать Premium
        </h1>
      </div>

      <div className="max-w-xl mx-auto px-4 py-6">
        {/* Success */}
        {success && (
          <div className="mb-4 bg-green-500/20 border border-green-500/50 rounded-xl p-4 flex items-center gap-3">
            <Check className="text-green-400" size={24} />
            <div>
              <h3 className="font-bold text-white">Успешно!</h3>
              <p className="text-green-200 text-sm">Premium выдан</p>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-4 bg-red-500/20 border border-red-500/50 rounded-xl p-4">
            <p className="text-red-200">❌ {error}</p>
          </div>
        )}

        {/* Form */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
          <form onSubmit={handleSubmit}>
            {/* User ID */}
            <div className="mb-4">
              <label className="block text-white font-medium mb-2 text-sm">
                User ID пользователя
              </label>
              <input
                type="text"
                value={targetUserId}
                onChange={(e) => setTargetUserId(e.target.value)}
                placeholder="usr_abc123"
                className="w-full bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-white text-sm"
                disabled={loading}
              />
            </div>

            {/* Days */}
            <div className="mb-4">
              <label className="block text-white font-medium mb-2 text-sm">
                Дней
              </label>
              <input
                type="number"
                value={days}
                onChange={(e) => setDays(e.target.value)}
                min="1"
                max="3650"
                className="w-full bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-white text-sm"
                disabled={loading}
              />
            </div>

            {/* Quick */}
            <div className="mb-4">
              <div className="flex flex-wrap gap-2">
                {quickDays.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDays(d.toString())}
                    className={`px-3 py-1 rounded-lg text-sm font-medium ${
                      days === d.toString()
                        ? 'bg-yellow-500 text-white'
                        : 'bg-white/10 text-white'
                    }`}
                    disabled={loading}
                  >
                    {d} дн
                  </button>
                ))}
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !targetUserId || !days}
              className="w-full bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-600 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2"
            >
              {loading ? 'Выдаём...' : (
                <>
                  <Crown size={18} />
                  Выдать Premium
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}


