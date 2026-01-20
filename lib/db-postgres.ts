// PostgreSQL Database Layer
// Используется для production на Vercel
import { sql } from '@vercel/postgres';
import { User, Group, GroupMember, Expense } from '@/types';

// ============================================
// DATABASE INITIALIZATION
// ============================================

export async function initDB() {
  try {
    // Users table
    // Note: telegram_id is BIGINT (supports IDs > 2.1B) and nullable (for name-only users)
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        telegram_id BIGINT UNIQUE,
        first_name TEXT NOT NULL,
        last_name TEXT,
        username TEXT,
        photo_url TEXT,
        is_premium BOOLEAN DEFAULT FALSE,
        premium_until TIMESTAMP,
        is_admin BOOLEAN DEFAULT FALSE,
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
        created_by TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        FOREIGN KEY (created_by) REFERENCES users(id)
      )
    `;

    // Group members table
    await sql`
      CREATE TABLE IF NOT EXISTS group_members (
        user_id TEXT NOT NULL,
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
        paid_by TEXT NOT NULL,
        split_between JSONB NOT NULL,
        date TIMESTAMP NOT NULL,
        created_by TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        category TEXT,
        FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
        FOREIGN KEY (paid_by) REFERENCES users(id),
        FOREIGN KEY (created_by) REFERENCES users(id)
      )
    `;

    // Promo codes table
    await sql`
      CREATE TABLE IF NOT EXISTS promo_codes (
        id TEXT PRIMARY KEY,
        code TEXT UNIQUE NOT NULL,
        premium_days INTEGER NOT NULL,
        max_uses INTEGER DEFAULT NULL,
        used_count INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        created_by TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        expires_at TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id)
      )
    `;

    // Promo code redemptions table
    await sql`
      CREATE TABLE IF NOT EXISTS promo_redemptions (
        id TEXT PRIMARY KEY,
        promo_code_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        redeemed_at TIMESTAMP NOT NULL DEFAULT NOW(),
        FOREIGN KEY (promo_code_id) REFERENCES promo_codes(id),
        FOREIGN KEY (user_id) REFERENCES users(id),
        UNIQUE(promo_code_id, user_id)
      )
    `;

    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_group_members ON group_members(group_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_expenses_group ON expenses(group_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_users_telegram ON users(telegram_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON promo_codes(code)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_promo_redemptions_user ON promo_redemptions(user_id)`;

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
  console.log(`[createUser] Attempting to create/get user with telegramId: ${telegramId}`);
  
  // Сначала проверяем, существует ли пользователь
  const existingUser = await getUserByTelegramId(telegramId);
  
  if (existingUser) {
    console.log(`[createUser] User already exists, returning existing user: ${existingUser.id}`);
    
    // Обновляем данные существующего пользователя
    const updateResult = await sql`
      UPDATE users 
      SET 
        first_name = ${firstName},
        last_name = ${lastName || null},
        username = ${username || null},
        photo_url = ${photoUrl || null}
      WHERE telegram_id = ${telegramId}
      RETURNING *
    `;
    
    const row = updateResult.rows[0];
    
    return {
      id: row.id,
      telegramId: row.telegram_id,
      firstName: row.first_name,
      lastName: row.last_name,
      username: row.username,
      photoUrl: row.photo_url,
      isPremium: row.is_premium,
      premiumUntil: row.premium_until ? new Date(row.premium_until) : undefined,
      isAdmin: row.is_admin,
      createdAt: new Date(row.created_at),
    };
  }
  
  // Создаём нового пользователя
  const id = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  console.log(`[createUser] Creating new user with id: ${id}`);
  
  const result = await sql`
    INSERT INTO users (id, telegram_id, first_name, last_name, username, photo_url, created_at)
    VALUES (${id}, ${telegramId}, ${firstName}, ${lastName || null}, ${username || null}, ${photoUrl || null}, NOW())
    RETURNING *
  `;

  const row = result.rows[0];
  
  console.log(`[createUser] User created successfully: ${row.id}`);
  
  return {
    id: row.id,
    telegramId: row.telegram_id,
    firstName: row.first_name,
    lastName: row.last_name,
    username: row.username,
    photoUrl: row.photo_url,
    isPremium: row.is_premium,
    premiumUntil: row.premium_until ? new Date(row.premium_until) : undefined,
    isAdmin: row.is_admin,
    createdAt: new Date(row.created_at),
  };
}

