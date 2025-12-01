# GratituGram - Complete App Map

## Navigation Structure Overview

```
ROOT NAVIGATOR (RootNavigator.js)
├── AuthChoice (Initial screen if not logged in)
│   ├── "I'm a Parent" button → ParentAuth Stack
│   └── "I'm a Child" button → KidAuth Stack
│
├── PARENT AUTH STACK (ParentAuthStack)
│   ├── ParentSignup ✅
│   │   └── Navigate to: ParentLogin (via signup link)
│   │   └── Navigate to: ParentLogin (via "Go to Login" button)
│   │
│   └── ParentLogin ✅
│       ├── Navigate to: ParentSignup (via signup link)
│       └── ✅ Login Success → ParentAppStack
│
├── PARENT APP STACK (ParentAppStack)
│   ├── ParentDashboard ✅ (Root screen)
│   │   ├── Tabs: Events | Videos | Settings
│   │   │
│   │   ├── Tab: EVENTS
│   │   │   ├── FAB Button → Create Event
│   │   │   ├── Event Card → Open Event
│   │   │
│   │   ├── Tab: VIDEOS
│   │   │   └── Video Card → ParentVideoReview
│   │   │
│   │   ├── Tab: SETTINGS
│   │   │   └── Logout Button ✅ → Clear session → RootNavigator re-checks → AuthChoice
│   │   │   └── People Icon (top-right) → Logout (same as above)
│   │   │
│   │   └── Open Event Button
│   │       └── Navigate to: GiftManagement
│   │
│   ├── EventManagement ✅
│   │   ├── Route from: ParentDashboard (Create Event or Edit Event)
│   │   ├── Form: Event Name, Date, Type, Location, Description
│   │   ├── Back button → ParentDashboard
│   │   └── Create/Save button → Supabase + Back to ParentDashboard
│   │
│   ├── GiftManagement ⚠️ (WORKFLOW ISSUE)
│   │   ├── Route from: ParentDashboard (click event card)
│   │   ├── Shows: List of gifts for this event
│   │   ├── Issues:
│   │   │   ❌ No UI to create/manage children yet
│   │   │   ❌ Schema mismatch: giver_name column doesn't exist
│   │   │   ❌ Can't assign kids to gifts
│   │   ├── Back button → ParentDashboard
│   │   └── Create Gift button → [Creates gift but then what?]
│   │
│   ├── ParentVideoReview
│   │   ├── Route from: ParentDashboard (Videos tab, click video)
│   │   ├── Shows: Video from kid, parent approval buttons
│   │   ├── Buttons: Approve | Edit
│   │   ├── Approve → SendToGuests
│   │   └── Edit → VideoCustomization
│   │
│   ├── VideoCustomization
│   │   ├── Route from: ParentVideoReview (Edit button)
│   │   ├── Shows: Video with music, effects, customization
│   │   └── Save → SendToGuests or VideoConfirmation
│   │
│   ├── SendToGuests
│   │   ├── Route from: ParentVideoReview (Approve button)
│   │   ├── Shows: List of guests to share with
│   │   └── Share button → SendSuccess
│   │
│   └── SendSuccess
│       ├── Route from: SendToGuests
│       ├── Shows: Success message
│       └── Back button → ParentDashboard
│
├── KID AUTH STACK (KidAuthStack)
│   └── KidPINLogin ✅
│       ├── PIN Input (4 digits)
│       ├── Login Success → KidAppStack
│       └── Back to AuthChoice (if cancel)
│
└── KID APP STACK (KidAppStack)
    ├── KidPendingGifts ✅ (Root screen)
    │   ├── Shows: List of gifts to record thank you videos for
    │   ├── Logout button → Clear session → RootNavigator re-checks → AuthChoice
    │   └── Gift Card buttons:
    │       ├── "Record Thank You" → VideoRecording
    │       ├── "Parent Reviewing" → (disabled)
    │       └── "Approved" or "Sent" → (view only)
    │
    ├── VideoRecording ✅
    │   ├── Route from: KidPendingGifts (Record Thank You button)
    │   ├── Shows: Camera view + record button
    │   ├── Recording: Max 60 seconds (kids), 120 (adult)
    │   ├── Back button (while recording) → KidPendingGifts
    │   ├── Back button (after recording) → Delete and re-record
    │   └── Next button (after recording) → VideoPlayback
    │
    ├── VideoPlayback ✅
    │   ├── Route from: VideoRecording (Next button)
    │   ├── Shows: Video playback with controls
    │   ├── Play/Pause button
    │   ├── Re-Record button → Back to VideoRecording
    │   └── Add Music button → MusicSelection
    │
    ├── MusicSelection ✅
    │   ├── Route from: VideoPlayback (Add Music button)
    │   ├── Shows: List of songs to choose from
    │   ├── Song selection → VideoCustomization
    │   └── Back button → VideoPlayback
    │
    ├── VideoCustomization ✅
    │   ├── Route from: MusicSelection (select song)
    │   ├── Shows: Video preview with selected music
    │   ├── Customization options: effects, filters, etc.
    │   └── Next button → VideoConfirmation
    │
    ├── VideoConfirmation ✅
    │   ├── Route from: VideoCustomization (Next button)
    │   ├── Shows: Final video preview
    │   ├── Confirm & Submit button → VideoSuccess
    │   └── Edit button → Back to VideoCustomization
    │
    └── VideoSuccess ✅
        ├── Route from: VideoConfirmation (Submit button)
        ├── Shows: Success animation and next steps
        ├── "Back to My Gifts" button → KidPendingGifts
        └── "View Dashboard" button → KidPendingGifts
```

