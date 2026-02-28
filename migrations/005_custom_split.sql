-- Migration: Add custom split feature
-- Author: Custom Split Feature Implementation
-- Date: 2026-01-24
-- Purpose: Allow uneven expense splitting by specifying shares/portions for each participant

-- Add split_type column (equal or custom)
ALTER TABLE expenses 
ADD COLUMN split_type TEXT NOT NULL DEFAULT 'equal';

-- Add custom_splits column (stores shares for each user when split_type = 'custom')
-- Format: {"user_id_123": 2, "user_id_456": 1} 
-- Meaning: user_123 gets 2 shares, user_456 gets 1 share
ALTER TABLE expenses 
ADD COLUMN custom_splits JSONB DEFAULT NULL;

-- Add check constraint: split_type must be 'equal' or 'custom'
ALTER TABLE expenses 
ADD CONSTRAINT check_split_type 
CHECK (split_type IN ('equal', 'custom'));

-- Add check constraint: if custom, custom_splits must not be null
ALTER TABLE expenses 
ADD CONSTRAINT check_custom_splits_data 
CHECK (
  (split_type = 'equal') OR 
  (split_type = 'custom' AND custom_splits IS NOT NULL)
);

-- Create index for faster filtering by split type
CREATE INDEX IF NOT EXISTS idx_expenses_split_type ON expenses(split_type);

-- Verification
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'expenses' 
    AND column_name IN ('split_type', 'custom_splits')
  ) THEN
    RAISE NOTICE '✅ Successfully added split_type and custom_splits columns to expenses table';
  ELSE
    RAISE EXCEPTION '❌ Failed to add columns';
  END IF;
END $$;
