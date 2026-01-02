-- Add guest_type column to guests table
-- Values: 'gift_giver' (gave a gift) or 'rsvp_only' (came to party but no gift)
ALTER TABLE guests ADD COLUMN IF NOT EXISTS guest_type TEXT DEFAULT 'gift_giver';

COMMENT ON COLUMN guests.guest_type IS 'Type of guest: gift_giver or rsvp_only';
