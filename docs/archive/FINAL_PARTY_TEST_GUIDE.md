# 🎉 Final Party Test Guide - Complete Workflow

**Goal**: Verify all systems work end-to-end before tomorrow's party
**Time**: 20-30 minutes for full test
**Version**: Nov 14, 2025

---

## 🔴 PRE-TEST CHECKLIST (DO THIS FIRST!)

Before running these tests, you MUST:

- [ ] Run **FIX_RLS_POLICIES.sql** in Supabase
- [ ] Run **FIX_GIFTS_RLS.sql** in Supabase
- [ ] Run **FIX_GIFTS_RLS_FOR_KIDS.sql** in Supabase
- [ ] Restart your app (fully close and reopen)
- [ ] Clear browser console logs (F12 > Console > Clear)

**Without these SQL fixes, all tests will fail with RLS errors.**

---

## 📋 TEST 1: Parent Signup (3 minutes)

**Goal**: Verify parent can create account and see dashboard

### Steps:
1. **Open App** - Click "I'm a Parent"
2. **Sign Up** with:
   - Email: `testparent@example.com`
   - Password: `Test123456!`
   - Name: `Test Parent`
3. **Check Dashboard** - Should see:
   - ✅ "Hi, Test Parent!" greeting
   - ✅ Events tab
   - ✅ Children tab
   - ✅ Videos tab
   - ✅ Settings tab

### Expected Console Logs:
```
✅ Parent account created successfully
✅ Parent profile created
```

### If It Fails:
- Check browser console for RLS errors
- **If you see "permission denied" errors**: Run FIX_RLS_POLICIES.sql again
- Restart app

---

## 📋 TEST 2: Create Event (2 minutes)

**Goal**: Parent creates birthday party event

### Steps:
1. **From Dashboard** → Click **Events** tab (if not there)
2. **Click + Add Event**
3. **Fill Form**:
   - Event Name: `Birthday Party`
   - Description: `Test party for video sharing`
   - Date: `Tomorrow's date`
4. **Click Save**
5. **Check Dashboard** - Event should appear in list

### Expected Results:
```
✅ Event "Birthday Party" appears in events list
✅ Event shows correct date
```

### If It Fails:
- Check for RLS error in console
- **Error**: "permission denied" → Run FIX_GIFTS_RLS.sql
- Refresh page

---

## 📋 TEST 3: Add Child (2 minutes)

**Goal**: Parent creates child and gets access code

### Steps:
1. **From Dashboard** → Click **Children** tab
2. **Click + Add Child**
3. **Fill Form**:
   - Name: `TestChild`
   - Age: `8`
4. **Click Save**
5. **Note the Access Code** displayed (e.g., TES4521)

### Expected Results:
```
✅ Child "TestChild" appears in list
✅ Access Code displayed in format: AAA#### (3 letters + 4 digits)
✅ Console shows: "✅ Child created successfully: TES4521"
```

### If It Fails:
- Check console for errors
- Make sure child table exists in Supabase
- If RLS error: Run FIX_GIFTS_RLS.sql

---

## 📋 TEST 4: Add Guests via CSV (Optional - 3 minutes)

**Goal**: Import guest list for email sharing later

### Steps:
1. **From Dashboard** → Click **Children** tab → Tap child → **Manage Guests**
2. **Tap + Add Guests via CSV**
3. **Create test CSV** (or paste):
   ```
   Name,Email
   Grandma,grandma@example.com
   Uncle John,uncle@example.com
   Aunt Sarah,aunt@example.com
   ```
4. **Click Import**
5. **Verify guests appear** in list

### Expected Results:
```
✅ 3 guests imported successfully
✅ Guests show in list with names and emails
```

### If It Fails:
- CSV format must be exact (Name, Email headers)
- Check browser console for parse errors

---

## 📋 TEST 5: Create Gift (2 minutes)

**Goal**: Parent creates gift for event with guest assignment

