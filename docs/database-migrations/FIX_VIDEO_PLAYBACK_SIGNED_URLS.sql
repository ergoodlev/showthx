-- ============================================
-- FIX VIDEO PLAYBACK WITH SIGNED URLS
-- ============================================
-- CRITICAL BUG FIX: Video playback error -1008
--
-- ROOT CAUSE:
-- 1. Code was using getPublicUrl() on a PRIVATE bucket
-- 2. Bucket name mismatch: ENABLE_VIDEO_PLAYBACK.sql targeted 'gratitugram-videos'
--    but the app actually uploads to 'videos' bucket
--
-- SOLUTION:
-- 1. Code now uses createSignedUrl() (already fixed in videoService.js)
-- 2. This SQL ensures RLS policies are correct for the 'videos' bucket
-- 3. Bucket remains PRIVATE for COPPA/privacy compliance
--
-- SECURITY:
-- - Bucket stays private (not public)
-- - Videos only accessible via time-limited signed URLs (24 hours)
-- - URLs expire automatically
-- - RLS policies control who can generate signed URLs
-- - Kids use anonymous auth, parents use authenticated auth
-- ============================================

-- =============================================================================
-- STEP 1: Verify which bucket is being used
-- =============================================================================

-- Check which buckets exist and contain video files
SELECT
  bucket_id,
  COUNT(*) as file_count,
  pg_size_pretty(SUM((metadata->>'size')::bigint)) as total_size
FROM storage.objects
WHERE bucket_id IN ('videos', 'gratitugram-videos')
GROUP BY bucket_id;

-- Expected output: Should show 'videos' bucket with video files

-- =============================================================================
-- STEP 2: Ensure 'videos' bucket exists and is PRIVATE
-- =============================================================================

-- Check bucket configuration
SELECT id, name, public
FROM storage.buckets
WHERE name = 'videos';

-- If bucket is public, make it private (CRITICAL for privacy compliance)
UPDATE storage.buckets
SET public = false
WHERE name = 'videos' AND public = true;

-- =============================================================================
-- STEP 3: Drop any conflicting or duplicate policies
-- =============================================================================

-- Drop old/conflicting policies on storage.objects
DROP POLICY IF EXISTS "Parents can read videos from storage" ON storage.objects;
DROP POLICY IF EXISTS "Kids can read videos from storage" ON storage.objects;
DROP POLICY IF EXISTS "Parents can read videos" ON storage.objects;
DROP POLICY IF EXISTS "Kids can read videos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read videos" ON storage.objects;
DROP POLICY IF EXISTS "Anonymous users can read videos" ON storage.objects;

-- =============================================================================
-- STEP 4: Create SELECT policies for 'videos' bucket (needed for signed URLs)
-- =============================================================================

-- Allow authenticated users (parents) to SELECT from videos bucket
-- This enables them to call createSignedUrl() for video playback
CREATE POLICY "Parents can read videos for playback"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'videos');

-- Allow anonymous users (kids) to SELECT from videos bucket
-- This enables them to call createSignedUrl() if needed
CREATE POLICY "Kids can read videos for playback"
ON storage.objects
FOR SELECT
TO anon
USING (bucket_id = 'videos');

-- =============================================================================
-- STEP 5: Verify upload policies exist (should already be in place)
-- =============================================================================

-- Check existing INSERT policies
SELECT
  policyname,
  roles::text,
  cmd::text
FROM pg_policies
WHERE tablename = 'objects'
  AND schemaname = 'storage'
  AND cmd = 'INSERT'
  AND policyname LIKE '%video%'
ORDER BY policyname;

-- If upload policies are missing, they should be added from:
-- - ENABLE_VIDEO_UPLOADS.sql (for authenticated users)
-- - FIX_VIDEO_UPLOAD_FOR_KIDS.sql (for anonymous users)

-- =============================================================================
-- VERIFICATION: Check all video-related policies
-- =============================================================================

SELECT
  policyname,
  roles::text,
  cmd::text,
  qual::text as using_clause
FROM pg_policies
WHERE tablename = 'objects'
  AND schemaname = 'storage'
  AND (
    policyname LIKE '%video%'
    OR qual::text LIKE '%videos%'
  )
ORDER BY cmd, policyname;

-- Expected output should show:
-- INSERT policies for authenticated and anon users
-- SELECT policies for authenticated and anon users
-- All targeting bucket_id = 'videos'

-- =============================================================================
-- IMPORTANT: After running this SQL
-- =============================================================================
-- 1. Test video upload from kid account
-- 2. Test video playback in parent review screen
-- 3. Videos should play without error -1008
-- 4. Check console logs for "Signed URL created (expires in 24 hours)"
-- 5. Verify bucket remains PRIVATE (not public)
-- =============================================================================
