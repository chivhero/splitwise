'use client';

import { useState, useEffect } from 'react';
import { Expense, Group, GroupMember } from '@/types';
import { X, UserPlus } from 'lucide-react';
import { hapticFeedback, showTelegramPopup } from '@/lib/telegram';
import { useLanguage } from '@/contexts/LanguageContext';

interface AddExpenseModalProps {
  telegramId: number;
  group: Group;
  onClose: () => void;
  onExpenseAdded: (expense: Expense) => void;
  onMemberAdded?: (member: GroupMember) => void;
}

export default function AddExpenseModal({ telegramId, group, onClose, onExpenseAdded, onMemberAdded }: AddExpenseModalProps) {
  const { t } = useLanguage();
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  
  // Локальный список участников (для мгновенного обновления UI)
  const [localMembers, setLocalMembers] = useState<GroupMember[]>(group.members);
  
  // Находим текущего пользователя
  const currentUserMember = localMembers.find(m => m.user?.telegramId === telegramId);
  const currentUserId = currentUserMember?.userId;
  
  const [paidBy, setPaidBy] = useState<string>(currentUserId || '');
  const [splitBetween, setSplitBetween] = useState<string[]>(currentUserId ? [currentUserId] : []);
  const [category, setCategory] = useState('other');
  const [loading, setLoading] = useState(false);
  const [paidByError, setPaidByError] = useState(false);
  
  // Custom split state
  const [splitType, setSplitType] = useState<'equal' | 'custom'>('equal');
  const [customShares, setCustomShares] = useState<Record<string, number>>({});
  
  // Состояния для добавления нового участника
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [addingMember, setAddingMember] = useState(false);

  const categories = [
    { id: 'food', emoji: '🍔' },
    { id: 'transport', emoji: '🚗' },
    { id: 'entertainment', emoji: '🎉' },
    { id: 'accommodation', emoji: '🏠' },
    { id: 'shopping', emoji: '🛍️' },
    { id: 'other', emoji: '💰' },
  ];

  // Initialize custom shares when participants change
  useEffect(() => {
    if (splitType === 'custom') {
      const newShares: Record<string, number> = {};
      splitBetween.forEach(userId => {
        newShares[userId] = customShares[userId] || 1;
      });
      setCustomShares(newShares);
    }
  }, [splitBetween, splitType]);

  const toggleMember = (userId: string) => {
    if (splitBetween.includes(userId)) {
      if (splitBetween.length > 1) {
        const newSplitBetween = splitBetween.filter(id => id !== userId);
        setSplitBetween(newSplitBetween);
        
        // Remove from custom shares if exists
        if (splitType === 'custom') {
          const newShares = { ...customShares };
          delete newShares[userId];
          setCustomShares(newShares);
        }
      }
    } else {
      setSplitBetween([...splitBetween, userId]);
      
      // Add to custom shares with default value 1
      if (splitType === 'custom') {
        setCustomShares({ ...customShares, [userId]: 1 });
      }
    }
    hapticFeedback('light');
  };
  
  const handleShareChange = (userId: string, value: number) => {
    if (value < 1) return; // Don't allow less than 1
    setCustomShares({ ...customShares, [userId]: value });
  };
  
  const resetAllShares = () => {
    const reset: Record<string, number> = {};
    splitBetween.forEach(userId => {
      reset[userId] = 1;
    });
    setCustomShares(reset);
    hapticFeedback('light');
  };
  
  // Calculate preview based on split type
  const calculatePreview = () => {
    if (!amount || splitBetween.length === 0) return null;
    
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum)) return null;
    
    if (splitType === 'equal') {
      const perPerson = amountNum / splitBetween.length;
      return { perPerson, shares: null };
    } else {
      const totalShares = Object.values(customShares).reduce((sum, s) => sum + (s || 0), 0);
      if (totalShares === 0) return null;
      const pricePerShare = amountNum / totalShares;
      return { perPerson: null, pricePerShare, totalShares };
    }
  };

  const handleAddNewMember = async () => {
    if (!newMemberName.trim()) {
      showTelegramPopup(t('addMember.nameRequired') || 'Введите имя');
      return;
    }

    setAddingMember(true);
    hapticFeedback('light');

    try {
      // 1. Создаем пользователя по имени
      const createUserRes = await fetch('/api/users/create-by-name', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          firstName: newMemberName.trim()
        }),
      });

      if (!createUserRes.ok) {
        throw new Error('Failed to create user');
      }

      const userData = await createUserRes.json();
      const newUserId = userData.user.id;

      // 2. Добавляем пользователя в группу
      const joinRes = await fetch(`/api/groups/${group.id}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: newUserId }),
      });

      if (!joinRes.ok) {
        throw new Error('Failed to join group');
      }

      const joinData = await joinRes.json();
      const newMember = joinData.member;

      if (newMember) {
        // 3. Мгновенно обновляем локальный список участников
        setLocalMembers([...localMembers, newMember]);
        
        // 4. Автоматически добавляем нового участника в "С кем делить"
        setSplitBetween([...splitBetween, newMember.userId]);
        
        // 5. Уведомляем родительский компонент об обновлении
        onMemberAdded?.(newMember);
        
        hapticFeedback('success');
        setShowAddMember(false);
        setNewMemberName('');
      }
    } catch (error) {
      console.error('Failed to add member:', error);
      showTelegramPopup(t('addMember.error') || 'Ошибка добавления участника');
      hapticFeedback('error');
    } finally {
      setAddingMember(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!description.trim()) {
      showTelegramPopup(t('expenses.descriptionRequired'));
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      showTelegramPopup(t('expenses.amountRequired'));
      return;
    }

    // Валидация плательщика
    if (!paidBy) {
      setPaidByError(true);
      hapticFeedback('error');
      return;
    }

    if (splitBetween.length === 0) {
      showTelegramPopup(t('expenses.splitBetweenRequired'));
      return;
    }

    setPaidByError(false);
    setLoading(true);
    hapticFeedback('light');

    // Validate custom split if selected
    if (splitType === 'custom') {
      for (const userId of splitBetween) {
        if (!customShares[userId] || customShares[userId] < 1) {
          showTelegramPopup('Укажите доли для всех участников (минимум 1)');
          setLoading(false);
          return;
        }
      }
    }

    try {
      const response = await fetch(`/api/groups/${group.id}/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: description.trim(),
          amount: amountNum,
          paidByUserId: paidBy,
          splitBetweenUserIds: splitBetween,
          telegramId,
          category,
          splitType,
          customSplits: splitType === 'custom' ? customShares : undefined,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        onExpenseAdded(data.expense);
        hapticFeedback('success');
      } else {
        showTelegramPopup(data.error || t('expenses.error'));
        hapticFeedback('error');
      }
    } catch (error) {
      console.error('Failed to add expense:', error);
      showTelegramPopup(t('expenses.connectionError'));
      hapticFeedback('error');
    } finally {
      setLoading(false);
    }
  };

  const getMemberName = (member: any) => {
    // Если это текущий пользователь - показываем "Вы"/"You"
    if (member.userId === currentUserId) {
      return t('common.you');
    }
    const firstName = member.user?.firstName || t('expenses.member');
    const lastName = member.user?.lastName || '';
    return lastName ? `${firstName} ${lastName}` : firstName;
  };

  const renderAddMemberButton = () => (
    <button
      type="button"
      onClick={() => {
        setShowAddMember(true);
        hapticFeedback('light');
      }}
      className="w-full p-3 rounded-xl border-2 border-dashed border-white/20 hover:border-white/40 hover:bg-white/5 transition-all flex items-center justify-center gap-2 text-white/60 hover:text-white"
    >
      <UserPlus size={18} />
      <span className="text-sm font-medium">{t('addMember.add') || '+ Добавить участника'}</span>
    </button>
  );

  const renderAddMemberForm = () => {
    if (!showAddMember) return null;
    
    return (
      <div className="p-4 rounded-xl bg-white/5 border border-white/20 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-white/80">
            {t('addMember.newMemberName') || 'Имя нового участника'}
          </label>
          <button
            type="button"
            onClick={() => {
              setShowAddMember(false);
              setNewMemberName('');
            }}
            className="text-white/60 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>
        <input
          type="text"
          value={newMemberName}
          onChange={(e) => setNewMemberName(e.target.value)}
          placeholder={t('addMember.namePlaceholder') || 'Например: Олег'}
          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all"
          maxLength={50}
          disabled={addingMember}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleAddNewMember();
            }
          }}
        />
        <button
          type="button"
          onClick={handleAddNewMember}
          disabled={addingMember || !newMemberName.trim()}
          className="w-full px-4 py-3 rounded-xl bg-white/20 border border-white/30 text-white hover:bg-white/30 transition-all disabled:opacity-50 font-medium"
        >
          {addingMember ? (t('common.adding') || 'Добавление...') : (t('common.add') || 'Добавить')}
        </button>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 animate-fade-in">
      <div className="h-[100dvh] w-full bg-gradient-to-b from-[#1a1a1a] to-[#0a0a0a] flex flex-col">
        {/* Header with Close Button */}
        <div className="flex items-center justify-between px-6 pt-8 pb-4 border-b border-white/10 flex-shrink-0 bg-gradient-to-b from-black/40 to-transparent backdrop-blur-xl">
          <h2 className="text-2xl font-bold text-white">{t('expenses.add')}</h2>
          <button 
            onClick={onClose} 
            className="text-white/70 hover:text-white active:scale-95 transition-all p-2 hover:bg-white/10 rounded-xl"
          >
            <X size={28} />
          </button>
        </div>

        {/* Form - scrollable */}
        <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto px-6 py-4 flex-1">
          <div>
            <label className="block text-sm font-medium mb-2 text-white/80">{t('expenses.description')} *</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('expenses.descriptionPlaceholder')}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all"
              maxLength={100}
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-white/80">{t('expenses.amount')} ({group.currency}) *</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              step="0.01"
              min="0"
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-white/80">{t('expenses.category')}</label>
            <div className="grid grid-cols-3 gap-2">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setCategory(cat.id);
                    hapticFeedback('light');
                  }}
                  className={`p-3 rounded-xl border-2 text-sm transition-all ${
                    category === cat.id
                      ? 'border-white/40 bg-white/10'
                      : 'border-white/10 hover:border-white/20 hover:bg-white/5'
                  }`}
                  disabled={loading}
                >
                  <div className="text-2xl mb-1">{cat.emoji}</div>
                  <div className="text-xs text-white/80">{t(`expenses.categories.${cat.id}`)}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-white/80">{t('expenses.paidByLabel')} *</label>
            <div className={`space-y-2 max-h-48 overflow-y-auto rounded-xl ${paidByError ? 'ring-2 ring-red-500' : ''}`}>
              {localMembers.map((member) => {
                const memberName = getMemberName(member);
                const isSelected = paidBy === member.userId;
                
                return (
                  <button
                    key={member.userId}
                    type="button"
                    onClick={() => {
                      setPaidBy(member.userId);
                      setPaidByError(false);
                      hapticFeedback('light');
                    }}
                    className={`w-full p-3 rounded-xl border-2 text-left transition-all ${
                      isSelected
                        ? 'border-white/40 bg-white/10 font-semibold'
                        : 'border-white/10 hover:border-white/20 hover:bg-white/5'
                    }`}
                    disabled={loading}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-white">{memberName}</span>
                      {isSelected && <span className="text-white text-xl">✓</span>}
                    </div>
                  </button>
                );
              })}
              {!showAddMember && renderAddMemberButton()}
              {renderAddMemberForm()}
            </div>
            {paidByError && (
              <p className="text-xs text-red-400 mt-2">{t('expenses.paidByRequired')}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-white/80">
              {t('expenses.splitBetweenLabel')} *
            </label>
            <div className="space-y-2 max-h-48 overflow-y-auto rounded-xl">
              {localMembers.map((member) => {
                const isSelected = splitBetween.includes(member.userId);
                return (
                  <button
                    key={member.userId}
                    type="button"
                    onClick={() => toggleMember(member.userId)}
                    className={`w-full p-3 rounded-xl border-2 text-left transition-all ${
                      isSelected
                        ? 'border-white/40 bg-white/10'
                        : 'border-white/10 hover:border-white/20 hover:bg-white/5'
                    }`}
                    disabled={loading}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-white">{getMemberName(member)}</span>
                      {isSelected && (
                        <span className="text-white">✓</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Split Type Selector */}
          {splitBetween.length > 0 && (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-white/80">
                Как разделить расход?
              </label>
              
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSplitType('equal');
                    hapticFeedback('light');
                  }}
                  className={`p-3 rounded-xl border-2 text-sm transition-all ${
                    splitType === 'equal'
                      ? 'border-white/40 bg-white/10 font-semibold'
                      : 'border-white/10 hover:border-white/20 hover:bg-white/5'
                  }`}
                  disabled={loading}
                >
                  <div className="text-xl mb-1">⚖️</div>
                  <div className="text-xs text-white/80">Поровну</div>
                </button>
                
                <button
                  type="button"
                  onClick={() => {
                    setSplitType('custom');
                    // Initialize shares for all participants
                    const initialShares: Record<string, number> = {};
                    splitBetween.forEach(userId => {
                      initialShares[userId] = customShares[userId] || 1;
                    });
                    setCustomShares(initialShares);
                    hapticFeedback('light');
                  }}
                  className={`p-3 rounded-xl border-2 text-sm transition-all ${
                    splitType === 'custom'
                      ? 'border-white/40 bg-white/10 font-semibold'
                      : 'border-white/10 hover:border-white/20 hover:bg-white/5'
                  }`}
                  disabled={loading}
                >
                  <div className="text-xl mb-1">🎯</div>
                  <div className="text-xs text-white/80">По долям</div>
                </button>
              </div>

              {/* Custom Shares Input */}
              {splitType === 'custom' && (
                <div className="space-y-3 p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-white/70">Укажите доли для каждого:</span>
                    <button
                      type="button"
                      onClick={resetAllShares}
                      className="text-xs text-white/50 hover:text-white/80 underline"
                    >
                      Всем по 1
                    </button>
                  </div>
                  
                  {splitBetween.map(userId => {
                    const member = localMembers.find(m => m.userId === userId);
                    if (!member) return null;
                    
                    return (
                      <div key={userId} className="flex items-center gap-3">
                        <span className="flex-1 text-sm text-white truncate">
                          {getMemberName(member)}
                        </span>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={customShares[userId] || ''}
                          onChange={(e) => handleShareChange(userId, parseInt(e.target.value) || 0)}
                          className="w-20 px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white text-center focus:outline-none focus:ring-2 focus:ring-white/30"
                          disabled={loading}
                        />
                        <span className="text-xs text-white/50 w-12">
                          {customShares[userId] === 1 ? 'доля' : 'долей'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Preview Calculation */}
              {(() => {
                const preview = calculatePreview();
                if (!preview) return null;
                
                return (
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                    <div className="text-xs font-medium text-white/70 mb-2">Расчёт:</div>
                    {splitType === 'equal' && preview.perPerson !== null && (
                      <div className="text-sm text-white">
                        <span className="text-white/60">По </span>
                        <span className="font-bold">{preview.perPerson.toFixed(2)} {group.currency}</span>
                        <span className="text-white/60"> на человека</span>
                      </div>
                    )}
                    {splitType === 'custom' && preview.pricePerShare && preview.totalShares && (
                      <div className="space-y-1">
                        <div className="text-xs text-white/60">
                          Всего долей: {preview.totalShares} | Цена доли: {preview.pricePerShare.toFixed(2)} {group.currency}
                        </div>
                        <div className="space-y-0.5">
                          {splitBetween.map(userId => {
                            const member = localMembers.find(m => m.userId === userId);
                            const shares = customShares[userId] || 0;
                            const amount = (preview.pricePerShare || 0) * shares;
                            if (!member) return null;
                            return (
                              <div key={userId} className="text-xs flex justify-between">
                                <span className="text-white/70">{getMemberName(member)}:</span>
                                <span className="text-white font-medium">
                                  {shares} × {(preview.pricePerShare || 0).toFixed(2)} = {amount.toFixed(2)} {group.currency}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

        </form>

        {/* Actions - fixed at bottom with safe area padding */}
        <div className="flex gap-3 px-6 pt-4 pb-8 border-t border-white/10 flex-shrink-0 bg-gradient-to-t from-black/40 to-transparent backdrop-blur-xl">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-4 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all font-medium text-base"
              disabled={loading}
            >
            {t('common.cancel')}
            </button>
          <button 
            type="submit" 
            onClick={(e) => {
              e.preventDefault();
              const form = e.currentTarget.closest('div')?.previousElementSibling as HTMLFormElement;
              if (form) {
                form.requestSubmit();
              }
            }}
            className="flex-1 px-6 py-4 rounded-xl bg-white/20 border border-white/30 text-white hover:bg-white/30 transition-all disabled:opacity-50 font-semibold text-base" 
            disabled={loading}
          >
            {loading ? t('expenses.adding') : t('expenses.add')}
            </button>
          </div>
      </div>
    </div>
  );
}