### Steps:
1. **From Dashboard** → Click **Events** → Select **Birthday Party**
2. **Click + Add Gift**
3. **Fill Form**:
   - Gift Name: `LEGO Set`
   - From/Giver: `Grandpa`
   - **Start typing "Grandma"** - watch autocomplete dropdown appear!
   - **Click on "Grandma"** in dropdown
4. **Click Save**

### Expected Results:
```
✅ Gift created with autocomplete guest selection
✅ Autocomplete dropdown filters as you type
✅ Gift shows "From Grandma" after saving
```

### If It Fails:
- Autocomplete dropdown not showing? Check console for errors
- "Guest not found"? Make sure guests were added first

---

## 📋 TEST 6: Kid Login (2 minutes)

**Goal**: Child logs in with access code

### Steps:
1. **From Home Screen** → Click **"I'm a Child"**
2. **Enter Access Code**: `TES4521` (from Test 3)
3. **Press ✓ (checkmark)**

### Expected Results:
```
✅ Logged in successfully
✅ Child dashboard shows "Hi, TestChild!"
✅ Gift "LEGO Set" appears in list with "Record" button
✅ Console shows: "✅ Child found: TestChild with code: TES4521"
```

### If It Fails:
- **"Access code not found"**: Code not generated or saved
- **"Permission denied"**: Run FIX_GIFTS_RLS_FOR_KIDS.sql
- Check console for detailed error

---

## 📋 TEST 7: Record Video (5 minutes)

**Goal**: Child records thank you video for gift

### Steps:
1. **From Kid Dashboard** → Click **LEGO Set** gift card
2. **Click Red "Record" Button**
3. **Record 3-5 seconds** of video (say "thank you!")
4. **Camera shows video recorded message**
5. **Click "Next"** to proceed

### Expected Results:
```
✅ Camera activates (shows live feed)
✅ Record button changes to red square during recording
✅ "Preparing camera..." message shows initially
✅ Video saves without "Camera not ready" error
✅ "Video Recorded!" confirmation appears
```

### If It Fails:
- **"Camera is not ready" error**: This was fixed! If it still appears:
  - Close app completely (not just background)
  - Wait 5 seconds
  - Reopen and try again
  - Check you have camera permissions granted
- **"Camera permission denied"**: Grant camera access when prompted

---

## 📋 TEST 8: Customize Video (2 minutes)

**Goal**: Child adds music and text to video

### Steps:
1. **From Video Recording** → Proceed through:
   - **Music Selection**: Pick any song
   - **Video Customization**: Add text "Thank you Grandpa!"
   - **Video Confirmation**: Review and confirm
2. **Click "Submit Video"**

### Expected Results:
```
✅ Video submitted to parent for approval
✅ Dashboard updates to show "Parent Reviewing" status
✅ Navigation goes to "Video Success" screen
```

### If It Fails:
- Check console for video upload errors
- Verify database has videos table
- If RLS error: Might need additional video table RLS policy

---

## 📋 TEST 9: Parent Reviews Video (3 minutes)

### Steps:
1. **Switch back to Parent view** (re-login as parent)
2. **From Dashboard** → Click **Videos** tab
3. **See pending video** from TestChild
4. **Tap video** to review
5. **Watch video preview**
6. **Click "Approve"**
7. **Proceed to share with guests**

### Expected Results:
```
✅ Video appears in Videos tab with "Pending" status
✅ Video preview plays correctly
✅ "Approve" button works
✅ Navigation to SendToGuests screen
```

### If It Fails:
- Video not appearing? Check videos table in Supabase
- Video won't play? Check video file was saved properly
- RLS error? Run appropriate RLS policy fix

---

## 📋 TEST 10: Share Video with Guests (2 minutes)

### Steps:
1. **From Guest Sharing Screen** → See list of guests
2. **Toggle guests to select**: Select "Grandma" and "Uncle John"
3. **Click "Send to 2 Guests"**

