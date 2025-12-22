-- ============================================
-- FIX: Add recorded_at column to gifts table
-- ============================================
-- Error: column "recorded_at" of relation "gifts" does not exist
-- This migration adds the missing column
-- ============================================

-- Add recorded_at column to gifts table
ALTER TABLE gifts
ADD COLUMN IF NOT EXISTS recorded_at TIMESTAMPTZ;

-- Set recorded_at to created_at for existing records
UPDATE gifts
SET recorded_at = created_at
WHERE recorded_at IS NULL;

-- Verification
SELECT 'Column recorded_at added to gifts table' AS status;

-- Show updated schema
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'gifts'
AND column_name IN ('created_at', 'recorded_at', 'status');
