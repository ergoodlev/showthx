-- ============================================
-- ENABLE VIDEO UPLOADS FOR KIDS
-- ============================================
-- This migration fixes the "videos not saving" issue
-- by allowing kids (anon role) to upload videos
-- ============================================

-- =============================================================================
-- STEP 1: Create the secure video submission function
-- =============================================================================

CREATE OR REPLACE FUNCTION public.submit_video_from_kid(
  p_child_id UUID,
  p_gift_id UUID,
  p_parent_id UUID,
  p_video_url TEXT,
  p_storage_path TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_video_id UUID;
  v_child_valid BOOLEAN;
  v_gift_valid BOOLEAN;
BEGIN
  -- Validate that child belongs to parent
  SELECT EXISTS(
    SELECT 1 FROM public.children
    WHERE id = p_child_id AND parent_id = p_parent_id
  ) INTO v_child_valid;

  IF NOT v_child_valid THEN
    RAISE EXCEPTION 'Invalid child_id or child does not belong to parent';
  END IF;

  -- Validate that gift belongs to parent
  SELECT EXISTS(
    SELECT 1 FROM public.gifts
    WHERE id = p_gift_id AND parent_id = p_parent_id
  ) INTO v_gift_valid;

  IF NOT v_gift_valid THEN
    RAISE EXCEPTION 'Invalid gift_id or gift does not belong to parent';
  END IF;

  -- Insert the video record
  INSERT INTO public.videos (
    child_id,
    gift_id,
    parent_id,
    video_url,
    storage_path,
    status,
    recorded_at,
    metadata
  ) VALUES (
    p_child_id,
    p_gift_id,
    p_parent_id,
    p_video_url,
    p_storage_path,
    'pending_approval',
    NOW(),
    p_metadata
  )
  RETURNING id INTO v_video_id;

  -- Update gift status
  UPDATE public.gifts
  SET status = 'pending_approval',
      recorded_at = NOW()
  WHERE id = p_gift_id;

  RETURN v_video_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.submit_video_from_kid TO anon;
GRANT EXECUTE ON FUNCTION public.submit_video_from_kid TO authenticated;

-- =============================================================================
-- STEP 2: Allow anonymous (kids) to upload videos to storage
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

-- =============================================================================
-- VERIFICATION
-- =============================================================================

-- Check function exists:
SELECT 'Function created: submit_video_from_kid' AS status
WHERE EXISTS (
  SELECT 1 FROM pg_proc WHERE proname = 'submit_video_from_kid'
);

-- Check anon can upload to storage:
SELECT 'Storage policy created: Anonymous users can upload videos' AS status
WHERE EXISTS (
  SELECT 1 FROM pg_policies
  WHERE tablename = 'objects'
    AND schemaname = 'storage'
    AND policyname = 'Anonymous users can upload videos'
);

-- Check videos table policies:
SELECT policyname, roles::text, cmd::text
FROM pg_policies
WHERE tablename = 'videos' AND schemaname = 'public'
ORDER BY policyname;
