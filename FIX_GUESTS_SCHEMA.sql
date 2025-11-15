-- ============================================
-- CRITICAL FIX: Guests Table Schema Error
-- ============================================
-- Error: "null value in column \"video_id\" of relation \"guests\" violates not-null constraint"
--
-- Problem: The guests table has a NOT NULL video_id column
-- Guests are CONTACTS (emails), not videos
-- Guests should NOT have a video_id requirement
--
-- Solution: Remove the video_id column from guests table
-- ============================================

-- Drop the constraint if it exists
ALTER TABLE public.guests DROP COLUMN IF EXISTS video_id CASCADE;

-- Verify the guests table structure (should have: id, parent_id, name, email, created_at, updated_at)
-- SELECT column_name, is_nullable FROM information_schema.columns
-- WHERE table_name = 'guests' ORDER BY ordinal_position;
