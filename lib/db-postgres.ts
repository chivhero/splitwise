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

    // Expense Items table (checklist for expenses)
    await sql`
      CREATE TABLE IF NOT EXISTS expense_items (
        id TEXT PRIMARY KEY,
        expense_id TEXT NOT NULL,
        description TEXT NOT NULL,
        is_checked BOOLEAN DEFAULT FALSE,
        created_by TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE CASCADE,
        FOREIGN KEY (created_by) REFERENCES users(id)
      )
    `;

    // Expense Comments table (discussion for expenses)
    await sql`
      CREATE TABLE IF NOT EXISTS expense_comments (
        id TEXT PRIMARY KEY,
        expense_id TEXT NOT NULL,
        text TEXT NOT NULL,
        created_by TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE CASCADE,
        FOREIGN KEY (created_by) REFERENCES users(id)
      )
    `;

    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_group_members ON group_members(group_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_expenses_group ON expenses(group_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_users_telegram ON users(telegram_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON promo_codes(code)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_promo_redemptions_user ON promo_redemptions(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_expense_items_expense ON expense_items(expense_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_expense_comments_expense ON expense_comments(expense_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_expense_comments_date ON expense_comments(created_at DESC)`;

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
  date?: Date,
  splitType: 'equal' | 'custom' = 'equal',
  customSplits?: Record<string, number>
): Promise<Expense> {
  const id = `expense_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const expenseDate = date || new Date();
  
  // Validation: if custom split, customSplits must be provided
  if (splitType === 'custom' && !customSplits) {
    throw new Error('customSplits required when splitType is "custom"');
  }
  
  // Validation: all participants must have shares in customSplits
  if (splitType === 'custom' && customSplits) {
    const customSplitsKeys = new Set(Object.keys(customSplits));
    const participantsSet = new Set(splitBetween);
    
    for (const userId of splitBetween) {
      if (!customSplitsKeys.has(userId)) {
        throw new Error(`User ${userId} missing from customSplits`);
      }
      if (customSplits[userId] < 1) {
        throw new Error(`Shares must be >= 1 for user ${userId}`);
      }
    }
  }
  
  const result = await sql`
    INSERT INTO expenses (
      id, group_id, description, amount, currency, 
      paid_by, split_between, date, created_by, created_at, category,
      split_type, custom_splits
    )
    VALUES (
      ${id}, ${groupId}, ${description}, ${amount}, ${currency},
      ${paidBy}, ${JSON.stringify(splitBetween)}::jsonb, ${expenseDate.toISOString()}, 
      ${createdBy}, NOW(), ${category || null},
      ${splitType}, ${customSplits ? JSON.stringify(customSplits) : null}::jsonb
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
    splitType: row.split_type || 'equal',
    customSplits: row.custom_splits || undefined,
  };
}

export async function getGroupExpenses(groupId: string, retryCount = 0): Promise<Expense[]> {
  // Получаем COUNT и данные
  const countResult = await sql`
    SELECT COUNT(*) as cnt FROM expenses WHERE group_id = ${groupId}
  `;
  const expectedCount = parseInt(countResult.rows[0]?.cnt || '0');
  
  const result = await sql`
    SELECT * FROM expenses
    WHERE group_id = ${groupId}
    ORDER BY date DESC, created_at DESC
  `;

  console.log(`[getGroupExpenses] COUNT: ${expectedCount}, SELECT: ${result.rows.length} for group ${groupId} (retry: ${retryCount})`);

  // Если SELECT вернул меньше чем COUNT — read replica lag
  if (result.rows.length < expectedCount && retryCount < 3) {
    console.log(`[getGroupExpenses] Read replica lag detected! Waiting 300ms and retrying...`);
    await new Promise(resolve => setTimeout(resolve, 300));
    return getGroupExpenses(groupId, retryCount + 1);
  }

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
    splitType: row.split_type || 'equal',
    customSplits: row.custom_splits || undefined,
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
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [
    users,
    realUsers,
    fakeUsers,
    activeUsers,
    premiumUsers,
    premiumExpiring,
    weeklyNewUsers,
    monthlyNewUsers,
    groups,
    activeGroups,
    expenses,
    customSplitExpenses,
    totalVolume,
    todayExpenses,
    weeklyExpenses,
    promoCodes,
    activePromoCodes,
  ] = await Promise.all([
    // User metrics
    sql`SELECT COUNT(*) as count FROM users`,
    sql`SELECT COUNT(*) as count FROM users WHERE telegram_id IS NOT NULL`,
    sql`SELECT COUNT(*) as count FROM users WHERE telegram_id IS NULL`,
    sql`
      SELECT COUNT(DISTINCT u.id) as count 
      FROM users u
      INNER JOIN expenses e ON u.id = e.created_by
      WHERE e.created_at >= ${sevenDaysAgo.toISOString()}
    `,
    sql`SELECT COUNT(*) as count FROM users WHERE is_premium = TRUE`,
    sql`
      SELECT COUNT(*) as count FROM users 
      WHERE is_premium = TRUE 
      AND premium_until IS NOT NULL 
      AND premium_until <= ${sevenDaysLater.toISOString()}
      AND premium_until > NOW()
    `,
    sql`SELECT COUNT(*) as count FROM users WHERE created_at >= ${sevenDaysAgo.toISOString()}`,
    sql`SELECT COUNT(*) as count FROM users WHERE created_at >= ${thirtyDaysAgo.toISOString()}`,
    
    // Group metrics
    sql`SELECT COUNT(*) as count FROM groups`,
    sql`
      SELECT COUNT(DISTINCT group_id) as count
      FROM expenses
      WHERE created_at >= ${thirtyDaysAgo.toISOString()}
    `,
    
    // Expense metrics
    sql`SELECT COUNT(*) as count FROM expenses`,
    sql`SELECT COUNT(*) as count FROM expenses WHERE split_type = 'custom'`,
    sql`SELECT COALESCE(SUM(amount), 0) as total FROM expenses`,
    sql`SELECT COUNT(*) as count FROM expenses WHERE created_at >= ${todayStart.toISOString()}`,
    sql`SELECT COUNT(*) as count FROM expenses WHERE created_at >= ${sevenDaysAgo.toISOString()}`,
    
    // Promo codes
    sql`SELECT COUNT(*) as count FROM promo_codes`,
    sql`SELECT COUNT(*) as count FROM promo_codes WHERE is_active = TRUE`,
  ]);

  const totalUsers = parseInt(users.rows[0].count);
  const totalGroups = parseInt(groups.rows[0].count);
  const activeGroupsCount = parseInt(activeGroups.rows[0].count);

  return {
    // User metrics
    totalUsers,
    realUsers: parseInt(realUsers.rows[0].count),
    fakeUsers: parseInt(fakeUsers.rows[0].count),
    activeUsers: parseInt(activeUsers.rows[0].count),
    premiumUsers: parseInt(premiumUsers.rows[0].count),
    premiumExpiring: parseInt(premiumExpiring.rows[0].count),
    weeklyNewUsers: parseInt(weeklyNewUsers.rows[0].count),
    monthlyNewUsers: parseInt(monthlyNewUsers.rows[0].count),
    
    // Group metrics
    totalGroups,
    activeGroups: activeGroupsCount,
    inactiveGroups: totalGroups - activeGroupsCount,
    
    // Expense metrics
    totalExpenses: parseInt(expenses.rows[0].count),
    customSplitExpenses: parseInt(customSplitExpenses.rows[0].count),
    totalVolume: parseFloat(totalVolume.rows[0].total || '0'),
    todayExpenses: parseInt(todayExpenses.rows[0].count),
    weeklyExpenses: parseInt(weeklyExpenses.rows[0].count),
    
    // Promo codes
    totalPromoCodes: parseInt(promoCodes.rows[0].count),
    activePromoCodes: parseInt(activePromoCodes.rows[0].count),
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

// ============================================
// EXPENSE ITEMS OPERATIONS (Checklist)
// ============================================

export async function createExpenseItem(
  expenseId: string,
  description: string,
  createdBy: string
): Promise<any> {
  const id = `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const result = await sql`
    INSERT INTO expense_items (id, expense_id, description, is_checked, created_by, created_at)
    VALUES (${id}, ${expenseId}, ${description}, FALSE, ${createdBy}, NOW())
    RETURNING *
  `;

  const row = result.rows[0];
  return {
    id: row.id,
    expenseId: row.expense_id,
    description: row.description,
    isChecked: row.is_checked,
    createdBy: row.created_by,
    createdAt: new Date(row.created_at),
  };
}

export async function getExpenseItems(expenseId: string): Promise<any[]> {
  const result = await sql`
    SELECT 
      ei.*,
      u.id as creator_id,
      u.first_name as creator_first_name,
      u.last_name as creator_last_name
    FROM expense_items ei
    LEFT JOIN users u ON ei.created_by = u.id
    WHERE ei.expense_id = ${expenseId}
    ORDER BY ei.created_at ASC
  `;

  return result.rows.map(row => ({
    id: row.id,
    expenseId: row.expense_id,
    description: row.description,
    isChecked: row.is_checked,
    createdBy: row.created_by,
    createdAt: new Date(row.created_at),
    createdByUser: row.creator_id ? {
      id: row.creator_id,
      firstName: row.creator_first_name,
      lastName: row.creator_last_name,
    } : undefined,
  }));
}

export async function toggleExpenseItem(itemId: string, isChecked: boolean): Promise<void> {
  await sql`
    UPDATE expense_items 
    SET is_checked = ${isChecked}
    WHERE id = ${itemId}
  `;
}

export async function deleteExpenseItem(itemId: string): Promise<void> {
  await sql`
    DELETE FROM expense_items WHERE id = ${itemId}
  `;
}

// ============================================
// EXPENSE COMMENTS OPERATIONS
// ============================================

export async function createExpenseComment(
  expenseId: string,
  text: string,
  createdBy: string
): Promise<any> {
  const id = `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const result = await sql`
    INSERT INTO expense_comments (id, expense_id, text, created_by, created_at)
    VALUES (${id}, ${expenseId}, ${text}, ${createdBy}, NOW())
    RETURNING *
  `;

  const row = result.rows[0];
  return {
    id: row.id,
    expenseId: row.expense_id,
    text: row.text,
    createdBy: row.created_by,
    createdAt: new Date(row.created_at),
  };
}

export async function getExpenseComments(expenseId: string): Promise<any[]> {
  const result = await sql`
    SELECT 
      ec.*,
      u.id as creator_id,
      u.telegram_id as creator_telegram_id,
      u.first_name as creator_first_name,
      u.last_name as creator_last_name,
      u.username as creator_username,
      u.photo_url as creator_photo_url
    FROM expense_comments ec
    LEFT JOIN users u ON ec.created_by = u.id
    WHERE ec.expense_id = ${expenseId}
    ORDER BY ec.created_at ASC
  `;

  return result.rows.map(row => ({
    id: row.id,
    expenseId: row.expense_id,
    text: row.text,
    createdBy: row.created_by,
    createdAt: new Date(row.created_at),
    createdByUser: row.creator_id ? {
      id: row.creator_id,
      telegramId: row.creator_telegram_id,
      firstName: row.creator_first_name,
      lastName: row.creator_last_name,
      username: row.creator_username,
      photoUrl: row.creator_photo_url,
    } : undefined,
  }));
}

export async function deleteExpenseComment(commentId: string): Promise<void> {
  await sql`
    DELETE FROM expense_comments WHERE id = ${commentId}
  `;
}

// ============================================
// REMINDER SYSTEM
// ============================================

export interface ReminderUser {
  telegramId: number;
  firstName: string;
  username?: string;
  locale?: string;
  activeGroupsCount: number;
  lastExpenseAt?: Date;
}

/**
 * Returns users eligible for weekly Friday reminders:
 * - Must have a Telegram ID (can receive messages)
 * - Must be a member of at least one group
 * - No activity filter (sends to all users, not just active ones)
 */
export async function getActiveUsersForReminder(): Promise<ReminderUser[]> {
  const result = await sql`
    SELECT
      u.telegram_id,
      u.first_name,
      u.username,
      COUNT(DISTINCT gm.group_id)              AS active_groups_count,
      MAX(e.created_at)                        AS last_expense_at
    FROM users u
    INNER JOIN group_members gm ON u.id = gm.user_id
    LEFT JOIN expenses e ON e.group_id = gm.group_id
    WHERE u.telegram_id IS NOT NULL
    GROUP BY u.telegram_id, u.first_name, u.username
    ORDER BY last_expense_at DESC NULLS LAST
  `;

  return result.rows.map(row => ({
    telegramId: Number(row.telegram_id),
    firstName: row.first_name,
    username: row.username ?? undefined,
    activeGroupsCount: Number(row.active_groups_count),
    lastExpenseAt: row.last_expense_at ? new Date(row.last_expense_at) : undefined,
  }));
}










