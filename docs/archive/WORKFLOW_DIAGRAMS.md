# GratituGram Workflow Diagrams and Flow Maps

## 1. CURRENT EVENT CREATION FLOW

```
ParentDashboardScreen
    │
    ├─ EVENTS Tab (Default)
    │   ├─ Shows list of events
    │   ├─ Event count header
    │   └─ FAB (Floating Action Button) ──────────┐
    │                                               │
    │                                               ▼
    │                                   EventManagementScreen
    │                                       │
    │                                       ├─ Form Fields:
    │                                       │   - Event Name (required)
    │                                       │   - Event Type (required)
    │                                       │   - Event Date (required)
    │                                       │   - Location (optional)
    │                                       │   - Description (optional)
    │                                       │
    │                                       ├─ Validation ✓
    │                                       │
    │                                       ├─ Get Current User
    │                                       │   └─ supabase.auth.getUser()
    │                                       │
    │                                       ├─ INSERT INTO events table
    │                                       │   └─ ⚠️ ISSUE: May fail if event_type
    │                                       │      column doesn't exist
    │                                       │
    │                                       └─ navigation.goBack()
    │                                               │
    └───────────────────────────────────────────────┘
        │
        ├─ useFocusEffect triggers loadDashboardData()
        │
        ├─ QUERY: SELECT * FROM events WHERE parent_id = user.id
        │   └─ ⚠️ ISSUE: gifts:gifts(count) syntax may fail
        │
        └─ Render events in FlatList
            ├─ Event card shows:
            │   - Event name
            │   - Event type
            │   - Event date
            │   - Gift count ⚠️ (May show 0 due to query issue)
            │   - Kid count (hardcoded as 0)
            │
            └─ On event card press:
                └─ handleEventPress()
                    └─ navigation.navigate('GiftManagement', {eventId, eventName})
```

**Status:** PARTIALLY WORKING
- UI is complete
- Navigation works
- Event saves to DB (if schema supports it)
- Loading events back has query issues

---

## 2. GIFT MANAGEMENT & KID ASSIGNMENT FLOW

```
GiftManagementScreen
    │
    ├─ On Screen Focus:
    │   ├─ loadGifts()
    │   │   └─ Query gift_assignments(children(name))
    │   │       └─ ⚠️ CRITICAL: Table may not exist
    │   │
    │   └─ loadKids()
    │       └─ SELECT id, name FROM children WHERE parent_id = user.id
    │           └─ ⚠️ If no kids exist → empty array
    │
    ├─ Display Gifts List (FlatList)
    │   └─ Show each gift with assigned kids
    │
    ├─ FAB (Create Gift Button)
    │   │
    │   └─ Opens Modal: "Create Gift"
    │       │
    │       ├─ Form Fields:
    │       │   - Gift Name (required)
    │       │   - Giver Name (required)
    │       │       └─ ⚠️ Column may not exist in minimal schema
    │       │   - Description (optional)
    │       │   - Kid Checkboxes
    │       │       ├─ Loaded from loadKids() state
    │       │       └─ ⚠️ If empty: Validation fails "Select at least one kid"
    │       │
    │       ├─ Validate Form
    │       │   └─ At least one kid must be selected
    │       │
    │       ├─ INSERT INTO gifts
    │       │   │
    │       │   └─ ⚠️ FAIL Points:
    │       │       - giver_name column doesn't exist (minimal schema)
    │       │       - event_type column reference
    │       │
    │       ├─ DELETE FROM gift_assignments WHERE gift_id = giftId
    │       │   └─ ⚠️ CRITICAL: Table may not exist
    │       │
    │       └─ INSERT INTO gift_assignments (for each selected kid)
    │           │
    │           └─ ⚠️ Column mismatch: children_id vs child_id
    │
    ├─ Edit Gift: Opens Modal with pre-filled data
    │   └─ Same save flow as create
    │
    └─ Delete Gift: Soft delete confirmation
        └─ Removes from local state
```

**Status:** BROKEN - CRITICAL ISSUES
- Dependencies on missing table (gift_assignments)
- Column name mismatches (giver_name, children_id)
- Schema inconsistency between minimal and phase2

---

## 3. CRITICAL MISSING PIECE: KID/CHILD MANAGEMENT

```
ParentDashboardScreen
    │
    ├─ EVENTS Tab
    ├─ VIDEOS Tab
    └─ SETTINGS Tab ← Where kid management should be!
        │
        └─ Current Content:
            ├─ Parent profile card
            │   ├─ Avatar/Icon
            │   ├─ Full name
            │   └─ Email
            │
            ├─ [NO KID MANAGEMENT]
            │
            ├─ Logout button
            │
            └─ Version number
```

**MISSING: Dedicated Kids Management Screen**

