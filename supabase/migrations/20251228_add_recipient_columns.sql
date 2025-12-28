-- Add recipient columns to video_compositing_jobs for auto-send functionality
-- This enables the Video Queue feature where emails are sent automatically after compositing

ALTER TABLE video_compositing_jobs
ADD COLUMN IF NOT EXISTS recipient_email TEXT,
ADD COLUMN IF NOT EXISTS recipient_name TEXT,
ADD COLUMN IF NOT EXISTS send_method TEXT DEFAULT 'email',
ADD COLUMN IF NOT EXISTS email_subject TEXT,
ADD COLUMN IF NOT EXISTS email_body TEXT,
ADD COLUMN IF NOT EXISTS child_name TEXT,
ADD COLUMN IF NOT EXISTS gift_name TEXT,
ADD COLUMN IF NOT EXISTS event_name TEXT;

-- Add index for faster parent dashboard queries
CREATE INDEX IF NOT EXISTS idx_compositing_jobs_parent_status
ON video_compositing_jobs(parent_id, status);

-- Add comment for documentation
COMMENT ON COLUMN video_compositing_jobs.send_method IS 'email or share - determines how video is sent after compositing';
COMMENT ON COLUMN video_compositing_jobs.recipient_email IS 'Email address to send composited video to';
