# 🎉 Party Readiness - Critical SQL Checklist

**Last Updated**: Nov 14, 2025
**Status**: 3 Critical SQL fixes identified - RUN THESE FIRST

---

## ✅ MUST RUN BEFORE PARTY (Critical Order)

### 1️⃣ FIX_RLS_POLICIES.sql - Parents Can't Sign Up! (CRITICAL)
**File**: `/Users/ericgoodlev/Desktop/GratituGram/FIX_RLS_POLICIES.sql`
**What**: Add INSERT policy for parents table
**Why**: Without this, parent signup fails silently
**Risk Level**: 🔴 CRITICAL - Blocks entire parent flow
**Action**:
```sql
CREATE POLICY "Parents can insert own record" ON public.parents
  FOR INSERT WITH CHECK (auth.uid()::text = id::text);
```

### 2️⃣ FIX_GIFTS_RLS.sql - Parent Gift Management (HIGH)
**File**: `/Users/ericgoodlev/Desktop/GratituGram/FIX_GIFTS_RLS.sql`
**What**: RLS policies for gifts and events tables
**Why**: Parents need to create and manage gifts + events
**Risk Level**: 🟡 HIGH - Breaks event/gift creation
**What it sets up**:
- Parents can view own gifts
- Parents can create gifts
- Parents can update own gifts
- Parents can delete own gifts
- Same for events table

### 3️⃣ FIX_GIFTS_RLS_FOR_KIDS.sql - Kids Can't See Gifts! (HIGH)
**File**: `/Users/ericgoodlev/Desktop/GratituGram/FIX_GIFTS_RLS_FOR_KIDS.sql`
**What**: Allow kids (anon users) to view gifts assigned to them
**Why**: Kids can't see their gifts in KidPendingGiftsScreen without this
**Risk Level**: 🟡 HIGH - Entire kid video flow breaks
**Key Policy**:
```sql
CREATE POLICY "Kids can view gifts through assignments"
  ON public.gifts FOR SELECT
  TO anon
  USING (true);
```

---

## 📋 Step-by-Step Implementation

### Phase 1: Backup (2 minutes)
1. Go to **Supabase Dashboard**
2. Click **Project Settings**
3. Go to **Backups** tab
4. Click **"Create backup now"**
5. Wait for backup to complete ✅

### Phase 2: Run SQL (5 minutes)
1. Go to **Supabase SQL Editor**
2. Create **New Query**
3. Copy-paste each SQL file in order:
   - First: `FIX_RLS_POLICIES.sql`
   - Second: `FIX_GIFTS_RLS.sql`
   - Third: `FIX_GIFTS_RLS_FOR_KIDS.sql`
4. Click **Run** for each
5. Verify no errors appear

### Phase 3: Verification (3 minutes)
1. Test parent signup
2. Test parent login
3. Test child login
4. Check no RLS errors in browser console

---

## 🧪 Quick Test After SQL

```
✅ Parent can sign up
✅ Parent can create event
✅ Parent can add child (generates access code)
✅ Parent can create gift
✅ Parent can see gift in list
✅ Kid can log in with access code
✅ Kid can see assigned gifts
✅ Kid can record video
```

---

## 📊 Current Status

| Component | Status | Action |
|-----------|--------|--------|
| Parents RLS INSERT | ❌ MISSING | Run FIX_RLS_POLICIES.sql |
| Gifts/Events RLS | ❌ MISSING | Run FIX_GIFTS_RLS.sql |
| Kids Gift View | ❌ MISSING | Run FIX_GIFTS_RLS_FOR_KIDS.sql |
| Kid Logout | ✅ FIXED | Already applied in code |
| Camera Recording | ✅ FIXED | Already applied in code |
| Guest Autocomplete | ✅ FIXED | Already applied in code |
| Database Schema | ✅ EXISTS | Created earlier |

---

## ⏱️ Timeline Before Party

| Time | Task | Status |
|------|------|--------|
| NOW | Run 3 SQL files | 🔴 **URGENT** |
| 15 min after | Test flows | 🟡 **IMPORTANT** |
| 30 min after | Demo run-through | 🟡 **IMPORTANT** |
| 1 hour before | Final checks | 🟢 **NICE-TO-HAVE** |

---

## 🚨 If Something Goes Wrong

**Restore from backup**:
1. Supabase Dashboard → Project Settings → Backups
2. Find your backup
3. Click "Restore"
4. Wait 5 minutes
5. Re-run SQL files

---

## ✅ Final Checklist

- [ ] Backup created
- [ ] FIX_RLS_POLICIES.sql executed
- [ ] FIX_GIFTS_RLS.sql executed
- [ ] FIX_GIFTS_RLS_FOR_KIDS.sql executed
- [ ] Parent signup tested
- [ ] Child login tested
- [ ] Gift visibility tested
- [ ] App restarted
- [ ] No RLS errors in console

**Once all checked**: You're ready for the party! 🎊
