-- Frame Templates Schema for ShowThx
-- Run this in your Supabase SQL Editor

-- =====================================================
-- FRAME TEMPLATES TABLE
-- Stores parent-created frame template definitions
-- =====================================================
CREATE TABLE IF NOT EXISTS frame_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Template identification
  name TEXT NOT NULL,
  description TEXT,

  -- Frame shape (parent chooses shape, kids decorate)
  frame_shape TEXT NOT NULL DEFAULT 'rectangle',
  -- Options: 'rectangle', 'rounded', 'polaroid', 'scalloped', 'playful'

  -- Parent-defined custom text overlay (kids cannot change this)
  custom_text TEXT DEFAULT '',
  -- Example: "Thanks for coming to my party!" or "Thank you so much!"
  custom_text_position TEXT DEFAULT 'bottom',
  -- Options: 'top', 'bottom'
  custom_text_color TEXT DEFAULT '#FFFFFF',
  custom_text_font TEXT DEFAULT 'default',
  -- Options: 'default', 'playful', 'elegant', 'bold'

  -- Frame appearance settings (legacy - kept for backwards compatibility)
  frame_type TEXT NOT NULL DEFAULT 'minimal',
  -- Options: 'gradient-glow', 'neon-border', 'soft-vignette', 'celebration', 'minimal', 'custom'

  -- Colors (hex values)
  primary_color TEXT DEFAULT '#06b6d4',
  secondary_color TEXT DEFAULT '#0891b2',
  border_color TEXT DEFAULT '#FFFFFF',

  -- Pattern overlay (decorations kids can add)
  pattern TEXT DEFAULT 'none',
  -- Options: 'none', 'balloons', 'stars', 'smiles', 'confetti', 'hearts'

  -- Kid decoration settings (stored when kid decorates the frame)
  kid_decorations JSONB DEFAULT '{}'::jsonb,
  -- Structure: { emojis: [{emoji, x, y}], texture: 'sparkle', fill_color: '#FFD700' }

  -- Text defaults for this frame
  default_text_position TEXT DEFAULT 'bottom',
  -- Options: 'top', 'middle', 'bottom'
  default_text_color TEXT DEFAULT '#FFFFFF',

  -- Border settings
  border_width INTEGER DEFAULT 4,
  border_radius INTEGER DEFAULT 12,

  -- Visibility settings (for future: allow sharing templates)
  is_public BOOLEAN DEFAULT FALSE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick lookup by parent
CREATE INDEX IF NOT EXISTS idx_frame_templates_parent ON frame_templates(parent_id);

-- =====================================================
-- FRAME ASSIGNMENTS TABLE
-- Flexible assignment system - link frames to events, children, guests, or gifts
-- =====================================================
CREATE TABLE IF NOT EXISTS frame_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  frame_template_id UUID NOT NULL REFERENCES frame_templates(id) ON DELETE CASCADE,

  -- Flexible foreign keys (at least one should be set)
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  child_id UUID REFERENCES children(id) ON DELETE CASCADE,
  guest_id UUID REFERENCES guests(id) ON DELETE CASCADE,
  gift_id UUID REFERENCES gifts(id) ON DELETE CASCADE,

  -- Priority (higher = more specific, takes precedence)
  -- Gift-level: 100, Guest-level: 75, Child-level: 50, Event-level: 25
  priority INTEGER DEFAULT 25,

  -- Status
  is_active BOOLEAN DEFAULT TRUE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure at least one foreign key is set
  CONSTRAINT at_least_one_assignment CHECK (
    event_id IS NOT NULL OR
    child_id IS NOT NULL OR
    guest_id IS NOT NULL OR
    gift_id IS NOT NULL
  )
);

-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_frame_assignments_template ON frame_assignments(frame_template_id);
CREATE INDEX IF NOT EXISTS idx_frame_assignments_event ON frame_assignments(event_id) WHERE event_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_frame_assignments_child ON frame_assignments(child_id) WHERE child_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_frame_assignments_guest ON frame_assignments(guest_id) WHERE guest_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_frame_assignments_gift ON frame_assignments(gift_id) WHERE gift_id IS NOT NULL;

-- =====================================================
-- HELPER FUNCTION: Get applicable frame for a gift
-- Returns the most specific frame assignment
-- =====================================================
CREATE OR REPLACE FUNCTION get_frame_for_gift(
  p_gift_id UUID,
  p_child_id UUID,
  p_event_id UUID,
  p_guest_id UUID DEFAULT NULL
)
RETURNS TABLE (
  frame_template_id UUID,
  assignment_type TEXT,
  priority INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    fa.frame_template_id,
    CASE
      WHEN fa.gift_id IS NOT NULL THEN 'gift'
      WHEN fa.guest_id IS NOT NULL THEN 'guest'
      WHEN fa.child_id IS NOT NULL THEN 'child'
      WHEN fa.event_id IS NOT NULL THEN 'event'
    END as assignment_type,
    fa.priority
  FROM frame_assignments fa
  WHERE fa.is_active = TRUE
    AND (
      fa.gift_id = p_gift_id
      OR fa.guest_id = p_guest_id
      OR fa.child_id = p_child_id
      OR fa.event_id = p_event_id
    )
  ORDER BY fa.priority DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- RLS POLICIES (Row Level Security)
-- =====================================================

-- Enable RLS
ALTER TABLE frame_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE frame_assignments ENABLE ROW LEVEL SECURITY;

-- Frame templates: Parents can CRUD their own templates
CREATE POLICY "Parents can view own frame templates"
  ON frame_templates FOR SELECT
  USING (auth.uid() = parent_id OR is_public = TRUE);

CREATE POLICY "Parents can create frame templates"
  ON frame_templates FOR INSERT
  WITH CHECK (auth.uid() = parent_id);

CREATE POLICY "Parents can update own frame templates"
  ON frame_templates FOR UPDATE
  USING (auth.uid() = parent_id);

CREATE POLICY "Parents can delete own frame templates"
  ON frame_templates FOR DELETE
  USING (auth.uid() = parent_id);

-- Frame assignments: Parents can manage assignments for their templates
CREATE POLICY "Parents can view frame assignments for their templates"
  ON frame_assignments FOR SELECT
  USING (
    frame_template_id IN (
      SELECT id FROM frame_templates WHERE parent_id = auth.uid()
    )
  );

CREATE POLICY "Parents can create frame assignments"
  ON frame_assignments FOR INSERT
  WITH CHECK (
    frame_template_id IN (
      SELECT id FROM frame_templates WHERE parent_id = auth.uid()
    )
  );

CREATE POLICY "Parents can update frame assignments"
  ON frame_assignments FOR UPDATE
  USING (
    frame_template_id IN (
      SELECT id FROM frame_templates WHERE parent_id = auth.uid()
    )
  );

CREATE POLICY "Parents can delete frame assignments"
  ON frame_assignments FOR DELETE
  USING (
    frame_template_id IN (
      SELECT id FROM frame_templates WHERE parent_id = auth.uid()
    )
  );

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_frame_templates_updated_at
  BEFORE UPDATE ON frame_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
