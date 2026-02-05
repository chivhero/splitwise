#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });
const { sql } = require('@vercel/postgres');

async function checkDB() {
  try {
    console.log('🔍 Checking database...\n');

    const users = await sql`SELECT COUNT(*) as count FROM users`;
    const groups = await sql`SELECT COUNT(*) as count FROM groups`;
    const expenses = await sql`SELECT COUNT(*) as count FROM expenses`;
    const items = await sql`SELECT COUNT(*) as count FROM expense_items`;
    const comments = await sql`SELECT COUNT(*) as count FROM expense_comments`;

    console.log('📊 Database statistics:');
    console.log(`   Users: ${users.rows[0].count}`);
    console.log(`   Groups: ${groups.rows[0].count}`);
    console.log(`   Expenses: ${expenses.rows[0].count}`);
    console.log(`   Expense Items: ${items.rows[0].count}`);
    console.log(`   Expense Comments: ${comments.rows[0].count}`);

    if (expenses.rows[0].count > 0) {
      console.log('\n📝 Recent expenses:');
      const recentExpenses = await sql`
        SELECT id, description, amount, currency, created_at 
        FROM expenses 
        ORDER BY created_at DESC 
        LIMIT 5
      `;
      recentExpenses.rows.forEach(exp => {
        console.log(`   - ${exp.description}: ${exp.amount} ${exp.currency} (${exp.created_at.toISOString().split('T')[0]})`);
      });
    } else {
      console.log('\n⚠️  No expenses found in database');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkDB();
