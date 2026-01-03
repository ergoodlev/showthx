-- Minimal video view tracking for COPPA compliance
-- Only stores: video ID, viewed boolean, first view timestamp
-- NO personal data: no IPs, no user agents, no device info

-- Create video_views table
CREATE TABLE IF NOT EXISTS video_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  gift_id UUID REFERENCES gifts(id) ON DELETE SET NULL,
  viewed BOOLEAN DEFAULT FALSE,
  first_viewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure one tracking record per video
  UNIQUE(video_id)
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_video_views_video_id ON video_views(video_id);
CREATE INDEX IF NOT EXISTS idx_video_views_gift_id ON video_views(gift_id);

-- Add tracking_token to videos table for secure URL generation
ALTER TABLE videos ADD COLUMN IF NOT EXISTS tracking_token UUID DEFAULT gen_random_uuid();
CREATE UNIQUE INDEX IF NOT EXISTS idx_videos_tracking_token ON videos(tracking_token);

-- RLS policies
ALTER TABLE video_views ENABLE ROW LEVEL SECURITY;

-- Parents can read view status for their own videos
CREATE POLICY "Parents can view their video view stats"
  ON video_views FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM videos v
      WHERE v.id = video_views.video_id
      AND v.parent_id = auth.uid()
    )
  );

-- Edge functions can insert/update (via service role)
-- No policy needed for service role - it bypasses RLS

-- Function to record a video view (called by edge function)
CREATE OR REPLACE FUNCTION record_video_view(p_tracking_token UUID)
RETURNS TABLE(video_url TEXT, success BOOLEAN) AS $$
DECLARE
  v_video_id UUID;
  v_video_url TEXT;
BEGIN
  -- Get video by tracking token
  SELECT id, video_url INTO v_video_id, v_video_url
  FROM videos
  WHERE tracking_token = p_tracking_token;

  IF v_video_id IS NULL THEN
    RETURN QUERY SELECT NULL::TEXT, FALSE;
    RETURN;
  END IF;

  -- Insert or update view record
  INSERT INTO video_views (video_id, viewed, first_viewed_at)
  VALUES (v_video_id, TRUE, NOW())
  ON CONFLICT (video_id)
  DO UPDATE SET
    viewed = TRUE,
    first_viewed_at = COALESCE(video_views.first_viewed_at, NOW());

  RETURN QUERY SELECT v_video_url, TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to anon for edge function access
GRANT EXECUTE ON FUNCTION record_video_view TO anon;
GRANT EXECUTE ON FUNCTION record_video_view TO authenticated;

-- Comment for documentation
COMMENT ON TABLE video_views IS 'Minimal video view tracking - COPPA compliant. Only tracks if video was viewed and when first viewed.';
