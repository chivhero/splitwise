'use client';

import { useState } from 'react';
import { adminAPI } from '@/lib/api-client';
import { Crown, ArrowLeft, Check } from 'lucide-react';
import Link from 'next/link';
import { hapticFeedback } from '@/lib/telegram';

export default function AdminPremiumPage() {
  const [targetUserId, setTargetUserId] = useState('');
  const [days, setDays] = useState('30');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!targetUserId || !days) {
      setError('Заполните все поля');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(false);

      await adminAPI.grantPremium(targetUserId, parseInt(days));

      setSuccess(true);
      hapticFeedback('success');
      
      // Очистить форму через 2 секунды
      setTimeout(() => {
        setTargetUserId('');
        setDays('30');
        setSuccess(false);
      }, 2000);
    } catch (err: any) {
      setError(err.message);
      hapticFeedback('error');
    } finally {
      setLoading(false);
    }
  };

  const quickDays = [7, 30, 90, 180, 365];

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-900 via-yellow-800 to-orange-900">
      {/* Header */}
      <div className="bg-black/20 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <Link href="/admin" className="text-yellow-200 hover:text-white transition-colors inline-flex items-center gap-2 mb-4">
            <ArrowLeft size={20} />
            Назад к панели
          </Link>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Crown className="text-yellow-400" size={32} />
            Выдать Premium
          </h1>
          <p className="text-yellow-200 mt-2">Управление Premium подписками пользователей</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Success Message */}
        {success && (
          <div className="mb-6 bg-green-500/20 backdrop-blur-sm border border-green-500/50 rounded-2xl p-6 flex items-center gap-4 animate-fade-in">
            <Check className="text-green-400" size={32} />
            <div>
              <h3 className="text-xl font-bold text-white">Успешно!</h3>
              <p className="text-green-200">Premium выдан пользователю</p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-500/20 backdrop-blur-sm border border-red-500/50 rounded-2xl p-6">
            <h3 className="text-xl font-bold text-white mb-2">❌ Ошибка</h3>
            <p className="text-red-200">{error}</p>
          </div>
        )}

        {/* Form */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20">
          <form onSubmit={handleSubmit}>
            {/* User ID Input */}
            <div className="mb-6">
              <label className="block text-white font-medium mb-2">
                User ID пользователя
              </label>
              <input
                type="text"
                value={targetUserId}
                onChange={(e) => setTargetUserId(e.target.value)}
                placeholder="Например: usr_abc123"
                className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                disabled={loading}
              />
              <p className="text-white/60 text-sm mt-2">
                ID пользователя из базы данных (начинается с usr_)
              </p>
            </div>

            {/* Days Input */}
            <div className="mb-6">
              <label className="block text-white font-medium mb-2">
                Срок (дней)
              </label>
              <input
                type="number"
                value={days}
                onChange={(e) => setDays(e.target.value)}
                min="1"
                max="3650"
                className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                disabled={loading}
              />
            </div>

            {/* Quick Selection */}
            <div className="mb-6">
              <label className="block text-white font-medium mb-3">
                Быстрый выбор
              </label>
              <div className="flex flex-wrap gap-2">
                {quickDays.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDays(d.toString())}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${
                      days === d.toString()
                        ? 'bg-yellow-500 text-white'
                        : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                    disabled={loading}
                  >
                    {d} дней
                  </button>
                ))}
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !targetUserId || !days}
              className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  Выдаём Premium...
                </>
              ) : (
                <>
                  <Crown size={20} />
                  Выдать Premium
                </>
              )}
            </button>
          </form>
        </div>

        {/* Info Card */}
        <div className="mt-8 bg-blue-500/10 backdrop-blur-sm border border-blue-500/30 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-white mb-3">ℹ️ Информация</h3>
          <ul className="space-y-2 text-blue-200 text-sm">
            <li>• User ID можно найти в базе данных</li>
            <li>• Максимальный срок: 3650 дней (10 лет)</li>
            <li>• Действие будет записано в Audit Log</li>
            <li>• Пользователь получит Premium немедленно</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