---

## Navigation Flow Diagrams

### ✅ WORKING: Parent Signup/Login Flow
```
AuthChoice
  ↓ "I'm a Parent"
ParentAuthStack
  ├─ ParentSignup → ParentLogin (via link)
  └─ ParentLogin → ParentAppStack (on successful login)
```

### ✅ WORKING: Logout Flow (FIXED!)
```
ParentDashboard (Settings Tab or People Icon)
  ↓ "Log Out" button
Alert: "Are you sure?"
  ↓ Confirm "Log Out"
logoutAndReturnToAuth()
  ├─ supabase.auth.signOut()
  ├─ AsyncStorage.removeItem('parentSessionId')
  ├─ AsyncStorage.removeItem('kidSessionId')
  └─ AsyncStorage.removeItem('parentEmail')
RootNavigator detects empty session
  ↓ (via AppState listener on app foreground OR next state check)
AuthChoice
```

### ✅ WORKING: Kid Login Flow
```
AuthChoice
  ↓ "I'm a Child"
KidAuthStack
  ├─ KidPINLogin (enter PIN)
  └─ KidAppStack on successful PIN validation
```

### ✅ WORKING: Video Recording Flow
```
KidPendingGifts
  ↓ Click "Record Thank You"
VideoRecording
  ↓ Record video + Click "Next"
VideoPlayback
  ↓ Review + Click "Add Music"
MusicSelection
  ↓ Select song
VideoCustomization
  ↓ Customize
VideoConfirmation
  ↓ Confirm & Submit
VideoSuccess
  ↓ "Back to My Gifts" or "View Dashboard"
KidPendingGifts
```

### ⚠️ PARTIALLY WORKING: Event Creation Flow
```
ParentDashboard (Events Tab)
  ↓ Click FAB "+" button
EventManagement (mode: create)
  ├─ Fill: Event Name, Date, Type, Location, Description
  ├─ Click "Create Event"
  ├─ Save to Supabase ✅
  └─ Back to ParentDashboard ✅
ParentDashboard
  ├─ ❌ Event not showing in list (QUERY ISSUE)
  ├─ ❌ Even if it shows, clicking it goes to GiftManagement
  └─ No navigation back from GiftManagement
```

### ❌ BROKEN: Gift Assignment Flow
```
ParentDashboard (Events Tab)
  ↓ Click event card
GiftManagement
  ├─ ❌ Can't create children (no UI)
  ├─ ❌ Can't assign kids to gifts (schema issue)
  ├─ ❌ Can't proceed to parent video review
  └─ Back button → ParentDashboard
```

---

## Critical Issues Summary

### 🔴 Blocking Issues (Must Fix)
1. **Event Query** - Events not showing after creation
   - Query: Line 81-88 in ParentDashboardScreen
   - Issue: Schema column mismatch

2. **No Child Management UI** - Can't create/link kids
   - Missing: ManageChildrenScreen or similar
   - Needed: Parent must be able to create child accounts

3. **Gift Schema Mismatch** - giver_name column missing
   - Error: When creating gifts in GiftManagementScreen
   - Fix: Rename column or update query

4. **Gift Assignment** - No way to assign kids to gifts
   - Issue: gift_assignments table exists but no UI

### 🟡 Navigation Issues (Should Fix)
1. **GiftManagement Dead End** - No way back to normal flow
   - Should: Go back to events, or navigate to next step

