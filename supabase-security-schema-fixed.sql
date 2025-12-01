-- ========================================
-- GratituGram Security & Approval Schema (FIXED)
-- Creates all tables from scratch
-- ========================================

-- ========================================
-- 1. Create Videos Table with Approval Workflow
-- ========================================

CREATE TABLE IF NOT EXISTS videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  child_id UUID,
  guest_name TEXT,
  gift_name TEXT,
  video_url TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'sent')),
  video_type TEXT DEFAULT 'thank_you' CHECK (video_type IN ('thank_you', 'gift_opening', 'combined')),
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID REFERENCES auth.users(id),
  sent_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_videos_user_id ON videos(user_id);
CREATE INDEX IF NOT EXISTS idx_videos_status ON videos(status);
CREATE INDEX IF NOT EXISTS idx_videos_expires_at ON videos(expires_at);
CREATE INDEX IF NOT EXISTS idx_videos_child_id ON videos(child_id);

-- ========================================
-- 2. Create Children Table for Multi-Child Support
-- ========================================

CREATE TABLE IF NOT EXISTS children (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  age INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_children_user_id ON children(user_id);

-- Add child_id foreign key to videos
ALTER TABLE IF EXISTS videos
ADD CONSTRAINT fk_videos_children FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE;

-- ========================================
-- 3. Create Video Share Tokens Table
-- For secure time-limited video sharing
-- ========================================

CREATE TABLE IF NOT EXISTS video_share_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  recipient_email TEXT,
  max_uses INTEGER,
  uses INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMP WITH TIME ZONE,
  allow_download BOOLEAN DEFAULT FALSE,
  revoked_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_video_share_tokens_token ON video_share_tokens(token);
CREATE INDEX IF NOT EXISTS idx_video_share_tokens_user_id ON video_share_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_video_share_tokens_expires_at ON video_share_tokens(expires_at);

-- ========================================
-- 4. Create Audit Logs Table (for COPPA compliance)
-- ========================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  child_id UUID REFERENCES children(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  event_details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_child_id ON audit_logs(child_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- ========================================
-- 5. Create Parental Consent & Preferences Table
-- ========================================

CREATE TABLE IF NOT EXISTS parental_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_pin TEXT NOT NULL,
  parent_email TEXT NOT NULL,
  two_factor_enabled BOOLEAN DEFAULT FALSE,
  encryption_enabled BOOLEAN DEFAULT FALSE,
  public_key TEXT,
  require_approval BOOLEAN DEFAULT TRUE,
  send_emails BOOLEAN DEFAULT TRUE,
  auto_delete_drafts BOOLEAN DEFAULT TRUE,
  draft_retention_days INTEGER DEFAULT 7,
  approved_retention_days INTEGER DEFAULT 90,
  coppa_consent_given BOOLEAN DEFAULT FALSE,
  coppa_consent_at TIMESTAMP WITH TIME ZONE,
  privacy_policy_accepted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_parental_settings_user_id ON parental_settings(user_id);

-- ========================================
-- 6. ROW LEVEL SECURITY (RLS) Policies
-- ========================================

-- Enable RLS on all tables
ALTER TABLE children ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_share_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE parental_settings ENABLE ROW LEVEL SECURITY;

-- Children: Only parents can see their own children
CREATE POLICY "parents_see_own_children" ON children
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "parents_insert_own_children" ON children
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "parents_update_own_children" ON children
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "parents_delete_own_children" ON children
  FOR DELETE USING (user_id = auth.uid());

-- Videos: Only parents can see/manage their own videos
CREATE POLICY "parents_see_own_videos" ON videos
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "parents_insert_own_videos" ON videos
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "parents_update_own_videos" ON videos
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "parents_delete_own_videos" ON videos
  FOR DELETE USING (user_id = auth.uid());

-- Video Share Tokens: Only creators can manage their tokens
CREATE POLICY "users_see_own_tokens" ON video_share_tokens
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "users_manage_own_tokens" ON video_share_tokens
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "users_delete_own_tokens" ON video_share_tokens
  FOR DELETE USING (user_id = auth.uid());

-- Audit Logs: Only parents see their own logs
CREATE POLICY "parents_see_own_audit_logs" ON audit_logs
  FOR SELECT USING (user_id = auth.uid());

-- Parental Settings: Only parents see their own settings
CREATE POLICY "parents_see_own_settings" ON parental_settings
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "parents_update_own_settings" ON parental_settings
  FOR UPDATE USING (user_id = auth.uid());

-- ========================================
-- 7. Functions for Automatic Cleanup
-- ========================================

-- Function to auto-delete expired draft videos
CREATE OR REPLACE FUNCTION delete_expired_drafts()
RETURNS void AS $$
BEGIN
  DELETE FROM videos
  WHERE status = 'draft'
  AND created_at < NOW() - INTERVAL '7 days';

  RAISE NOTICE 'Deleted expired draft videos';
END;
$$ LANGUAGE plpgsql;

-- Function to auto-delete old approved videos
CREATE OR REPLACE FUNCTION delete_old_approved_videos()
RETURNS void AS $$
BEGIN
  DELETE FROM videos
  WHERE status = 'approved'
  AND created_at < NOW() - INTERVAL '90 days';

  RAISE NOTICE 'Deleted old approved videos';
END;
$$ LANGUAGE plpgsql;

-- Function to clean up expired share tokens
CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS void AS $$
BEGIN
  DELETE FROM video_share_tokens
  WHERE expires_at < NOW()
  AND revoked_at IS NULL;

  RAISE NOTICE 'Cleaned up expired share tokens';
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 8. Triggers for Audit Logging
-- ========================================

-- Log video status changes
CREATE OR REPLACE FUNCTION log_video_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO audit_logs (user_id, child_id, event_type, event_details)
    VALUES (
      NEW.user_id,
      NEW.child_id,
      'video_status_changed',
      jsonb_build_object(
        'video_id', NEW.id,
        'old_status', OLD.status,
        'new_status', NEW.status,
        'timestamp', NOW()
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS video_status_change_trigger ON videos CASCADE;
CREATE TRIGGER video_status_change_trigger
AFTER UPDATE ON videos
FOR EACH ROW
EXECUTE FUNCTION log_video_status_change();

-- Log video deletions
CREATE OR REPLACE FUNCTION log_video_deletion()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs (user_id, child_id, event_type, event_details)
  VALUES (
    OLD.user_id,
    OLD.child_id,
    'video_deleted',
    jsonb_build_object(
      'video_id', OLD.id,
      'status', OLD.status,
      'guest_name', OLD.guest_name,
      'timestamp', NOW()
    )
  );
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS video_deletion_trigger ON videos CASCADE;
CREATE TRIGGER video_deletion_trigger
BEFORE DELETE ON videos
FOR EACH ROW
EXECUTE FUNCTION log_video_deletion();

-- ========================================
-- 9. Comments for Documentation
-- ========================================

COMMENT ON TABLE children IS 'Child profiles - supports multi-child families';
COMMENT ON TABLE videos IS 'Video records with approval workflow status';
COMMENT ON TABLE video_share_tokens IS 'Time-limited secure sharing tokens for videos';
COMMENT ON TABLE audit_logs IS 'COPPA compliance audit trail of all data access and modifications';
COMMENT ON TABLE parental_settings IS 'Parent preferences and consent tracking';

COMMENT ON COLUMN videos.status IS 'draft = recording, approved = parent approved, sent = shared with recipients';
COMMENT ON COLUMN videos.expires_at IS 'When video expires and should be auto-deleted';
COMMENT ON COLUMN video_share_tokens.token IS 'Secure random token - recipients use this to access video';
COMMENT ON COLUMN parental_settings.parent_pin IS 'PIN for parental dashboard access (must be hashed)';
