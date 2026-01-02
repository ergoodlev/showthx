-- Fix RLS Infinite Recursion on frame_templates
-- Error: "infinite recursion detected in policy for relation \"frame_templates\""
-- Caused by: frame_templates policy references frame_assignments, which references frame_templates
-- Run this in Supabase SQL Editor

-- First, drop ALL existing policies on frame_templates to start fresh
DROP POLICY IF EXISTS "Allow kids to view frame templates" ON frame_templates;
DROP POLICY IF EXISTS "Parents can view their own frame templates" ON frame_templates;
DROP POLICY IF EXISTS "Parents can create frame templates" ON frame_templates;
DROP POLICY IF EXISTS "Parents can update their own frame templates" ON frame_templates;
DROP POLICY IF EXISTS "Parents can delete their own frame templates" ON frame_templates;
DROP POLICY IF EXISTS "Users can view own frame templates" ON frame_templates;
DROP POLICY IF EXISTS "Users can insert own frame templates" ON frame_templates;
DROP POLICY IF EXISTS "Users can update own frame templates" ON frame_templates;
DROP POLICY IF EXISTS "Users can delete own frame templates" ON frame_templates;

-- Enable RLS if not already enabled
ALTER TABLE frame_templates ENABLE ROW LEVEL SECURITY;

-- Create simple, non-recursive policies for frame_templates

-- SELECT: Parents can view their own templates
-- (Kids will access frames through the frame_assignments relationship instead)
CREATE POLICY "frame_templates_select_own"
  ON frame_templates FOR SELECT
  USING (parent_id = auth.uid());

-- INSERT: Parents can create templates
CREATE POLICY "frame_templates_insert_own"
  ON frame_templates FOR INSERT
  WITH CHECK (parent_id = auth.uid());

-- UPDATE: Parents can update their own templates
CREATE POLICY "frame_templates_update_own"
  ON frame_templates FOR UPDATE
  USING (parent_id = auth.uid())
  WITH CHECK (parent_id = auth.uid());

-- DELETE: Parents can delete their own templates
CREATE POLICY "frame_templates_delete_own"
  ON frame_templates FOR DELETE
  USING (parent_id = auth.uid());

-- Now fix frame_assignments policies to avoid recursion
DROP POLICY IF EXISTS "Allow viewing frame assignments for parents and kids" ON frame_assignments;
DROP POLICY IF EXISTS "Parents can view frame assignments for their templates" ON frame_assignments;
DROP POLICY IF EXISTS "Parents can create frame assignments" ON frame_assignments;
DROP POLICY IF EXISTS "Parents can update frame assignments" ON frame_assignments;
DROP POLICY IF EXISTS "Parents can delete frame assignments" ON frame_assignments;

-- Enable RLS if not already enabled
ALTER TABLE frame_assignments ENABLE ROW LEVEL SECURITY;

-- For frame_assignments, we need to allow access based on parent ownership
-- But we can't reference frame_templates (causes recursion)
-- Solution: Use a function to check ownership

-- Create a helper function that bypasses RLS (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION is_frame_template_owner(template_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM frame_templates
    WHERE id = template_id AND parent_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- SELECT: Can view if you own the template OR you're the child/event participant
CREATE POLICY "frame_assignments_select"
  ON frame_assignments FOR SELECT
  USING (
    -- Parent owns the template (use function to avoid recursion)
    is_frame_template_owner(frame_template_id)
    OR
    -- Child can see their own assignments
    child_id = auth.uid()
  );

-- INSERT: Only if you own the template
CREATE POLICY "frame_assignments_insert"
  ON frame_assignments FOR INSERT
  WITH CHECK (is_frame_template_owner(frame_template_id));

-- UPDATE: Only if you own the template
CREATE POLICY "frame_assignments_update"
  ON frame_assignments FOR UPDATE
  USING (is_frame_template_owner(frame_template_id))
  WITH CHECK (is_frame_template_owner(frame_template_id));

-- DELETE: Only if you own the template
CREATE POLICY "frame_assignments_delete"
  ON frame_assignments FOR DELETE
  USING (is_frame_template_owner(frame_template_id));

-- Verify policies
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