2. **Event Editing** - How do you edit events?
   - Should: Click event → Edit button → EventManagement

### 🟢 Working
1. ✅ Parent signup/login
2. ✅ Kid PIN login
3. ✅ Logout (FIXED!)
4. ✅ Video recording flow
5. ✅ Video playback and customization
6. ✅ Parent video review screens

---

## Expected Complete Workflow

### From Parent Perspective:
1. **Create Account** → ParentSignup → ParentLogin ✅
2. **Create Child** → ParentDashboard Settings → Create Child ❌ (MISSING)
3. **Create Event** → ParentDashboard → EventManagement ✅
4. **Create Gifts** → EventManagement → GiftManagement ✅ (but issues)
5. **Assign Kids to Gifts** → GiftManagement → (Assign Kids) ❌ (MISSING)
6. **Share Event with Kids** → (Send PIN/invite) ❌ (MISSING)
7. **Review Videos** → ParentDashboard Videos → ParentVideoReview ✅
8. **Approve & Share** → ParentVideoReview → SendToGuests → SendSuccess ✅
9. **Logout** → ParentDashboard Settings → Logout ✅

### From Kid Perspective:
1. **Receive PIN from Parent** ❌ (Not yet implemented)
2. **Login with PIN** → KidPINLogin ✅
3. **View Assigned Gifts** → KidPendingGifts ✅
4. **Record Thank You Video** → VideoRecording → VideoPlayback → MusicSelection → VideoCustomization → VideoConfirmation → VideoSuccess ✅
5. **Back to Gift List** → KidPendingGifts ✅
6. **Logout** → KidPendingGifts → Logout ✅

---

## Files and Their Roles

### Navigation
- `RootNavigator.js` - Main navigation tree, session management (FIXED: Now has AppState listener)
- `ParentAuthStack`, `ParentAppStack`, `KidAuthStack`, `KidAppStack` - Separate navigation stacks

### Parent Screens
- `ParentSignupScreen.js` - Account creation ✅
- `ParentLoginScreen.js` - Account login ✅
- `ParentDashboardScreen.js` - Main hub with tabs (Events, Videos, Settings) ✅
- `EventManagementScreen.js` - Create/edit events ✅
- `GiftManagementScreen.js` - Create/manage gifts ⚠️ (schema issues)
- `ParentVideoReviewScreen.js` - Review/approve videos ✅
- `VideoCustomizationScreen.js` - Edit video with music ✅
- `SendToGuestsScreen.js` - Share with guests ✅
- `SendSuccessScreen.js` - Confirmation ✅

### Kid Screens
- `KidPINLoginScreen.js` - PIN login ✅
- `KidPendingGiftsScreen.js` - Gift list for kids ✅
- `VideoRecordingScreen.js` - Camera recording ✅
- `VideoPlaybackScreen.js` - Video preview ✅
- `MusicSelectionScreen.js` - Choose music ✅
- `VideoCustomizationScreen.js` - Add effects ✅
- `VideoConfirmationScreen.js` - Final check ✅
- `VideoSuccessScreen.js` - Success animation ✅

### Services
- `authService.js` - Signup, login, PIN validation
- `emailService.js` - Send emails (welcome, notifications)
- `databaseService.js` - Supabase queries
- `videoService.js` - Video uploads and processing
- `navigationService.js` - Navigation helpers (FIXED: logoutAndReturnToAuth)

---

## Next Steps to Implement

### Phase 1: Fix Core Issues (1-2 hours)
- [ ] Fix event display query (ParentDashboardScreen)
- [ ] Create ManageChildrenScreen for parent to add kids
- [ ] Fix GiftManagementScreen schema issues

### Phase 2: Complete Workflow (2-3 hours)
- [ ] Implement gift-to-kid assignment UI
- [ ] Create PIN sharing mechanism
- [ ] Add navigation from gift creation to next step

### Phase 3: Polish (1-2 hours)
- [ ] Better error messages
- [ ] Loading states
- [ ] Animations and transitions

---

## Testing Checklist

- [ ] Parent signup works
- [ ] Parent login works
- [ ] Logout works (app returns to AuthChoice)
- [ ] Event creation saves and displays
- [ ] Event editing works
- [ ] Can create children
- [ ] Can create gifts
- [ ] Can assign kids to gifts
- [ ] Kid login with PIN works
- [ ] Kid can see assigned gifts
- [ ] Kid can record video through full flow
- [ ] Parent can review and approve kid's video
- [ ] Parent can share with guests
- [ ] All screens have proper back navigation