```
What SHOULD exist:
    
    ParentDashboardScreen → SETTINGS Tab
        │
        └─ Settings Screen Content:
            ├─ Parent Profile Section
            │   ├─ Name
            │   ├─ Email
            │   └─ Edit Profile button
            │
            ├─ Manage Children Section ← ⚠️ MISSING
            │   ├─ List of children:
            │   │   ├─ Child name
            │   │   ├─ Age
            │   │   ├─ Edit button
            │   │   └─ Delete button
            │   │
            │   ├─ FAB: "Add Child"
            │   │   │
            │   │   └─ Modal: "Create Child"
            │   │       ├─ Field: Name (required)
            │   │       ├─ Field: Birth Date (optional)
            │   │       ├─ Field: PIN (required, 4 digits)
            │   │       │   └─ Generate random or manual entry?
            │   │       │
            │   │       ├─ INSERT INTO children
            │   │       │   ├─ id (UUID)
            │   │       │   ├─ parent_id (from auth)
            │   │       │   ├─ name (from form)
            │   │       │   ├─ pin (from form)
            │   │       │   └─ created_at (now)
            │   │       │
            │   │       └─ Save button
            │   │
            │   └─ Display PIN for kid to use at login
            │       └─ "Share this PIN with your child"
            │
            └─ Logout button
```

---

## 4. KID AUTHENTICATION & LOGIN FLOW

```
RootNavigator
    │
    ├─ Check session on startup
    │   ├─ AsyncStorage.getItem('parentSessionId') → Parent logged in
    │   ├─ AsyncStorage.getItem('kidSessionId') → Kid logged in
    │   └─ Neither → Show AuthChoice
    │
    ├─ AuthChoice Screen
    │   ├─ "I'm a Parent" button → ParentAuthStack
    │   └─ "I'm a Child" button → KidAuthStack
    │
    └─ KidAuthStack
        │
        └─ KidPINLoginScreen
            │
            ├─ Custom numpad UI (1-9, 0, delete)
            ├─ PIN display dots (••••)
            │
            └─ On PIN submitted (4 digits):
                │
                ├─ Call validateKidPin(pin)
                │   │
                │   └─ ⚠️ BROKEN: Auth Service (authService.js:171-202)
                │       │
                │       ├─ ⚠️ ISSUE 1: Queries wrong table
                │       │   │
                │       │   └─ CURRENT CODE:
                │       │       SELECT id, full_name, child_name 
                │       │       FROM parents 
                │       │       WHERE kid_code = pin
                │       │
                │       │   └─ SHOULD BE:
                │       │       SELECT id, name, parent_id
                │       │       FROM children
                │       │       WHERE pin = pin
                │       │
                │       ├─ ⚠️ ISSUE 2: Wrong column references
                │       │   └─ Uses: parents.child_name (doesn't exist)
                │       │   └─ Should use: children.name
                │       │
                │       ├─ ⚠️ ISSUE 3: PIN storage insecure
                │       │   └─ Stores PIN in AsyncStorage (UNENCRYPTED)
                │       │   └─ Should store: child ID
                │       │
                │       └─ ⚠️ ISSUE 4: Security - Lockout
                │           └─ 5 attempts → 15 min lockout (good)
                │           └─ But PIN is stored plaintext (bad)
                │
                ├─ If PIN valid:
                │   ├─ Store in AsyncStorage:
                │   │   ├─ kidSessionId = pin ⚠️ (should be child.id)
                │   │   ├─ parentId = parent.id
                │   │   └─ kidName = child.name
                │   │
                │   └─ navigation.replace('KidPendingGifts')
                │
                └─ If PIN invalid:
                    ├─ Increment attempt counter
                    └─ Show "Wrong PIN. X attempts remaining"
```

**Status:** BROKEN
- Queries wrong table
- References non-existent columns
- Insecure PIN storage
- Can't proceed to KidPendingGifts

---

## 5. KID SEES GIFTS & RECORDS VIDEO FLOW

```
KidPendingGiftsScreen
    │
    ├─ On screen focus:
    │   ├─ Get kid session from AsyncStorage
    │   │   └─ kidSessionId (actually PIN, should be child ID)
    │   │
    │   └─ Query gift_assignments
    │       │
    │       └─ ⚠️ BROKEN QUERY (KidPendingGiftsScreen.js:62-80)
    │           │
    │           SELECT *
    │           FROM gift_assignments
    │           WHERE children_id = storedKidId  ← ⚠️ Wrong column
    │           │
    │           └─ Schema has: child_id (not children_id)
    │
    ├─ If gifts load:
    │   │
    │   ├─ Display header: "Hi, {kidName}! Thanks to Give"
    │   │
    │   └─ FlatList of gifts:
    │       ├─ Gift name (uppercase, large)
    │       ├─ Giver name ← ⚠️ Column may not exist
    │       ├─ Event name
    │       ├─ Status indicator:
    │       │   ├─ "Record" (pending)
    │       │   ├─ "Reviewing" (recorded)
    │       │   ├─ "Approved" (approved)
    │       │   └─ "Sent" (sent)
    │       │
    │       └─ On gift tap (if pending):
    │           │
    │           └─ handleRecordGift(gift)
    │               │
    │               └─ navigation.navigate('VideoRecording', {
    │                   giftId: gift.id,
    │                   giftName: gift.name,
    │                   giverName: gift.giver_name
    │               })
    │
    └─ If gifts list empty:
        └─ "All done! No gifts to record yet."
```

