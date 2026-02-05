'use client';

import { useState, useEffect } from 'react';
import { Expense, Group, ExpenseItem, ExpenseComment } from '@/types';
import { X, Edit2, Trash2, Plus, Check, MessageSquare } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { format } from 'date-fns';
import { ru, enUS } from 'date-fns/locale';
import { getTelegramUser } from '@/lib/telegram';

interface ExpenseDetailsModalProps {
  expense: Expense;
  group: Group;
  onClose: () => void;
  onDelete?: () => void;
  onEdit?: () => void;
}

export default function ExpenseDetailsModal({
  expense,
  group,
  onClose,
  onDelete,
  onEdit,
}: ExpenseDetailsModalProps) {
  const { t, locale } = useLanguage();
  const tgUser = getTelegramUser();
  const currentUserMember = tgUser ? group.members.find(m => m.user?.telegramId === tgUser.id) : null;
  const currentUserId = currentUserMember?.userId;

  // State
  const [items, setItems] = useState<ExpenseItem[]>([]);
  const [comments, setComments] = useState<ExpenseComment[]>([]);
  const [newItemText, setNewItemText] = useState('');
  const [newCommentText, setNewCommentText] = useState('');
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  const getUserName = (userId: string) => {
    if (userId === currentUserId) {
      return t('common.you');
    }
    const member = group.members.find(m => m.userId === userId);
    return member?.user?.firstName || t('common.unknown');
  };

  const getCategoryEmoji = (category?: string) => {
    const categories: { [key: string]: string } = {
      food: '🍔',
      transport: '🚗',
      entertainment: '🎉',
      accommodation: '🏠',
      shopping: '🛍️',
      other: '💰',
    };
    return categories[category || 'other'] || '💰';
  };

  // Загрузка items и комментариев
  useEffect(() => {
    loadData();
  }, [expense.id]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [itemsRes, commentsRes] = await Promise.all([
        fetch(`/api/groups/${expense.groupId}/expenses/${expense.id}/items`),
        fetch(`/api/groups/${expense.groupId}/expenses/${expense.id}/comments`),
      ]);

      if (itemsRes.ok) {
        const itemsData = await itemsRes.json();
        setItems(itemsData.items || []);
      }

      if (commentsRes.ok) {
        const commentsData = await commentsRes.json();
        setComments(commentsData.comments || []);
      }
    } catch (error) {
      console.error('Failed to load expense details:', error);
    } finally {
      setLoading(false);
    }
  };

  // Добавить item
  const handleAddItem = async () => {
    if (!newItemText.trim() || adding || !currentUserId) return;

    try {
      setAdding(true);
      const res = await fetch(`/api/groups/${expense.groupId}/expenses/${expense.id}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: newItemText.trim(),
          userId: currentUserId,
        }),
      });

      if (res.ok) {
        const { item } = await res.json();
        setItems(prev => [...prev, item]);
        setNewItemText('');
      }
    } catch (error) {
      console.error('Failed to add item:', error);
    } finally {
      setAdding(false);
    }
  };

  // Toggle checkbox
  const handleToggleItem = async (itemId: string, currentChecked: boolean) => {
    try {
      const res = await fetch(
        `/api/groups/${expense.groupId}/expenses/${expense.id}/items/${itemId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isChecked: !currentChecked }),
        }
      );

      if (res.ok) {
        setItems(prev =>
          prev.map(item =>
            item.id === itemId ? { ...item, isChecked: !currentChecked } : item
          )
        );
      }
    } catch (error) {
      console.error('Failed to toggle item:', error);
    }
  };

  // Удалить item
  const handleDeleteItem = async (itemId: string) => {
    try {
      const res = await fetch(
        `/api/groups/${expense.groupId}/expenses/${expense.id}/items/${itemId}`,
        { method: 'DELETE' }
      );

      if (res.ok) {
        setItems(prev => prev.filter(item => item.id !== itemId));
      }
    } catch (error) {
      console.error('Failed to delete item:', error);
    }
  };

  // Добавить комментарий
  const handleAddComment = async () => {
    if (!newCommentText.trim() || adding || !currentUserId) return;

    try {
      setAdding(true);
      const res = await fetch(`/api/groups/${expense.groupId}/expenses/${expense.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: newCommentText.trim(),
          userId: currentUserId,
        }),
      });

      if (res.ok) {
        const { comment } = await res.json();
        setComments(prev => [...prev, comment]);
        setNewCommentText('');
      }
    } catch (error) {
      console.error('Failed to add comment:', error);
    } finally {
      setAdding(false);
    }
  };

  // Удалить комментарий
  const handleDeleteComment = async (commentId: string) => {
    try {
      const res = await fetch(
        `/api/groups/${expense.groupId}/expenses/${expense.id}/comments/${commentId}`,
        { method: 'DELETE' }
      );

      if (res.ok) {
        setComments(prev => prev.filter(comment => comment.id !== commentId));
      }
    } catch (error) {
      console.error('Failed to delete comment:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-0">
      {/* Full Screen Modal */}
      <div className="bg-gradient-to-b from-purple-900/95 to-indigo-900/95 backdrop-blur-xl h-[100dvh] w-full flex flex-col">
        {/* Header */}
        <div className="px-6 pt-8 pb-4 border-b border-white/10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-white">{t('expenses.details')}</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-full transition"
            >
              <X size={28} className="text-white" />
            </button>
          </div>

          {/* Основная информация */}
          <div className="flex items-start gap-3 mb-3">
            <div className="text-3xl">{getCategoryEmoji(expense.category)}</div>
            <div className="flex-1">
              <h3 className="font-semibold text-xl text-white mb-1">{expense.description}</h3>
              <p className="text-sm text-white/70">
                {t('expenses.paidByName', { name: getUserName(expense.paidBy) })}
              </p>
              <p className="text-xs text-white/60 mt-1">
                {format(new Date(expense.date), 'd MMMM yyyy, HH:mm', {
                  locale: locale === 'ru' ? ru : enUS,
                })}
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-white">
                {expense.amount.toFixed(2)} {expense.currency}
              </p>
              <p className="text-xs text-white/60 mt-1">
                {expense.splitBetween.length} {t('common.members')}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            {onEdit && (
              <button
                onClick={onEdit}
                className="flex-1 bg-white/10 hover:bg-white/20 text-white py-2 px-4 rounded-lg transition flex items-center justify-center gap-2"
              >
                <Edit2 size={18} />
                <span>{t('common.edit')}</span>
              </button>
            )}
            {onDelete && (
              <button
                onClick={onDelete}
                className="flex-1 bg-red-500/20 hover:bg-red-500/30 text-red-300 py-2 px-4 rounded-lg transition flex items-center justify-center gap-2"
              >
                <Trash2 size={18} />
                <span>{t('common.delete')}</span>
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {/* Checklist Section */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <Check size={20} />
              {t('expenses.checklist')}
            </h3>

            {/* Add Item Input */}
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={newItemText}
                onChange={(e) => setNewItemText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
                placeholder={t('expenses.addItemPlaceholder')}
                className="flex-1 bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder:text-white/40"
              />
              <button
                onClick={handleAddItem}
                disabled={!newItemText.trim() || adding}
                className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg transition"
              >
                <Plus size={20} />
              </button>
            </div>

            {/* Items List */}
            <div className="space-y-2">
              {items.length === 0 && !loading && (
                <p className="text-white/40 text-sm text-center py-4">
                  {t('expenses.noItems')}
                </p>
              )}
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 bg-white/5 rounded-lg p-3 group"
                >
                  <button
                    onClick={() => handleToggleItem(item.id, item.isChecked)}
                    className={`w-6 h-6 rounded border-2 flex items-center justify-center transition ${
                      item.isChecked
                        ? 'bg-green-500 border-green-500'
                        : 'border-white/30 hover:border-white/50'
                    }`}
                  >
                    {item.isChecked && <Check size={16} className="text-white" />}
                  </button>
                  <span
                    className={`flex-1 ${
                      item.isChecked ? 'line-through text-white/50' : 'text-white'
                    }`}
                  >
                    {item.description}
                  </span>
                  <button
                    onClick={() => handleDeleteItem(item.id)}
                    className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Comments Section */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <MessageSquare size={20} />
              {t('expenses.comments')}
            </h3>

            {/* Comments List */}
            <div className="space-y-3 mb-3 max-h-64 overflow-y-auto">
              {comments.length === 0 && !loading && (
                <p className="text-white/40 text-sm text-center py-4">
                  {t('expenses.noComments')}
                </p>
              )}
              {comments.map((comment) => (
                <div key={comment.id} className="bg-white/5 rounded-lg p-3 group">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-white text-sm">
                      {getUserName(comment.createdBy)}
                    </span>
                    <span className="text-xs text-white/40">
                      {format(new Date(comment.createdAt), 'd MMM, HH:mm', {
                        locale: locale === 'ru' ? ru : enUS,
                      })}
                    </span>
                    {comment.createdBy === currentUserId && (
                      <button
                        onClick={() => handleDeleteComment(comment.id)}
                        className="ml-auto opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                  <p className="text-white/90 text-sm">{comment.text}</p>
                </div>
              ))}
            </div>

            {/* Add Comment Input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                placeholder={t('expenses.addCommentPlaceholder')}
                className="flex-1 bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder:text-white/40"
              />
              <button
                onClick={handleAddComment}
                disabled={!newCommentText.trim() || adding}
                className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg transition"
              >
                <MessageSquare size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
