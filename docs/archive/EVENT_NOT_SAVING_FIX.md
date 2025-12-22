# Events Not Saving to Supabase - ROOT CAUSE & FIX

## The Problem
You created events, clicked save, and they seemed to work... but they never appeared in Supabase.

## Root Cause 🔴

**The schema was missing a critical RLS (Row Level Security) policy for the `parents` table.**

Specifically: There was **no INSERT policy** for the parents table.

### What Happened:
1. You signed up as a parent ✅
2. App tried to create a parent profile in the `parents` table ❌ BLOCKED
3. Because there was no INSERT policy, the insert silently failed
4. Parent profile never created in database
5. When you tried to create event, something was wrong with the parent data
6. Event creation might have failed or not been properly validated

### RLS Policies (Row Level Security)

RLS policies define who can do what on each table. For the `parents` table, we had:

```sql
-- WHAT WAS THERE:
SELECT Policy: ✅ Parents can view own record
UPDATE Policy: ✅ Parents can update own record

-- WHAT WAS MISSING:
INSERT Policy: ❌ Parents can insert own record  ← THIS!
```

Without the INSERT policy, you couldn't create/insert a parent record.

---

## The Fix 🟢

### Option 1: Quick Fix (1 minute)
If your Supabase already has tables set up:

1. **Go to Supabase Dashboard**
   - https://app.supabase.com
   - Select your project

2. **Open SQL Editor**
   - Left sidebar → SQL Editor
   - Click "New Query"

3. **Copy and paste this:**
   ```sql
   CREATE POLICY "Parents can insert own record" ON public.parents FOR INSERT WITH CHECK (auth.uid()::text = id::text);
   ```

4. **Click "Run"**
   - Wait for success message ✅

5. **Test it:**
   - Go back to your app
   - Create a new event
   - Check Supabase dashboard → Tables → events
   - Your event should now appear! ✅

### Option 2: Complete Fresh Setup
If you want to start completely fresh:

1. **Delete all existing data** (in Supabase dashboard → Tables)
2. **Run the updated schema:**
   - Use `SUPABASE_SCHEMA_MINIMAL.sql` (now has the fix)
   - OR copy from `FIX_RLS_POLICIES.sql` for just the fix
3. **Sign up and create event again**
4. Check if events appear

---

## How to Verify the Fix Worked

After running the SQL above, verify it was created:

1. Go to Supabase Dashboard
2. Go to **Authentication** → **Policies** (or same area)
3. Look for the `parents` table
4. You should see:
   - ✅ Parents can view own record (SELECT)
   - ✅ Parents can insert own record (INSERT) ← **NEW**
   - ✅ Parents can update own record (UPDATE)

---

## Why This Happened

The original schema files were incomplete. They had:
- INSERT policies for children ✅
- INSERT policies for events ✅
- INSERT policies for gifts ✅
- INSERT policies for videos ✅

But **forgot** the INSERT policy for parents table ❌

This is now fixed in:
- `SUPABASE_SCHEMA_MINIMAL.sql` (line 169)
- `SUPABASE_SCHEMA_FIXED.sql` (lines 152-154)

---

## What Changed in the Code

### Before (Broken):
```sql
-- PARENTS POLICIES
CREATE POLICY "Parents can view own record" ON public.parents FOR SELECT USING (auth.uid()::text = id::text);
CREATE POLICY "Parents can update own record" ON public.parents FOR UPDATE USING (auth.uid()::text = id::text);
-- Missing INSERT policy!
```

### After (Fixed):
```sql
-- PARENTS POLICIES
CREATE POLICY "Parents can view own record" ON public.parents FOR SELECT USING (auth.uid()::text = id::text);
CREATE POLICY "Parents can insert own record" ON public.parents FOR INSERT WITH CHECK (auth.uid()::text = id::text);
CREATE POLICY "Parents can update own record" ON public.parents FOR UPDATE USING (auth.uid()::text = id::text);
```

---

## Complete Flow (Now Working!)

```
1. Parent Signs Up
   ↓
2. Create auth user ✅
3. Sign in the user ✅
4. INSERT parent profile INTO parents table
   ↓
   [With the fix: INSERT allowed by RLS policy ✅]
   ↓
5. Parent logged in successfully ✅
6. Parent creates event
   ↓
7. INSERT event INTO events table
   ↓
   [RLS policy checks: auth.uid() matches parent_id ✅]
   ↓
8. Event appears in Supabase ✅
9. Event appears in app ✅
```

---

## Testing Steps

After applying the fix:

### 1. Test Event Creation
```
1. Logout (if logged in)
2. Sign up as new parent with email: test@example.com
3. After signup, should be logged in ✅
4. Go to ParentDashboard → Events tab
5. Click "+" button to create event
6. Fill in:
   - Event Name: "Test Event"
   - Event Date: Tomorrow's date
7. Click "Create Event"
8. Should see success (no error) ✅
9. Open Supabase dashboard
10. Go to Tables → events
11. You should see your event there ✅
```

### 2. Test Event List Display
```
1. Go back to app (ParentDashboard)
2. Go to Events tab
3. You should see "Test Event" in the list ✅
```

### 3. Test Complete Parent Workflow
```
1. Event created ✅
2. Click event → goes to GiftManagement ✅
3. Create a gift (test with what works)
4. All should work without database errors ✅
```

---

## Files You May Need to Re-Run

If you already ran the schema before this fix:

**You need to run this ONE line to fix your existing database:**
```sql
CREATE POLICY "Parents can insert own record" ON public.parents FOR INSERT WITH CHECK (auth.uid()::text = id::text);
```

**OR if you want a completely fresh database:**

1. Delete all tables in Supabase
2. Re-run the complete `SUPABASE_SCHEMA_MINIMAL.sql` (it now has the fix)
3. Run step-by-step as before

---

## Summary

| Aspect | Before | After |
|--------|--------|-------|
| INSERT policy for parents | ❌ Missing | ✅ Added |
| Parent profile creation | ❌ Fails silently | ✅ Works |
| Event creation | ❌ Data issue | ✅ Works |
| Event display | ❌ Missing | ✅ Shows |
| **Status** | **Broken** | **FIXED!** |

---

## Questions?

If this fix doesn't work, check:

1. **Did you run the SQL policy creation?** (Line 9-10 above)
2. **Did you wait for the SQL to complete?** (Green success message)
3. **Did you restart the app?** (Important for session refresh)
4. **Did you create a NEW event after the fix?** (Old events might not show)
5. **Can you see the policy in Supabase?** (Go to the policies tab)

---

## One-Line Fix Summary

If you just want the one-liner:

**Run this in Supabase SQL Editor:**
```sql
CREATE POLICY "Parents can insert own record" ON public.parents FOR INSERT WITH CHECK (auth.uid()::text = id::text);
```

**Then test:** Create an event in the app → Check Supabase → Event should appear ✅
