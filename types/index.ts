// Типы для приложения

export interface TelegramUser {
  id: number; // Telegram user ID (can be > 2.1B, stored as BIGINT in DB)
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
}

export interface User {
  id: string;
  telegramId?: number; // Telegram ID (BIGINT in DB, optional - users can be added by name only)
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
  splitType: 'equal' | 'custom'; // How to split the expense
  customSplits?: Record<string, number>; // user_id → number of shares (only for custom split)
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
  // User metrics
  totalUsers: number;
  realUsers: number;           // Users with telegram_id
  fakeUsers: number;           // Users without telegram_id (manually added)
  activeUsers: number;         // Users active in last 7 days
  premiumUsers: number;
  premiumExpiring: number;     // Premium expiring in next 7 days
  weeklyNewUsers: number;      // New users in last 7 days
  monthlyNewUsers: number;     // New users in last 30 days
  
  // Group metrics
  totalGroups: number;
  activeGroups: number;        // Groups with expenses in last 30 days
  inactiveGroups: number;      // Groups with no expenses in last 30 days
  
  // Expense metrics
  totalExpenses: number;
  customSplitExpenses: number; // Expenses using custom split
  totalVolume: number;         // Sum of all expense amounts
  todayExpenses: number;       // Expenses created today
  weeklyExpenses: number;      // Expenses created in last 7 days
  
  // Promo codes
  totalPromoCodes: number;
  activePromoCodes: number;    // Active promo codes
}

export interface ExpenseItem {
  id: string;
  expenseId: string;
  description: string;
  isChecked: boolean;
  createdBy: string;
  createdAt: Date;
  createdByUser?: User;
}

export interface ExpenseComment {
  id: string;
  expenseId: string;
  text: string;
  createdBy: string;
  createdAt: Date;
  createdByUser?: User;
}















