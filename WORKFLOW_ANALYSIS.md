# GratituGram Event Creation and Gift Assignment Workflow Analysis

## Executive Summary

The GratituGram app has **critical schema mismatches** and **incomplete data flows** that prevent proper event creation and gift assignment. While the UI screens are mostly complete, there are fundamental issues with:

1. **Supabase schema inconsistencies** - Multiple incompatible schema versions
2. **Missing child/kid management** - No UI to create children in parent account
3. **Broken gift assignment flow** - Query issues preventing kids from accessing gifts
4. **Session management gaps** - Kid authentication not fully integrated
5. **Missing column definitions** - Schema lacks required columns referenced in code

---

## 1. EVENT CREATION FLOW ANALYSIS

### Current Flow: ParentDashboardScreen → EventManagementScreen → Dashboard

**Location:** `/Users/ericgoodlev/Desktop/GratituGram/screens/`

#### Step 1: Parent Dashboard (ParentDashboardScreen.js)
- **Status:** Implemented
- **Action:** User taps FAB (Floating Action Button) to create event
- **Handler:** `handleCreateEvent()` → navigates to `EventManagement` with `mode: 'create'`
- **Line:** 141-143

```javascript
const handleCreateEvent = () => {
  navigation?.navigate('EventManagement', { mode: 'create' });
};
```

#### Step 2: Event Management Screen (EventManagementScreen.js)
- **Status:** Implemented with form
- **Fields Collected:**
  - Event Name (required)
  - Event Type (birthday, wedding, etc.)
  - Event Date (YYYY-MM-DD, required)
  - Location (optional)
  - Description (optional)
  
- **Save Handler (Line 59-111):**
  - Gets user from `supabase.auth.getUser()`
  - Inserts into `events` table with `parent_id: user.id`
  - Returns to dashboard with `navigation?.goBack()`

#### Step 3: Return to Dashboard (ParentDashboardScreen.js)
- **Status:** Automatic via `useFocusEffect` hook
- **Load Events Query (Line 81-88):**

```javascript
const { data: eventList, error: eventsError } = await supabase
  .from('events')
  .select('*, gifts:gifts(count)')  // ← QUERY ISSUES HERE
  .eq('parent_id', user.id)
  .order('event_date', { ascending: true });
```

### Issues Found:

#### Issue 1.1: Query Uses Supabase Count Alias
- **Problem:** Line 83 uses `gifts:gifts(count)` which requires specific Supabase configuration
- **Error:** May return `null` or cause RLS policy violations
- **Impact:** Gift count on dashboard may not display correctly
- **Current Code:**
```javascript
.select('*, gifts:gifts(count)')
```
- **Should be one of:**
```javascript
// Option A: Select all gift fields
.select('*, gifts(*)')

// Option B: Use direct count (Supabase v2+)
.select('*, gifts(id)')  // Then count in UI
```

#### Issue 1.2: Event Type Column Missing from Schema
- **Problem:** Code uses `event_type` column (EventManagementScreen.js:80, ParentDashboardScreen.js:194)
- **Minimal Schema Status:** **NOT DEFINED**
- **Phase 2 Schema Status:** Defined with CHECK constraint for valid types
- **Current Code (EventManagementScreen.js:80):**
```javascript
event_type: eventType,
```
- **Resolution:** Need to verify which schema is actually in Supabase
  - If using SUPABASE_SCHEMA_MINIMAL.sql: Column is missing, will cause INSERT error
  - If using supabase-schema-phase2.sql: Column exists with validation

### Event Creation Flow - VERDICT

**Status:** FUNCTIONAL but with risks
- Events can be created IF schema includes `event_type` column
- Events will be saved to Supabase
- Dashboard query may fail due to `gifts(count)` syntax
- No validation that event actually appears in dashboard

---

## 2. GIFT MANAGEMENT & KID LINKING ANALYSIS

### Current Flow: Event Card → GiftManagementScreen → Gift Creation

#### Step 1: Navigate from Event to Gift Management
- **Trigger:** User taps event card (ParentDashboardScreen.js:145-146)
- **Handler:**
```javascript
const handleEventPress = (event) => {
  navigation?.navigate('GiftManagement', { 
    eventId: event.id, 
    eventName: event.name 
  });
};
```

