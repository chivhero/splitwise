#!/usr/bin/env ts-node
/**
 * Database Migration Script
 * 
 * Runs all pending migrations in the migrations/ directory
 * Usage: npm run migrate
 */

import { sql } from '@vercel/postgres';
import * as fs from 'fs';
import * as path from 'path';

const MIGRATIONS_DIR = path.join(process.cwd(), 'migrations');

async function runMigrations() {
  try {
    console.log('🚀 Starting database migrations...\n');

    // Create migrations tracking table
    await sql`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        version TEXT UNIQUE NOT NULL,
        applied_at TIMESTAMP DEFAULT NOW()
      )
    `;

    console.log('✅ Migrations table ready');

    // Get applied migrations
    const applied = await sql`
      SELECT version FROM schema_migrations ORDER BY version
    `;
    const appliedVersions = new Set(applied.rows.map(row => row.version));

    // Get migration files
    const files = fs.readdirSync(MIGRATIONS_DIR)
      .filter(f => f.endsWith('.sql'))
      .sort();

    console.log(`\n📂 Found ${files.length} migration file(s)`);

    let applied_count = 0;

    for (const file of files) {
      const version = file.replace('.sql', '');

      if (appliedVersions.has(version)) {
        console.log(`⏭️  Skipping ${file} (already applied)`);
        continue;
      }

      console.log(`\n📝 Applying migration: ${file}`);

      const filePath = path.join(MIGRATIONS_DIR, file);
      const sqlContent = fs.readFileSync(filePath, 'utf-8');

      // Execute migration
      await sql.query(sqlContent);

      // Record migration
      await sql`
        INSERT INTO schema_migrations (version) VALUES (${version})
      `;

      console.log(`✅ Applied ${file}`);
      applied_count++;
    }

    console.log(`\n🎉 Migration complete! Applied ${applied_count} new migration(s)`);
    
    // Show database stats
    const stats = await sql`
      SELECT 
        (SELECT COUNT(*) FROM users) as users,
        (SELECT COUNT(*) FROM groups) as groups,
        (SELECT COUNT(*) FROM expenses) as expenses
    `;
    
    console.log('\n📊 Database stats:');
    console.log(`   Users: ${stats.rows[0].users}`);
    console.log(`   Groups: ${stats.rows[0].groups}`);
    console.log(`   Expenses: ${stats.rows[0].expenses}`);

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migrations
runMigrations()
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });










