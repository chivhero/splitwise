-- Migration: Make telegram_id optional for users
-- Created: 2025-01-08
-- Reason: Allow adding group members by name only, without Telegram account

-- Drop the NOT NULL constraint from telegram_id
ALTER TABLE users ALTER COLUMN telegram_id DROP NOT NULL;

-- Drop the unique index and recreate it as partial index (only for non-null values)
DROP INDEX IF EXISTS idx_users_telegram;
CREATE UNIQUE INDEX idx_users_telegram ON users(telegram_id) WHERE telegram_id IS NOT NULL;

-- Add comment
COMMENT ON COLUMN users.telegram_id IS 'Telegram ID (optional - users can be added by name only)';