### Expected Results:
```
✅ Guest list loads from database
✅ Guests have name + email showing
✅ "Send" button works
✅ Success message appears
✅ Gift status changes to "Sent"
```

### If It Fails:
- Guests not loading? Check guests table RLS policies
- Send fails? Check email service configuration
- Guest emails need to be valid format

---

## 🧪 Logout Test (1 minute each)

### Test Kid Logout:
1. **From Kid Dashboard** → Click logout button (top-right)
2. **Confirm logout**
3. **Should return to auth choice screen**

### Expected:
```
✅ "Are you sure?" confirmation appears
✅ Returns to home screen (not error)
✅ Console shows no "REPLACE" navigation errors
```

### Test Parent Logout:
1. **From Parent Dashboard** → Click logout (in Settings tab)
2. **Confirm logout**
3. **Should return to auth choice screen**

### Expected:
```
✅ Confirmation appears
✅ Returns cleanly to auth screen
```

---

## ✅ FINAL VERIFICATION CHECKLIST

Once all tests pass, check:

- [ ] **Parent can sign up** ✅
- [ ] **Parent can create event** ✅
- [ ] **Parent can add child & get access code** ✅
- [ ] **Parent can import guests** ✅
- [ ] **Gift autocomplete works with guests** ✅
- [ ] **Child can login with access code** ✅
- [ ] **Child can record video** ✅
- [ ] **Child can customize video** ✅
- [ ] **Parent can approve video** ✅
- [ ] **Parent can share with guests** ✅
- [ ] **Kid logout works** ✅
- [ ] **Parent logout works** ✅
- [ ] **No RLS errors in console** ✅
- [ ] **No "REPLACE" navigation errors** ✅
- [ ] **No crash dumps** ✅

---

## 🚨 Common Issues & Fixes

| Issue | Console Error | Fix |
|-------|---------------|-----|
| Can't sign up | "permission denied" | Run FIX_RLS_POLICIES.sql |
| Can't create gifts | "permission denied" | Run FIX_GIFTS_RLS.sql |
| Kid sees no gifts | "permission denied" | Run FIX_GIFTS_RLS_FOR_KIDS.sql |
| Camera error | "Camera not ready" | Close app, wait 5s, reopen |
| Video won't save | RLS error in videos | Check videos table RLS |
| Guests not loading | RLS error in guests | Check guests table RLS |
| Logout error | "REPLACE" navigation | Already fixed! |

---

## 📱 Test Scenarios

### Scenario A: Fresh Parent (No Previous Data)
1. New email for signup
2. Create new event
3. Add new child
4. Complete full video workflow
5. **This tests**: Complete fresh onboarding

### Scenario B: Returning Parent (Has Data)
1. Use existing parent email
2. Use existing child
3. Add new gift to existing event
4. Record new video
5. **This tests**: Multi-session workflow

### Scenario C: Multiple Children
1. Parent has 2+ children
2. Log in as different child
3. Each sees their own gifts
4. **This tests**: Data isolation works

---

## ⏱️ Time Breakdown

```
Pre-test SQL: 5 minutes
Test 1-3 (Setup): 7 minutes
Test 4-5 (Guests): 5 minutes
Test 6-8 (Video): 10 minutes
Test 9-10 (Review): 5 minutes
Logout tests: 2 minutes
Final checks: 5 minutes
─────────────────────
TOTAL: ~35 minutes
```

---

## 🎊 You're Ready!

Once all green checkmarks appear, you have:
- ✅ Fully functional parent workflow
- ✅ Fully functional child workflow
- ✅ Secure RLS policies
- ✅ Guest management
- ✅ Video recording & sharing
- ✅ Email guest sharing
- ✅ Proper session handling

**The app is ready for the party!** 🎉

Need help? Check the console logs first - they're detailed and will point to the exact issue.
