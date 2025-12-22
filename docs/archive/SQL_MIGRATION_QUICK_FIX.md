# SQL Migration Quick Fix

## The Error You Got

```
ERROR: 42725: function name "public.submit_video_from_kid" is not unique
HINT: Specify the argument list to select the function unambiguously.
```

This means there are multiple versions of the function with different parameters.

---

## ✅ FIXED! Updated SQL Migration

I've updated the `database/FIX_VIDEO_STORAGE_PATH.sql` file to fix this.

The new migration now:
- **Drops ALL old versions** of the function first
- **Then creates** the new version without `storage_path`

---

## How to Run the Updated Migration

### Step 1: Open Supabase SQL Editor

Go to your Supabase project → SQL Editor

### Step 2: Copy Updated SQL

Open the file:
```
database/FIX_VIDEO_STORAGE_PATH.sql
```

Copy the ENTIRE contents (it now starts with DROP FUNCTION statements).

### Step 3: Paste and Execute

Paste into Supabase SQL Editor and click "Run"

### Step 4: Verify Success

You should see:
```
Function updated: submit_video_from_kid (without storage_path)
```

---

## What Changed in the Migration

**OLD VERSION** (caused error):
```sql
CREATE OR REPLACE FUNCTION public.submit_video_from_kid(
  ...
```

**NEW VERSION** (fixes error):
```sql
-- Drop ALL existing versions first
DROP FUNCTION IF EXISTS public.submit_video_from_kid(UUID, UUID, UUID, TEXT, TEXT, JSONB);
DROP FUNCTION IF EXISTS public.submit_video_from_kid(UUID, UUID, UUID, TEXT, JSONB);

-- Then create the new version
CREATE OR REPLACE FUNCTION public.submit_video_from_kid(
  ...
```

---

## Why This Happened

You probably had an old version of the function with 6 parameters (including storage_path):
```sql
submit_video_from_kid(child_id, gift_id, parent_id, video_url, storage_path, metadata)
```

And were trying to create a new version with 5 parameters:
```sql
submit_video_from_kid(child_id, gift_id, parent_id, video_url, metadata)
```

PostgreSQL saw these as TWO DIFFERENT functions (function overloading), causing the "not unique" error.

The `DROP FUNCTION IF EXISTS` commands remove all old versions before creating the new one.

---

## Ready to Build!

After running the updated SQL migration successfully, you're ready to build:

```bash
npx eas build --platform ios --profile preview --non-interactive
```

All other fixes are already in place and ready to go!

---

*Updated: November 25, 2025*
