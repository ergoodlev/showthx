# Database Schema Issues - Action Required

## Summary
The app code expects certain database tables/columns that don't currently exist in the Supabase schema. These need to be added to fully enable all features.

---

## Critical Issues (Blocking Features)

### 1. Missing Table: `frame_assignments`
**Feature Affected:** Frame templates on videos
**Error:** `PGRST205 - Could not find the table 'public.frame_assignments'`
**Status:** ⚠️ **Feature Disabled** - App will work but frames won't appear on videos

**Required Table Schema:**
```sql
CREATE TABLE public.frame_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  frame_template_id UUID REFERENCES public.frame_templates(id) ON DELETE CASCADE,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  child_id UUID REFERENCES public.children(id) ON DELETE CASCADE,
  guest_id UUID REFERENCES public.guests(id) ON DELETE CASCADE,
  gift_id UUID REFERENCES public.gifts(id) ON DELETE CASCADE,
  priority INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better query performance
CREATE INDEX idx_frame_assignments_template ON public.frame_assignments(frame_template_id);
CREATE INDEX idx_frame_assignments_event ON public.frame_assignments(event_id);
CREATE INDEX idx_frame_assignments_child ON public.frame_assignments(child_id);
CREATE INDEX idx_frame_assignments_guest ON public.frame_assignments(guest_id);
CREATE INDEX idx_frame_assignments_gift ON public.frame_assignments(gift_id);
CREATE INDEX idx_frame_assignments_priority ON public.frame_assignments(priority DESC);
```

**RLS Policies Needed:**
```sql
-- Parents can manage frame assignments for their events
ALTER TABLE public.frame_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parents can view their frame assignments"
  ON public.frame_assignments FOR SELECT
  USING (
    event_id IN (
      SELECT id FROM public.events WHERE parent_id = auth.uid()
    )
  );

CREATE POLICY "Parents can create frame assignments for their events"
  ON public.frame_assignments FOR INSERT
  WITH CHECK (
    event_id IN (
      SELECT id FROM public.events WHERE parent_id = auth.uid()
    )
  );

CREATE POLICY "Parents can update their frame assignments"
  ON public.frame_assignments FOR UPDATE
  USING (
    event_id IN (
      SELECT id FROM public.events WHERE parent_id = auth.uid()
    )
  );

CREATE POLICY "Parents can delete their frame assignments"
  ON public.frame_assignments FOR DELETE
  USING (
    event_id IN (
      SELECT id FROM public.events WHERE parent_id = auth.uid()
    )
  );

-- Kids need read access to see frames for their gifts
CREATE POLICY "Kids can view frame assignments for their gifts"
  ON public.frame_assignments FOR SELECT
  USING (
    child_id IN (
      SELECT id FROM public.children WHERE access_code = current_setting('app.kid_code', true)
    )
    OR gift_id IN (
      SELECT ga.gift_id
      FROM public.gift_assignments ga
      WHERE ga.child_id IN (
        SELECT id FROM public.children WHERE access_code = current_setting('app.kid_code', true)
      )
    )
  );
```

---

### 2. Missing Column: `guests.phone`
**Feature Affected:** CSV import with phone numbers
**Error:** `PGRST204 - Could not find the 'phone' column of 'guests'`
**Status:** ✅ **Workaround Applied** - Phone data from CSV is now ignored

**Required Migration:**
```sql
ALTER TABLE public.guests
ADD COLUMN phone VARCHAR(20);

-- Optional: Add index if you'll query by phone
CREATE INDEX idx_guests_phone ON public.guests(phone);
```

**Impact:** CSV imports with phone numbers will work without errors. Currently phone data is silently discarded.

---

### 3. Missing Column: `gifts.approved_at`
**Feature Affected:** Parent video approval workflow
**Error:** `PGRST204 - Could not find the 'approved_at' column of 'gifts'`
**Status:** ❌ **Blocking Feature** - Parents cannot approve videos

**Required Migration:**
```sql
ALTER TABLE public.gifts
ADD COLUMN approved_at TIMESTAMP WITH TIME ZONE;
```

**Impact:** Parent video approval will work properly. Currently approval flow crashes when trying to set approved_at timestamp.

---

## Known Issues Summary

| Issue | Feature | Status | Priority |
|-------|---------|--------|----------|
| `frame_assignments` table missing | Frame templates | Disabled | High |
| `gifts.approved_at` column missing | Video approval | Blocking | High |
| `guests.phone` column missing | CSV phone import | Workaround | Medium |
| Date scroller not working | Event creation | Unknown | Medium |

---

## How to Apply Fixes

### Option 1: Supabase Dashboard (Recommended)
1. Go to https://supabase.com and log into your project
2. Navigate to **SQL Editor**
3. Copy and paste the SQL from above
4. Run each CREATE TABLE / ALTER TABLE statement
5. Run the RLS policies

### Option 2: Supabase CLI
```bash
# Create a new migration
supabase migration new add_missing_schema

# Edit the migration file and add the SQL above
# Then apply it
supabase db push
```

---

## After Applying Fixes

Once you've added the missing schema to Supabase:

1. **Test Frame Assignments:**
   - Create a frame template in parent mode
   - Assign it to an event
   - Record a video as a kid
   - Frame should appear on the video

2. **Test CSV Import:**
   - Import a CSV with phone numbers
   - All rows should import successfully without `PGRST204` errors

3. **Rebuild App for TestFlight:**
   ```bash
   eas build --platform ios
   eas submit --platform ios --latest
   ```

---

## Additional Notes

### Gift Names from CSV
The logs show this is working correctly:
- Rows with gift data: Uses actual gift name from CSV ✅
- Rows without gift data: Falls back to "Gift from [Name]" ✅

This is expected behavior when someone RSVPs without listing a gift.

### Date Scroller Issue
This appears to be a separate UI issue not related to database schema. Needs further investigation in the EventSetupScreen component.

---

## Contact

If you need help applying these fixes or encounter issues, please check:
- Supabase documentation: https://supabase.com/docs
- This project's BUG_FIXES_SUMMARY.md for related fixes