#### Step 2: Gift Management Screen (GiftManagementScreen.js)
- **Status:** Partially implemented
- **Load Flow:**
  - On screen focus, calls `loadGifts()` and `loadKids()` (Line 54-59)
  
```javascript
const loadKids = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  const { data } = await supabase
    .from('children')
    .select('id, name')
    .eq('parent_id', user.id);
  setKids(data || []);
};
```

#### Step 3: Create/Assign Gift to Kids
- **Modal Form Collects:**
  - Gift Name (required)
  - Giver Name (e.g., "Uncle Bob") (required)
  - Description (optional)
  - **Selected Kids (checkboxes)** (required - at least one)

- **Save Handler (Line 134-196):**
  1. Validates form
  2. Inserts into `gifts` table
  3. Deletes old `gift_assignments`
  4. Inserts new `gift_assignments` for each selected kid

### Critical Issue 2.1: Missing Parent UI to Create/Manage Kids

**Problem:** No way for parent to create children in their account!

**Current Situation:**
- GiftManagementScreen loads kids from database
- But there's NO screen to CREATE kids
- ParentDashboardScreen has SETTINGS tab but only shows:
  - Parent profile info (name, email)
  - Logout button
  - No kid management option

**Missing Features:**
```
Settings Tab should have:
  - View/Manage Children section
  - Add Child button → Show form with:
    - Child name (required)
    - Age (optional)
    - PIN for kid login (required, 4 digits)
  - Edit/Delete child options
```

**Impact:** 
- If kids list is empty, GiftManagementScreen shows "Select at least one kid" error
- Parent can't get past gift creation if no kids exist
- This is a **CRITICAL BLOCKER** for the workflow

---

### Critical Issue 2.2: Schema Mismatch - Gift Columns

**Problem:** Code references columns that may not exist in minimal schema

**Columns Used in GiftManagementScreen:**
- `name` ✓ (exists in both schemas)
- `giver_name` ✗ **MISSING in SUPABASE_SCHEMA_MINIMAL.sql**
- `description` ✓ (exists in both schemas)
- `event_id` ✓ (exists in both schemas)

**Actual Schema:**
- SUPABASE_SCHEMA_MINIMAL.sql (gifts table):
  - id, event_id, parent_id, child_id, name, description, recipient_name, recipient_email, status
  - **MISSING:** `giver_name`

- supabase-schema-phase2.sql (gifts table):
  - id, event_id, parent_id, gift_giver_name, gift_name, gift_description, etc.
  - Uses `gift_giver_name` NOT `giver_name`

**Current Code (GiftManagementScreen.js:140-143):**
```javascript
const giftData = {
  name: giftName,
  giver_name: giverName,  // ← WILL FAIL if column doesn't exist
  description: description || null,
  event_id: eventId,
};
```

**Impact:** INSERT will fail with column not found error

---

### Critical Issue 2.3: Gift Assignments Table Mismatch

**Problem:** Code uses `gift_assignments` table but it doesn't exist in minimal schema!

**Current Code (GiftManagementScreen.js:169-187):**
```javascript
// Delete old assignments
const { error: deleteError } = await supabase
  .from('gift_assignments')
  .delete()
  .eq('gift_id', giftId);

// Insert new assignments
if (selectedKids.length > 0) {
  const assignments = selectedKids.map((kidId) => ({
    gift_id: giftId,
    children_id: kidId,  // ← Column name issue!
  }));
  const { error: insertError } = await supabase
    .from('gift_assignments')
    .insert(assignments);
}
```

**Schema Status:**
- SUPABASE_SCHEMA_MINIMAL.sql: **Does NOT define gift_assignments table**
- supabase-schema-phase2.sql: **DOES define it** with:
  - gift_id, child_id (NOT children_id), parent_id, assigned_at, updated_at

