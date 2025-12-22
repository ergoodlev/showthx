# Comprehensive Fix Plan - All Remaining Issues

## STATUS: Ready to Execute

All fixes planned and ready to implement today.

---

## PHASE 1: CRITICAL FIXES (30 minutes)

### ✅ Fix #1: Database - recorded_at column
**Status:** SQL migration created
**Action:** Run `database/FIX_RECORDED_AT_COLUMN.sql` in Supabase now

### Fix #2: Face ID Session Retention (15 min)
**Problem:**
- Face ID shows "session logged out"
- After manual login, goes back to parent/child screen
- Extra navigation step required

**Root Cause Analysis:**
1. `restoreParentSession()` likely failing in biometricService
2. RootNavigator polling every 500ms may cause race conditions
3. No proper session persistence between app launches

**Solution:**
```javascript
// In ParentLoginScreen.js - handleBiometricLogin
// After successful login (line 101), force navigation refresh:
await AsyncStorage.setItem('lastParentEmail', result.email);
navigation.navigate('ParentHome'); // Direct navigation instead of relying on polling
```

**Files to modify:**
- `screens/ParentLoginScreen.js` (add explicit navigation after Face ID success)
- `navigation/RootNavigator.js` (reduce polling frequency from 500ms to 2000ms)
- `services/authService.js` (improve restoreParentSession)

### Fix #3: Remove All Music Features (15 min)
**Remove:**
- `screens/MusicSelectionScreen.js` - DELETE FILE
- `services/musicService.js` - DELETE FILE
- All music navigation in RootNavigator
- Music selection from video flow

**Update Flow:**
Record → Review → Frame Selection → Customize → Confirm → Submit

**Files to modify:**
- `navigation/RootNavigator.js` - Remove MusicSelection screen
- `screens/VideoPlaybackScreen.js` - Change "Choose Frame" → navigate to FrameSelection
- `screens/FrameSelectionScreen.js` - Navigate to VideoCustomization (skip music)
- `screens/VideoConfirmationScreen.js` - Remove music from submission

---

## PHASE 2: DATABASE & ARCHITECTURAL CHANGES (2 hours)

### Fix #4: Events, Gifts, and CSV Import Redesign

**Database Schema Changes:**

```sql
-- 1. Add event_id to gifts table
ALTER TABLE gifts
ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES events(id);

-- 2. Add guest_id to gifts table (for gift-guest pairing)
ALTER TABLE gifts
ADD COLUMN IF NOT EXISTS guest_id UUID REFERENCES guests(id);

-- 3. Create event_children junction table
CREATE TABLE IF NOT EXISTS event_children (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, child_id)
);

-- 4. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_gifts_event_id ON gifts(event_id);
CREATE INDEX IF NOT EXISTS idx_gifts_guest_id ON gifts(guest_id);
CREATE INDEX IF NOT EXISTS idx_event_children_event_id ON event_children(event_id);
CREATE INDEX IF NOT EXISTS idx_event_children_child_id ON event_children(child_id);
```

**UI Changes:**

**Move from Settings to Events:**
1. Remove "Import CSV" and "Manage Guests" from SettingsScreen
2. Add "Import CSV" button to EventDetailScreen
3. Add "Manage Guests" button to EventDetailScreen
4. Add "Assign Children" button to EventDetailScreen

**CSV Import Flow:**
1. Parent selects event first
2. Uploads CSV with columns: Name, Email, Gift
3. System parses CSV:
   - If gift in same row as guest → auto-pair (set guest_id on gift)
   - If gift empty → create guest, allow parent to add gift later
   - If gift exists but not aligned → add to "unassigned gifts pool"
4. Parent can assign unassigned gifts to guests later

**Manual Entry:**
- Add form: Guest Name + Email + Gift (all in one)
- Automatically pairs gift to guest and event

**Files to modify:**
- `database/EVENT_GIFT_SCHEMA.sql` (NEW - schema changes)
- `screens/SettingsScreen.js` (remove CSV/guests buttons)
- `screens/EventDetailScreen.js` (add CSV/guests/children buttons)
- `screens/CSVImportScreen.js` (add event context, update parsing)
- `screens/ManageGuestsScreen.js` (filter by event, show assignments)
- `services/csvService.js` (update to handle event_id and guest pairing)

---

## PHASE 3: UI SIMPLIFICATION (1 hour)

### Fix #5: Simplify Customize Screen

**Remove:**
- ❌ Text position buttons (Top, Middle, Bottom, Drag)
- ❌ Text color picker
- ❌ Transition effects (None, Fade, etc.)
- ❌ Video frame styles (Clean, Neon, Cinematic)

