// База данных SQLite
import Database from 'better-sqlite3';
import path from 'path';
import { User, Group, GroupMember, Expense } from '@/types';

const dbPath = path.join(process.cwd(), 'data.db');
const db = new Database(dbPath);

// Инициализация таблиц
export function initDB() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      telegram_id INTEGER UNIQUE NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT,
      username TEXT,
      photo_url TEXT,
      is_premium INTEGER DEFAULT 0,
      premium_until TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS groups (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      currency TEXT DEFAULT 'USD',
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (created_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS group_members (
      user_id TEXT NOT NULL,
      group_id TEXT NOT NULL,
      role TEXT DEFAULT 'member',
      joined_at TEXT NOT NULL,
      PRIMARY KEY (user_id, group_id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      group_id TEXT NOT NULL,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT DEFAULT 'USD',
      paid_by TEXT NOT NULL,
      split_between TEXT NOT NULL,
      date TEXT NOT NULL,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL,
      category TEXT,
      FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
      FOREIGN KEY (paid_by) REFERENCES users(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_group_members ON group_members(group_id);
    CREATE INDEX IF NOT EXISTS idx_expenses_group ON expenses(group_id);
  `);
}

// User operations
export function createUser(telegramId: number, firstName: string, lastName?: string, username?: string, photoUrl?: string): User {
  const id = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const createdAt = new Date().toISOString();
  
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO users (id, telegram_id, first_name, last_name, username, photo_url, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  
  stmt.run(id, telegramId, firstName, lastName, username, photoUrl, createdAt);
  
  return {
    id,
    telegramId,
    firstName,
    lastName,
    username,
    photoUrl,
    isPremium: false,
    createdAt: new Date(createdAt),
  };
}

export function getUserByTelegramId(telegramId: number): User | null {
  const stmt = db.prepare('SELECT * FROM users WHERE telegram_id = ?');
  const row = stmt.get(telegramId) as any;
  
  if (!row) return null;
  
  return {
    id: row.id,
    telegramId: row.telegram_id,
    firstName: row.first_name,
    lastName: row.last_name,
    username: row.username,
    photoUrl: row.photo_url,
    isPremium: row.is_premium === 1,
    premiumUntil: row.premium_until ? new Date(row.premium_until) : undefined,
    createdAt: new Date(row.created_at),
  };
}

export function getUserById(id: string): User | null {
  const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
  const row = stmt.get(id) as any;
  
  if (!row) return null;
  
  return {
    id: row.id,
    telegramId: row.telegram_id,
    firstName: row.first_name,
    lastName: row.last_name,
    username: row.username,
    photoUrl: row.photo_url,
    isPremium: row.is_premium === 1,
    premiumUntil: row.premium_until ? new Date(row.premium_until) : undefined,
    createdAt: new Date(row.created_at),
  };
}

export function updateUserPremium(userId: string, premiumUntil: Date) {
  const stmt = db.prepare('UPDATE users SET is_premium = 1, premium_until = ? WHERE id = ?');
  stmt.run(premiumUntil.toISOString(), userId);
}

// Group operations
export function createGroup(name: string, createdBy: string, description?: string, currency = 'USD'): Group {
  const id = `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const createdAt = new Date().toISOString();
  
  const stmt = db.prepare(`
    INSERT INTO groups (id, name, description, currency, created_by, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  
  stmt.run(id, name, description, currency, createdBy, createdAt);
  
  // Добавляем создателя как админа
  addGroupMember(id, createdBy, 'admin');
  
  return {
    id,
    name,
    description,
    currency,
    createdBy,
    createdAt: new Date(createdAt),
    members: [],
  };
}

export function addGroupMember(groupId: string, userId: string, role: 'admin' | 'member' = 'member') {
  const joinedAt = new Date().toISOString();
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO group_members (user_id, group_id, role, joined_at)
    VALUES (?, ?, ?, ?)
  `);
  stmt.run(userId, groupId, role, joinedAt);
}

export function getUserGroups(userId: string): Group[] {
  const stmt = db.prepare(`
    SELECT g.* FROM groups g
    INNER JOIN group_members gm ON g.id = gm.group_id
    WHERE gm.user_id = ?
    ORDER BY g.created_at DESC
  `);
  
  const rows = stmt.all(userId) as any[];
  
  return rows.map(row => ({
    id: row.id,
    name: row.name,
    description: row.description,
    currency: row.currency,
    createdBy: row.created_by,
    createdAt: new Date(row.created_at),
    members: getGroupMembers(row.id),
  }));
}

export function getGroupById(groupId: string): Group | null {
  const stmt = db.prepare('SELECT * FROM groups WHERE id = ?');
  const row = stmt.get(groupId) as any;
  
  if (!row) return null;
  
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    currency: row.currency,
    createdBy: row.created_by,
    createdAt: new Date(row.created_at),
    members: getGroupMembers(row.id),
  };
}

export function getGroupMembers(groupId: string): GroupMember[] {
  const stmt = db.prepare(`
    SELECT gm.*, u.* FROM group_members gm
    INNER JOIN users u ON gm.user_id = u.id
    WHERE gm.group_id = ?
  `);
  
  const rows = stmt.all(groupId) as any[];
  
  return rows.map(row => ({
    userId: row.user_id,
    groupId: row.group_id,
    role: row.role,
    joinedAt: new Date(row.joined_at),
    user: {
      id: row.id,
      telegramId: row.telegram_id,
      firstName: row.first_name,
      lastName: row.last_name,
      username: row.username,
      photoUrl: row.photo_url,
      isPremium: row.is_premium === 1,
      createdAt: new Date(row.created_at),
    },
  }));
}

// Expense operations
export function createExpense(
  groupId: string,
  description: string,
  amount: number,
  paidBy: string,
  splitBetween: string[],
  createdBy: string,
  currency = 'USD',
  category?: string,
  date?: Date
): Expense {
  const id = `expense_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const createdAt = new Date().toISOString();
  const expenseDate = (date || new Date()).toISOString();
  
  const stmt = db.prepare(`
    INSERT INTO expenses (id, group_id, description, amount, currency, paid_by, split_between, date, created_by, created_at, category)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  stmt.run(
    id,
    groupId,
    description,
    amount,
    currency,
    paidBy,
    JSON.stringify(splitBetween),
    expenseDate,
    createdBy,
    createdAt,
    category
  );
  
  return {
    id,
    groupId,
    description,
    amount,
    currency,
    paidBy,
    splitBetween,
    date: new Date(expenseDate),
    createdBy,
    createdAt: new Date(createdAt),
    category,
  };
}

export function getGroupExpenses(groupId: string): Expense[] {
  const stmt = db.prepare(`
    SELECT * FROM expenses
    WHERE group_id = ?
    ORDER BY date DESC, created_at DESC
  `);
  
  const rows = stmt.all(groupId) as any[];
  
  return rows.map(row => ({
    id: row.id,
    groupId: row.group_id,
    description: row.description,
    amount: row.amount,
    currency: row.currency,
    paidBy: row.paid_by,
    splitBetween: JSON.parse(row.split_between),
    date: new Date(row.date),
    createdBy: row.created_by,
    createdAt: new Date(row.created_at),
    category: row.category,
  }));
}

export function deleteExpense(expenseId: string) {
  const stmt = db.prepare('DELETE FROM expenses WHERE id = ?');
  stmt.run(expenseId);
}

// ============================================
// ADMIN AUDIT LOG (Simplified for SQLite)
// ============================================

export interface AuditLogEntry {
  id?: number;
  adminId: number;
  action: string;
  targetUserId?: string;
  targetEntityId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  createdAt?: Date;
}

export function logAdminAction(entry: AuditLogEntry): void {
  // For SQLite in development, just console.log
  console.log('📝 Admin Action:', entry);
}

export function getAuditLog(limit: number = 50): AuditLogEntry[] {
  // Placeholder for SQLite
  return [];
}

// ============================================
// PROMO CODES (Simplified for SQLite)
// ============================================

export interface PromoCode {
  id?: number;
  code: string;
  days: number;
  maxUses: number;
  currentUses: number;
  createdBy: number;
  isActive: boolean;
  expiresAt?: Date;
  createdAt?: Date;
}

export function createPromoCode(code: string, days: number, maxUses: number, createdBy: number): PromoCode {
  console.log('Creating promo code (SQLite dev mode):', { code, days, maxUses });
  return {
    code,
    days,
    maxUses,
    currentUses: 0,
    createdBy,
    isActive: true,
    createdAt: new Date(),
  };
}

export function getPromoCode(code: string): PromoCode | null {
  console.log('Getting promo code (SQLite dev mode):', code);
  return null;
}

export function usePromoCode(code: string, userId: string): boolean {
  console.log('Using promo code (SQLite dev mode):', { code, userId });
  return false;
}

export function getAllPromoCodes(): PromoCode[] {
  return [];
}

// Инициализация БД при импорте
initDB();

export default db;