**Status:** BLOCKED - Can't login due to auth issues

---

## 6. VIDEO RECORDING & CUSTOMIZATION FLOW

```
VideoRecordingScreen
    │
    ├─ Request camera permissions
    │   └─ useCameraPermissions() from expo-camera
    │
    ├─ Show camera preview (CameraView)
    │   ├─ Front-facing camera (default)
    │   └─ Flip camera button
    │
    ├─ Controls:
    │   ├─ Recording timer
    │   │   └─ Max: 60 sec (kids), 120 sec (adults)
    │   │
    │   └─ Record/Stop buttons
    │
    └─ After recording:
        │
        └─ Show recorded video preview
            ├─ Delete button (re-record)
            └─ Proceed button → VideoPlaybackScreen


VideoPlaybackScreen
    │
    ├─ Play recorded video
    │
    ├─ Trim video (optional)
    │   └─ Not currently implemented
    │
    └─ Proceed button → MusicSelectionScreen


MusicSelectionScreen
    │
    ├─ Browse music library
    │
    ├─ Select background music
    │   └─ Preview music
    │
    └─ Confirm selection → VideoCustomizationScreen


VideoCustomizationScreen
    │
    ├─ Add text overlays
    ├─ Add stickers
    ├─ Add filters
    │
    └─ Proceed → VideoConfirmationScreen


VideoConfirmationScreen
    │
    ├─ Review final video
    │
    ├─ Confirm or go back
    │
    └─ Submit button:
        │
        ├─ Upload to Supabase storage
        │
        ├─ INSERT INTO videos
        │   ├─ id (UUID)
        │   ├─ parent_id (from context)
        │   ├─ child_id (from session)
        │   ├─ gift_id (from route params)
        │   ├─ video_url (storage path)
        │   ├─ status = 'draft' or 'pending_approval'
        │   └─ created_at (now)
        │
        └─ Navigate → VideoSuccessScreen


VideoSuccessScreen
    │
    ├─ "Thank you for recording!"
    │
    └─ "Your video is pending parent review"
        │
        └─ Back to KidPendingGiftsScreen
            └─ Gift status now shows "Reviewing"
```

**Status:** PARTIALLY IMPLEMENTED
- Recording and camera work
- Music selection implemented
- Upload flow may have issues
- Customization features partially done

---

## 7. PARENT VIDEO REVIEW & SHARING FLOW

```
ParentDashboardScreen
    │
    ├─ VIDEOS Tab (showing pending review)
    │
    └─ Load pending videos query:
        │
        SELECT id, status, recorded_at,
               kid:children(name),
               gift:gifts(name, giver_name)
        FROM videos
        WHERE parent_id = user.id
        AND status = 'pending_approval'
        │
        └─ Display list:
            ├─ Video thumbnail
            ├─ Kid name
            ├─ Gift name
            ├─ Giver name
            └─ "Awaiting your review" badge


        On video tap:
        │
        └─ ParentVideoReviewScreen
            │
            ├─ Play video
            │
            ├─ Review controls:
            │   ├─ Approve button
            │   │   └─ UPDATE videos SET status = 'approved'
            │   │
            │   ├─ Reject button
            │   │   └─ Set status = 'draft' (kid can re-record)
            │   │
            │   └─ Edit button (not fully implemented)
            │
            └─ If Approved:
                │
                └─ SendToGuestsScreen
                    │
                    ├─ Load guests for event
                    │
                    ├─ Add/remove guests
                    │   ├─ Email input
                    │   ├─ Add button
                    │   └─ List of added guests
                    │
                    └─ Send button:
                        │
                        ├─ Create video_shares records
                        │
                        ├─ Send email to each guest
                        │   └─ With secure link to view video
                        │
                        └─ Navigate → SendSuccessScreen
                            │
                            └─ "Videos sent successfully!"
                                └─ Show guest list
```

**Status:** IMPLEMENTED
- Review screens exist
- Sharing UI complete
- Email integration partially done

---

## 8. DATA SCHEMA MISMATCH VISUALIZATION

