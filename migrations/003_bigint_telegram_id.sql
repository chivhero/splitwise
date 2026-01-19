-- Migration: Change telegram_id from INTEGER to BIGINT
-- Author: @V_day0 (https://x.com/V_day0)
-- Reason: Telegram user IDs exceed INTEGER max value (2,147,483,647)
-- Security: HIGH - fixes data integrity issues with large Telegram IDs
-- Date: 2026-01-13

-- Change telegram_id type from INTEGER to BIGINT
ALTER TABLE users ALTER COLUMN telegram_id TYPE BIGINT;

-- Update comment
COMMENT ON COLUMN users.telegram_id IS 'Telegram ID (BIGINT - supports IDs > 2.1B, optional for name-only users)';

-- Verify the change
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'users' 
    AND column_name = 'telegram_id' 
    AND data_type = 'bigint'
  ) THEN
    RAISE NOTICE '✅ Successfully changed telegram_id to BIGINT';
  ELSE
    RAISE EXCEPTION '❌ Failed to change telegram_id to BIGINT';
  END IF;
END $$;
