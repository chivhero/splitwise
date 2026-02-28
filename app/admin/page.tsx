'use client';

import { useEffect, useState } from 'react';
import { getTelegramUser, hapticFeedback, showTelegramPopup } from '@/lib/telegram';
import { AdminStats, PromoCode } from '@/types';
import { Crown, Users, DollarSign, Ticket, Plus, X, TrendingUp, Sparkles, AlertTriangle, CheckCircle, TrendingUp as TrendingUpIcon, Zap } from 'lucide-react';

export default function AdminPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [telegramId, setTelegramId] = useState<number | null>(null);

  useEffect(() => {
    const tgUser = getTelegramUser();
    const userId = tgUser ? tgUser.id : 123456789; // Test ID
    setTelegramId(userId);
    loadAdminData(userId);
  }, []);

  const loadAdminData = async (tgId: number) => {
    try {
      // Load stats
      const statsResponse = await fetch(`/api/admin/stats?telegramId=${tgId}`);
      
      if (statsResponse.status === 403) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      const statsData = await statsResponse.json();
      if (statsData.stats) {
        setStats(statsData.stats);
        setIsAdmin(true);
      }

      // Load promo codes
      const promoResponse = await fetch(`/api/admin/promo-codes?telegramId=${tgId}`);
      const promoData = await promoResponse.json();
      if (promoData.promoCodes) {
        setPromoCodes(promoData.promoCodes);
      }
    } catch (error) {
      console.error('Failed to load admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-white/20 border-t-white"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center p-4">
        <div className="card max-w-md w-full text-center py-12">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
          <p className="text-white/60">You don&apos;t have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-black/30 backdrop-blur-xl border-b border-white/10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="bg-white/10 p-2 rounded-xl border border-white/20">
              <Crown className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Admin Panel</h1>
              <p className="text-sm text-white/60">SplitWise Management</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Hero Stats */}
        {stats && (
          <div className="card bg-gradient-to-br from-white/10 to-white/5 border-white/20">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <p className="text-sm text-white/60 mb-1">👥 Active Users</p>
                <p className="text-3xl font-bold text-white">{stats.activeUsers}</p>
                <p className="text-xs text-green-400 mt-1">
                  ↗️ +{stats.weeklyNewUsers} this week
                </p>
              </div>
              <div>
                <p className="text-sm text-white/60 mb-1">💰 Total Volume</p>
                <p className="text-3xl font-bold text-white">
                  {(stats.totalVolume / 1000).toFixed(1)}K ₽
                </p>
                <p className="text-xs text-white/50 mt-1">
                  {stats.totalExpenses} expenses
                </p>
              </div>
              <div>
                <p className="text-sm text-white/60 mb-1">👑 Premium Users</p>
                <p className="text-3xl font-bold text-white">{stats.premiumUsers}</p>
                <p className="text-xs text-orange-400 mt-1">
                  ⚠️ {stats.premiumExpiring} expiring soon
                </p>
              </div>
              <div>
                <p className="text-sm text-white/60 mb-1">📊 Today</p>
                <p className="text-3xl font-bold text-white">{stats.todayExpenses}</p>
                <p className="text-xs text-white/50 mt-1">
                  {stats.weeklyExpenses} this week
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Stats Grid */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <EnhancedStatCard
              icon={<Users size={24} />}
              label="Total Users"
              value={stats.totalUsers}
              subtitle={`${stats.realUsers} real • ${stats.fakeUsers} fake`}
              trend={`+${stats.monthlyNewUsers} this month`}
              color="blue"
            />
            <EnhancedStatCard
              icon={<Crown size={24} />}
              label="Premium"
              value={stats.premiumUsers}
              subtitle={`${Math.round((stats.premiumUsers / stats.totalUsers) * 100)}% conversion`}
              trend={stats.premiumExpiring > 0 ? `⚠️ ${stats.premiumExpiring} expiring` : '✓ All good'}
              color="purple"
              trendColor={stats.premiumExpiring > 0 ? 'orange' : 'green'}
            />
            <EnhancedStatCard
              icon={<Users size={24} className="rotate-45" />}
              label="Groups"
              value={stats.totalGroups}
              subtitle={`${stats.activeGroups} active • ${stats.inactiveGroups} inactive`}
              trend={`${Math.round((stats.activeGroups / stats.totalGroups) * 100)}% active`}
              color="green"
            />
            <EnhancedStatCard
              icon={<DollarSign size={24} />}
              label="Expenses"
              value={stats.totalExpenses}
              subtitle={`${stats.customSplitExpenses} custom split`}
              trend={`${Math.round((stats.customSplitExpenses / stats.totalExpenses) * 100)}% adoption`}
              color="yellow"
            />
          </div>
        )}

        {/* Insights Panel */}
        {stats && (
          <div className="card">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-white/10 p-2 rounded-lg border border-white/20">
                <Zap className="text-yellow-400" size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Insights & Alerts</h2>
                <p className="text-sm text-white/60">Automated analytics & recommendations</p>
              </div>
            </div>
            
            <div className="grid md:grid-cols-2 gap-3">
              {/* Premium Expiring Alert */}
              {stats.premiumExpiring > 0 && (
                <InsightCard
                  icon={<AlertTriangle size={18} />}
                  type="warning"
                  title="Premium Expiring Soon"
                  description={`${stats.premiumExpiring} users losing premium in next 7 days`}
                  action="Send renewal reminders"
                />
              )}
              
              {/* Custom Split Adoption */}
              {stats.customSplitExpenses > 0 && (
                <InsightCard
                  icon={<TrendingUpIcon size={18} />}
                  type="success"
                  title="Custom Split Adoption"
                  description={`${Math.round((stats.customSplitExpenses / stats.totalExpenses) * 100)}% of expenses use custom split feature`}
                  action={`${stats.customSplitExpenses} expenses using it`}
                />
              )}
              
              {/* Inactive Groups */}
              {stats.inactiveGroups > 0 && (
                <InsightCard
                  icon={<AlertTriangle size={18} />}
                  type="info"
                  title="Inactive Groups"
                  description={`${stats.inactiveGroups} groups with no activity in 30 days`}
                  action={`${Math.round((stats.inactiveGroups / stats.totalGroups) * 100)}% inactive`}
                />
              )}
              
              {/* Growth Indicator */}
              {stats.weeklyNewUsers > 0 && (
                <InsightCard
                  icon={<TrendingUpIcon size={18} />}
                  type="success"
                  title="User Growth"
                  description={`+${stats.weeklyNewUsers} new users this week`}
                  action={`${stats.monthlyNewUsers} this month`}
                />
              )}
              
              {/* Fake Users Ratio */}
              {stats.fakeUsers > 0 && (
                <InsightCard
                  icon={<Users size={18} />}
                  type="info"
                  title="Manual Users"
                  description={`${stats.fakeUsers} users added manually (no Telegram ID)`}
                  action={`${Math.round((stats.fakeUsers / stats.totalUsers) * 100)}% of total users`}
                />
              )}
              
              {/* Active Users Ratio */}
              <InsightCard
                icon={<CheckCircle size={18} />}
                type={stats.activeUsers / stats.realUsers > 0.3 ? 'success' : 'warning'}
                title="User Engagement"
                description={`${stats.activeUsers} active users in last 7 days`}
                action={`${Math.round((stats.activeUsers / stats.realUsers) * 100)}% of real users`}
              />
            </div>
          </div>
        )}

        {/* Promo Codes Section */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="bg-white/10 p-2 rounded-lg border border-white/20">
                <Ticket className="text-white" size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Promo Codes</h2>
                <p className="text-sm text-white/60">Manage promotional codes</p>
              </div>
            </div>
            <button
              onClick={() => {
                setShowCreateModal(true);
                hapticFeedback('light');
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-all"
            >
              <Plus size={20} />
              <span className="hidden sm:inline">Create</span>
            </button>
          </div>

          <div className="space-y-3">
            {promoCodes.length === 0 ? (
              <div className="text-center py-8">
                <Sparkles className="mx-auto mb-3 text-white/40" size={48} />
                <p className="text-white/60">No promo codes yet</p>
                <p className="text-sm text-white/40 mt-1">Create your first promo code</p>
              </div>
            ) : (
              promoCodes.map((promo) => (
                <PromoCodeCard
                  key={promo.id}
                  promoCode={promo}
                  onDeactivate={() => {
                    if (telegramId) {
                      handleDeactivatePromo(promo.id);
                    }
                  }}
                />
              ))
            )}
          </div>
        </div>
      </main>

      {/* Create Promo Modal */}
      {showCreateModal && (
        <CreatePromoModal
          onClose={() => setShowCreateModal(false)}
          onCreate={(code, days, maxUses, expiresAt) => {
            if (telegramId) {
              handleCreatePromo(code, days, maxUses, expiresAt);
            }
          }}
        />
      )}
    </div>
  );

  async function handleCreatePromo(
    code: string,
    premiumDays: number,
    maxUses: number | null,
    expiresAt: Date | null
  ) {
    try {
      const response = await fetch('/api/admin/promo-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegramId,
          code,
          premiumDays,
          maxUses,
          expiresAt,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setPromoCodes([data.promoCode, ...promoCodes]);
        setShowCreateModal(false);
        showTelegramPopup('✅ Promo code created!');
        hapticFeedback('success');
      } else {
        showTelegramPopup(data.error || 'Failed to create promo code');
        hapticFeedback('error');
      }
    } catch (error) {
      console.error('Failed to create promo:', error);
      showTelegramPopup('Connection error');
      hapticFeedback('error');
    }
  }

  async function handleDeactivatePromo(promoCodeId: string) {
    try {
      const response = await fetch('/api/admin/promo-codes', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegramId, promoCodeId }),
      });

      if (response.ok) {
        setPromoCodes(
          promoCodes.map((p) =>
            p.id === promoCodeId ? { ...p, isActive: false } : p
          )
        );
        showTelegramPopup('✅ Promo code deactivated');
        hapticFeedback('success');
      } else {
        showTelegramPopup('Failed to deactivate');
        hapticFeedback('error');
      }
    } catch (error) {
      console.error('Failed to deactivate:', error);
      showTelegramPopup('Connection error');
      hapticFeedback('error');
    }
  }
}

