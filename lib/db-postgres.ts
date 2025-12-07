// PostgreSQL Database Layer
// Используется для production на Vercel
import { sql } from '@vercel/postgres';
import { User, Group, GroupMember, Expense } from '@/types';

// ============================================
// DATABASE INITIALIZATION
// ============================================

export async function initDB() {
  try {
    // Enable pgcrypto for UUID generation
    await sql`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`;

    // Users table
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        telegram_id INTEGER UNIQUE NOT NULL,
        first_name TEXT NOT NULL,
        last_name TEXT,
        username TEXT,
        photo_url TEXT,
        is_premium BOOLEAN DEFAULT FALSE,
        premium_until TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `;

    // Groups table
    await sql`
      CREATE TABLE IF NOT EXISTS groups (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        currency TEXT DEFAULT 'USD',
        created_by UUID NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        FOREIGN KEY (created_by) REFERENCES users(id)
      )
    `;

    // Group members table
    await sql`
      CREATE TABLE IF NOT EXISTS group_members (
        user_id UUID NOT NULL,
        group_id TEXT NOT NULL,
        role TEXT DEFAULT 'member',
        joined_at TIMESTAMP NOT NULL DEFAULT NOW(),
        PRIMARY KEY (user_id, group_id),
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE
      )
    `;

    // Expenses table
    await sql`
      CREATE TABLE IF NOT EXISTS expenses (
        id TEXT PRIMARY KEY,
        group_id TEXT NOT NULL,
        description TEXT NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        currency TEXT DEFAULT 'USD',
        paid_by UUID NOT NULL,
        split_between JSONB NOT NULL,
        date TIMESTAMP NOT NULL,
        created_by UUID NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        category TEXT,
        FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
        FOREIGN KEY (paid_by) REFERENCES users(id),
        FOREIGN KEY (created_by) REFERENCES users(id)
      )
    `;

    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_group_members ON group_members(group_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_expenses_group ON expenses(group_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_users_telegram ON users(telegram_id)`;

    console.log('✅ PostgreSQL database initialized');
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    throw error;
  }
}

// ============================================
// USER OPERATIONS
// ============================================

export async function createUser(
  telegramId: number,
  firstName: string,
  lastName?: string,
  username?: string,
  photoUrl?: string
): Promise<User> {
  const result = await sql`
    INSERT INTO users (telegram_id, first_name, last_name, username, photo_url)
    VALUES (${telegramId}, ${firstName}, ${lastName || null}, ${username || null}, ${photoUrl || null})
    ON CONFLICT (telegram_id) 
    DO UPDATE SET 
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      username = EXCLUDED.username,
      photo_url = EXCLUDED.photo_url
    RETURNING *
  `;

  const row = result.rows[0];
  
  return {
    id: row.id,
    telegramId: row.telegram_id,
    firstName: row.first_name,
    lastName: row.last_name,
    username: row.username,
    photoUrl: row.photo_url,
    isPremium: row.is_premium,
    premiumUntil: row.premium_until ? new Date(row.premium_until) : undefined,
    createdAt: new Date(row.created_at),
  };
}

export async function getUserByTelegramId(telegramId: number): Promise<User | null> {
  const result = await sql`
    SELECT * FROM users WHERE telegram_id = ${telegramId}
  `;

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  
  return {
    id: row.id,
    telegramId: row.telegram_id,
    firstName: row.first_name,
    lastName: row.last_name,
    username: row.username,
    photoUrl: row.photo_url,
    isPremium: row.is_premium,
    premiumUntil: row.premium_until ? new Date(row.premium_until) : undefined,
    createdAt: new Date(row.created_at),
  };
}

export async function getAllUsers(): Promise<User[]> {
  const result = await sql`
    SELECT * FROM users ORDER BY created_at DESC
  `;

  return result.rows.map((row) => ({
    id: row.id,
    telegramId: row.telegram_id,
    firstName: row.first_name,
    lastName: row.last_name,
    username: row.username,
    photoUrl: row.photo_url,
    isPremium: row.is_premium,
    premiumUntil: row.premium_until ? new Date(row.premium_until) : undefined,
    createdAt: new Date(row.created_at),
  }));
}

export async function getUserById(id: string): Promise<User | null> {
  const result = await sql`
    SELECT * FROM users WHERE id = ${id}
  `;

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  
  return {
    id: row.id,
    telegramId: row.telegram_id,
    firstName: row.first_name,
    lastName: row.last_name,
    username: row.username,
    photoUrl: row.photo_url,
    isPremium: row.is_premium,
    premiumUntil: row.premium_until ? new Date(row.premium_until) : undefined,
    createdAt: new Date(row.created_at),
  };
}

