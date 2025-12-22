/**
 * GratituGram Phase 2 Schema
 * Comprehensive database design for parent/child/event-based architecture
 * Supports birthdays, weddings, and multi-generational events
 * Includes COPPA-compliant parental consent tracking
 */

-- ========================================
-- 1. Parents Table (uses Supabase Auth)
-- ========================================
CREATE TABLE IF NOT EXISTS parents (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  profile_picture_url TEXT,
  account_type TEXT DEFAULT 'family' CHECK (account_type IN ('family', 'business', 'institutional')),
  billing_plan TEXT DEFAULT 'free' CHECK (billing_plan IN ('free', 'pro', 'enterprise')),
  parental_consent_given BOOLEAN DEFAULT FALSE,
  consent_given_at TIMESTAMP WITH TIME ZONE,
  terms_accepted BOOLEAN DEFAULT FALSE,
  terms_accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- 2. Parental Consent Tracking (COPPA)
-- ========================================
CREATE TABLE IF NOT EXISTS parental_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL CHECK (consent_type IN ('initial_signup', 'video_collection', 'music_license', 'data_sharing')),
  given BOOLEAN NOT NULL,
  consent_text TEXT,
  ip_address TEXT,
  user_agent TEXT,
  method TEXT CHECK (method IN ('email', 'in_app', 'phone')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  revoked_at TIMESTAMP WITH TIME ZONE
);

-- ========================================
-- 3. Events/Parties Table
-- ========================================
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('birthday', 'wedding', 'graduation', 'anniversary', 'milestone', 'custom')),
  event_date DATE,
  location TEXT,
  theme TEXT,
  description TEXT,

  -- Configuration for gift mode
  gift_mode TEXT DEFAULT 'individual' CHECK (gift_mode IN ('individual', 'shared', 'mixed')),

  -- Guest list source
  guest_source TEXT DEFAULT 'manual' CHECK (guest_source IN ('manual', 'csv', 'evite', 'email')),

  cover_image_url TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- 4. Children/Kids Table
-- ========================================
CREATE TABLE IF NOT EXISTS children (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  birth_date DATE,
  pin TEXT NOT NULL UNIQUE, -- 4-6 digit PIN, stored hashed in production
  pin_created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  profile_picture_url TEXT,
  literacy_level TEXT DEFAULT 'mixed' CHECK (literacy_level IN ('early', 'developing', 'fluent', 'mixed')),
  is_active BOOLEAN DEFAULT TRUE,
  last_login_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- 5. Gifts Table
-- ========================================
CREATE TABLE IF NOT EXISTS gifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  parent_id UUID NOT NULL REFERENCES parents(id) ON DELETE CASCADE,

  gift_giver_name TEXT NOT NULL, -- e.g., "Grandma", "Uncle Bob"
  gift_name TEXT NOT NULL, -- e.g., "LEGO Set", "Bicycle"
  gift_description TEXT,
  gift_category TEXT,

  -- Gift sharing configuration
  gift_type TEXT DEFAULT 'individual' CHECK (gift_type IN ('individual', 'shared')),

  -- Gift opening video
  gift_opening_video_url TEXT, -- Supabase URL
  gift_opening_uploaded_at TIMESTAMP WITH TIME ZONE,
  gift_opening_duration INTEGER, -- seconds

  -- Status tracking
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'sent')),

  order_index INTEGER, -- For displaying in order

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- 6. Gift Assignments (Gifts → Children)
-- ========================================
CREATE TABLE IF NOT EXISTS gift_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gift_id UUID NOT NULL REFERENCES gifts(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  parent_id UUID NOT NULL REFERENCES parents(id) ON DELETE CASCADE,

  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- 7. Videos Table (Enhanced)
-- ========================================
CREATE TABLE IF NOT EXISTS videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
  child_id UUID REFERENCES children(id) ON DELETE SET NULL,
  gift_id UUID REFERENCES gifts(id) ON DELETE SET NULL,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,

  -- Video type
  video_type TEXT NOT NULL CHECK (video_type IN ('gift_opening', 'thank_you', 'merged')),

  -- Video metadata
  video_url TEXT NOT NULL, -- Supabase storage URL
  duration INTEGER, -- seconds

  -- For thank you videos
  recorded_by_child_id UUID REFERENCES children(id) ON DELETE SET NULL,
  recorded_at TIMESTAMP WITH TIME ZONE,

  -- Status tracking
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'sent', 'archived')),
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by_parent_id UUID REFERENCES parents(id),

  -- For merged videos
  merged_from_videos TEXT[], -- Array of video IDs that were merged
  merge_config JSONB, -- Stores merge configuration

  -- Customization
  customization_data JSONB, -- Stickers, frames, drawings, text overlays

  -- Sharing
  sent_at TIMESTAMP WITH TIME ZONE,
  sent_to_guests TEXT[], -- Array of email addresses

  -- Retention
  expires_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- 8. Merged Video Customizations
