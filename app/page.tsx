'use client';

import { useEffect, useState } from 'react';
import { getTelegramUser, isTelegramWebApp, hapticFeedback } from '@/lib/telegram';
import { Group } from '@/types';
import GroupList from '@/components/GroupList';
import CreateGroupModal from '@/components/CreateGroupModal';
import PremiumBanner from '@/components/PremiumBanner';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { useLanguage } from '@/contexts/LanguageContext';
import { Plus, Crown } from 'lucide-react';
import { useRouter } from 'next/navigation';

// ID админов
const ADMIN_IDS = [409627169];

export default function Home() {
  const { t } = useLanguage();
  const router = useRouter();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [telegramId, setTelegramId] = useState<number | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const tgUser = getTelegramUser();
    const userId = tgUser ? tgUser.id : 123456789; // Тестовый ID для разработки
    
    setTelegramId(userId);
    
    // Проверяем является ли пользователь админом
    if (userId && ADMIN_IDS.includes(userId)) {
      setIsAdmin(true);
      console.log('👑 Admin detected!');
    }
    
    // Проверяем, есть ли параметр для присоединения к группе
    if (typeof window !== 'undefined') {
      // Telegram передаёт start_param через initDataUnsafe
      const webApp = window.Telegram?.WebApp;
      const initDataUnsafe = webApp?.initDataUnsafe as any;
      const startParam = initDataUnsafe?.start_param || 
                         new URLSearchParams(window.location.search).get('tgWebAppStartParam') ||
                         new URLSearchParams(window.location.search).get('startapp');
      
      console.log('[Join Debug] URL:', window.location.href);
      console.log('[Join Debug] WebApp start_param:', webApp?.initDataUnsafe?.start_param);
      console.log('[Join Debug] URL params:', window.location.search);
      console.log('[Join Debug] Final start param:', startParam);
      
      if (startParam && startParam.startsWith('join_')) {
        const groupId = startParam.replace('join_', '');
        console.log('[Join Debug] ✅ Joining group:', groupId);
        
        // Показываем уведомление
        if (webApp) {
          webApp.showAlert('Присоединяемся к группе...');
        }
        
        handleJoinGroup(groupId, userId);
      } else {
        console.log('[Join Debug] No join param, loading groups');
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
      console.log('[Join] Sending request to join group:', groupId);
      
      const response = await fetch(`/api/groups/${groupId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegramId: userId }),
      });

      const data = await response.json();
      console.log('[Join] Response:', data);

      if (response.ok) {
        hapticFeedback('success');
        await loadGroups(userId);
        
        // Показываем уведомление об успехе
        if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
          window.Telegram.WebApp.showAlert(`✅ Вы присоединились к группе!\n\nГруппа добавлена в ваш список.`);
        } else {
          alert('Вы успешно присоединились к группе!');
        }
      } else {
        console.error('[Join] Failed:', data.error);
        
        // Показываем ошибку пользователю
        const errorMsg = data.error || 'Не удалось присоединиться к группе';
        if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
          window.Telegram.WebApp.showAlert(`❌ Ошибка: ${errorMsg}`);
        } else {
          alert(`Ошибка: ${errorMsg}`);
        }
        
        // Всё равно загружаем группы
        loadGroups(userId);
      }
    } catch (error) {
      console.error('[Join] Exception:', error);
      loadGroups(userId);
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
          <div className="flex gap-2 items-center">
            {isAdmin && (
              <button
                onClick={() => {
                  hapticFeedback('light');
                  router.push('/admin-simple');
                }}
                className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition-all shadow-lg hover:shadow-xl active:scale-95"
              >
                <Crown size={18} />
                Админ
              </button>
            )}
            <LanguageSwitcher />
          </div>
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
