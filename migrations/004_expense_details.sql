-- Migration: Add expense items and comments tables
-- Author: @V_day0 (https://x.com/V_day0)
-- Date: 2026-01-24
-- Purpose: Enable detailed expense tracking with checklist items and comments

-- Expense Items table (checklist for each expense)
CREATE TABLE IF NOT EXISTS expense_items (
  id TEXT PRIMARY KEY,
  expense_id TEXT NOT NULL,
  description TEXT NOT NULL,
  is_checked BOOLEAN DEFAULT FALSE,
  created_by TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Expense Comments table (discussion thread for each expense)
CREATE TABLE IF NOT EXISTS expense_comments (
  id TEXT PRIMARY KEY,
  expense_id TEXT NOT NULL,
  text TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_expense_items_expense ON expense_items(expense_id);
CREATE INDEX IF NOT EXISTS idx_expense_comments_expense ON expense_comments(expense_id);
CREATE INDEX IF NOT EXISTS idx_expense_comments_date ON expense_comments(created_at DESC);

-- Verification
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name IN ('expense_items', 'expense_comments')
  ) THEN
    RAISE NOTICE '✅ Successfully created expense_items and expense_comments tables';
  ELSE
    RAISE EXCEPTION '❌ Failed to create tables';
  END IF;
END $$;
