# Video Playback Debugging Guide

## Changes Made

### 1. ✅ Button Text Changed
**File:** [screens/VideoConfirmationScreen.js](screens/VideoConfirmationScreen.js#L418)

Changed button text from "Submit Video" to "Send to my grown-ups!" for a more kid-friendly experience.

### 2. ✅ Enhanced Video Playback Error Logging
**File:** [screens/ParentVideoReviewScreen.js](screens/ParentVideoReviewScreen.js#L430-L450)

Added comprehensive error logging that will show:
- Full error details in console
- Video URI being used
- Whether it's a signed URL or public URL
- User-friendly alert with option to refresh

## Next Steps for Testing

### Test Video Playback

1. **Upload a new video** (after running all SQL migrations)
2. **Go to parent approval screen**
3. **Check console logs** for these messages:

**If video loads successfully:**
```
✅ Video loaded successfully
✅ Video URI: https://[...].supabase.co/storage/v1/object/sign/videos/[...]?token=[...]
✅ Is signed URL? YES
```

**If video fails to load:**
```
❌ Video playback error: [error object]
❌ Error details: {...}
❌ Video URI being used: [URL]
❌ Is signed URL? YES/NO
```

### What to Look For

#### ✅ Good Signs (Video Should Play):
- URI contains `?token=` (signed URL)
- Console shows "Video loaded successfully"
- No error -1008

#### ❌ Bad Signs (Video Won't Play):
- URI does NOT contain `?token=` (public URL - means old video from before fixes)
- Error -1008 appears
- Console shows "Video playback error"

## Common Issues & Solutions

### Issue 1: Old Videos Have Public URLs

**Problem:** Videos uploaded BEFORE the signed URL fix still have public URLs in database.

**Solution:**
1. Record a NEW video after applying all fixes
2. Old videos may need their URLs regenerated manually

**Check:** Look at video_url in database:
```sql
SELECT id, video_url, storage_path, created_at
FROM videos
ORDER BY created_at DESC
LIMIT 5;
```

If `video_url` doesn't contain `?token=`, it's a public URL (old).

### Issue 2: Signed URL Expired

**Problem:** Signed URLs expire after 24 hours.

**Solution:** The code now regenerates signed URLs automatically when loading video for review. If you see an old video failing, click the "Refresh" button in the error alert.

### Issue 3: RLS Policies Not Applied

**Problem:** Storage bucket still blocking access despite policies.

**Solution:**
1. Verify policies exist in Supabase:
   ```sql
   SELECT policyname, roles::text, cmd::text
   FROM pg_policies
   WHERE tablename = 'objects'
     AND schemaname = 'storage'
     AND policyname LIKE '%video%'
   ORDER BY policyname;
   ```

2. Should see these policies:
   - "Kids can read videos for playback" (anon, SELECT)
   - "Parents can read videos for playback" (authenticated, SELECT)

3. If missing, run `database/FIX_VIDEO_PLAYBACK_SIGNED_URLS.sql`

### Issue 4: Bucket Still Public

**Problem:** If bucket was made public as a workaround, signed URLs might not work correctly.

**Solution:**
1. Go to Supabase Dashboard → Storage → videos bucket
2. Ensure it's marked as **PRIVATE** (not public)
3. If public, make it private and re-test

## Email Sending Errors

### To Debug Email Errors

When you see email sending errors, check console logs for:

```
❌ Error sending email: [error message]
```

Common causes:
1. **Missing email credentials** - Check `.env` file has `FROM_EMAIL` and `FROM_NAME`
2. **Email service not configured** - Check Supabase Edge Functions or third-party email service
3. **Invalid recipient email** - Check guest email addresses in database

**To test email sending:**
1. Approve a video
2. Go to "Send to Guests" screen
3. Select a guest with valid email
4. Click send
5. **Share the console logs** if it fails

## Video Submission "Length" Error

### To Debug

The error mentions "length" - this could be:
1. **URL too long** - Signed URLs can be very long
2. **Metadata too long** - Video metadata (decorations, frame info) might exceed limit
3. **Function parameter mismatch** - `submit_video_from_kid` function signature issue

**To diagnose:**
1. Try submitting a video WITHOUT decorations or frames
2. Check console for error message
3. Look for `PGRST` error codes
4. **Share the complete error message** from console

### Likely Cause

If error is about `submit_video_from_kid` function:

Check which version of the function exists:
```sql
SELECT proname, pronargs, proargnames
FROM pg_proc
WHERE proname = 'submit_video_from_kid';
```

Should show 5 parameters:
- p_child_id (UUID)
- p_gift_id (UUID)
- p_parent_id (UUID)
- p_video_url (TEXT)
- p_metadata (JSONB)

If it shows 6 parameters (with `storage_path`), you need to run the updated migration.

## What to Share for Further Debugging

If issues persist, please share:

1. **Console logs** from video submission (complete error message)
2. **Console logs** from video playback attempt
3. **Console logs** from email sending attempt
4. **Screenshot** of Supabase Storage bucket settings (showing if public/private)
5. **Output** of this SQL query:
   ```sql
   -- Check latest video record
   SELECT id, video_url, storage_path, created_at,
          CASE
            WHEN video_url LIKE '%token=%' THEN 'SIGNED'
            ELSE 'PUBLIC'
          END as url_type
   FROM videos
   ORDER BY created_at DESC
   LIMIT 1;
   ```

## Priority Actions

### Immediate (Do Now):
1. ✅ Run `database/FIX_VIDEO_PLAYBACK_SIGNED_URLS.sql` if not done
2. ✅ Verify bucket is PRIVATE in Supabase dashboard
3. ✅ Record a NEW test video (after fixes applied)
4. ✅ Test video playback and share console logs

### Next (After Testing):
1. Test email sending and share any errors
2. Identify the "length" error by attempting video submission
3. Share all console logs for diagnosis

---

**Remember:** The fixes only apply to NEW videos recorded AFTER the SQL migrations are run. Old videos may still have public URLs and need to be re-recorded or have their URLs regenerated manually.
