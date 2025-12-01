# GratituGram End-to-End Workflows

Complete documentation of parent and kid workflows with the new access code system.

---

## Overview

GratituGram is built around two separate user flows:

1. **Parent Flow**: Manage children, create events, approve videos
2. **Kid Flow**: Log in, record thank-you videos, track gifts

Both flows connect to the **same Supabase backend**, enabling device linking through:
- Unique access codes (not simple PINs)
- Row-level security (RLS) policies
- Parent-child database relationships

---

## Device Linking Architecture

```
┌─────────────────────┐              ┌─────────────────────┐
│  Parent's Device    │              │  Child's Device     │
│  (iPhone/Android)   │              │  (iPhone/Android)   │
└──────────┬──────────┘              └──────────┬──────────┘
           │                                    │
           │  Parent Email + Password           │
           │  ──────────────────────────────>   │
           │                                    │
           │              ┌──────────────────── │
           │              │  Access Code (ALI5821)
           │              │  ───────────────────>
           │              │
           └──────────────┴────────────────────┘
                          │
                  ┌───────▼────────┐
                  │  Supabase      │
                  │  Backend       │
                  │  (PostgreSQL)  │
                  └────────────────┘
```

**Key Point**: Both devices connect to the SAME database instance. Data isolation happens through:
- **Parent Auth**: Email/password via Supabase Auth
- **Kid Auth**: Unique access code (queries children table)
- **RLS Policies**: Enforce that kids can only see their parent's data

---

## Complete Parent Workflow

### Step 1: Parent Signup/Login

**Screen**: `ParentAuthScreen` or `ParentLoginScreen`

**Flow**:
```
1. Parent enters email and password
2. Clicks "Sign Up" or "Log In"
3. Supabase validates credentials
4. On success:
   - Parent profile created in 'parents' table
   - Session stored in Supabase Auth
   - Session ID stored in AsyncStorage
   - User redirected to ParentDashboard
```

**Database Changes**:
```sql
INSERT INTO public.parents (id, email, full_name, created_at)
VALUES ('[UUID]', 'parent@email.com', 'Jane Smith', now());
```

**AsyncStorage**:
```javascript
{
  parentSessionId: '[Parent UUID]'
}
```

---

### Step 2: Navigate to Manage Children

**Screen**: `ParentDashboardScreen` → Tab "Children"

**Flow**:
```
1. Parent clicks "Children" tab
2. App loads all children for this parent
3. Shows list of child cards with:
   - Child name
   - Child age
   - 7-character Login Code (e.g., "ALI5821")
   - Share button
   - Edit button
```

**Database Query**:
```sql
SELECT id, name, age, access_code, created_at
FROM public.children
WHERE parent_id = '[Parent UUID]'
ORDER BY created_at DESC;
```

---

### Step 3: Add New Child

**Screen**: `ManageChildrenScreen`

**Flow**:
```
1. Parent clicks "➕ Add Child" button
2. Modal appears with form fields:
   - Child Name (text input)
   - Age (number input)
3. Parent fills in details (e.g., "Alice", "8")
4. Parent clicks "Create Child"
5. App validates form:
   - Name not empty ✓
   - Age between 1-18 ✓
6. App generates:
   - Access Code: ALI5821 (3 letters + 4 digits)
   - PIN: 5821 (4 digits, for backwards compatibility)
7. Database insert:
   - parents.children table updated
8. Success alert shows access code
9. Parent can share code with child
10. Modal closes, child appears in list
```

**Generated Values**:
```javascript
// Access Code Generation
const generateAccessCode = (name) => {
  const namePrefix = name.substring(0, 3).toUpperCase();
  const randomDigits = Math.floor(1000 + Math.random() * 9000).toString();
  return `${namePrefix}${randomDigits}`;
};
// Result: "ALI5821"

// PIN Generation (for backwards compatibility)
const generatePin = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};
// Result: "5821"
```

**Database Insert**:
```sql
INSERT INTO public.children (
  parent_id,
  name,
  age,
  access_code,
  pin,
  created_at
) VALUES (
  '[Parent UUID]',
  'Alice',
  8,
  'ALI5821',
  '5821',
  now()
);
```

**Alert Message**:
```
✅ Child Added!

Alice's Login Code: ALI5821

Share this code with your child so they can log in. It's like their special key!
```

---

### Step 4: Share Access Code with Child

**Method 1: Share Button**

**Flow**:
```
1. Parent finds child in list
2. Clicks Share button (Share icon)
3. Share dialog opens with pre-written message
4. Parent chooses how to share (iMessage, Email, WhatsApp, etc.)
5. Message sent: "Alice's Login Code: ALI5821"
```

**Message Template**:
```
Alice's Login Code: ALI5821

Share this with Alice so they can log in to GratituGram!
```

