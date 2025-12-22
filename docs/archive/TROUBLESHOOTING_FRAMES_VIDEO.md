# Troubleshooting: Frames & Video Playback

## 🎨 Issue 1: "Frames Look Boring" (Just Lines)

### ✅ FIXED - SVG Shapes Now More Prominent (2025-12-12)

**What was fixed:**
- SVG frame shapes (star-burst, cloud-fluffy, heart-love, spikey-fun, scalloped-fancy) are now much more visible
- Increased stroke width from thin (0.5-1px) to bold (1.5-2px)
- Enlarged decorative elements (stars, hearts, clouds, spikes, scallops)
- Added fill colors with opacity to make shapes stand out
- Added console logging to debug which frame shape is rendering

### Decorative SVG Shapes (Now Enhanced!)
Choose one of these for decorative frames:

- **`star-burst`** ⭐ - 16 large star points around edges with thick border
- **`cloud-fluffy`** ☁️ - Fluffy cloud bubbles with filled centers
- **`heart-love`** ❤️ - 8 hearts around the frame with thick outlines
- **`spikey-fun`** - 64 sharp spikes on all edges (16 per side)
- **`scalloped-fancy`** - 52 scalloped circles around perimeter

### CSS-Only Frames (Plain Lines)
These shapes use simple CSS borders, not SVG graphics:
- `bold-classic`
- `rounded-thick`
- `double-border`
- `polaroid`
- `neon-glow` (uses SVG but primarily glowing effect)
- `wavy-thick` (uses SVG sine waves)
- `gradient-frame`

### Testing SVG Frames
1. Create or edit an event
2. Create a new frame
3. Choose an SVG shape: `star-burst`, `cloud-fluffy`, or `heart-love`
4. Save the frame
5. Record a video - you should now see BOLD, PROMINENT decorative shapes!
6. Check logs for: `🎨 CustomFrameOverlay rendering:` to confirm the frame shape

---

## 📹 Issue 2: Video Playback Error -1008

### ✅ FIXED - Bucket Name Mismatch (2025-12-12)

**Root Cause Identified:**
The SQL policies were created for bucket `'videos'`, but the code uploads to bucket `'gratitugram-videos'`! The policies were on the **wrong bucket** all along.

