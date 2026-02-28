#!/usr/bin/env node
/**
 * Migration runner for 005_custom_split.sql
 * Adds split_type and custom_splits columns to expenses table
 */

const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const { sql } = require('@vercel/postgres');

async function runMigration() {
  try {
    console.log('🚀 Running migration 005_custom_split.sql...\n');

    console.log('📝 Adding split_type column...');
    await sql`
      ALTER TABLE expenses 
      ADD COLUMN IF NOT EXISTS split_type TEXT NOT NULL DEFAULT 'equal'
    `;
    console.log('✅ split_type column added');

    console.log('📝 Adding custom_splits column...');
    await sql`
      ALTER TABLE expenses 
      ADD COLUMN IF NOT EXISTS custom_splits JSONB DEFAULT NULL
    `;
    console.log('✅ custom_splits column added');

    console.log('📝 Adding check constraints...');
    
    // Check if constraint already exists
    const constraintCheck = await sql`
      SELECT constraint_name 
      FROM information_schema.table_constraints 
      WHERE table_name = 'expenses' 
      AND constraint_name = 'check_split_type'
    `;
    
    if (constraintCheck.rows.length === 0) {
      await sql`
        ALTER TABLE expenses 
        ADD CONSTRAINT check_split_type 
        CHECK (split_type IN ('equal', 'custom'))
      `;
      console.log('✅ check_split_type constraint added');
    } else {
      console.log('ℹ️  check_split_type constraint already exists');
    }
    
    const constraintCheck2 = await sql`
      SELECT constraint_name 
      FROM information_schema.table_constraints 
      WHERE table_name = 'expenses' 
      AND constraint_name = 'check_custom_splits_data'
    `;
    
    if (constraintCheck2.rows.length === 0) {
      await sql`
        ALTER TABLE expenses 
        ADD CONSTRAINT check_custom_splits_data 
        CHECK (
          (split_type = 'equal') OR 
          (split_type = 'custom' AND custom_splits IS NOT NULL)
        )
      `;
      console.log('✅ check_custom_splits_data constraint added');
    } else {
      console.log('ℹ️  check_custom_splits_data constraint already exists');
    }

    console.log('📝 Creating index...');
    await sql`
      CREATE INDEX IF NOT EXISTS idx_expenses_split_type ON expenses(split_type)
    `;
    console.log('✅ Index created');

    console.log('\n🎉 Migration 005 completed successfully!');
    
    // Verify columns exist
    const columnsCheck = await sql`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns 
      WHERE table_name = 'expenses' 
      AND column_name IN ('split_type', 'custom_splits')
      ORDER BY ordinal_position
    `;
    
    console.log('\n📊 Verified columns:');
    columnsCheck.rows.forEach(col => {
      console.log(`   ${col.column_name}: ${col.data_type} (default: ${col.column_default || 'NULL'})`);
    });

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

runMigration();