**Actual Column Names in phase2 schema:**
```sql
CREATE TABLE IF NOT EXISTS gift_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gift_id UUID NOT NULL REFERENCES gifts(id),
  child_id UUID NOT NULL REFERENCES children(id),  -- ← child_id
  parent_id UUID NOT NULL REFERENCES parents(id),
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Impact:** Code inserts `children_id` but schema expects `child_id` - will fail

---

## 3. KID/CHILD LINKING ANALYSIS

### Current Architecture

**KIDs don't use Supabase Auth** - They use a PIN-based system:

1. **Parent creates PIN in kid setup** (NOT IMPLEMENTED IN UI)
2. **Kid enters PIN on KidPINLoginScreen** (Line 99)
3. **System validates PIN against `children` table** (authService.js:171-202)

### Kid Authentication Flow (authService.js)

**Function:** `validateKidPin()` (Line 171-202)

```javascript
export const validateKidPin = async (pin) => {
  const { data: parent } = await supabase
    .from('parents')
    .select('id, full_name, child_name')
    .eq('kid_code', pin)  // ← WRONG - looking in parents table!
    .single();
  
  if (error || !parent) {
    return { success: false, error: 'Invalid PIN' };
  }
  
  // Store kid session
  await AsyncStorage.setItem(KID_SESSION_KEY, pin);
  await AsyncStorage.setItem('parentId', parent.id);
  
  return {
    success: true,
    parentId: parent.id,
    childName: parent.child_name || 'Child',
  };
};
```

### Issue 3.1: PIN Validation Uses Wrong Table and Column

**Problems:**
1. Looks for PIN in `parents.kid_code` (single code for all kids)
2. Should look in `children.pin` (individual PIN per child)
3. References `parent.child_name` which doesn't exist
4. Uses AsyncStorage to store PIN (security risk)

**Correct Flow Should Be:**
```javascript
const { data: child } = await supabase
  .from('children')
  .select('id, name, parent_id')
  .eq('pin', pin)
  .single();

// Store child session
await AsyncStorage.setItem(KID_SESSION_KEY, child.id);
await AsyncStorage.setItem('kidName', child.name);
```

### Issue 3.2: No UI to Create Children in Parent Account

**Missing Screen:** Parent Settings → Manage Children

**Should provide:**
```
✓ View list of children
✓ Add new child (name, age, PIN)
✓ Edit child PIN
✓ Delete child
✓ View child login history
```

**Current Settings Tab (ParentDashboardScreen.js:382-458):**
- Only shows parent profile and logout
- No kid management

---

## 4. COMPLETE WORKFLOW MAPPING

### Intended Workflow (What Should Happen)

```
1. PARENT SIGNUP
   ParentSignupScreen
   → Create Supabase auth account
   → Create parent profile
   → Navigate to Dashboard
   
2. CREATE EVENT
   ParentDashboardScreen (FAB) 
   → EventManagementScreen
   → Save event to DB
   → Return to Dashboard
   → Event appears in list ✓
   
3. MANAGE CHILDREN (MISSING!)
   ParentDashboardScreen (Settings tab)
   → [Should have] Kids Management Screen
   → Create Child (name, PIN)
   → PIN stored in children.pin
   
4. CREATE GIFTS
   ParentDashboardScreen (tap event)
   → GiftManagementScreen
   → Add Gift modal
   → Select kids (checkboxes)
   → Save gift + assignments
   
5. KID LOGS IN
   RootNavigator → KidAuthStack
   → KidPINLoginScreen
   → Kid enters PIN
   → Validate against children.pin
   → Navigate to KidPendingGiftsScreen ✓
   
6. KID SEES GIFTS
   KidPendingGiftsScreen
   → Query gift_assignments for kid
   → Show list of assigned gifts
   → Tap gift → Record video
   
7. RECORD VIDEO
   KidPendingGiftsScreen (tap gift)
   → VideoRecordingScreen
   → Kid records thank you video
   → VideoPlaybackScreen review
   → Customization (music, etc.)
   → Upload to cloud
   → Update video status
   
8. PARENT REVIEWS & APPROVES
   ParentDashboardScreen (Videos tab)
   → ParentVideoReviewScreen
   → Approve/Reject video
   → Mark for sending
   
9. SHARE WITH GUESTS
   ParentVideoReviewScreen
   → SendToGuestsScreen
   → Add guest emails
   → Send thank you videos
```

### Actual Workflow (What Currently Works)

```
1. PARENT SIGNUP ✓ Works
2. CREATE EVENT ✓ Mostly works (query issues)
3. MANAGE CHILDREN ✗ MISSING - NO UI
4. CREATE GIFTS ✗ FAILS - Schema mismatch
5. KID LOGS IN ✗ FAILS - PIN validation broken
6. KID SEES GIFTS ✗ FAILS - Can't get past login
7-9. BLOCKED due to steps 3-6
```

---

## 5. SUPABASE QUERY ISSUES

### Query 5.1: ParentDashboardScreen - Load Events (Line 81-88)

**Current Code:**
```javascript
const { data: eventList, error: eventsError } = await supabase
  .from('events')
  .select('*, gifts:gifts(count)')  // ← Problematic syntax
  .eq('parent_id', user.id)
  .order('event_date', { ascending: true });
