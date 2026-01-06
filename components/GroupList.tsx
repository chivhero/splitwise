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
    <div className="space-y-4">
      {groups.map((group, index) => (
        <div
          key={group.id}
          onClick={() => handleGroupClick(group.id)}
          className="group card cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 animate-slide-up"
          style={{ animationDelay: `${index * 0.1}s` }}
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <div className="backdrop-blur-xl bg-white/10 p-2 rounded-lg border border-white/20 group-hover:scale-110 transition-transform">
                  <Users size={18} className="text-white" />
                </div>
                <h3 className="font-bold text-xl text-white group-hover:text-white/90 transition-colors">
                  {group.name}
                </h3>
              </div>
              
              {group.description && (
                <p className="text-white/70 text-sm mb-3 ml-11 line-clamp-2">{group.description}</p>
              )}
              
              <div className="flex items-center gap-3 text-sm text-white/60 ml-11">
                <span className="backdrop-blur-xl bg-white/5 px-3 py-1 rounded-full border border-white/10">
                  {getMembersText(group.members.length)}
                </span>
                <span className="text-white/30">•</span>
                <span className="backdrop-blur-xl bg-white/5 px-3 py-1 rounded-full border border-white/10 font-medium">
                  {group.currency}
                </span>
              </div>
            </div>
            
            <ChevronRight 
              size={24} 
              className="text-white/40 group-hover:text-white/80 group-hover:translate-x-1 transition-all" 
            />
          </div>
          
          {/* Glassmorphism hover effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/5 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-2xl"></div>
        </div>
      ))}
    </div>
  );
}








