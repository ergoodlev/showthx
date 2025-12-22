# Frame Rendering Setup Guide

## 🎯 Problem
Frames don't render during video recording because:
1. `frame_assignments` table might not exist
2. RLS policies block kids from viewing frame assignments (CRITICAL BUG)

## 🛠️ Solution - Run SQL in Order

### Step 1: Add Missing Columns (if table already exists)
If you get error "column is_public does not exist", run this first:
```bash
database/add_missing_frame_columns.sql
```

### Step 2: Create Frame Tables
Run this in Supabase SQL Editor:
```bash
database/frame_templates_schema.sql
```

### Step 3: Fix RLS Policies for Kids (CRITICAL)
**This is the main fix!** Kids couldn't see frames because RLS blocked them.

Run this in Supabase SQL Editor:
```bash
database/fix_frame_rls_for_kids.sql
```

## ✅ Verification

After running both SQL files, test:

1. **Parent Side:**
   - Create an event
   - Click "Create Frame" at bottom of event screen
   - Choose a frame shape (star-burst, heart-love, cloud-fluffy, etc.)
   - Enter frame name and optional text
   - Click "Save Frame"
   - Check console logs - should see "✅ Frame assignment created"

2. **Kid Side:**
   - Import CSV with gifts (select a child for assignment)
   - Log in as that child
   - Gifts should appear
   - Click "Record Thank You"
   - **Frame should now render on camera view!**
   - Check console logs - should see:
     ```
     🖼️  getFrameForGift called with: {...}
     ✅ Frame found: {...}
     ```

## 🐛 Troubleshooting

### No Frame Renders
Check console logs for:

**"⚠️  Frame assignments table not found"**
→ Run `database/frame_templates_schema.sql`

**"🚫 RLS Policy Error - Kids cannot access frame assignments"**
→ Run `database/fix_frame_rls_for_kids.sql`

**"ℹ️  No frame assignment found for this gift/child/event"**
→ Frame was created but not assigned to the event
→ Recreate the frame from event screen (make sure eventId is passed)

**"❌ Failed to create frame assignment"**
→ Check error details in logs
→ Verify RLS policies allow parent to INSERT into frame_assignments

### Frame Preview Still Looks "Boring"
The FrameCreationScreen preview uses old rendering. This is cosmetic only.
The actual frame WILL render correctly during video recording.

To fix preview (optional): See TODO in `screens/FrameCreationScreen.js:306`

## 📊 Expected Console Output

### When Creating Frame:
```
🔗 Creating frame assignment: { frameId: "...", eventId: "...", ... }
✅ Frame assignment created: [{ ... }]
```

### When Recording Video:
```
🖼️  getFrameForGift called with: { giftId: "...", childId: "...", eventId: "..." }
🔍 Querying frame_assignments with conditions: event_id.eq....
✅ Frame found: { frameId: "...", frameName: "Star Burst Frame", frameShape: "star-burst", ... }
```

## 🎨 Available Frame Shapes

After fixing, parents can choose from these shapes:
- `bold-classic` - Bold rectangular border
- `rounded-thick` - Thick rounded corners
- `double-border` - Double-line border
- `polaroid` - Polaroid photo style
- `neon-glow` - Glowing neon effect
- `wavy-thick` - Wavy border
- `star-burst` - ⭐ Star burst pattern (SVG)
- `spikey-fun` - Spiky border (SVG)
- `cloud-fluffy` - ☁️ Fluffy clouds (SVG)
- `heart-love` - ❤️ Hearts in corners (SVG)
- `scalloped-fancy` - Scalloped edges (SVG)
- `gradient-frame` - Gradient overlay

---

**After running both SQL files, frames should work!**