-- ========================================
CREATE TABLE IF NOT EXISTS merged_video_customizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,

  -- Music selection
  music_track_id UUID REFERENCES music_library(id),
  music_title TEXT,
  music_artist TEXT,
  music_start_time INTEGER, -- seconds (trim point)
  music_duration INTEGER, -- seconds used

  -- Text overlay
  text_overlay TEXT, -- Kid's message
  text_position TEXT DEFAULT 'bottom' CHECK (text_position IN ('top', 'bottom', 'center')),
  text_color TEXT DEFAULT '#FFFFFF',
  text_font_size INTEGER DEFAULT 28,

  -- Transitions
  transition_style TEXT DEFAULT 'fade' CHECK (transition_style IN ('fade', 'slide', 'zoom', 'none')),
  transition_duration INTEGER DEFAULT 1000, -- milliseconds

  -- Layout
  layout_style TEXT DEFAULT 'side_by_side' CHECK (layout_style IN ('side_by_side', 'pip', 'split')),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- 9. Music Library (YouTube Audio Library)
-- ========================================
CREATE TABLE IF NOT EXISTS music_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  url TEXT NOT NULL, -- Download/stream URL
  license TEXT NOT NULL, -- CC, YouTube, etc.
  duration INTEGER NOT NULL, -- seconds
  genre TEXT,
  mood TEXT, -- happy, calm, energetic, etc.
  language TEXT,
  explicit BOOLEAN DEFAULT FALSE,
  thumbnail_url TEXT,
  source TEXT DEFAULT 'youtube' CHECK (source IN ('youtube', 'freepik', 'epidemic')),
  source_id TEXT, -- ID from source system
  is_featured BOOLEAN DEFAULT FALSE,
  is_kid_friendly BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- 10. Guests/Recipients Table
-- ========================================
CREATE TABLE IF NOT EXISTS guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,

  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  relationship TEXT, -- grandma, uncle, cousin, friend, etc.

  -- Gift associations
  assigned_gift_id UUID REFERENCES gifts(id) ON DELETE SET NULL,

  -- Status
  invitation_status TEXT DEFAULT 'pending' CHECK (invitation_status IN ('pending', 'accepted', 'declined')),
  video_sent BOOLEAN DEFAULT FALSE,
  video_sent_at TIMESTAMP WITH TIME ZONE,

  source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'csv', 'evite', 'email')),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- 11. Video Share Tokens (24-hour secure links)
-- ========================================
CREATE TABLE IF NOT EXISTS video_share_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  parent_id UUID NOT NULL REFERENCES parents(id) ON DELETE CASCADE,

  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  recipient_email TEXT,
  recipient_name TEXT,

  max_views INTEGER DEFAULT 1,
  view_count INTEGER DEFAULT 0,

  allow_download BOOLEAN DEFAULT FALSE,
  allow_share BOOLEAN DEFAULT FALSE,

  revoked_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- 12. Audit Logs
