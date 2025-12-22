-- ============================================
-- FIX VIDEO URL LENGTH LIMIT
-- ============================================
-- CRITICAL BUG FIX: Signed URLs too long for database column
--
-- ERROR:
-- code: 22001
-- message: value too long for type character varying(500)
--
-- ROOT CAUSE:
-- Signed URLs are 400-600 characters long (includes token parameter)
-- Database column video_url is limited to VARCHAR(500)
-- Signed URL example length: 516 characters
--
-- SOLUTION:
-- Increase video_url column to VARCHAR(1000) to accommodate signed URLs
--
-- SECURITY NOTE:
-- This is safe - just increasing storage capacity for longer URLs
-- ============================================

-- =============================================================================
-- STEP 1: Increase video_url column length in videos table
-- =============================================================================

ALTER TABLE public.videos
ALTER COLUMN video_url TYPE VARCHAR(1000);

-- =============================================================================
-- STEP 2: Add storage_path column if it doesn't exist (for URL regeneration)
-- =============================================================================

ALTER TABLE public.videos
ADD COLUMN IF NOT EXISTS storage_path TEXT;

-- =============================================================================
-- STEP 3: Populate storage_path for existing videos with public URLs
-- =============================================================================

-- Extract storage path from public URLs
-- Public URL format: https://.../storage/v1/object/public/videos/PATH
-- We need to extract just the PATH part after "/public/videos/"

UPDATE public.videos
SET storage_path =
  CASE
    WHEN video_url LIKE '%/public/videos/%' THEN
      SUBSTRING(video_url FROM '/public/videos/(.*)$')
    WHEN video_url LIKE '%/sign/videos/%' THEN
      -- For signed URLs, extract path before the ?token= part
      SUBSTRING(
        SUBSTRING(video_url FROM '/sign/videos/([^?]*)')
        FROM '^([^?]*)'
      )
    ELSE NULL
  END
WHERE storage_path IS NULL AND video_url IS NOT NULL;

-- =============================================================================
-- VERIFICATION
-- =============================================================================

-- Check column data type
SELECT
  column_name,
  data_type,
  character_maximum_length
FROM information_schema.columns
WHERE table_name = 'videos'
  AND column_name IN ('video_url', 'storage_path');

-- Expected output:
-- video_url    | character varying | 1000
-- storage_path | text              | NULL (unlimited)

-- Check if storage paths were populated
SELECT
  COUNT(*) as total_videos,
  COUNT(storage_path) as videos_with_path,
  COUNT(*) - COUNT(storage_path) as videos_without_path
FROM public.videos;

-- Sample check: Show first few videos with their URLs and extracted paths
SELECT
  id,
  LEFT(video_url, 80) as url_preview,
  storage_path
FROM public.videos
ORDER BY created_at DESC
LIMIT 5;

-- =============================================================================
-- IMPORTANT: After running this SQL
-- =============================================================================
-- 1. Test video submission - should work now with signed URLs
-- 2. Test video playback - old videos should now regenerate signed URLs
-- 3. storage_path will be populated for all existing videos
-- 4. New videos will automatically store storage_path via submit_video_from_kid
-- =============================================================================
