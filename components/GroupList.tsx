'use client';

import { Group } from '@/types';
import { Users, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { hapticFeedback } from '@/lib/telegram';
import { useLanguage } from '@/contexts/LanguageContext';

interface GroupListProps {
  groups: Group[];
}

export default function GroupList({ groups }: GroupListProps) {
  const { t, locale } = useLanguage();
  const router = useRouter();

  const handleGroupClick = (groupId: string) => {
    hapticFeedback('light');
    router.push(`/group/${groupId}`);
  };

  const getMembersText = (count: number) => {
    if (locale === 'ru') {
      // Русская плюрализация
      const lastDigit = count % 10;
      const lastTwoDigits = count % 100;
      
      if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
        return `${count} участников`;
      }
      if (lastDigit === 1) {
        return `${count} участник`;
      }
      if (lastDigit >= 2 && lastDigit <= 4) {
        return `${count} участника`;
      }
      return `${count} участников`;
    } else {
      // Английская плюрализация
      return count === 1 ? `${count} member` : `${count} members`;
    }
  };

  return (
    <div className="space-y-3">
      {groups.map((group) => (
        <div
          key={group.id}
          onClick={() => handleGroupClick(group.id)}
          className="card cursor-pointer hover:shadow-md transition-shadow active:scale-98"
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="font-semibold text-lg mb-1 text-purple-900">{group.name}</h3>
              {group.description && (
                <p className="text-purple-600 text-sm mb-2">{group.description}</p>
              )}
              <div className="flex items-center gap-2 text-sm text-indigo-500">
                <Users size={16} />
                <span>{getMembersText(group.members.length)}</span>
                <span className="text-purple-300">•</span>
                <span>{group.currency}</span>
              </div>
            </div>
            <ChevronRight size={20} className="text-purple-400" />
          </div>
        </div>
      ))}
    </div>
  );
}