-- ========================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID REFERENCES parents(id) ON DELETE SET NULL,
  child_id UUID REFERENCES children(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- Indexes for Performance
-- ========================================
CREATE INDEX idx_parents_email ON parents(email);
CREATE INDEX idx_children_parent_id ON children(parent_id);
CREATE INDEX idx_children_pin ON children(pin);
CREATE INDEX idx_events_parent_id ON events(parent_id);
CREATE INDEX idx_events_event_date ON events(event_date);
CREATE INDEX idx_gifts_event_id ON gifts(event_id);
CREATE INDEX idx_gifts_status ON gifts(status);
CREATE INDEX idx_gift_assignments_gift_id ON gift_assignments(gift_id);
CREATE INDEX idx_gift_assignments_child_id ON gift_assignments(child_id);
CREATE INDEX idx_videos_parent_id ON videos(parent_id);
CREATE INDEX idx_videos_child_id ON videos(child_id);
CREATE INDEX idx_videos_video_type ON videos(video_type);
CREATE INDEX idx_videos_status ON videos(status);
CREATE INDEX idx_videos_event_id ON videos(event_id);
CREATE INDEX idx_merged_video_customizations_video_id ON merged_video_customizations(video_id);
CREATE INDEX idx_guests_parent_id ON guests(parent_id);
CREATE INDEX idx_guests_event_id ON guests(event_id);
CREATE INDEX idx_video_share_tokens_token ON video_share_tokens(token);
CREATE INDEX idx_audit_logs_parent_id ON audit_logs(parent_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- ========================================
-- Row Level Security (RLS)
-- ========================================

-- Parents can only see their own data
ALTER TABLE parents ENABLE ROW LEVEL SECURITY;
CREATE POLICY parents_self_policy ON parents
  FOR SELECT USING (auth.uid() = id);

-- Children can only see their own data
ALTER TABLE children ENABLE ROW LEVEL SECURITY;
CREATE POLICY children_parent_policy ON children
  FOR SELECT USING (parent_id = (SELECT id FROM parents WHERE id = auth.uid()));

-- Events
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
CREATE POLICY events_parent_policy ON events
  FOR SELECT USING (parent_id = (SELECT id FROM parents WHERE id = auth.uid()));

-- Gifts
ALTER TABLE gifts ENABLE ROW LEVEL SECURITY;
CREATE POLICY gifts_parent_policy ON gifts
  FOR SELECT USING (parent_id = (SELECT id FROM parents WHERE id = auth.uid()));

-- Videos
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
CREATE POLICY videos_parent_policy ON videos
  FOR SELECT USING (parent_id = (SELECT id FROM parents WHERE id = auth.uid()));

-- Guests
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;
CREATE POLICY guests_parent_policy ON guests
  FOR SELECT USING (parent_id = (SELECT id FROM parents WHERE id = auth.uid()));

-- Parental Consents
ALTER TABLE parental_consents ENABLE ROW LEVEL SECURITY;
CREATE POLICY parental_consents_parent_policy ON parental_consents
  FOR SELECT USING (parent_id = (SELECT id FROM parents WHERE id = auth.uid()));

-- ========================================
-- Helpful Views
-- ========================================

-- View: Pending videos for parent dashboard
CREATE OR REPLACE VIEW pending_videos_view AS
SELECT
  v.id,
  v.parent_id,
  v.child_id,
  v.gift_id,
  v.video_type,
  v.status,
  c.name AS child_name,
  g.gift_name,
  g.gift_giver_name,
  v.created_at
FROM videos v
LEFT JOIN children c ON v.child_id = c.id
LEFT JOIN gifts g ON v.gift_id = g.id
WHERE v.status = 'draft'
ORDER BY v.created_at DESC;

-- View: All events with gift counts
CREATE OR REPLACE VIEW events_with_stats AS
SELECT
  e.id,
  e.parent_id,
  e.name,
  e.event_date,
  COUNT(DISTINCT g.id) AS gift_count,
  COUNT(DISTINCT ga.child_id) AS assigned_children_count,
  COUNT(DISTINCT CASE WHEN v.status = 'completed' THEN v.id END) AS completed_videos_count
FROM events e
LEFT JOIN gifts g ON e.id = g.event_id
LEFT JOIN gift_assignments ga ON g.id = ga.gift_id
LEFT JOIN videos v ON g.id = v.gift_id
GROUP BY e.id;

-- ========================================
-- Comments for Documentation
-- ========================================

COMMENT ON TABLE parents IS 'Parent/guardian accounts (uses Supabase Auth)';
COMMENT ON TABLE children IS 'Child/kid accounts with PIN logins';
COMMENT ON TABLE events IS 'Events like birthdays, weddings, graduations';
COMMENT ON TABLE gifts IS 'Gifts with opening videos, linked to events';
COMMENT ON TABLE gift_assignments IS 'Flexible many-to-many: gifts can be assigned to one or multiple kids';
COMMENT ON TABLE videos IS 'Video content: gift openings, thank yous, merged videos';
COMMENT ON TABLE merged_video_customizations IS 'Kid customizations for merged videos: music, text, transitions';
COMMENT ON TABLE music_library IS 'YouTube Audio Library tracks and other royalty-free music';
COMMENT ON TABLE guests IS 'Email list of gift givers to receive thank you videos';
COMMENT ON TABLE parental_consents IS 'COPPA-compliant consent tracking for child video collection';
COMMENT ON TABLE video_share_tokens IS 'Secure 24-hour links for guest video access';