**Method 2: Manual (Screen Share, Write Down, Etc.)**

Parent can:
- Copy the code from the Login Code badge
- Write it down on paper
- Screen share to show child
- Type it in child's device directly

---

### Step 5: Parent Creates Events

**Screen**: `ParentDashboardScreen` → Tab "Events"

**Flow**:
```
1. Parent clicks "Events" tab
2. Clicks "➕ Create Event" button
3. Event creation form appears:
   - Event Title (e.g., "Christmas 2024")
   - Event Description
   - Event Date
   - Select child (if multiple kids)
4. Parent optionally adds Gifts:
   - Gift Name
   - Gift Description
   - Gift Image (optional)
5. Parent saves event
6. Event created and associated with child
7. Event appears in child's app (child needs to log in to see)
```

**Database Changes**:
```sql
INSERT INTO public.events (
  parent_id,
  title,
  description,
  event_date,
  created_at
) VALUES ('[Parent UUID]', 'Christmas 2024', '...', '2024-12-25', now());

INSERT INTO public.gifts (
  parent_id,
  event_id,
  name,
  description,
  created_at
) VALUES ('[Parent UUID]', '[Event UUID]', 'Toy', '...', now());
```

---

### Step 6: Approve Kid Videos

**Screen**: `ParentDashboardScreen` → Tab "Videos" or "Pending"

**Flow**:
```
1. Parent sees pending videos from kids
2. Each video shows:
   - Kid name
   - Associated gift
   - Video thumbnail (if available)
   - Status: "Pending Approval"
3. Parent clicks video to review
4. Parent sees playback controls
5. Parent can:
   - APPROVE: Video marked as approved, shared with others
   - REJECT: Video deleted, ask kid to re-record
   - HOLD: Keep as pending for later review
6. Once approved, video is "published"
```

**Database Changes**:
```sql
-- Approve video
UPDATE public.videos
SET status = 'approved'
WHERE id = '[Video UUID]'
AND parent_id = '[Parent UUID]';

-- Reject video
DELETE FROM public.videos
WHERE id = '[Video UUID]'
AND parent_id = '[Parent UUID]';
```

---

## Complete Kid Workflow

### Step 1: Child Opens App on Their Device

**Screen**: `RootNavigator` → Auth Stack

**Flow**:
```
1. Child opens GratituGram app on their device
2. App checks if kid already logged in
   - Check AsyncStorage for 'kidSessionId'
   - If found, skip login and go to Step 5
3. If not logged in, show `KidPINLoginScreen`
```

**AsyncStorage Check**:
```javascript
const { pin } = await getKidSession();
if (pin) {
  // Already logged in, go to app
  navigate to KidPendingGifts
} else {
  // Not logged in, show login screen
  show KidPINLoginScreen
}
```

---

### Step 2: Child Enters Access Code

**Screen**: `KidPINLoginScreen`

**UI**:
```
┌─────────────────────────────────┐
│  Enter Your Code                │
│  Ask a grown-up if you need help│
├─────────────────────────────────┤
│                                 │
│         [ABC1234]               │
│                                 │
│      [Clear ✗]  [Submit ✓]      │
│                                 │
└─────────────────────────────────┘
```

**Flow**:
```
1. Child sees large text input field
2. Placeholder shows example: "ABC1234"
3. Parent read access code to child OR child types it in
4. As child types:
   - Input auto-converts to uppercase
   - Max 7 characters allowed
   - Clear button available if needed
5. When exactly 7 characters entered:
   - Submit button enables (turns green)
6. Child clicks checkmark (Submit) button
7. App validates access code against database
```

**Code Entry**:
```javascript
// Code: "ali5821" (typed in lowercase)
// Auto-converts to: "ALI5821" (uppercase)
// Stored as: "ALI5821"
```

---

### Step 3a: Successful Login

**Flow**:
```
1. Access code "ALI5821" found in database
2. App retrieves associated child:
   - childId: '[Child UUID]'
   - childName: 'Alice'
   - parentId: '[Parent UUID]'
3. Session stored in AsyncStorage:
   - kidSessionId: 'ALI5821'
   - parentId: '[Parent UUID]'
   - childId: '[Child UUID]'
   - childName: 'Alice'
4. Loading spinner appears briefly
5. App redirects to KidPendingGifts screen
6. Child sees events and gifts created by their parent
```

**AsyncStorage After Login**:
```javascript
{
  kidSessionId: 'ALI5821',
  parentId: '[Parent UUID]',
  childId: '[Child UUID]',
  childName: 'Alice'
}
```

---

### Step 3b: Failed Login (Wrong Code)

