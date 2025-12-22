-- Add Missing Columns to frame_templates Table
-- Run this BEFORE running frame_templates_schema.sql
-- This fixes the "column is_public does not exist" error

-- Add is_public column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'frame_templates'
        AND column_name = 'is_public'
    ) THEN
        ALTER TABLE frame_templates ADD COLUMN is_public BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Added is_public column';
    ELSE
        RAISE NOTICE 'is_public column already exists';
    END IF;
END $$;

-- Verify all expected columns exist
SELECT
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'frame_templates'
ORDER BY ordinal_position;