**Evidence:**
- [videoStorageService.js:46](services/videoStorageService.js#L46) - uploads to `'gratitugram-videos'`
- Old ENABLE_VIDEO_PLAYBACK.sql - policies for `'videos'` ❌

**Fix Applied:**
Updated SQL to use correct bucket name: `'gratitugram-videos'`

### Error (Before Fix)
```
ERROR ❌ Video playback error: The AVPlayerItem instance has failed with the error code -1008
```

### ⚡ **CRITICAL FIX REQUIRED - Run Updated SQL**

**YOU MUST RE-RUN THE SQL WITH THE CORRECT BUCKET NAME:**

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Run the **updated** `database/ENABLE_VIDEO_PLAYBACK.sql`
3. The SQL now correctly targets bucket: `'gratitugram-videos'`

### Verify Fix Applied
Run this in Supabase SQL Editor to verify policies exist:

```sql
SELECT
  policyname,
  roles::text,
  cmd::text,
  qual::text as using_clause
FROM pg_policies
WHERE tablename = 'objects'
  AND schemaname = 'storage'
  AND cmd = 'SELECT'
  AND policyname LIKE '%video%'
ORDER BY policyname;
```

**Expected output (MUST show gratitugram-videos):**
```
| policyname                          | roles          | cmd    | using_clause                              |
|-------------------------------------|----------------|--------|-------------------------------------------|
| Parents can read videos from storage| {authenticated}| SELECT | (bucket_id = 'gratitugram-videos'::text) |
| Kids can read videos from storage   | {anon}         | SELECT | (bucket_id = 'gratitugram-videos'::text) |
```

### Alternative: Make Storage Bucket Public (If SQL Doesn't Work)
1. Go to **Supabase Dashboard** → **Storage**
2. Click on the **"gratitugram-videos"** bucket (NOT "videos"!)
3. Click the **"..."** menu → **"Make Public"**
4. Confirm

This bypasses RLS entirely and makes all videos accessible via their URL.

### Test Video URL Directly
Copy a video URL from the logs and paste it into your browser:
```
https://[your-project].supabase.co/storage/v1/object/public/gratitugram-videos/...
```

- **If video loads:** Policies working, error is elsewhere
- **If 403 error:** Policies not working, make bucket public
- **If 404 error:** Video file doesn't exist

---

## 🖼️ Issue 3: Frame Doesn't Render During Recording

### Symptoms from Logs
```
LOG  🖼️  getFrameForGift called with: {...}
LOG  ℹ️  No frame assignment found for this gift/child/event
```

But later:
```
LOG  ✅ Frame found: {...}
```

### Root Cause
The frame query was improved to handle hierarchical matching better. The new code should fix this.

### Testing After Fix
1. Create a NEW test event
2. Create a frame with an **SVG shape** (star-burst, cloud-fluffy, heart-love)
3. Import CSV and assign gifts to a child
4. Log in as kid
5. Click "Record" on any gift
6. **Frame should now render!**

Check logs for:
```
LOG  🔍 Found 1 matching frame assignment(s)
LOG  ✅ Frame found: {...frameShape: "star-burst"...}
```

---

## 🔧 Issue 4: Kid Can't Customize Frames

### Current Status
Kids cannot currently customize frames during recording. This feature doesn't exist yet.

### How It Works Now
1. **Parent creates frame** - chooses shape, colors, custom text
2. **Frame is locked** - kids see the frame but can't change it
3. **Kids add decorations** - can add emoji stickers (balloon, confetti, etc.) but not change the frame itself

### Future Enhancement
To allow kids to customize frames:
1. Add kid decoration UI before recording
2. Let kids choose:
   - Frame color (from parent's palette)
   - Add emoji stickers
   - Choose texture overlay
3. Save kid's customizations to `frame_templates.kid_decorations` JSONB field

**This is NOT currently implemented.**

---

## 📋 Event Creation Workflow Issue

### ✅ FIXED - Frame Creation Removed from Event Creation Screen (2025-12-12)

**What was fixed:**
- Frame creation UI is now hidden during event creation (mode === 'create')
- Frame creation button only appears when **editing** an existing event
- This prevents the broken workflow where eventId was null for new events

### Root Cause (Identified)
In [EventManagementScreen.js:296](EventManagementScreen.js#L296), when creating a new event, `existingEvent?.id` was null. The FrameCreationScreen would receive `eventId: null` and couldn't create a frame assignment, so the frame template was saved but not linked to the event.

### New Workflow
1. **Create event first** → Save event (event gets an ID)
2. **Edit the event** → Open the saved event for editing
3. **Create Frame** button now appears → Click to create frame
4. Frame is properly assigned to event with the correct event ID

### Technical Details
- Frame creation section wrapped in: `{mode === 'edit' && existingEvent?.id && (...)}`
- Only shows when editing an existing event with a valid ID
- Prevents frame assignment errors from null eventId

---

## ✅ Testing Checklist

After fixes are deployed:

### 1. Test Video Playback
- [ ] Parent login → Videos tab → Click pending video
- [ ] Video plays without error -1008
- [ ] If still fails → Make storage bucket public

### 2. Test Frame Rendering
- [ ] Create new event
- [ ] Create frame with **SVG shape** (star-burst)
- [ ] Import CSV with gifts
- [ ] Assign gifts to child
- [ ] Kid login → Record video
- [ ] Frame renders with SVG shape (not plain lines)

### 3. Verify Gift Name Stays Visible
- [ ] During recording, "Say Thank You for your {gift}!" stays visible
- [ ] Doesn't disappear when recording starts

### 4. Verify Child Count
- [ ] Parent dashboard shows correct count (e.g., "43 gifts, 1 kid")
- [ ] Not "0 kids"

---

## 🐛 Known Limitations

1. **Kids can't customize frames** - Future feature
2. **Frame creation during event creation is buggy** - Use workaround (create event first, then frame)
3. **FrameCreationScreen preview shows plain lines** - Cosmetic issue, actual recording will show SVG shapes
4. **No kid playback** - Kids can't watch their own videos yet

---

**For immediate testing:** Run the app and test with an SVG shape like `star-burst` or `cloud-fluffy`!
