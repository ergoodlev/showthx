-- ============================================
-- FIX: Allow Kids (anon role) to Upload Videos
-- ============================================
-- Problem: Kids use access codes (not Supabase auth), so they're 'anon' role
-- Current RLS only allows 'authenticated' to upload videos
-- Kids can't upload, causing "videos STILL not saving" issue
--
-- Solution: Add RLS policy to allow anon uploads to videos bucket
-- ============================================

-- =============================================================================
-- STEP 1: Allow anonymous (kids) to upload videos
-- =============================================================================

-- Drop if exists
DROP POLICY IF EXISTS "Anonymous users can upload videos" ON storage.objects;

-- Allow anon to INSERT videos
CREATE POLICY "Anonymous users can upload videos"
ON storage.objects
FOR INSERT
TO anon
WITH CHECK (
  bucket_id = 'videos'
);

-- =============================================================================
-- STEP 2: Verify the submit_video_from_kid function exists
-- =============================================================================

-- This function was created in FIX_VIDEO_RLS_FOR_KIDS.sql
-- It validates child/gift ownership and creates the video record
-- Make sure it's been run! Query to check:
-- SELECT proname FROM pg_proc WHERE proname = 'submit_video_from_kid';

-- =============================================================================
-- STEP 3: Ensure videos table has correct RLS policies
-- =============================================================================

-- Enable RLS on videos table
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

-- Drop existing video policies
DROP POLICY IF EXISTS "Parents can view their videos" ON public.videos;
DROP POLICY IF EXISTS "Parents can insert videos" ON public.videos;
DROP POLICY IF EXISTS "Parents can update their videos" ON public.videos;
DROP POLICY IF EXISTS "Parents can delete their videos" ON public.videos;

-- Parents can view their own videos
CREATE POLICY "Parents can view their videos"
ON public.videos
FOR SELECT
TO authenticated
USING (parent_id = auth.uid());

-- Parents can update their own videos
CREATE POLICY "Parents can update their videos"
ON public.videos
FOR UPDATE
TO authenticated
USING (parent_id = auth.uid())
WITH CHECK (parent_id = auth.uid());

-- Parents can delete their own videos
CREATE POLICY "Parents can delete their videos"
ON public.videos
FOR DELETE
TO authenticated
USING (parent_id = auth.uid());

-- NOTE: We DON'T allow direct INSERT via RLS
-- Kids must use the submit_video_from_kid() function which bypasses RLS securely

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================

-- 1. Check anon can upload to storage:
-- SELECT policyname, roles, cmd FROM pg_policies
-- WHERE tablename = 'objects' AND schemaname = 'storage' AND roles @> ARRAY['anon'];
-- Should show: "Anonymous users can upload videos" with cmd = 'INSERT'

-- 2. Check RPC function exists:
-- SELECT proname, prosecdef FROM pg_proc WHERE proname = 'submit_video_from_kid';
-- Should return one row with prosecdef = 't' (true)

-- 3. Check videos table policies:
-- SELECT policyname, roles, cmd FROM pg_policies
-- WHERE tablename = 'videos' AND schemaname = 'public';

-- =============================================================================
-- TESTING THE FIX
-- =============================================================================

-- After running this migration, the video upload flow should work:
-- 1. Kids (anon) upload video file to storage.objects (now allowed!)
-- 2. App calls submit_video_from_kid() RPC function
-- 3. Function validates ownership and creates video record
-- 4. Function updates gift status to 'pending_approval'
-- 5. Success!
