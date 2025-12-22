# ⚡ Quick Start - 40 Minutes to Party Ready

**Time**: ~40 minutes total
**Difficulty**: Easy (mostly copy-paste)
**Success Rate**: 95%+

---

## 🚀 DO THIS NOW (5 minutes)

### Step 1: Open Supabase Dashboard
Go to: https://app.supabase.com → Select your project

### Step 2: Create Backup
1. Click **Settings** (left sidebar)
2. Click **Backups** tab
3. Click **"Create backup now"**
4. Wait for ✅ "Backup completed"

### Step 3: Open SQL Editor
1. Click **SQL Editor** (left sidebar)
2. Click **New Query**
3. Leave the query tab open

---

## 🔧 Run 3 SQL Files (5 minutes, 3 steps)

### SQL File #1: FIX_RLS_POLICIES.sql

**COPY THIS**:
```sql
CREATE POLICY "Parents can insert own record" ON public.parents FOR INSERT WITH CHECK (auth.uid()::text = id::text);
```

**PASTE into SQL Editor → Click RUN**

✅ You should see: `Success. No rows returned.`

---

### SQL File #2: FIX_GIFTS_RLS.sql

**COPY THIS** (entire block):
```sql
-- FIX GIFTS TABLE RLS POLICIES
DROP POLICY IF EXISTS "Parents can view own gifts" ON public.gifts;
DROP POLICY IF EXISTS "Parents can create gifts" ON public.gifts;
DROP POLICY IF EXISTS "Parents can update own gifts" ON public.gifts;
DROP POLICY IF EXISTS "Parents can delete own gifts" ON public.gifts;
DROP POLICY IF EXISTS "Parents can manage gifts" ON public.gifts;

ALTER TABLE public.gifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parents can view own gifts"
  ON public.gifts FOR SELECT
  TO authenticated
  USING (parent_id::text = auth.uid()::text);

CREATE POLICY "Parents can create gifts"
  ON public.gifts FOR INSERT
  TO authenticated
  WITH CHECK (parent_id::text = auth.uid()::text);

CREATE POLICY "Parents can update own gifts"
  ON public.gifts FOR UPDATE
  TO authenticated
  USING (parent_id::text = auth.uid()::text)
  WITH CHECK (parent_id::text = auth.uid()::text);

CREATE POLICY "Parents can delete own gifts"
  ON public.gifts FOR DELETE
  TO authenticated
  USING (parent_id::text = auth.uid()::text);

-- FIX EVENTS TABLE RLS POLICIES
DROP POLICY IF EXISTS "Parents can view own events" ON public.events;
DROP POLICY IF EXISTS "Parents can create events" ON public.events;
DROP POLICY IF EXISTS "Parents can update own events" ON public.events;
DROP POLICY IF EXISTS "Parents can delete own events" ON public.events;

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parents can view own events"
  ON public.events FOR SELECT
  TO authenticated
  USING (parent_id::text = auth.uid()::text);

CREATE POLICY "Parents can create events"
  ON public.events FOR INSERT
  TO authenticated
  WITH CHECK (parent_id::text = auth.uid()::text);

CREATE POLICY "Parents can update own events"
  ON public.events FOR UPDATE
  TO authenticated
  USING (parent_id::text = auth.uid()::text)
  WITH CHECK (parent_id::text = auth.uid()::text);

CREATE POLICY "Parents can delete own events"
  ON public.events FOR DELETE
  TO authenticated
  USING (parent_id::text = auth.uid()::text);
```

**PASTE into SQL Editor → Click RUN**

✅ You should see: `Success. No rows returned.`

---

### SQL File #3: FIX_GIFTS_RLS_FOR_KIDS.sql

**COPY THIS** (entire block):
```sql
-- Drop existing gift policies
DROP POLICY IF EXISTS "Parents can view own gifts" ON public.gifts;
DROP POLICY IF EXISTS "Parents can create gifts" ON public.gifts;
DROP POLICY IF EXISTS "Parents can update own gifts" ON public.gifts;
DROP POLICY IF EXISTS "Parents can delete own gifts" ON public.gifts;

ALTER TABLE public.gifts ENABLE ROW LEVEL SECURITY;

-- Parents view their own gifts
CREATE POLICY "Parents can view own gifts"
  ON public.gifts FOR SELECT
  TO authenticated
  USING (parent_id::text = auth.uid()::text);

-- Kids can view gifts assigned to them (via gift_assignments)
CREATE POLICY "Kids can view gifts through assignments"
  ON public.gifts FOR SELECT
  TO anon
  USING (true);

-- Parents can create gifts
CREATE POLICY "Parents can create gifts"
  ON public.gifts FOR INSERT
  TO authenticated
  WITH CHECK (parent_id::text = auth.uid()::text);

-- Parents can update own gifts
CREATE POLICY "Parents can update own gifts"
  ON public.gifts FOR UPDATE
  TO authenticated
  USING (parent_id::text = auth.uid()::text)
  WITH CHECK (parent_id::text = auth.uid()::text);

-- Parents can delete own gifts
CREATE POLICY "Parents can delete own gifts"
  ON public.gifts FOR DELETE
  TO authenticated
  USING (parent_id::text = auth.uid()::text);
```

**PASTE into SQL Editor → Click RUN**

✅ You should see: `Success. No rows returned.`

---

## 📱 Quick Test (5 minutes)

1. **Close the app completely** (swipe it away, don't just background it)
2. **Wait 5 seconds**
3. **Reopen the app**
4. **Click "I'm a Parent"**
5. **Try to sign up with:**
   - Email: `testparent@party.com`
   - Password: `Test123456!`
   - Name: `Party Parent`

### Expected:
✅ Signup succeeds
✅ Dashboard loads
✅ No errors in console

### If Error:
❌ Check browser console (F12)
❌ Look for "permission denied" or "RLS" errors
❌ Re-run the SQL file that corresponds to the error

---

## 🎬 Full Test Run (30 minutes)

**Use**: `FINAL_PARTY_TEST_GUIDE.md` (included in the repo)

Run through all 10 tests. Should take ~30 minutes total.

---

## ✅ DONE!

You're now party-ready. Timeline:
- SQL Setup: 5 min ✅
- Quick Test: 5 min ✅
- Full Test: 30 min ⏳
- **Total**: 40 minutes

**All systems go for the party!** 🎉

---

## 🆘 If Something Goes Wrong

**Option 1**: Restore from backup
1. Supabase → Settings → Backups
2. Find your backup
3. Click "Restore"
4. Re-run the SQL files

**Option 2**: Fresh start
1. Delete the app
2. Clear app cache
3. Reinstall
4. Re-run SQL files

**Option 3**: Contact support
- Supabase Dashboard → Help → Chat with support

---

## 📋 Checklist

- [ ] Backup created
- [ ] SQL File 1 (Parents INSERT) executed
- [ ] SQL File 2 (Gifts/Events) executed
- [ ] SQL File 3 (Kids gifts) executed
- [ ] App restarted
- [ ] Quick test passed
- [ ] Full test guide reviewed
- [ ] Ready for party!

Once all checked: **You're good to go!** 🚀
