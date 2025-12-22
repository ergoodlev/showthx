-- Fix Frame Assignments RLS to Allow Kids to View Frames
-- CRITICAL BUG FIX: Kids couldn't see frames because RLS blocked them
-- Run this in Supabase SQL Editor

-- Drop the restrictive SELECT policy
DROP POLICY IF EXISTS "Parents can view frame assignments for their templates" ON frame_assignments;

-- Create NEW policy that allows both parents AND kids to view frame assignments
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

-- Verify policy was created
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'frame_assignments';