// Enhanced Stat Card Component
function EnhancedStatCard({
  icon,
  label,
  value,
  subtitle,
  trend,
  color,
  trendColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  subtitle: string;
  trend: string;
  color: string;
  trendColor?: string;
}) {
  const colorClasses = {
    blue: 'from-blue-500/20 to-blue-600/10 border-blue-500/30',
    purple: 'from-purple-500/20 to-purple-600/10 border-purple-500/30',
    green: 'from-green-500/20 to-green-600/10 border-green-500/30',
    yellow: 'from-yellow-500/20 to-yellow-600/10 border-yellow-500/30',
    pink: 'from-pink-500/20 to-pink-600/10 border-pink-500/30',
  }[color];

  const trendColorClass = {
    green: 'text-green-400',
    orange: 'text-orange-400',
    red: 'text-red-400',
  }[trendColor || 'green'] || 'text-white/60';

  return (
    <div className={`card bg-gradient-to-br ${colorClasses} hover:scale-[1.02] transition-transform cursor-pointer`}>
      <div className="flex items-start gap-3">
        <div className="bg-white/10 p-2 rounded-lg text-white/90">{icon}</div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-white/60 mb-1">{label}</p>
          <p className="text-2xl font-bold text-white mb-1">{value.toLocaleString()}</p>
          <p className="text-[10px] text-white/50 mb-1 truncate">{subtitle}</p>
          <p className={`text-[10px] font-medium ${trendColorClass}`}>{trend}</p>
        </div>
      </div>
    </div>
  );
}