// Создать пользователя только по имени (без Telegram ID)
export async function createUserByName(
  firstName: string,
  lastName?: string
): Promise<User> {
  const id = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  console.log(`[createUserByName] Creating user by name: ${firstName} ${lastName || ''}, id: ${id}`);
  
  const result = await sql`
    INSERT INTO users (id, telegram_id, first_name, last_name, created_at)
    VALUES (${id}, NULL, ${firstName}, ${lastName || null}, NOW())
    RETURNING *
  `;

  const row = result.rows[0];
  
  console.log(`[createUserByName] User created: ${row.id}`);
  
  return {
    id: row.id,
    telegramId: row.telegram_id,
    firstName: row.first_name,
    lastName: row.last_name,
    username: row.username,
    photoUrl: row.photo_url,
    isPremium: row.is_premium,
    premiumUntil: row.premium_until ? new Date(row.premium_until) : undefined,
    isAdmin: row.is_admin,
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
    isAdmin: row.is_admin,
    createdAt: new Date(row.created_at),
  };
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
    isAdmin: row.is_admin,
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

export async function checkGroupMembership(
  groupId: string,
  userId: string
): Promise<boolean> {
  const result = await sql`
    SELECT 1 FROM group_members 
    WHERE group_id = ${groupId} AND user_id = ${userId}
    LIMIT 1
  `;
  return result.rows.length > 0;
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

export async function getGroupMembers(groupId: string, retryCount = 0): Promise<GroupMember[]> {
  // Сначала проверим сколько записей в group_members напрямую
  const countResult = await sql`
    SELECT COUNT(*) as cnt FROM group_members WHERE group_id = ${groupId}
  `;
  const rawCount = parseInt(countResult.rows[0]?.cnt || '0');
  
  // Явно указываем колонки чтобы избежать конфликтов имён
  const result = await sql`
    SELECT 
      gm.user_id,
      gm.group_id,
      gm.role,
      gm.joined_at,
      u.id as user_db_id,
      u.telegram_id,
      u.first_name,
      u.last_name,
      u.username,
      u.photo_url,
      u.is_premium,
      u.created_at as user_created_at
    FROM group_members gm
    INNER JOIN users u ON gm.user_id = u.id
    WHERE gm.group_id = ${groupId}
    ORDER BY gm.joined_at ASC
  `;

  console.log(`[getGroupMembers] Raw count: ${rawCount}, JOIN result: ${result.rows.length} for group ${groupId} (retry: ${retryCount})`);
  
  // Если JOIN вернул меньше записей чем COUNT — это read replica lag
  // Ждём 300ms и пробуем снова (максимум 3 раза)
  if (result.rows.length < rawCount && retryCount < 3) {
    console.log(`[getGroupMembers] Read replica lag detected! Waiting 300ms and retrying...`);
    await new Promise(resolve => setTimeout(resolve, 300));
    return getGroupMembers(groupId, retryCount + 1);
  }

  return result.rows.map(row => ({
    userId: row.user_id,
    groupId: row.group_id,
    role: row.role,
    joinedAt: new Date(row.joined_at),
    user: {
      id: row.user_db_id,
      telegramId: row.telegram_id,
      firstName: row.first_name,
      lastName: row.last_name,
      username: row.username,
      photoUrl: row.photo_url,
      isPremium: row.is_premium,
      createdAt: new Date(row.user_created_at),
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
  const [users, groups, expenses, premiumUsers, promoCodes] = await Promise.all([
    sql`SELECT COUNT(*) as count FROM users`,
    sql`SELECT COUNT(*) as count FROM groups`,
    sql`SELECT COUNT(*) as count FROM expenses`,
    sql`SELECT COUNT(*) as count FROM users WHERE is_premium = TRUE`,
    sql`SELECT COUNT(*) as count FROM promo_codes`,
  ]);

  return {
    totalUsers: parseInt(users.rows[0].count),
    totalGroups: parseInt(groups.rows[0].count),
    totalExpenses: parseInt(expenses.rows[0].count),
    premiumUsers: parseInt(premiumUsers.rows[0].count),
    totalPromoCodes: parseInt(promoCodes.rows[0].count),
  };
}

// ============================================
// PROMO CODE OPERATIONS
// ============================================

export async function createPromoCode(
  code: string,
  premiumDays: number,
  maxUses: number | null,
  expiresAt: Date | null,
  createdBy: string
): Promise<any> {
  const id = `promo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const result = await sql`
    INSERT INTO promo_codes (id, code, premium_days, max_uses, expires_at, created_by, created_at)
    VALUES (${id}, ${code.toUpperCase()}, ${premiumDays}, ${maxUses}, ${expiresAt ? expiresAt.toISOString() : null}, ${createdBy}, NOW())
    RETURNING *
  `;

  return result.rows[0];
}

export async function getPromoCode(code: string): Promise<any | null> {
  // Очищаем код от пробелов и приводим к верхнему регистру
  const cleanCode = code.trim().toUpperCase().replace(/\s/g, '');
  
  console.log('[getPromoCode] Looking for code:', cleanCode);
  
  const result = await sql`
    SELECT * FROM promo_codes 
    WHERE UPPER(TRIM(code)) = ${cleanCode}
    LIMIT 1
  `;

  console.log('[getPromoCode] Found:', result.rows.length > 0 ? result.rows[0].code : 'none');

  return result.rows.length > 0 ? result.rows[0] : null;
}

export async function getAllPromoCodes(): Promise<any[]> {
  const result = await sql`
    SELECT pc.*, u.first_name as creator_name
    FROM promo_codes pc
    LEFT JOIN users u ON pc.created_by = u.id
    ORDER BY pc.created_at DESC
  `;

  return result.rows;
}

export async function redeemPromoCode(userId: string, promoCodeId: string): Promise<boolean> {
  try {
    const redemptionId = `redemption_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    await sql`
      INSERT INTO promo_redemptions (id, promo_code_id, user_id, redeemed_at)
      VALUES (${redemptionId}, ${promoCodeId}, ${userId}, NOW())
    `;

    await sql`
      UPDATE promo_codes 
      SET used_count = used_count + 1 
      WHERE id = ${promoCodeId}
    `;

    return true;
  } catch (error) {
    console.error('Failed to redeem promo code:', error);
    return false;
  }
}

export async function hasUserRedeemedPromo(userId: string, promoCodeId: string): Promise<boolean> {
  const result = await sql`
    SELECT 1 FROM promo_redemptions 
    WHERE user_id = ${userId} AND promo_code_id = ${promoCodeId}
    LIMIT 1
  `;

  return result.rows.length > 0;
}

export async function deactivatePromoCode(promoCodeId: string): Promise<void> {
  await sql`
    UPDATE promo_codes 
    SET is_active = FALSE 
    WHERE id = ${promoCodeId}
  `;
}

export async function updateUserAdmin(userId: string, isAdmin: boolean): Promise<void> {
  await sql`
    UPDATE users 
    SET is_admin = ${isAdmin}
    WHERE id = ${userId}
  `;
}

export async function isUserAdmin(userId: string): Promise<boolean> {
  const result = await sql`
    SELECT is_admin FROM users 
    WHERE id = ${userId}
    LIMIT 1
  `;

  return result.rows.length > 0 && result.rows[0].is_admin === true;
}










