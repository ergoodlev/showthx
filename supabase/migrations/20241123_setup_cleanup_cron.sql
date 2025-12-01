-- Migration: Set up cron job for COPPA-compliant video cleanup
-- Date: 2024-11-23
-- Description: Schedules daily cleanup of expired videos using pg_cron

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule the cleanup function to run daily at 3 AM UTC
-- This calls our Edge Function via HTTP
SELECT cron.schedule(
  'cleanup-expired-videos-daily',  -- job name
  '0 3 * * *',                      -- cron expression: 3 AM UTC daily
  $$
  SELECT net.http_post(
    url := (SELECT current_setting('app.settings.supabase_url') || '/functions/v1/cleanup-expired-videos'),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT current_setting('app.settings.service_role_key'))
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Alternative: Direct database cleanup (if Edge Function approach doesn't work)
-- This runs directly in the database without calling the Edge Function

-- Create a function to clean up expired videos directly in the database
CREATE OR REPLACE FUNCTION cleanup_expired_videos_direct()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  expired_gift RECORD;
  deleted_count INTEGER := 0;
BEGIN
  -- Log start of cleanup
  RAISE NOTICE '[COPPA CLEANUP] Starting expired video cleanup at %', NOW();

  -- Find and process expired gifts
  FOR expired_gift IN
    SELECT id, video_path, video_expires_at
    FROM gifts
    WHERE video_path IS NOT NULL
      AND video_expires_at IS NOT NULL
      AND video_expires_at < NOW()
  LOOP
    -- Clear video fields (storage deletion handled separately)
    UPDATE gifts
    SET
      video_url = NULL,
      video_path = NULL,
      video_expires_at = NULL,
      status = 'expired',
      updated_at = NOW()
    WHERE id = expired_gift.id;

    deleted_count := deleted_count + 1;
    RAISE NOTICE '[COPPA CLEANUP] Marked expired: gift_id=%, video_path=%', expired_gift.id, expired_gift.video_path;
  END LOOP;

  RAISE NOTICE '[COPPA CLEANUP] Completed. Marked % videos as expired', deleted_count;
END;
$$;

-- Schedule the direct database cleanup as a backup (runs at 4 AM UTC)
SELECT cron.schedule(
  'cleanup-expired-videos-direct',
  '0 4 * * *',
  'SELECT cleanup_expired_videos_direct()'
);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- View scheduled jobs (for verification)
-- SELECT * FROM cron.job;

COMMENT ON FUNCTION cleanup_expired_videos_direct() IS 'COPPA-compliant cleanup function that marks expired videos for deletion';
