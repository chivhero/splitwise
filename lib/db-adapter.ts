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
  getUserByTelegramId,
  getUserById,
  updateUserPremium,
  createGroup,
  addGroupMember,
  getUserGroups,
  getGroupById,
  getGroupMembers,
  createExpense,
  getGroupExpenses,
  deleteExpense,
  logAdminAction,
  getAuditLog,
  createPromoCode,
  getPromoCode,
  usePromoCode,
  getAllPromoCodes,
} = db;

// Export дополнительных функций если они есть
export const healthCheck = db.healthCheck;
export const getStats = db.getStats;

// Export типов
export type { AuditLogEntry, PromoCode } from './db-postgres';

export default db.default || db;