```
CODE EXPECTS vs ACTUAL SCHEMA
═══════════════════════════════════════════════════════════

GIFTS TABLE
───────────────────────────────────────────────────────────
Code Uses:                  Minimal Schema:              Phase 2 Schema:
├─ name ✓                   ├─ name ✓                   ├─ gift_name ⚠️
├─ giver_name ⚠️            ├─ (NO giver_name) ✗         ├─ gift_giver_name ⚠️
├─ description ✓            ├─ description ✓             ├─ gift_description ⚠️
├─ event_id ✓               ├─ event_id ✓                ├─ event_id ✓
├─ event_type (in events)   ├─ (NO event_type) ✗         ├─ event_type ✓
└─ status ✓                 └─ status ✓                  └─ status ✓


GIFT_ASSIGNMENTS TABLE
───────────────────────────────────────────────────────────
Code Uses:                  Minimal Schema:              Phase 2 Schema:
├─ gift_id ✓                ├─ (TABLE MISSING) ✗          ├─ gift_id ✓
├─ children_id ⚠️           │                            ├─ child_id ⚠️
└─ parent_id                │                            └─ parent_id ✓


CHILDREN TABLE
───────────────────────────────────────────────────────────
Code Uses:                  Minimal Schema:              Phase 2 Schema:
├─ id ✓                     ├─ id ✓                     ├─ id ✓
├─ parent_id ✓              ├─ parent_id ✓              ├─ parent_id ✓
├─ name ✓                   ├─ name ✓                   ├─ name ✓
├─ pin ✓                    ├─ pin ✓                    ├─ pin ✓
└─ age (optional) ✓         └─ age ✓                    └─ birth_date (different)
```

---

## 9. ISSUE DEPENDENCY CHAIN

```
Issue Chain - One breaks, all downstream break:

1. CREATE EVENT
   ├─ ⚠️ event_type column missing (minimal schema)
   └─ ✓ Event saved (if schema supports it)
       │
       ▼
2. CREATE GIFTS
   ├─ ⚠️ giver_name column missing (minimal schema)
   └─ ✓ Gift created (if column exists)
       │
       ▼
3. ASSIGN GIFTS TO KIDS
   ├─ ⚠️ Kids list empty (no UI to create kids)
   ├─ ⚠️ gift_assignments table missing (minimal schema)
   └─ ✗ BLOCKED - Can't proceed
       │
       ▼
4. KID LOGIN
   ├─ ⚠️ PIN validation queries wrong table
   ├─ ⚠️ PIN validation references non-existent column
   └─ ✗ BLOCKED - Can't authenticate
       │
       ▼
5. KID SEES GIFTS
   ├─ ⚠️ Column name mismatch: children_id vs child_id
   ├─ ⚠️ giver_name may not exist
   └─ ✗ BLOCKED - Can't load gifts
       │
       ▼
6. RECORD VIDEO
   └─ ✓ Can record (if kid authenticated)
       │
       ▼
7. PARENT REVIEWS
   └─ ✓ Can review (if video exists)
       │
       ▼
8. SHARE WITH GUESTS
   └─ ✓ Can share (if video approved)


ACTUAL STATUS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. ✓ CREATE EVENT (works with caveat)
2. ✗ CREATE GIFTS (blocked by missing column/table)
3. ✗ ASSIGN GIFTS (no UI to create kids)
4. ✗ KID LOGIN (broken auth)
5. ✗ KID SEES GIFTS (blocked by auth)
6-8. ✗ BLOCKED by steps 3-5
```

---

## 10. QUICK REFERENCE: WHERE TO FIX

```
CRITICAL FIXES NEEDED:
═════════════════════════════════════════════════════════

1. CHILD/KID MANAGEMENT
   └─ Create: ManageChildrenScreen.js
      Location: /screens/ManageChildrenScreen.js
      Parent: ParentDashboardScreen Settings tab

2. SCHEMA CONSISTENCY
   └─ Choose: SUPABASE_SCHEMA_MINIMAL.sql OR supabase-schema-phase2.sql
      Files: Update all .sql files in root
      Code: Update all queries in screens/ and services/

3. PIN VALIDATION
   └─ Fix: authService.js → validateKidPin()
      Line: 171-202
      Change: Query children table instead of parents

4. GIFT ASSIGNMENTS QUERIES
   └─ File 1: GiftManagementScreen.js (line 66-70)
      File 2: KidPendingGiftsScreen.js (line 62-80)
      Fix: Update column names and table references

5. GIFT CREATION
   └─ File: GiftManagementScreen.js (line 140-143)
      Fix: Ensure giver_name column exists in schema
           Or rename to match schema (gift_giver_name)

6. EVENT QUERY
   └─ File: ParentDashboardScreen.js (line 81-88)
      Fix: Remove gifts:gifts(count) syntax
           Use simpler SELECT or count in UI layer
```