```

**Issues:**
- `gifts(count)` syntax only works with specific Supabase configuration
- May return empty array or null values
- RLS policy must allow reading gifts

**Recommended Fix:**
```javascript
const { data: eventList, error: eventsError } = await supabase
  .from('events')
  .select('*')
  .eq('parent_id', user.id)
  .order('event_date', { ascending: true });

// Then in UI layer:
const giftCount = eventList?.reduce((acc, event) => {
  // Load gift counts separately or in another query
}, {});
```

### Query 5.2: GiftManagementScreen - Load Gifts (Line 66-70)

**Current Code:**
```javascript
const { data } = await supabase
  .from('gifts')
  .select('*, gift_assignments(children(name))')  // ← Nested select
  .eq('event_id', eventId)
  .order('created_at', { ascending: false });
```

**Issue:** 
- Assumes `gift_assignments` table exists and is properly related
- If table doesn't exist, query fails
- Nested `children(name)` requires proper foreign keys

### Query 5.3: KidPendingGiftsScreen - Load Assigned Gifts (Line 62-80)

**Current Code:**
```javascript
const { data: giftsData, error: giftsError } = await supabase
  .from('gift_assignments')
  .select(`
    gift:gifts(
      id,
      name,
      giver_name,        // ← May not exist
      event_id,
      event:events(name)
    ),
    video:videos(
      id,
      status,
      recorded_at
    )
  `)
  .eq('children_id', storedKidId);  // ← Wrong column name
```

**Issues:**
1. Column name mismatch: should be `child_id` not `children_id`
2. Column `giver_name` may not exist
3. Relationship `video:videos` assumes only one video per assignment

---

## 6. RLS POLICY ANALYSIS

### Current RLS Policies (SUPABASE_SCHEMA_MINIMAL.sql)

**Status:** All policies use `auth.uid()::text = parent_id::text` pattern

**Policy Example (events):**
```sql
CREATE POLICY "Parents can view own events" ON public.events 
FOR SELECT USING (auth.uid()::text = parent_id::text);

CREATE POLICY "Parents can insert own events" ON public.events 
FOR INSERT WITH CHECK (auth.uid()::text = parent_id::text);
```

**Issues:**
1. **No policies for children table** - Kids aren't using Supabase auth, so policies won't help
2. **No policies for gift_assignments** - Table not in minimal schema
3. **Type casting `::text`** - Relies on UUID being castable to text (works but not ideal)

**Required Additions for Kids:**
```sql
-- Kids can view their assigned gifts
CREATE POLICY "Kids can view assigned gifts" ON public.gift_assignments
FOR SELECT USING (child_id = current_user_id);  -- Needs kid-aware policy

