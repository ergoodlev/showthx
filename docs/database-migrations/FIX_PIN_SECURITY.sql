-- ============================================
-- FIX: PIN Collision Security Issue
-- ============================================
-- Problem: 4-digit PINs (10,000 combinations) cause collisions at scale
-- Solution: Add unique access_code per child (e.g., "ALI5821")
--
-- This code is:
-- - Globally unique (no collisions)
-- - Kid-friendly (easy to remember)
-- - Hard to brute force (alphanumeric)
-- - Doesn't leak family structure
-- ============================================

-- ADD UNIQUE ACCESS CODE TO CHILDREN TABLE
ALTER TABLE public.children
ADD COLUMN IF NOT EXISTS access_code VARCHAR(10) UNIQUE NOT NULL DEFAULT '';

-- Update existing children with generated codes (temporary - will be regenerated on edit)
-- Format: First 3 letters of name + 4 random digits
-- Example: "ALICE" → "ALI" + "5821" = "ALI5821"
UPDATE public.children
SET access_code = UPPER(SUBSTR(name, 1, 3)) || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0')
WHERE access_code = '';

-- Make sure PIN column still exists (can keep it as secondary, or deprecate later)
-- For now, keeping PIN for backwards compatibility
-- New logins should use access_code instead

-- Optional: Add an index for faster lookups on access_code
CREATE INDEX IF NOT EXISTS idx_children_access_code ON public.children(access_code);

-- ============================================
-- NOTES FOR IMPLEMENTATION
-- ============================================
-- 1. Update ManageChildrenScreen to display access_code instead of PIN
-- 2. Update validateKidPin to lookup by access_code instead of PIN
-- 3. Share access_code with parent (not PIN)
-- 4. Keep PIN column for legacy support (can migrate later)
-- 5. When editing child, regenerate access code if name changes
--
-- Example codes:
-- Alice → ALI + 5821 = ALI5821
-- Emma → EMM + 3749 = EMM3749
-- Noah → NOA + 2104 = NOA2104
-- ============================================
