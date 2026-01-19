-- Initial Schema Migration for SplitWise
-- Created: 2025-11-05

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  telegram_id BIGINT UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT,
  username TEXT,
  photo_url TEXT,
  is_premium BOOLEAN DEFAULT FALSE,
  premium_until TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Index for faster telegram_id lookups
CREATE INDEX IF NOT EXISTS idx_users_telegram ON users(telegram_id);

-- Groups table
CREATE TABLE IF NOT EXISTS groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  currency TEXT DEFAULT 'USD',
  created_by TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Group members table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS group_members (
  user_id TEXT NOT NULL,
  group_id TEXT NOT NULL,
  role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, group_id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE
);

-- Index for faster group member lookups
CREATE INDEX IF NOT EXISTS idx_group_members ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_user_groups ON group_members(user_id);

-- Expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL CHECK (amount >= 0),
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
);

-- Indexes for faster expense queries
CREATE INDEX IF NOT EXISTS idx_expenses_group ON expenses(group_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_paid_by ON expenses(paid_by);

-- Comments for documentation
COMMENT ON TABLE users IS 'Telegram users who use the SplitWise app';
COMMENT ON TABLE groups IS 'Expense groups created by users';
COMMENT ON TABLE group_members IS 'Members of each group with their roles';
COMMENT ON TABLE expenses IS 'Individual expenses within groups';

COMMENT ON COLUMN expenses.split_between IS 'JSON array of user IDs who share this expense';
COMMENT ON COLUMN users.is_premium IS 'Whether user has active Premium subscription';