**Flow**:
```
1. Access code "XXX1234" entered
2. App queries database:
   SELECT * FROM children WHERE access_code = 'XXX1234'
3. No child found (access code doesn't exist)
4. Error message displayed:
   "Wrong code. Try again. (4 attempts remaining)"
5. Input field clears
6. Attempt counter increments
7. Child can try again
```

**Attempt Tracking**:
```javascript
// After wrong attempt:
setAttempts(1);
AsyncStorage.setItem('kidPINAttempts', '1');

// After 5th wrong attempt:
setLocked(true);
setAttempts(0);
AsyncStorage.setItem('kidPINLockTime', Date.now().toString());
// Account locked for 15 minutes
```

---

### Step 4: Account Lockout (5 Failed Attempts)

**Flow**:
```
1. Child enters wrong code 5 times
2. After 5th attempt:
   - Account locks
   - Error message: "Too many attempts. Try again in 15 minutes."
   - Orange warning banner appears
   - Countdown timer starts: 15:00, 14:59, etc.
   - All buttons disabled
3. Timer counts down
4. At 0:00:
   - Account auto-unlocks
   - Attempt counter resets
   - Child can try again
```

**Lockout State**:
```javascript
{
  locked: true,
  lockTime: 1699564234567, // Timestamp
  attempts: 5,
}

// And in AsyncStorage:
{
  kidPINLockTime: '1699564234567',
  kidPINAttempts: '5'
}
```

**Unlock**:
```javascript
// Timer component:
const remaining = Math.max(0, 900000 - elapsed); // 15 minutes = 900000ms
// When remaining reaches 0:
setLocked(false);
setAttempts(0);
AsyncStorage.removeItem('kidPINLockTime');
AsyncStorage.removeItem('kidPINAttempts');
```

---

### Step 5: View Pending Gifts

**Screen**: `KidPendingGiftsScreen`

**Flow**:
```
1. Child logged in, redirected to this screen
2. App queries all gifts for this child:
   - Filters by: parent_id (from session)
   - Shows gifts that don't have videos yet
3. Child sees list of gifts:
   - Gift image
   - Gift name
   - Gift description
4. Child taps gift to start recording video
```

**Database Query**:
```sql
SELECT g.*
FROM public.gifts g
JOIN public.events e ON g.event_id = e.id
WHERE e.parent_id = '[Parent UUID]'
  AND g.id NOT IN (
    SELECT gift_id FROM public.videos
    WHERE status = 'approved'
  )
ORDER BY e.event_date DESC;
```

---

### Step 6: Record Thank You Video

**Screen**: `VideoRecordingScreen`

**Flow**:
```
1. Child taps on a gift
2. Video recording screen opens
3. Child records themselves saying thank you
   - "Thank you for the [gift name]!"
   - Or custom message
4. Child can:
   - Preview the video
   - Re-record if not happy
   - Accept and submit
5. Video saved to device and uploaded to Supabase
6. Video marked as "pending_approval"
7. Parent notified that new video is awaiting approval
```

**Database Changes**:
```sql
INSERT INTO public.videos (
  id,
  parent_id,
  child_id,
  gift_id,
  status,
  video_url,
  created_at
) VALUES (
  '[UUID]',
  '[Parent UUID]',
  '[Child UUID]',
  '[Gift UUID]',
  'pending_approval',
  'gs://bucket/videos/[path]',
  now()
);
```

---

### Step 7: View Approved Videos

**Screen**: `KidApprovedVideosScreen` (or Videos tab)

**Flow**:
```
1. Child navigates to "Videos" or "Approved" tab
2. App queries approved videos:
   - Filters by: parent_id (from session)
   - Shows only videos with status = 'approved'
3. Child sees their recorded videos
4. Can watch, share, or delete (if allowed)
```

**Database Query**:
```sql
SELECT v.*
FROM public.videos v
WHERE v.parent_id = '[Parent UUID]'
  AND v.status = 'approved'
ORDER BY v.created_at DESC;
```

---

### Step 8: Logout

**Screen**: Any kid screen → Settings or back to Login

**Flow**:
```
1. Child clicks logout button
2. Confirmation dialog shown
3. Child confirms
4. Session cleared from AsyncStorage:
   - kidSessionId removed
   - parentId removed
   - childId removed
   - childName removed
5. Redirect to KidPINLoginScreen
6. Child can log in again or log in as different child
```

**AsyncStorage After Logout**:
```javascript
// Before logout:
{
  kidSessionId: 'ALI5821',
  parentId: '[Parent UUID]',
  childId: '[Child UUID]',
  childName: 'Alice'
}

// After logout:
{
  // All above removed
}
```

---

## Data Isolation & Security

### Parent-Child Data Relationships

