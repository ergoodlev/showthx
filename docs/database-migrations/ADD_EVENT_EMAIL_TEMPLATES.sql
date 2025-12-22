-- ============================================
-- ADD EMAIL TEMPLATE COLUMNS TO EVENTS TABLE
-- ============================================
-- Purpose: Allow parents to create ONE email template per event
--          that applies to ALL videos sent from that event
--
-- Mail Merge Placeholders Supported:
-- - [name] or [guest_name] - Guest's name
-- - [child_name] - Child who recorded the video
-- - [gift_name] - The gift name
-- - [parent_name] - Parent's name
-- ============================================

-- Add email template columns to events table
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS email_template_subject TEXT DEFAULT 'A Special Thank You Video for You!',
ADD COLUMN IF NOT EXISTS email_template_greeting TEXT DEFAULT 'You''ve Received a Thank You Video!',
ADD COLUMN IF NOT EXISTS email_template_message TEXT DEFAULT 'Someone special has created a video message just for you to say thank you.',
ADD COLUMN IF NOT EXISTS email_template_gift_label TEXT DEFAULT 'Thank you for: [gift_name]',
ADD COLUMN IF NOT EXISTS email_template_button_text TEXT DEFAULT 'Watch the Video',
ADD COLUMN IF NOT EXISTS email_template_sign_off TEXT DEFAULT 'With gratitude,';

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_events_parent_id ON public.events(parent_id);

-- =============================================================================
-- VERIFICATION
-- =============================================================================

-- Check that columns were added
SELECT
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_name = 'events'
  AND column_name LIKE 'email_template%'
ORDER BY column_name;

-- Expected output:
-- email_template_button_text | text | 'Watch the Video'
-- email_template_gift_label  | text | 'Thank you for: [gift_name]'
-- email_template_greeting    | text | 'You''ve Received a Thank You Video!'
-- email_template_message     | text | 'Someone special has created a video message just for you to say thank you.'
-- email_template_sign_off    | text | 'With gratitude,'
-- email_template_subject     | text | 'A Special Thank You Video for You!'

-- Sample check: Show first few events with their email templates
SELECT
  id,
  name,
  email_template_subject,
  email_template_greeting
FROM public.events
ORDER BY created_at DESC
LIMIT 3;

-- =============================================================================
-- USAGE EXAMPLE
-- =============================================================================
-- To customize an event's email template:
--
-- UPDATE public.events
-- SET
--   email_template_subject = 'Thank You from [child_name]!',
--   email_template_greeting = 'Hi [name]!',
--   email_template_message = '[child_name] wants to say thank you for [gift_name]. Watch the special video message below!',
--   email_template_gift_label = 'Gift: [gift_name]',
--   email_template_button_text = 'Watch My Thank You Video',
--   email_template_sign_off = 'Love and thanks,'
-- WHERE id = 'your-event-id-here';
-- =============================================================================
