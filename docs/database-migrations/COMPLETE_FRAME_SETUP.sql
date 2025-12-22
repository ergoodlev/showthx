-- ==============================================================================
-- COMPLETE FRAME SETUP FOR SHOWTHX
-- Copy and paste this entire file into Supabase SQL Editor
-- Run AFTER you've run add_missing_frame_columns.sql
-- ==============================================================================

-- =====================================================
-- STEP 1: CREATE TABLES
-- =====================================================

-- Frame Templates Table
CREATE TABLE IF NOT EXISTS frame_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Template identification
  name TEXT NOT NULL,
  description TEXT,

  -- Frame shape (parent chooses shape, kids decorate)
  frame_shape TEXT NOT NULL DEFAULT 'rectangle',

  -- Parent-defined custom text overlay
  custom_text TEXT DEFAULT '',
  custom_text_position TEXT DEFAULT 'bottom',
  custom_text_color TEXT DEFAULT '#FFFFFF',
  custom_text_font TEXT DEFAULT 'default',

  -- Frame appearance settings
  frame_type TEXT NOT NULL DEFAULT 'minimal',

  -- Colors (hex values)
  primary_color TEXT DEFAULT '#06b6d4',
  secondary_color TEXT DEFAULT '#0891b2',
  border_color TEXT DEFAULT '#FFFFFF',

  -- Pattern overlay
  pattern TEXT DEFAULT 'none',

  -- Kid decoration settings
  kid_decorations JSONB DEFAULT '{}'::jsonb,

  -- Text defaults
  default_text_position TEXT DEFAULT 'bottom',
  default_text_color TEXT DEFAULT '#FFFFFF',

  -- Border settings
  border_width INTEGER DEFAULT 4,
  border_radius INTEGER DEFAULT 12,

  -- Visibility settings
  is_public BOOLEAN DEFAULT FALSE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Frame Assignments Table
CREATE TABLE IF NOT EXISTS frame_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  frame_template_id UUID NOT NULL REFERENCES frame_templates(id) ON DELETE CASCADE,

  -- Flexible foreign keys (at least one should be set)
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  child_id UUID REFERENCES children(id) ON DELETE CASCADE,
  guest_id UUID REFERENCES guests(id) ON DELETE CASCADE,
  gift_id UUID REFERENCES gifts(id) ON DELETE CASCADE,

  -- Priority (higher = more specific)
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

-- =====================================================
-- STEP 2: CREATE INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_frame_templates_parent ON frame_templates(parent_id);
CREATE INDEX IF NOT EXISTS idx_frame_assignments_template ON frame_assignments(frame_template_id);
CREATE INDEX IF NOT EXISTS idx_frame_assignments_event ON frame_assignments(event_id) WHERE event_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_frame_assignments_child ON frame_assignments(child_id) WHERE child_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_frame_assignments_guest ON frame_assignments(guest_id) WHERE guest_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_frame_assignments_gift ON frame_assignments(gift_id) WHERE gift_id IS NOT NULL;

-- =====================================================
-- STEP 3: CREATE HELPER FUNCTION
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
-- STEP 4: ENABLE RLS
-- =====================================================

ALTER TABLE frame_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE frame_assignments ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 5: CREATE RLS POLICIES FOR FRAME_TEMPLATES
-- =====================================================

DROP POLICY IF EXISTS "Parents can view own frame templates" ON frame_templates;
CREATE POLICY "Parents can view own frame templates"
  ON frame_templates FOR SELECT
  USING (auth.uid() = parent_id OR is_public = TRUE);

DROP POLICY IF EXISTS "Parents can create frame templates" ON frame_templates;
CREATE POLICY "Parents can create frame templates"
  ON frame_templates FOR INSERT
  WITH CHECK (auth.uid() = parent_id);

DROP POLICY IF EXISTS "Parents can update own frame templates" ON frame_templates;
CREATE POLICY "Parents can update own frame templates"
  ON frame_templates FOR UPDATE
  USING (auth.uid() = parent_id);

DROP POLICY IF EXISTS "Parents can delete own frame templates" ON frame_templates;
CREATE POLICY "Parents can delete own frame templates"
  ON frame_templates FOR DELETE
  USING (auth.uid() = parent_id);

-- =====================================================
-- STEP 6: FIX RLS POLICIES FOR FRAME_ASSIGNMENTS
-- CRITICAL: This allows kids to see frames!
-- =====================================================

-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Parents can view frame assignments for their templates" ON frame_assignments;

-- Create NEW policy that allows both parents AND kids to view
DROP POLICY IF EXISTS "Allow viewing frame assignments for parents and kids" ON frame_assignments;
CREATE POLICY "Allow viewing frame assignments for parents and kids"
  ON frame_assignments FOR SELECT
  USING (
    -- Parents can view assignments for their own templates
    frame_template_id IN (
      SELECT id FROM frame_templates WHERE parent_id = auth.uid()
    )
    OR
    -- Kids can view assignments for their events/gifts
    (
      -- Assignment for an event the kid has gifts in
      event_id IN (
        SELECT DISTINCT g.event_id
        FROM gifts g
        JOIN gift_assignments ga ON g.id = ga.gift_id
        JOIN children c ON ga.children_id = c.id
        WHERE c.id = auth.uid()
      )
      OR
      -- Assignment for a child (when kid is logged in as child)
      child_id = auth.uid()
      OR
      -- Assignment for a specific gift assigned to this kid
      gift_id IN (
        SELECT g.id
        FROM gifts g
        JOIN gift_assignments ga ON g.id = ga.gift_id
        WHERE ga.children_id = auth.uid()
      )
    )
  );

-- Parent INSERT/UPDATE/DELETE policies (unchanged)
DROP POLICY IF EXISTS "Parents can create frame assignments" ON frame_assignments;
CREATE POLICY "Parents can create frame assignments"
  ON frame_assignments FOR INSERT
  WITH CHECK (
    frame_template_id IN (
      SELECT id FROM frame_templates WHERE parent_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Parents can update frame assignments" ON frame_assignments;
CREATE POLICY "Parents can update frame assignments"
  ON frame_assignments FOR UPDATE
  USING (
    frame_template_id IN (
      SELECT id FROM frame_templates WHERE parent_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Parents can delete frame assignments" ON frame_assignments;
CREATE POLICY "Parents can delete frame assignments"
  ON frame_assignments FOR DELETE
  USING (
    frame_template_id IN (
      SELECT id FROM frame_templates WHERE parent_id = auth.uid()
    )
  );

-- =====================================================
-- STEP 7: CREATE TRIGGERS
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_frame_templates_updated_at ON frame_templates;
CREATE TRIGGER update_frame_templates_updated_at
  BEFORE UPDATE ON frame_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Show all policies created
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename IN ('frame_templates', 'frame_assignments')
ORDER BY tablename, policyname;

-- ==============================================================================
-- SETUP COMPLETE!
-- ==============================================================================
