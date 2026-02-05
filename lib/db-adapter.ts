/**
 * Database Adapter
 * 
 * Автоматически переключается между SQLite (dev) и PostgreSQL (prod)
 * на основе переменной окружения USE_SQLITE или DATABASE_URL
 */

const useSQLite = process.env.USE_SQLITE === 'true' || (!process.env.DATABASE_URL && !process.env.POSTGRES_URL);

console.log(`📊 Database mode: ${useSQLite ? 'SQLite (Development)' : 'PostgreSQL (Production)'}`);

// Динамический импорт правильной версии БД
let db;

if (useSQLite) {
  // Development: используем SQLite
  db = require('./db');
  console.log('✅ Using SQLite database');
} else {
  // Production: используем PostgreSQL
  db = require('./db-postgres');
  console.log('✅ Using PostgreSQL database');
}

// Re-export всех функций
export const {
  initDB,
  createUser,
  createUserByName,
  getUserByTelegramId,
  getUserById,
  updateUserPremium,
  createGroup,
  addGroupMember,
  checkGroupMembership,
  getUserGroups,
  getGroupById,
  getGroupMembers,
  createExpense,
  getGroupExpenses,
  deleteExpense,
} = db;

// Export дополнительных функций если они есть
export const healthCheck = db.healthCheck;
export const getStats = db.getStats;
export const getPromoCode = db.getPromoCode;
export const getAllPromoCodes = db.getAllPromoCodes;
export const createPromoCode = db.createPromoCode;
export const deactivatePromoCode = db.deactivatePromoCode;
export const redeemPromoCode = db.redeemPromoCode;
export const hasUserRedeemedPromo = db.hasUserRedeemedPromo;
export const isUserAdmin = db.isUserAdmin;

// Expense Items (Checklist)
export const createExpenseItem = db.createExpenseItem;
export const getExpenseItems = db.getExpenseItems;
export const toggleExpenseItem = db.toggleExpenseItem;
export const deleteExpenseItem = db.deleteExpenseItem;

// Expense Comments
export const createExpenseComment = db.createExpenseComment;
export const getExpenseComments = db.getExpenseComments;
export const deleteExpenseComment = db.deleteExpenseComment;

export default db.default || db;










