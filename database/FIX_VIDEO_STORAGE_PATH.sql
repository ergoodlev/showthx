-- ============================================
-- FIX VIDEO SUBMISSION - REMOVE storage_path
-- ============================================
-- The videos table doesn't have storage_path column
-- This migration updates the function to match actual schema
-- ============================================

-- Drop ALL existing versions of the function (handles "function not unique" error)
DROP FUNCTION IF EXISTS public.submit_video_from_kid(UUID, UUID, UUID, TEXT, TEXT, JSONB);
DROP FUNCTION IF EXISTS public.submit_video_from_kid(UUID, UUID, UUID, TEXT, JSONB);

-- Now create the new version without storage_path
CREATE OR REPLACE FUNCTION public.submit_video_from_kid(
  p_child_id UUID,
  p_gift_id UUID,
  p_parent_id UUID,
  p_video_url TEXT,
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

  -- Insert the video record (WITHOUT storage_path)
  INSERT INTO public.videos (
    child_id,
    gift_id,
    parent_id,
    video_url,
    customization_data,
    status,
    created_at
  ) VALUES (
    p_child_id,
    p_gift_id,
    p_parent_id,
    p_video_url,
    p_metadata,
    'pending_approval',
    NOW()
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

-- Ensure permissions are set
GRANT EXECUTE ON FUNCTION public.submit_video_from_kid TO anon;
GRANT EXECUTE ON FUNCTION public.submit_video_from_kid TO authenticated;

-- Verification
SELECT 'Function updated: submit_video_from_kid (without storage_path)' AS status;
