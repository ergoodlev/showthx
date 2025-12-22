-- ============================================
-- ENABLE VIDEO PLAYBACK FOR SHOWTHX
-- ============================================
-- Fixes error -1008 (NSURLErrorResourceUnavailable)
-- when trying to play videos in ParentVideoReviewScreen
-- ============================================
--
-- PROBLEM:
-- Videos upload successfully but playback fails with:
-- "The AVPlayerItem instance has failed with the error code -1008"
--
-- ROOT CAUSE:
-- Storage bucket has INSERT policy for uploads but NO SELECT policy for downloads.
-- Parents (authenticated users) cannot read video files from storage.
--
-- CRITICAL FIX (2025-12-12):
-- The bucket name is 'gratitugram-videos', NOT 'videos'!
-- Previous policies were created for wrong bucket name.
--
-- SOLUTION:
-- Add SELECT policies allowing authenticated users and anonymous users
-- to read videos from the 'gratitugram-videos' storage bucket.
-- ============================================

-- =============================================================================
-- STEP 1: Allow authenticated users (parents) to read videos
-- =============================================================================

DROP POLICY IF EXISTS "Parents can read videos from storage" ON storage.objects;

CREATE POLICY "Parents can read videos from storage"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'gratitugram-videos');

-- =============================================================================
-- STEP 2: Allow anonymous users (kids) to read videos (for future features)
-- =============================================================================

DROP POLICY IF EXISTS "Kids can read videos from storage" ON storage.objects;

CREATE POLICY "Kids can read videos from storage"
ON storage.objects
FOR SELECT
TO anon
USING (bucket_id = 'gratitugram-videos');

-- =============================================================================
-- ALTERNATIVE: Make bucket public (simpler but less secure)
-- =============================================================================
-- If RLS policies don't work, you can make the bucket public:
-- 1. Go to Supabase Dashboard → Storage → videos bucket
-- 2. Click "..." menu → "Make Public"
-- 3. This bypasses RLS and allows anyone with the URL to access videos

-- =============================================================================
-- VERIFICATION
-- =============================================================================

-- Check SELECT policies exist:
SELECT
  policyname,
  roles::text,
  cmd::text,
  qual::text as using_clause
FROM pg_policies
WHERE tablename = 'objects'
  AND schemaname = 'storage'
  AND cmd = 'SELECT'
  AND policyname LIKE '%videos%'
ORDER BY policyname;

-- Expected output:
-- | policyname                          | roles          | cmd    |
-- |-------------------------------------|----------------|--------|
-- | Parents can read videos from storage| {authenticated}| SELECT |
-- | Kids can read videos from storage   | {anon}         | SELECT |

-- =============================================================================
-- TESTING
-- =============================================================================
-- After running this SQL:
-- 1. Parent login → Dashboard → Videos tab → Click pending video
-- 2. Video should play without error -1008
-- 3. Frame overlay should render if frame was assigned to event
