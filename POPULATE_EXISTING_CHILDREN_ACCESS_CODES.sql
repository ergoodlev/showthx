-- Populate access_code for existing children that don't have one
-- Run this in Supabase SQL Editor to fix the display issue

-- First, check which children are missing access codes
-- SELECT id, name, access_code FROM public.children WHERE access_code IS NULL OR access_code = '';

-- Update all children without access codes
-- Generate format: First 3 letters of name + 4-digit random number
UPDATE public.children
SET access_code = UPPER(SUBSTR(name, 1, 3)) || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0')
WHERE access_code IS NULL OR access_code = '';

-- Verify the update worked
-- SELECT id, name, access_code FROM public.children ORDER BY created_at DESC;
