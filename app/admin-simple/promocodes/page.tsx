'use client';

import { useState, useEffect } from 'react';
import { getTelegramUser, hapticFeedback } from '@/lib/telegram';
import { Gift, ArrowLeft, Check, Copy } from 'lucide-react';
import Link from 'next/link';

const ADMIN_IDS = [409627169];

export default function AdminPromocodesPage() {
  const [adminId, setAdminId] = useState<number | null>(null);
  const [code, setCode] = useState('');
  const [days, setDays] = useState('30');
  const [maxUses, setMaxUses] = useState('100');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);

  useEffect(() => {
    const tgUser = getTelegramUser();
    const userId = tgUser?.id;
    
    if (!userId || !ADMIN_IDS.includes(userId)) {
      window.location.href = '/';
      return;
    }
    
    setAdminId(userId);
  }, []);

  const generateRandomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCode(result);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!code || !days || !maxUses || !adminId) {
      setError('Заполните все поля');
      return;
    }

    if (code.length < 3) {
      setError('Код должен быть минимум 3 символа');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(false);

      const response = await fetch('/api/admin-simple/promocodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminTelegramId: adminId,
          code: code.toUpperCase(),
          days: parseInt(days),
          maxUses: parseInt(maxUses),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create promo code');
      }

      setSuccess(true);
      setGeneratedCode(code.toUpperCase());
      hapticFeedback('success');
      
      setTimeout(() => {
        setCode('');
        setDays('30');
        setMaxUses('100');
        setSuccess(false);
        setGeneratedCode(null);
      }, 5000);
    } catch (err: any) {
      setError(err.message);
      hapticFeedback('error');
    } finally {
      setLoading(false);
    }
  };

  const copyCode = () => {
    if (generatedCode) {
      navigator.clipboard.writeText(generatedCode);
      hapticFeedback('light');
    }
  };

  if (!adminId) {
    return null;
  }

  const quickDays = [7, 30, 90, 180, 365];
  const quickMaxUses = [10, 50, 100, 500, 1000];

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-900 via-purple-900 to-indigo-900">
      {/* Header */}
      <div className="bg-black/20 backdrop-blur-sm border-b border-white/10 p-4">
        <Link href="/admin-simple" className="text-pink-200 hover:text-white flex items-center gap-2 mb-3">
          <ArrowLeft size={20} />
          Назад
        </Link>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Gift className="text-pink-300" size={28} />
          Создать промо-код
        </h1>
      </div>

      <div className="max-w-xl mx-auto px-4 py-6">
        {/* Success */}
        {success && generatedCode && (
          <div className="mb-4 bg-green-500/20 border border-green-500/50 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <Check className="text-green-400" size={24} />
              <div>
                <h3 className="font-bold text-white">Промо-код создан!</h3>
                <p className="text-green-200 text-sm">Код готов к использованию</p>
              </div>
            </div>
            <button
              onClick={copyCode}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2"
            >
              <Copy size={16} />
              Скопировать код: {generatedCode}
            </button>
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
            {/* Code */}
            <div className="mb-4">
              <label className="block text-white font-medium mb-2 text-sm">
                Промо-код
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="FRIEND2025"
                  className="flex-1 bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-white text-sm uppercase"
                  disabled={loading}
                  maxLength={50}
                />
                <button
                  type="button"
                  onClick={generateRandomCode}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
                  disabled={loading}
                >
                  🎲
                </button>
              </div>
              <p className="text-white/50 text-xs mt-1">3-50 символов</p>
            </div>

            {/* Days */}
            <div className="mb-4">
              <label className="block text-white font-medium mb-2 text-sm">
                Дней Premium
              </label>
              <input
                type="number"
                value={days}
                onChange={(e) => setDays(e.target.value)}
                min="1"
                max="365"
                className="w-full bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-white text-sm mb-2"
                disabled={loading}
              />
              <div className="flex flex-wrap gap-2">
                {quickDays.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDays(d.toString())}
                    className={`px-3 py-1 rounded-lg text-sm font-medium ${
                      days === d.toString()
                        ? 'bg-pink-500 text-white'
                        : 'bg-white/10 text-white'
                    }`}
                    disabled={loading}
                  >
                    {d} дн
                  </button>
                ))}
              </div>
            </div>

            {/* Max Uses */}
            <div className="mb-4">
              <label className="block text-white font-medium mb-2 text-sm">
                Макс. использований
              </label>
              <input
                type="number"
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
                min="1"
                max="10000"
                className="w-full bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-white text-sm mb-2"
                disabled={loading}
              />
              <div className="flex flex-wrap gap-2">
                {quickMaxUses.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMaxUses(m.toString())}
                    className={`px-3 py-1 rounded-lg text-sm font-medium ${
                      maxUses === m.toString()
                        ? 'bg-pink-500 text-white'
                        : 'bg-white/10 text-white'
                    }`}
                    disabled={loading}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !code || !days || !maxUses}
              className="w-full bg-pink-500 hover:bg-pink-600 disabled:bg-gray-600 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2"
            >
              {loading ? 'Создаём...' : (
                <>
                  <Gift size={18} />
                  Создать промо-код
                </>
              )}
            </button>
          </form>
        </div>

        {/* Info */}
        <div className="mt-6 bg-blue-500/20 border border-blue-500/30 rounded-xl p-4">
          <h3 className="font-bold text-white mb-2 text-sm">ℹ️ Как использовать промо-код?</h3>
          <p className="text-blue-200 text-xs leading-relaxed">
            Пользователи смогут активировать промо-код в боте командой <code className="bg-white/10 px-1 rounded">/promo</code> или через специальную кнопку в приложении. После активации они получат Premium на указанное количество дней.
          </p>
        </div>
      </div>
    </div>
  );
}

