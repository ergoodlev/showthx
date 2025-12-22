# Critical Fixes Plan - Build 31

## Overview
11 critical issues identified that need systematic fixes before next build.

---

## Priority 1: Critical Data/Functionality Issues

### 1. Gift/Guest Pairing Doesn't Persist ⚠️⚠️⚠️
**Problem:** Shows "unknown guest, unknown gift" on parent review dashboard
**Root Cause:** Likely missing `guest_id` column on gifts table or improper foreign key relationship
**Fix:**
- Check database schema - ensure `gifts.guest_id` exists
- Verify RLS policies allow reading guest data
- Update video submission to include guest_id
- Fix parent review screen to JOIN gifts with guests

**Files to Update:**
- `database/EVENT_GIFT_SCHEMA.sql` - verify schema
- Video submission flow - ensure guest_id is saved
- Parent review screen - fix query to include guest join

---

### 2. CSV Upload - Old Guests Persist ⚠️⚠️
**Problem:** Old guests from deleted events remain after new CSV upload
**Root Cause:** CSV import doesn't filter by event_id or clean old data
**Fix:**
- Add event_id filter to guest queries
- Delete old guests for this event before importing new CSV
- Update RLS policies to scope guests to events

**Files to Update:**
- `services/csvService.js` - add delete old guests before import
- Guest management screens - filter by event_id

---

###

 3. Gifts Upload Issue ⚠️⚠️
**Problem:** Gifts didn't upload properly
**Root Cause:** Unknown - need to investigate
**Fix:**
- Check gift creation form/flow
- Verify database insertion
- Check RLS policies on gifts table

**Files to Update:**
- Gift management screens
- Database policies

---

### 4. Parent Video Review - Black Screen ⚠️⚠️⚠️
**Problem:** Video doesn't play in parent review - just black square
**Root Cause:** Likely video URL not loading or Video component misconfigured
**Fix:**
- Check video URL is valid in database
- Verify Video component has correct props
- Add error handling and loading states

**Files to Update:**
- Parent review screen (find the file that shows videos)

---

### 5. Send Video Feature Doesn't Work ⚠️⚠️⚠️
**Problem:** Send video functionality broken
**Root Cause:** Need to investigate
**Fix:**
- Find send video screen
- Check email service integration
- Verify video URL generation

**Files to Update:**
- Send video screen
- Email service

---

### 6. Send Video Allows Any Guest ⚠️⚠
**Problem:** Can pair video with ANY guest instead of the assigned one
**Root Cause:** Send video screen doesn't filter to assigned guest
**Fix:**
- Update send video screen to only show the guest assigned to the gift
- Pre-select the assigned guest
- Disable guest picker if already assigned

**Files to Update:**
- Send video screen

---

### 7. Face ID Still Doesn't Work ⚠️⚠️
**Problem:** Face ID authentication fails
**Root Cause:** Previous fixes didn't resolve
**Fix:**
- Check biometric authentication implementation
- Verify iOS permissions
- Add better error handling

**Files to Update:**
- `screens/ParentLoginScreen.js`

---

## Priority 2: UX/Visual Issues

### 8. Splash Screen Wrong ⚠️
**Problem:** Splash screen doesn't show ONLY the artsy script logo
**Current:** Uses splash-icon.png with dark blue background
**Fix:**
- Update app.json splash configuration
- Ensure only artsy logo shows (no background graphics)
- Set appropriate background color

**Files to Update:**
- `app.json` - splash configuration
- May need new splash asset

---

### 9. Stickers Not Draggable ⚠️
**Problem:** Stickers randomly placed, can't be dragged
**Fix:**
- Add PanResponder to decoration overlays
- Allow drag and drop positioning
- Save final positions

**Files to Update:**
- `screens/VideoCustomizationScreen.js`

---

### 10. Frame System Confusion ⚠️
**Problem:** Kids should choose frame STYLES, parents should only edit TEXT
**Current:** Unclear separation
**Fix:**
- Kids get frame style picker (visual borders/overlays)
- Parents get text editor only
- Clarify the workflow

**Files to Update:**
- Kid video flow screens
- Parent review screens
- Frame service

---

### 11. Frames Not Showing ⚠️
**Problem:** Frames don't appear on video preview/record screen
**Fix:**
- Add frame overlay rendering to video screens
- Show selected frame during recording/preview

**Files to Update:**
- Video recording screen
- Video playback screen

---

## Implementation Order

### Phase A: Database/Data Fixes (Most Critical)
1. Fix gift/guest pairing persistence
2. Fix CSV upload - clean old guests
3. Fix gifts upload
4. Fix send video to use assigned guest only

### Phase B: Video Playback Fixes
5. Fix parent video review black screen
6. Fix send video feature

### Phase C: Authentication
7. Fix Face ID

### Phase D: UX Improvements
8. Fix splash screen
9. Make stickers draggable
10. Fix frame system architecture
11. Add frames to video preview/record

---

## Estimated Time
- Phase A: 2-3 hours (complex database/relationship fixes)
- Phase B: 1-2 hours
- Phase C: 30-60 min
- Phase D: 2-3 hours

**Total: 6-9 hours of focused development**

---

## Next Steps

**Before proceeding, I need clarification on:**

1. **Frame System Vision:** Can you describe exactly how frames should work?
   - What do kids choose? (border styles, overlay graphics?)
   - What do parents edit? (just text overlay?)
   - Where/when does each happen in the flow?

2. **Splash Screen:** Do you have the artsy script logo asset, or should I use the existing one differently?

3. **Priority:** Which of these 11 should I tackle first? Or should I work through them in the order I proposed?

---

*Created: November 29, 2025*
*For Build: 31+*
