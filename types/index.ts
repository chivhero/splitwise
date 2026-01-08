// Типы для приложения

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
}

export interface User {
  id: string;
  telegramId?: number; // Optional - users can be added by name only
  firstName: string;
  lastName?: string;
  username?: string;
  photoUrl?: string;
  isPremium: boolean;
  premiumUntil?: Date;
  isAdmin?: boolean;
  createdAt: Date;
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  currency: string;
  createdBy: string;
  createdAt: Date;
  members: GroupMember[];
}

export interface GroupMember {
  userId: string;
  groupId: string;
  role: 'admin' | 'member';
  joinedAt: Date;
  user?: User;
}

export interface Expense {
  id: string;
  groupId: string;
  description: string;
  amount: number;
  currency: string;
  paidBy: string;
  splitBetween: string[]; // user IDs
  date: Date;
  createdBy: string;
  createdAt: Date;
  category?: string;
}

export interface Settlement {
  from: string; // user ID
  to: string; // user ID
  amount: number;
  fromUser?: User;
  toUser?: User;
}

export interface Balance {
  userId: string;
  balance: number; // положительное = должны вам, отрицательное = вы должны
  user?: User;
}

export interface PromoCode {
  id: string;
  code: string;
  premiumDays: number;
  maxUses: number | null;
  usedCount: number;
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  expiresAt: Date | null;
  creatorName?: string;
}

export interface PromoRedemption {
  id: string;
  promoCodeId: string;
  userId: string;
  redeemedAt: Date;
}

export interface AdminStats {
  totalUsers: number;
  totalGroups: number;
  totalExpenses: number;
  premiumUsers: number;
  totalPromoCodes: number;
}