// Promo Code Card Component
function PromoCodeCard({
  promoCode,
  onDeactivate,
}: {
  promoCode: PromoCode;
  onDeactivate: () => void;
}) {
  const isExpired =
    promoCode.expiresAt && new Date(promoCode.expiresAt) < new Date();
  const isMaxed =
    promoCode.maxUses !== null && promoCode.usedCount >= promoCode.maxUses;

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-all">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <code className="text-lg font-bold text-white bg-white/10 px-3 py-1 rounded-lg">
              {promoCode.code}
            </code>
            {!promoCode.isActive && (
              <span className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded-lg">
                Inactive
              </span>
            )}
            {isExpired && (
              <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-1 rounded-lg">
                Expired
              </span>
            )}
            {isMaxed && (
              <span className="text-xs bg-gray-500/20 text-gray-400 px-2 py-1 rounded-lg">
                Max uses
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-white/60">Premium:</span>{' '}
              <span className="text-white font-semibold">{promoCode.premiumDays} days</span>
            </div>
            <div>
              <span className="text-white/60">Used:</span>{' '}
              <span className="text-white font-semibold">
                {promoCode.usedCount}
                {promoCode.maxUses !== null && ` / ${promoCode.maxUses}`}
              </span>
            </div>
          </div>
          {promoCode.creatorName && (
            <p className="text-xs text-white/40 mt-1">
              Created by {promoCode.creatorName}
            </p>
          )}
        </div>
        {promoCode.isActive && (
          <button
            onClick={() => {
              hapticFeedback('light');
              onDeactivate();
            }}
            className="text-white/60 hover:text-red-400 transition-colors p-2"
          >
            <X size={20} />
          </button>
        )}
      </div>
    </div>
  );
}

// Insight Card Component
function InsightCard({
  icon,
  type,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  type: 'success' | 'warning' | 'info';
  title: string;
  description: string;
  action: string;
}) {
  const typeStyles = {
    success: 'bg-green-500/10 border-green-500/30 text-green-400',
    warning: 'bg-orange-500/10 border-orange-500/30 text-orange-400',
    info: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
  }[type];

  return (
    <div className={`p-4 rounded-xl border ${typeStyles} bg-opacity-50`}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5">{icon}</div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-white mb-1">{title}</h4>
          <p className="text-xs text-white/70 mb-2">{description}</p>
          <p className="text-[10px] font-medium opacity-80">{action}</p>
        </div>
      </div>
    </div>
  );
}

// Create Promo Modal Component
function CreatePromoModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (
    code: string,
    days: number,
    maxUses: number | null,
    expiresAt: Date | null
  ) => void;
}) {
  const [code, setCode] = useState('');
  const [days, setDays] = useState('30');
  const [maxUses, setMaxUses] = useState('');
  const [expiresAt, setExpiresAt] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!code.trim() || !days) {
      showTelegramPopup('Please fill required fields');
      return;
    }

    onCreate(
      code.trim(),
      parseInt(days),
      maxUses ? parseInt(maxUses) : null,
      expiresAt ? new Date(expiresAt) : null
    );
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-black/30 backdrop-blur-xl border border-white/10 w-full max-w-md rounded-3xl shadow-2xl">
        <div className="flex items-center justify-between p-6 pb-4 border-b border-white/10">
          <h2 className="text-xl font-bold text-white">Create Promo Code</h2>
          <button onClick={onClose} className="text-white/60 hover:text-white">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-white/80">
              Promo Code *
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="PREMIUM30"
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all uppercase"
              maxLength={20}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-white/80">
              Premium Days *
            </label>
            <input
              type="number"
              value={days}
              onChange={(e) => setDays(e.target.value)}
              placeholder="30"
              min="1"
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-white/80">
              Max Uses (optional)
            </label>
            <input
              type="number"
              value={maxUses}
              onChange={(e) => setMaxUses(e.target.value)}
              placeholder="Unlimited"
              min="1"
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-white/80">
              Expires At (optional)
            </label>
            <input
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 rounded-xl bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-all"
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
