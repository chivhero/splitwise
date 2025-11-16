'use client';

import { useEffect, useState } from 'react';
import { getTelegramUser, isTelegramWebApp, hapticFeedback } from '@/lib/telegram';
import { Group } from '@/types';
import GroupList from '@/components/GroupList';
import CreateGroupModal from '@/components/CreateGroupModal';
import PremiumBanner from '@/components/PremiumBanner';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { useLanguage } from '@/contexts/LanguageContext';
import { Plus } from 'lucide-react';

export default function Home() {
  const { t } = useLanguage();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [telegramId, setTelegramId] = useState<number | null>(null);

  useEffect(() => {
    const tgUser = getTelegramUser();
    const userId = tgUser ? tgUser.id : 123456789; // Тестовый ID для разработки
    
    setTelegramId(userId);
    
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
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-600 text-white p-6 rounded-b-3xl shadow-xl">
        <div className="flex justify-between items-start mb-2">
          <h1 className="text-2xl font-bold">💰 {t('groups.title')}</h1>
          <LanguageSwitcher />
        </div>
        <p className="text-purple-100 text-sm">
          {t('home.description')}
        </p>
      </div>

      {/* Premium Banner */}
      <div className="px-4 mt-4">
        <PremiumBanner />
      </div>

      {/* Groups List */}
      <div className="px-4 mt-6">
        {groups.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-xl font-semibold mb-2">{t('home.getStarted')}</h2>
            <p className="text-gray-600 mb-6">
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
        ) : (
          <>
            <GroupList groups={groups} />
          </>
        )}
      </div>

      {/* Floating Action Button */}
      {groups.length > 0 && (
        <button
          onClick={handleCreateGroup}
          className="fixed bottom-6 right-6 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white w-14 h-14 rounded-full shadow-xl hover:shadow-2xl flex items-center justify-center transition-all active:scale-95"
        >
          <Plus size={24} />
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
