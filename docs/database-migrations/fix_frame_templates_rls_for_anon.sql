-- ============================================
-- Fix Frame Templates RLS for Anonymous Users (Kids)
-- ============================================
--
-- CRITICAL BUG: Kids can query frame_assignments but JOIN to frame_templates fails
--
-- ROOT CAUSE:
-- The query in frameTemplateService.js does:
--   .from('frame_assignments')
--   .select(`*, frame_templates (*)`)
--
-- Kids can now read frame_assignments (after running fix_frame_rls_for_anon_users.sql),
-- but they CANNOT read frame_templates, so the JOIN returns null for all frame data.
--
-- EVIDENCE FROM LOGS:
-- - Kid recording: "🔍 Found 1 matching frame assignment(s)" ✅ (frame_assignments policy worked!)
-- - But frame data is null: "frameName": undefined, "frameShape": undefined ❌
-- - Result: "ℹ️  No frame template assigned for this gift"
--
-- SOLUTION:
-- Add RLS policy allowing anonymous users (role: anon) to SELECT from frame_templates
--
-- SECURITY NOTE:
-- This is SAFE because:
-- - Anonymous users are kids authenticated via access codes
-- - Frame templates are just design preferences (colors, shapes, custom text)
-- - No sensitive data in frame_templates
-- - Kids need to see frames during recording
-- ============================================

-- Create policy allowing anonymous users to view frame templates
CREATE POLICY "Allow anonymous users to view frame templates"
  ON frame_templates FOR SELECT
  TO anon
  USING (true);

-- Verify policy was created
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles::text,
  cmd::text
FROM pg_policies
WHERE tablename = 'frame_templates'
ORDER BY policyname;

-- Expected output: Should show policy for anon role
-- "Allow anonymous users to view frame templates" ({anon}, SELECT)