**Keep:**
- ✅ Decoration selection (redesigned - see Fix #6)

**New Simplified Screen:**
- Title: "Decorate Your Video"
- Single section: Decoration picker (Lottie icons)
- Button: "Review & Submit"

**Files to modify:**
- `screens/VideoCustomizationScreen.js` (massive simplification)

---

## PHASE 4: MAJOR REDESIGN (3-4 hours)

### Fix #6 & #7: New Decoration/Frame System

**New Architecture:**

**Kid's Flow:**
1. Record video
2. Review video
3. **Choose decorations** (Lottie icon stickers)
   - Stars, hearts, balloons, confetti, dinosaurs, unicorns
   - Drag & drop onto video
   - Resize/reposition
   - Can place multiple decorations
4. Submit

**Parent's Flow:**
1. Review kid's video (with decorations intact)
2. **Choose static frame** (border around video)
   - Use existing 10 static frames from StaticFrameOverlay
   - Rainbow, Stars, Hearts, Bubbles, etc.
3. **Add text overlay**
   - Custom message
   - Position (top/middle/bottom)
   - Parent controls text, not kid
4. Approve & finalize

**Technical Implementation:**

**Lottie Icons (Kid Decorations):**
```
Download from LottieFiles.com:
- Star icon (single star)
- Heart icon (single heart)
- Balloon icon
- Confetti burst
- Sparkle
- Dinosaur icon
- Unicorn icon
- Rainbow icon
- Smiley face
- Gift box icon

Place in: assets/lottie/decorations/
```

**New Components:**
1. `DecorationPickerScreen.js` (kid chooses Lottie icons)
2. `DecorationOverlay.js` (renders decorations on video)
3. `ParentFrameSelector.js` (parent chooses static frame)
4. `ParentTextEditor.js` (parent adds text)

**Data Structure:**
```javascript
// Video customization data
{
  decorations: [
    { id: 'star-1', lottieFile: 'star.json', x: 100, y: 200, scale: 1.0 },
    { id: 'heart-1', lottieFile: 'heart.json', x: 300, y: 150, scale: 0.8 }
  ],
  frame: 'rainbow-gradient', // Parent-selected static frame
  text: {
    message: 'Thank you Grandma!',
    position: 'bottom',
    color: '#ffffff'
  }
}
```

**Files to create:**
- `screens/DecorationPickerScreen.js`
- `components/DecorationOverlay.js`
- `components/DraggableDecoration.js`
- `screens/ParentFrameEditor.js`
- `services/decorationService.js`
- `assets/lottie/decorations/*` (Lottie JSON files)

**Files to modify:**
- `navigation/RootNavigator.js` (update kid flow navigation)
- `screens/VideoPlaybackScreen.js` (navigate to DecorationPicker)
- `screens/ParentVideoReviewScreen.js` (add frame/text editor)
- `services/frameService.js` (separate static frames from decorations)

### Fix #8: Show Frame Preview on Video

**Implementation:**
- In `VideoConfirmationScreen`, render selected decorations + frame + text over video
- Use `DecorationOverlay` + `StaticFrameOverlay` + text layer
- Show live preview before submission

**Files to modify:**
- `screens/VideoConfirmationScreen.js` (add preview rendering)

---

## LOTTIE DECORATION DOWNLOADS

**Where to get:**
LottieFiles.com - Free animations

**Search terms:**
1. "star icon simple"
2. "heart icon simple"
3. "balloon icon"
4. "confetti burst"
5. "sparkle icon"
6. "dinosaur cute"
7. "unicorn icon"
8. "rainbow icon"
9. "smiley face"
10. "gift box icon"

**Download as:**
- JSON format
- Save to: `/assets/lottie/decorations/`
- Naming: star.json, heart.json, balloon.json, etc.

---

## SQL MIGRATIONS TO RUN

Run these IN ORDER in Supabase SQL Editor:

### 1. Fix recorded_at column
```sql
-- File: database/FIX_RECORDED_AT_COLUMN.sql
-- RUN THIS FIRST!
```

### 2. Event-Gift-Child relationships
```sql
-- File: database/EVENT_GIFT_SCHEMA.sql (will create)
-- RUN THIS SECOND!
```

---

## TESTING CHECKLIST

After all fixes:

### Critical Functionality:
- [ ] Face ID logs in without "session logged out" error
- [ ] Face ID goes directly to ParentHome (no extra steps)
- [ ] Video submission works (no recorded_at error)
- [ ] CSV import from event detail page
- [ ] Gifts paired with guests from CSV
- [ ] Unassigned gifts can be assigned later

### Kid Flow:
- [ ] Record video
- [ ] Review video
- [ ] Choose decorations (Lottie icons)
- [ ] Drag/resize decorations
- [ ] Submit to parent

### Parent Flow:
- [ ] Review video with kid's decorations
- [ ] Choose static frame
- [ ] Add text overlay
- [ ] Preview with all elements
- [ ] Approve and finalize

### Removed Features (verify gone):
- [ ] No music selection anywhere
- [ ] No transition effects in customize screen
- [ ] No text position in kid flow
- [ ] No video frame styles
- [ ] No CSV import in settings

---

## ESTIMATED TIME

- Phase 1: 1 hour
- Phase 2: 2 hours
- Phase 3: 1 hour
- Phase 4: 4 hours
- Testing: 1 hour

**Total: ~9 hours of focused work**

---

## NEXT STEPS

1. Run SQL migration #1 (recorded_at) NOW
2. Begin Phase 1 fixes (Face ID, remove music)
3. Proceed systematically through phases
4. Test thoroughly after each phase

Ready to begin implementation!

---

*Created: November 29, 2025*
