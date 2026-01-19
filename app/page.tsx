'use client';

import { useEffect, useState } from 'react';
import { getTelegramUser, isTelegramWebApp, hapticFeedback } from '@/lib/telegram';
import { Group } from '@/types';
import GroupList from '@/components/GroupList';
import CreateGroupModal from '@/components/CreateGroupModal';
import PremiumBanner from '@/components/PremiumBanner';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import PromoCodeInput from '@/components/PromoCodeInput';
import { useLanguage } from '@/contexts/LanguageContext';
import { isAdminTelegramId } from '@/lib/admin';
import { Plus, Crown } from 'lucide-react';
import Link from 'next/link';

export default function Home() {
  const { t, locale } = useLanguage();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [telegramId, setTelegramId] = useState<number | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const tgUser = getTelegramUser();
    
    if (!tgUser) {
      console.warn('[Home] No Telegram user found - waiting for authentication...');
      setLoading(false);
      return;
    }
    
    const userId = tgUser.id;
    setTelegramId(userId);
    setIsAdmin(isAdminTelegramId(userId));
    
    // Проверяем, есть ли параметр для присоединения к группе
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const startParam = urlParams.get('tgWebAppStartParam') || urlParams.get('startapp');
      
      if (startParam && startParam.startsWith('join_')) {
        const groupId = startParam.replace('join_', '');
        handleJoinGroup(groupId, userId);
      } else {
        loadGroups(userId);
      }
    } else {
      loadGroups(userId);
    }
  }, []);

  const loadGroups = async (tgId: number) => {
    try {
      const response = await fetch(`/api/groups?telegramId=${tgId}`);
      const data = await response.json();
      setGroups(data.groups || []);
    } catch (error) {
      console.error('Failed to load groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = () => {
    hapticFeedback('light');
    setShowCreateModal(true);
  };

  const handleGroupCreated = (group: Group) => {
    setGroups([group, ...groups]);
    setShowCreateModal(false);
    hapticFeedback('success');
  };

  const handleJoinGroup = async (groupId: string, userId: number) => {
    try {
      const response = await fetch(`/api/groups/${groupId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegramId: userId }),
      });

      if (response.ok) {
        hapticFeedback('success');
        loadGroups(userId);
        // Показываем уведомление
        if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
          window.Telegram.WebApp.showAlert(t('groups.joinSuccess'));
        }
      } else {
        const data = await response.json();
        console.error('Failed to join group:', data.error);
      }
    } catch (error) {
      console.error('Failed to join group:', error);
    }
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

  // Если пользователь не авторизован (не запущено в Telegram)
  if (!telegramId) {
    return (
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden p-6">
        <div className="absolute inset-0 bg-gradient-radial from-white/5 to-transparent"></div>
        <div className="relative backdrop-blur-xl bg-white/10 p-8 rounded-3xl border border-white/20 shadow-glass-xl max-w-md text-center">
          <div className="text-6xl mb-4">🤖</div>
          <h2 className="text-2xl font-bold text-white mb-3">{t('errors.telegramOnly')}</h2>
          <p className="text-white/70 mb-6">
            Пожалуйста, откройте это приложение через официального бота @SplitWisedbot в Telegram
          </p>
          <a 
            href="https://t.me/SplitWisedbot"
            className="btn-primary inline-block"
          >
            Открыть бота
          </a>
        </div>
      </div>
    );
  }

  return (
    <div key={locale} className="min-h-screen pb-20 relative overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-white/5 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-white/3 rounded-full blur-3xl animate-float" style={{animationDelay: '1s'}}></div>
      </div>

      {/* Header with Glassmorphism */}
      <div className="relative backdrop-blur-2xl bg-gradient-to-br from-white/10 to-white/5 border-b border-white/10 shadow-glass-lg">
        <div className="p-6 pb-8">
          <div className="flex justify-between items-start mb-3">
            <div>
              <h1 className="text-3xl font-bold text-white mb-1 tracking-tight">
                💰 {t('groups.title')}
              </h1>
              <div className="h-1 w-20 bg-gradient-to-r from-white to-transparent rounded-full"></div>
            </div>
            <div className="flex items-center gap-2">
              {isAdmin && (
                <Link href="/admin">
                  <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 text-white hover:from-yellow-500/30 hover:to-orange-500/30 transition-all text-sm">
                    <Crown size={18} />
                    <span className="hidden sm:inline">Admin</span>
                  </button>
                </Link>
              )}
              <PromoCodeInput onSuccess={() => {
                if (telegramId) loadGroups(telegramId);
              }} />
              <LanguageSwitcher />
            </div>
          </div>
          <p className="text-white/70 text-sm mt-2">
            {t('home.description')}
          </p>
        </div>
      </div>

      {/* Premium Banner */}
      <div className="px-4 mt-6 relative z-10">
        <PremiumBanner />
      </div>

      {/* Groups List */}
      <div className="px-4 mt-6 relative z-10">
        {groups.length === 0 ? (
          <div className="text-center py-16">
            <div className="backdrop-blur-2xl bg-white/5 rounded-3xl border border-white/10 p-12 shadow-glass-xl animate-fade-in">
              <div className="text-7xl mb-6 animate-float">🎉</div>
              <h2 className="text-2xl font-bold text-white mb-3">{t('home.getStarted')}</h2>
              <p className="text-white/60 mb-8 max-w-md mx-auto">
                {t('groups.createFirst')}
              </p>
              <button
                onClick={handleCreateGroup}
                className="btn-primary inline-flex items-center gap-2"
              >
                <Plus size={20} />
                {t('groups.createNew')}
              </button>
            </div>
          </div>
        ) : (
          <>
            <GroupList groups={groups} />
          </>
        )}
      </div>

      {/* Floating Action Button with Glass Effect */}
      {groups.length > 0 && (
        <button
          onClick={handleCreateGroup}
          className="fixed bottom-6 right-6 backdrop-blur-xl bg-white/20 hover:bg-white/30 border border-white/30 text-white w-16 h-16 rounded-2xl shadow-glass-xl hover:shadow-glass-2xl flex items-center justify-center transition-all duration-300 active:scale-95 z-50 group"
        >
          <Plus size={28} className="group-hover:rotate-90 transition-transform duration-300" />
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
        </button>
      )}

      {/* Create Group Modal */}
      {showCreateModal && telegramId && (
        <CreateGroupModal
          telegramId={telegramId}
          onClose={() => setShowCreateModal(false)}
          onGroupCreated={handleGroupCreated}
        />
      )}
    </div>
  );
}