-- Videos - kids can view/update own videos
CREATE POLICY "Kids can view own videos" ON public.videos
FOR SELECT USING (child_id = current_user_id);
```

**BUT:** Since kids aren't using Supabase auth, need alternative mechanism:
- Use JWT tokens with kid ID claims
- Or use `AsyncStorage` kid session + server-side validation

---

## 7. COMPLETE ISSUE SUMMARY

| Issue | Severity | Component | Status |
|-------|----------|-----------|--------|
| **No UI to create/manage kids** | CRITICAL | Settings tab | Missing |
| **Schema mismatch - giver_name column** | CRITICAL | Gifts table | Inconsistent |
| **gift_assignments table missing** | CRITICAL | Schema | Minimal schema lacks it |
| **PIN validation wrong table/column** | CRITICAL | Auth service | Broken |
| **Event type column inconsistency** | HIGH | Events table | Depends on schema version |
| **Query syntax issues (gifts count)** | HIGH | Dashboard query | May fail silently |
| **Column name: children_id vs child_id** | HIGH | Query filters | Type mismatch |
| **Kid auth not using Supabase auth** | MEDIUM | Architecture | Design issue |
| **No RLS for gift_assignments** | MEDIUM | Security | Missing policies |
| **Session persistence off** | MEDIUM | Config | supabaseClient.js |

---

## 8. NAVIGATION STRUCTURE VERIFICATION

### RootNavigator.js Status: ✓ Well Structured

**Parent Auth Stack:**
- ParentSignup ✓
- ParentLogin ✓
→ ParentDashboard

**Parent App Stack:**
- ParentDashboard ✓
- EventManagement ✓
- GiftManagement ✓ (but broken)
- ParentVideoReview ✓
- SendToGuests ✓
- SendSuccess ✓

**Kid Auth Stack:**
- KidPINLogin ✓

**Kid App Stack:**
- KidPendingGifts ✓ (but can't load gifts)
- VideoRecording ✓
- VideoPlayback (disabled)
- MusicSelection ✓
- VideoCustomization ✓
- VideoConfirmation ✓
- VideoSuccess ✓

**Verdict:** Navigation structure is correct, but data flows are broken

---

## 9. RECOMMENDATIONS

### Immediate Actions (CRITICAL)

1. **Choose Schema Version**
   - Decide: Use SUPABASE_SCHEMA_MINIMAL.sql or supabase-schema-phase2.sql?
   - Update ALL queries to match chosen schema
   - Document schema version in app config

2. **Add Missing UI: Parent Kids Management**
   - Create `ManageChildrenScreen.js`
   - Add to ParentDashboardScreen Settings tab
   - Allow: view, add, edit, delete children
   - Form should collect: name, age (optional), PIN (4-6 digits)

3. **Fix Gift Management Queries**
   - Add `giver_name` column to gifts table if using minimal schema
   - Create `gift_assignments` table if using minimal schema
   - Update query column references: `children_id` → `child_id`

4. **Fix PIN Validation**
   - Query `children` table, not `parents` table
   - Use child's PIN from `children.pin` column
   - Store kid ID in session, not PIN

### Secondary Actions (HIGH PRIORITY)

5. **Update RLS Policies**
   - Add policies for gift_assignments table
   - Add policies for kids viewing gifts (if using Supabase auth)
   - Or implement alternative auth mechanism for kids

6. **Fix Event Query**
   - Change `gifts:gifts(count)` to simpler syntax
   - Load gift counts in application layer
   - Or use aggregation query

7. **Add Kid Session Handling**
   - Implement proper kid authentication
   - Use JWT tokens with kid ID claims
   - Or use secure session tokens in AsyncStorage

8. **Data Validation**
   - Add form validation for PIN format
   - Validate event_type values
   - Validate gift assignments (at least 1 kid per gift)

### Testing Checklist

- [ ] Parent can create event
- [ ] Event appears in dashboard
- [ ] Parent can access Settings → Manage Children
- [ ] Parent can create child with name and PIN
- [ ] Child list loads in GiftManagementScreen
- [ ] Parent can create gift and assign to kid(s)
- [ ] Gift appears in gifts list
- [ ] Kid can login with PIN
- [ ] Kid sees assigned gifts
- [ ] Kid can start recording video
- [ ] Parent sees pending video in dashboard
- [ ] Parent can review and approve video

---

## 10. FILE LOCATIONS REFERENCE

**Key Files:**
- App Router: `/Users/ericgoodlev/Desktop/GratituGram/navigation/RootNavigator.js`
- Auth Service: `/Users/ericgoodlev/Desktop/GratituGram/services/authService.js`
- Database Service: `/Users/ericgoodlev/Desktop/GratituGram/services/databaseService.js`
- Parent Dashboard: `/Users/ericgoodlev/Desktop/GratituGram/screens/ParentDashboardScreen.js`
- Gift Management: `/Users/ericgoodlev/Desktop/GratituGram/screens/GiftManagementScreen.js`
- Kid Pending Gifts: `/Users/ericgoodlev/Desktop/GratituGram/screens/KidPendingGiftsScreen.js`
- Kid PIN Login: `/Users/ericgoodlev/Desktop/GratituGram/screens/KidPINLoginScreen.js`
- Event Management: `/Users/ericgoodlev/Desktop/GratituGram/screens/EventManagementScreen.js`
- Supabase Client: `/Users/ericgoodlev/Desktop/GratituGram/supabaseClient.js`

**Schema Files:**
- Minimal Schema: `/Users/ericgoodlev/Desktop/GratituGram/SUPABASE_SCHEMA_MINIMAL.sql`
- Phase 2 Schema: `/Users/ericgoodlev/Desktop/GratituGram/supabase-schema-phase2.sql`