export async function updateUserPremium(userId: string, premiumUntil: Date): Promise<void> {
  await sql`
    UPDATE users 
    SET is_premium = TRUE, premium_until = ${premiumUntil.toISOString()}
    WHERE id = ${userId}
  `;
}

// ============================================
// GROUP OPERATIONS
// ============================================

export async function createGroup(
  name: string,
  createdBy: string,
  description?: string,
  currency = 'USD'
): Promise<Group> {
  const id = `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const result = await sql`
    INSERT INTO groups (id, name, description, currency, created_by, created_at)
    VALUES (${id}, ${name}, ${description || null}, ${currency}, ${createdBy}, NOW())
    RETURNING *
  `;

  // Добавляем создателя как админа
  await addGroupMember(id, createdBy, 'admin');

  const row = result.rows[0];
  
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    currency: row.currency,
    createdBy: row.created_by,
    createdAt: new Date(row.created_at),
    members: [],
  };
}

export async function addGroupMember(
  groupId: string,
  userId: string,
  role: 'admin' | 'member' = 'member'
): Promise<void> {
  await sql`
    INSERT INTO group_members (user_id, group_id, role, joined_at)
    VALUES (${userId}, ${groupId}, ${role}, NOW())
    ON CONFLICT (user_id, group_id) DO NOTHING
  `;
}

export async function getUserGroups(userId: string): Promise<Group[]> {
  const result = await sql`
    SELECT g.* FROM groups g
    INNER JOIN group_members gm ON g.id = gm.group_id
    WHERE gm.user_id = ${userId}
    ORDER BY g.created_at DESC
  `;

  const groups: Group[] = [];
  
  for (const row of result.rows) {
    const members = await getGroupMembers(row.id);
    
    groups.push({
      id: row.id,
      name: row.name,
      description: row.description,
      currency: row.currency,
      createdBy: row.created_by,
      createdAt: new Date(row.created_at),
      members,
    });
  }

  return groups;
}

export async function getGroupById(groupId: string): Promise<Group | null> {
  const result = await sql`
    SELECT * FROM groups WHERE id = ${groupId}
  `;

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  const members = await getGroupMembers(row.id);
  
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    currency: row.currency,
    createdBy: row.created_by,
    createdAt: new Date(row.created_at),
    members,
  };
}

export async function getGroupMembers(groupId: string): Promise<GroupMember[]> {
  const result = await sql`
    SELECT gm.*, u.* FROM group_members gm
    INNER JOIN users u ON gm.user_id = u.id
    WHERE gm.group_id = ${groupId}
  `;

  return result.rows.map(row => ({
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
      isPremium: row.is_premium,
      createdAt: new Date(row.created_at),
    },
  }));
}

// ============================================
// EXPENSE OPERATIONS
// ============================================

export async function createExpense(
  groupId: string,
  description: string,
  amount: number,
  paidBy: string,
  splitBetween: string[],
  createdBy: string,
  currency = 'USD',
  category?: string,
  date?: Date
): Promise<Expense> {
  const id = `expense_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const expenseDate = date || new Date();
  
  const result = await sql`
    INSERT INTO expenses (
      id, group_id, description, amount, currency, 
      paid_by, split_between, date, created_by, created_at, category
    )
    VALUES (
      ${id}, ${groupId}, ${description}, ${amount}, ${currency},
      ${paidBy}, ${JSON.stringify(splitBetween)}::jsonb, ${expenseDate.toISOString()}, 
      ${createdBy}, NOW(), ${category || null}
    )
    RETURNING *
  `;

  const row = result.rows[0];
  
  return {
    id: row.id,
    groupId: row.group_id,
    description: row.description,
    amount: parseFloat(row.amount),
    currency: row.currency,
    paidBy: row.paid_by,
    splitBetween: row.split_between,
    date: new Date(row.date),
    createdBy: row.created_by,
    createdAt: new Date(row.created_at),
    category: row.category,
  };
}

export async function getGroupExpenses(groupId: string): Promise<Expense[]> {
  const result = await sql`
    SELECT * FROM expenses
    WHERE group_id = ${groupId}
    ORDER BY date DESC, created_at DESC
  `;

  return result.rows.map(row => ({
    id: row.id,
    groupId: row.group_id,
    description: row.description,
    amount: parseFloat(row.amount),
    currency: row.currency,
    paidBy: row.paid_by,
    splitBetween: row.split_between,
    date: new Date(row.date),
    createdBy: row.created_by,
    createdAt: new Date(row.created_at),
    category: row.category,
  }));
}

