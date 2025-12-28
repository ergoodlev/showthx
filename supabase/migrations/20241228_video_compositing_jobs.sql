-- Video Compositing Jobs Table
-- Tracks server-side video compositing requests processed by Trigger.dev

CREATE TABLE IF NOT EXISTS video_compositing_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Input video and overlays
  video_path TEXT NOT NULL,           -- Storage path to raw video
  frame_png_path TEXT,                -- Storage path to frame PNG overlay
  custom_text TEXT,                   -- Text to overlay on video
  custom_text_position TEXT DEFAULT 'bottom',  -- 'top', 'center', 'bottom'
  custom_text_color TEXT DEFAULT '#FFFFFF',
  stickers JSONB,                     -- Array of stickers [{emoji, x, y, scale}]
  filter_id TEXT,                     -- Video filter to apply

  -- Job status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  output_path TEXT,                   -- Storage path to composited video
  error_message TEXT,                 -- Error details if failed

  -- Metadata
  parent_id UUID REFERENCES parents(id) ON DELETE CASCADE,
  video_id UUID REFERENCES videos(id) ON DELETE SET NULL,
  gift_id UUID REFERENCES gifts(id) ON DELETE SET NULL,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Trigger.dev tracking
  trigger_task_id TEXT,               -- Trigger.dev task run ID
  retry_count INTEGER DEFAULT 0
);

-- Index for polling by status
CREATE INDEX idx_compositing_jobs_status ON video_compositing_jobs(status);
CREATE INDEX idx_compositing_jobs_parent ON video_compositing_jobs(parent_id);
CREATE INDEX idx_compositing_jobs_created ON video_compositing_jobs(created_at DESC);

-- RLS Policies
ALTER TABLE video_compositing_jobs ENABLE ROW LEVEL SECURITY;

-- Parents can view their own jobs
CREATE POLICY "Parents can view own compositing jobs"
  ON video_compositing_jobs FOR SELECT
  TO authenticated
  USING (parent_id = auth.uid());

-- Parents can create jobs
CREATE POLICY "Parents can create compositing jobs"
  ON video_compositing_jobs FOR INSERT
  TO authenticated
  WITH CHECK (parent_id = auth.uid());

-- Service role can update jobs (for Trigger.dev callback)
CREATE POLICY "Service role can update compositing jobs"
  ON video_compositing_jobs FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Function to notify on job completion (for realtime subscription)
CREATE OR REPLACE FUNCTION notify_compositing_complete()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    PERFORM pg_notify(
      'compositing_complete',
      json_build_object(
        'job_id', NEW.id,
        'output_path', NEW.output_path,
        'parent_id', NEW.parent_id
      )::text
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_compositing_complete
  AFTER UPDATE ON video_compositing_jobs
  FOR EACH ROW
  EXECUTE FUNCTION notify_compositing_complete();

COMMENT ON TABLE video_compositing_jobs IS 'Tracks server-side video compositing jobs processed by Trigger.dev';
