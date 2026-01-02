-- Fix Events RLS to Allow Kids to View Event Settings
-- CRITICAL BUG FIX: Kids couldn't see allow_kids_frame_choice because RLS blocked them from reading events
-- This enables the "Let kids choose frame" feature to work
-- Run this in Supabase SQL Editor

-- First, check if kids can already read events
-- If not, add a policy

-- Option 1: Create a simple policy allowing kids to view events they're associated with
-- This is needed for kids to see: event name, allow_kids_frame_choice

-- Drop any existing restrictive policy that might be in the way
DROP POLICY IF EXISTS "Kids can view their events" ON events;
DROP POLICY IF EXISTS "Allow kids to view events" ON events;

-- Create policy allowing kids to view events they have gifts in
CREATE POLICY "Allow kids to view events"
  ON events FOR SELECT
  USING (
    -- Parents can always view their own events
    parent_id = auth.uid()
    OR
    -- Kids can view events where they have assigned gifts
    id IN (
      SELECT DISTINCT g.event_id
      FROM gifts g
      JOIN gift_assignments ga ON g.id = ga.gift_id
      JOIN children c ON ga.children_id = c.id
      WHERE c.id = auth.uid()
    )
  );

-- Also ensure kids can read frame_templates for frame selection
DROP POLICY IF EXISTS "Allow kids to view frame templates" ON frame_templates;

CREATE POLICY "Allow kids to view frame templates"
  ON frame_templates FOR SELECT
  USING (
    -- Parents can view their own templates
    parent_id = auth.uid()
    OR
    -- Kids can view templates assigned to events they're part of
    id IN (
      SELECT DISTINCT fa.frame_template_id
      FROM frame_assignments fa
      WHERE fa.event_id IN (
        SELECT DISTINCT g.event_id
        FROM gifts g
        JOIN gift_assignments ga ON g.id = ga.gift_id
        WHERE ga.children_id = auth.uid()
      )
      AND fa.is_active = true
    )
  );

-- Verify policies were created
SELECT
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename IN ('events', 'frame_templates')
ORDER BY tablename, policyname;