export async function deleteExpense(expenseId: string): Promise<void> {
  await sql`
    DELETE FROM expenses WHERE id = ${expenseId}
  `;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

export async function healthCheck(): Promise<boolean> {
  try {
    const result = await sql`SELECT 1 as health`;
    return result.rows.length > 0;
  } catch (error) {
    console.error('Health check failed:', error);
    return false;
  }
}

export async function getStats() {
  const [users, groups, expenses, premiumUsers] = await Promise.all([
    sql`SELECT COUNT(*) as count FROM users`,
    sql`SELECT COUNT(*) as count FROM groups`,
    sql`SELECT COUNT(*) as count FROM expenses`,
    sql`SELECT COUNT(*) as count FROM users WHERE is_premium = true`,
  ]);

  return {
    totalUsers: parseInt(users.rows[0].count),
    totalGroups: parseInt(groups.rows[0].count),
    totalExpenses: parseInt(expenses.rows[0].count),
    totalPremiumUsers: parseInt(premiumUsers.rows[0].count),
  };
}

// ============================================
// ADMIN AUDIT LOG
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

export async function logAdminAction(entry: AuditLogEntry): Promise<void> {
  await sql`
    INSERT INTO admin_audit_log (
      admin_id, action, target_user_id, target_entity_id,
      details, ip_address, user_agent
    ) VALUES (
      ${entry.adminId},
      ${entry.action},
      ${entry.targetUserId || null},
      ${entry.targetEntityId || null},
      ${JSON.stringify(entry.details || {})},
      ${entry.ipAddress || null},
      ${entry.userAgent || null}
    )
  `;
}

export async function getAuditLog(limit: number = 50): Promise<AuditLogEntry[]> {
  const result = await sql`
    SELECT * FROM admin_audit_log
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;

  return result.rows.map(row => ({
    id: row.id,
    adminId: row.admin_id,
    action: row.action,
    targetUserId: row.target_user_id,
    targetEntityId: row.target_entity_id,
    details: row.details,
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
    createdAt: new Date(row.created_at),
  }));
}

// ============================================
// PROMO CODES
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

export async function createPromoCode(code: string, days: number, maxUses: number, createdBy: number): Promise<PromoCode> {
  const result = await sql`
    INSERT INTO promo_codes (code, days, max_uses, created_by)
    VALUES (${code}, ${days}, ${maxUses}, ${createdBy})
    RETURNING *
  `;

  const row = result.rows[0];
  return {
    id: row.id,
    code: row.code,
    days: row.days,
    maxUses: row.max_uses,
    currentUses: row.current_uses,
    createdBy: row.created_by,
    isActive: row.is_active,
    expiresAt: row.expires_at ? new Date(row.expires_at) : undefined,
    createdAt: new Date(row.created_at),
  };
}

export async function getPromoCode(code: string): Promise<PromoCode | null> {
  const result = await sql`
    SELECT * FROM promo_codes WHERE code = ${code} AND is_active = true
  `;

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  return {
    id: row.id,
    code: row.code,
    days: row.days,
    maxUses: row.max_uses,
    currentUses: row.current_uses,
    createdBy: row.created_by,
    isActive: row.is_active,
    expiresAt: row.expires_at ? new Date(row.expires_at) : undefined,
    createdAt: new Date(row.created_at),
  };
}

export async function usePromoCode(code: string, userId: string): Promise<boolean> {
  try {
    // Получаем промо-код
    const promo = await getPromoCode(code);
    if (!promo || !promo.id) return false;

    // Проверяем лимит использований
    if (promo.currentUses >= promo.maxUses) return false;

    // Проверяем не использовал ли пользователь этот код ранее
    const existingUse = await sql`
      SELECT * FROM promo_code_uses
      WHERE promo_code_id = ${promo.id} AND user_id = ${userId}
    `;

    if (existingUse.rows.length > 0) return false;

    // Выдаём Premium пользователю
    const user = await getUserById(userId);
    if (!user) return false;

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + promo.days);

    await updateUserPremium(userId, expiresAt);

    // Увеличиваем счётчик использований
    await sql`
      UPDATE promo_codes
      SET current_uses = current_uses + 1
      WHERE id = ${promo.id}
    `;

    // Записываем использование
    await sql`
      INSERT INTO promo_code_uses (promo_code_id, user_id)
      VALUES (${promo.id}, ${userId})
    `;

    return true;
  } catch (error) {
    console.error('Error using promo code:', error);
    return false;
  }
}

export async function getAllPromoCodes(): Promise<PromoCode[]> {
  const result = await sql`
    SELECT * FROM promo_codes
    ORDER BY created_at DESC
  `;

  return result.rows.map(row => ({
    id: row.id,
    code: row.code,
    days: row.days,
    maxUses: row.max_uses,
    currentUses: row.current_uses,
    createdBy: row.created_by,
    isActive: row.is_active,
    expiresAt: row.expires_at ? new Date(row.expires_at) : undefined,
    createdAt: new Date(row.created_at),
  }));
}










