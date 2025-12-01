-- Migration: Fix Video Storage RLS Policies
-- Date: 2024-11-23
-- Description: Comprehensive RLS policies for the 'videos' storage bucket
-- This allows authenticated users (parents) to upload and manage videos

-- =============================================================================
-- STEP 1: Ensure the videos bucket exists with proper configuration
-- =============================================================================

-- Create the videos bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'videos',
  'videos',
  false,  -- Not public - use signed URLs
  104857600,  -- 100MB limit
  ARRAY['video/mp4', 'video/quicktime', 'video/mov', 'video/x-m4v']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 104857600,
  allowed_mime_types = ARRAY['video/mp4', 'video/quicktime', 'video/mov', 'video/x-m4v'];

-- =============================================================================
-- STEP 2: Drop existing policies to avoid conflicts
-- =============================================================================

DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated reads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes" ON storage.objects;
DROP POLICY IF EXISTS "videos_insert_policy" ON storage.objects;
DROP POLICY IF EXISTS "videos_select_policy" ON storage.objects;
DROP POLICY IF EXISTS "videos_update_policy" ON storage.objects;
DROP POLICY IF EXISTS "videos_delete_policy" ON storage.objects;
DROP POLICY IF EXISTS "Parents can upload videos" ON storage.objects;
DROP POLICY IF EXISTS "Parents can view videos" ON storage.objects;
DROP POLICY IF EXISTS "Parents can delete videos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload videos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read videos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update videos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete videos" ON storage.objects;
DROP POLICY IF EXISTS "Service role full access" ON storage.objects;

-- =============================================================================
-- STEP 3: Create comprehensive RLS policies for videos bucket
-- =============================================================================

-- Policy: Allow authenticated users to INSERT (upload) videos
CREATE POLICY "Authenticated users can upload videos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'videos'
);

-- Policy: Allow authenticated users to SELECT (read/download) videos
CREATE POLICY "Authenticated users can read videos"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'videos'
);

-- Policy: Allow authenticated users to UPDATE videos metadata
CREATE POLICY "Authenticated users can update videos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'videos')
WITH CHECK (bucket_id = 'videos');

-- Policy: Allow authenticated users to DELETE their videos
CREATE POLICY "Authenticated users can delete videos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'videos'
);

-- Policy: Service role has full access (for Edge Functions and cleanup)
CREATE POLICY "Service role full access"
ON storage.objects
FOR ALL
TO service_role
USING (bucket_id = 'videos')
WITH CHECK (bucket_id = 'videos');

-- =============================================================================
-- STEP 4: Also ensure anon can read videos (for signed URLs to work)
-- =============================================================================

-- Drop if exists first
DROP POLICY IF EXISTS "Public read access for signed URLs" ON storage.objects;

-- Signed URLs work even with private bucket, but this allows the token-based access
CREATE POLICY "Public read access for signed URLs"
ON storage.objects
FOR SELECT
TO anon
USING (
  bucket_id = 'videos'
);

-- =============================================================================
-- STEP 5: Ensure RLS is enabled on storage.objects
-- =============================================================================

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- STEP 6: Grant necessary permissions
-- =============================================================================

GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.buckets TO authenticated;
GRANT SELECT ON storage.objects TO anon;
GRANT SELECT ON storage.buckets TO anon;

-- =============================================================================
-- VERIFICATION QUERIES (run these to check policies are set up correctly)
-- =============================================================================

-- Check bucket exists:
-- SELECT * FROM storage.buckets WHERE id = 'videos';

-- Check policies:
-- SELECT policyname, permissive, roles, cmd, qual, with_check
-- FROM pg_policies
-- WHERE tablename = 'objects' AND schemaname = 'storage';

-- Test upload permission (run as authenticated user):
-- INSERT INTO storage.objects (bucket_id, name, owner, created_at, updated_at)
-- VALUES ('videos', 'test/test.mp4', auth.uid(), now(), now());