```
┌──────────────┐
│   Parents    │
├──────────────┤
│ id (PK)      │
│ email        │
│ full_name    │
└──────────────┘
       │
       │ parent_id (FK)
       │
       ▼
┌──────────────┐
│   Children   │
├──────────────┤
│ id (PK)      │
│ parent_id(FK)│◄─── Links to specific parent
│ name         │
│ age          │
│ access_code  │◄─── Unique per child
│ pin          │
└──────────────┘
       │
       │ child_id (FK)
       │
       ▼
┌──────────────┐
│   Videos     │
├──────────────┤
│ id (PK)      │
│ parent_id(FK)│◄─── Must match child's parent_id
│ child_id(FK) │◄─── Links to specific child
│ status       │
│ video_url    │
└──────────────┘
```

### RLS Policies

**Parent Policy** (AuthService.validateParentSession):
```sql
CREATE POLICY parent_auth ON public.parents
FOR SELECT USING (id = auth.uid());
```
- Parent can only see their own record
- Parent email/password checked before access

**Child Policy** (AuthService.validateKidPin):
```sql
SELECT * FROM public.children
WHERE access_code = '[provided_code]'
SINGLE();
```
- Child's access code must be unique
- Returns that child's parent_id
- App uses parent_id to filter all subsequent queries

**Data Query Filter**:
```javascript
// Kid logs in, gets:
{
  parentId: '[Parent UUID]',
  childId: '[Child UUID]'
}

// All subsequent queries filter by parent_id:
SELECT * FROM gifts WHERE parent_id = '[Parent UUID]'
SELECT * FROM events WHERE parent_id = '[Parent UUID]'
SELECT * FROM videos WHERE parent_id = '[Parent UUID]'
```

### Why Kids Can't See Other Families' Data

**Example Scenario**:

Parent A (id: "uuid-111"):
- Child: Alice (access_code: "ALI5821", parent_id: "uuid-111")
- Event: "Christmas" (parent_id: "uuid-111")
- Gift: "Toy" (parent_id: "uuid-111")

Parent B (id: "uuid-222"):
- Child: Bob (access_code: "BOB7234", parent_id: "uuid-222")
- Event: "Birthday" (parent_id: "uuid-222")
- Gift: "Book" (parent_id: "uuid-222")

**Flow**:

1. Alice logs in with "ALI5821"
2. validateKidPin() returns:
   ```javascript
   {
     parentId: 'uuid-111',  // Parent A's ID
     childId: 'alice-uuid'
   }
   ```
3. App loads gifts: `WHERE parent_id = 'uuid-111'`
4. Alice sees **only** Toy (Parent A's gift)
5. Alice **cannot** see Book (Parent B's gift) because:
   - Query filters by parent_id = 'uuid-111'
   - Book has parent_id = 'uuid-222'
   - Bob's data filtered out

---

## Quick Reference: Access Code Format

### Generation Formula

```
Access Code = NAME_PREFIX + RANDOM_DIGITS

NAME_PREFIX = First 3 letters of child's name (uppercase)
RANDOM_DIGITS = 4 random digits (0000-9999)

Total Length: 7 characters
Possible Combinations: ~3.5 trillion (vastly more than 4-digit PIN's 10,000)
```

### Examples

| Child Name | Generated Code | Format |
|-----------|---|---|
| Alice | ALI5821 | ALI + 5821 |
| Bob | BOB7234 | BOB + 7234 |
| Charlie | CHA0156 | CHA + 0156 |
| David | DAV9999 | DAV + 9999 |
| Eva | EVA0001 | EVA + 0001 |

### Collision Risk

| Users | 4-Digit PIN | 7-Char Code |
|-------|--|---|
| 100 | <1% | ~0% |
| 1,000 | ~36% | ~0% |
| 10,000 | >99% | ~0% |
| 1,000,000 | Guaranteed | ~0.0000001% |

**Conclusion**: 7-character codes scale to millions of users safely.

---

## Error Handling

### Common Errors & Recovery

| Error | Cause | Recovery |
|-------|-------|----------|
| "Wrong code" | Access code doesn't exist | Share correct code from parent |
| "Too many attempts" | 5 failed logins | Wait 15 minutes |
| Network error | No internet | Check WiFi/cellular |
| Video upload fails | Storage quota exceeded | Parent upgrades plan |
| Can't see events | Parent hasn't created any | Parent creates events first |

---

## Summary

1. **Parent** manages everything: children, events, gifts, and approvals
2. **Child** accesses app with unique 7-character access code
3. **Both** connect to same Supabase backend via different auth methods
4. **Data isolation** enforced by RLS policies and parent_id filtering
5. **Scaling** safe up to millions of users with unique access codes

---

For detailed testing procedures, see `TESTING_CHECKLIST.md`
For deployment steps, see `DEPLOYMENT_GUIDE.md`
