-- ============================================
-- FIX: Allow Kids to Submit Videos via RLS
-- ============================================
-- Problem: Kids use access codes, not Supabase auth
-- The RLS policy checks auth.uid() which fails for kids
--
-- Solution: Create a SECURITY DEFINER function that:
-- 1. Validates child_id belongs to parent_id
-- 2. Validates gift_id belongs to parent_id
-- 3. Inserts video record securely
-- ============================================

-- First, create a function to securely insert videos
-- This runs with the permissions of the function creator (bypasses RLS)
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

-- Grant execute permission to anonymous users
GRANT EXECUTE ON FUNCTION public.submit_video_from_kid TO anon;
GRANT EXECUTE ON FUNCTION public.submit_video_from_kid TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION public.submit_video_from_kid IS
'Securely allows kids (using access codes) to submit videos.
Validates child and gift ownership before inserting.
Used by VideoConfirmationScreen when kids submit their thank-you videos.';

-- ============================================
-- VERIFICATION QUERIES (run these to verify)
-- ============================================
-- Check function exists:
-- SELECT proname, prosecdef FROM pg_proc WHERE proname = 'submit_video_from_kid';
-- prosecdef should be 't' (true) for SECURITY DEFINER

-- Test the function (replace UUIDs with real ones):
-- SELECT submit_video_from_kid(
--   'child-uuid'::uuid,
--   'gift-uuid'::uuid,
--   'parent-uuid'::uuid,
--   'https://example.com/video.mp4',
--   'parent-id/gift-id/timestamp.mp4',
--   '{"music_id": null}'::jsonb
-- );
