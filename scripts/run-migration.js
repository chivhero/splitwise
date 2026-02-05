#!/usr/bin/env node
/**
 * Quick migration runner using Node.js
 */

const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const { sql } = require('@vercel/postgres');

async function runMigration() {
  try {
    console.log('🚀 Running migration 004_expense_details.sql...\n');

    const migrationPath = path.join(__dirname, '../migrations/004_expense_details.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    // Remove the DO $$ block as it's PostgreSQL specific and might cause issues
    const cleanSQL = migrationSQL
      .split('\n')
      .filter(line => !line.includes('DO $$') && !line.includes('END $$;') && !line.includes('RAISE'))
      .join('\n');

    // Execute migration
    console.log('📝 Creating expense_items table...');
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
    console.log('✅ expense_items table created');

    console.log('📝 Creating expense_comments table...');
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
    console.log('✅ expense_comments table created');

    console.log('📝 Creating indexes...');
    await sql`CREATE INDEX IF NOT EXISTS idx_expense_items_expense ON expense_items(expense_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_expense_comments_expense ON expense_comments(expense_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_expense_comments_date ON expense_comments(created_at DESC)`;
    console.log('✅ Indexes created');

    console.log('\n🎉 Migration completed successfully!');
    
    // Show table info
    const itemsCount = await sql`SELECT COUNT(*) as count FROM expense_items`;
    const commentsCount = await sql`SELECT COUNT(*) as count FROM expense_comments`;
    
    console.log('\n📊 New tables:');
    console.log(`   expense_items: ${itemsCount.rows[0].count} rows`);
    console.log(`   expense_comments: ${commentsCount.rows[0].count} rows`);

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

runMigration();
