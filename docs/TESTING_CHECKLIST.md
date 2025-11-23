# Testing Checklist for Access Code System

Complete these tests to verify the new access code system works correctly.

## Prerequisites

- [ ] Database migration run: `access_code` column populated for all children
- [ ] App running locally with `npx expo start`
- [ ] Parent account created and logged in
- [ ] Test device or emulator ready

---

## Phase 1: Parent Workflows

### Create New Child

**Steps:**
1. Navigate to "Manage Children" from parent dashboard
2. Click "Add Child" button
3. Enter child name (e.g., "Alice")
4. Enter age (e.g., "8")
5. Click "Create Child"

**Expected Results:**
- [ ] Modal appears and doesn't freeze
- [ ] Can type in name field
- [ ] Can type in age field
- [ ] "Create Child" button is enabled
- [ ] Success alert shows with message: "✅ Child Added!"
- [ ] Alert shows: "Alice's Login Code: ALI[4 digits]" (e.g., "ALI5821")
- [ ] Access code is 7 characters total
- [ ] Access code starts with first 3 letters of name (uppercase)
- [ ] Last 4 characters are digits
- [ ] Returns to children list

**Verify in Database:**
```sql
SELECT id, name, access_code, pin FROM public.children
WHERE name = 'Alice'
ORDER BY created_at DESC LIMIT 1;
```
Expected:
- `access_code`: "ALI5821" (or similar - 7 chars)
- `pin`: "5821" (4 digits, for backwards compatibility)

---

### View Children List

**Steps:**
1. From parent dashboard, go to "Children" tab
2. Look at each child card

**Expected Results:**
- [ ] Child name displays
- [ ] Age displays (e.g., "Age 8")
- [ ] **Login Code badge shows 7-character code** (e.g., "Login Code: ALI5821")
- [ ] Not showing 4-digit PIN
- [ ] Not showing empty/blank code
- [ ] Share button visible
- [ ] Edit pencil icon visible

**Test Multiple Children:**
- [ ] Create 3+ children
- [ ] Verify each has unique access code
- [ ] Verify no access codes are the same
- [ ] All codes follow NAME+DIGITS format

---

### Share Access Code

**Steps:**
1. Click Share button on child card
2. Choose where to share (iMessage, email, etc.)
3. Copy the message

**Expected Results:**
- [ ] Share dialog opens
- [ ] Message includes child name: "Alice's Login Code:"
- [ ] Message includes 7-character code: "ALI5821"
- [ ] Message includes helpful text: "Share this with Alice so they can log in"
- [ ] Message does NOT show old PIN
- [ ] Message is easy to read

**Example Message:**
```
Alice's Login Code: ALI5821

Share this with Alice so they can log in to GratituGram!
```

---

### Edit Child

**Steps:**
1. Click pencil icon on child card
2. Change name or age
3. Click "Save Changes"

**Expected Results:**
- [ ] Edit modal opens (doesn't freeze)
- [ ] Current name and age populate in fields
- [ ] Can edit fields
- [ ] "Save Changes" button works
- [ ] Returns to children list
- [ ] Child info updated
- [ ] **Access code UNCHANGED** (should not regenerate)
- [ ] Verify in database that access_code is same

---

### Delete Child

**Steps:**
1. Long-press or find delete button on child card
2. Confirm deletion

**Expected Results:**
- [ ] Confirmation dialog appears
- [ ] Child removed from list
- [ ] Verify in database: child deleted

---

## Phase 2: Kid Login Workflows

### Successful Login

**Steps:**
1. Logout as parent
2. Go to Kid Login screen
3. Type the access code (e.g., "ALI5821")
4. Click checkmark button

**Expected Results:**
- [ ] Text input field shows (not number pad)
- [ ] Placeholder text: "ABC1234"
- [ ] Can type letters and numbers
- [ ] Input auto-capitalizes (lowercase becomes uppercase)
- [ ] Input limited to 7 characters max
- [ ] Checkmark button **disabled** until exactly 7 characters entered
- [ ] After typing 7 characters, checkmark button becomes **enabled**
- [ ] Button turns green (semantic success color)
- [ ] Loading spinner appears
- [ ] Redirects to kid home screen (e.g., "KidPendingGifts")
- [ ] Kid session stored in AsyncStorage:
  - `kidSessionId`: "ALI5821"
  - `parentId`: [parent's UUID]
  - `childId`: [child's UUID]
  - `childName`: "Alice"

---

### Wrong Access Code

**Steps:**
1. Go to Kid Login screen
2. Type wrong code (e.g., "XXX1234")
3. Click checkmark button

**Expected Results:**
- [ ] Error message appears: "Wrong code. Try again. (4 attempts remaining)"
- [ ] Input field clears
- [ ] Attempt counter increments
- [ ] Can try again immediately
- [ ] Still on login screen (not redirected)

---

### Failed Attempts & Lockout

**Steps:**
1. Go to Kid Login screen
2. Intentionally enter wrong code 5 times

**Expected Results:**
- **Attempt 1:** Error: "Wrong code. Try again. (4 attempts remaining)"
- **Attempt 2:** Error: "Wrong code. Try again. (3 attempts remaining)"
- **Attempt 3:** Error: "Wrong code. Try again. (2 attempts remaining)"
- **Attempt 4:** Error: "Wrong code. Try again. (1 attempts remaining)"
- **Attempt 5:** Error: "Too many attempts. Try again in 15 minutes."
- [ ] Input field disabled
- [ ] Checkmark button disabled (grayed out)
- [ ] Clear button disabled (grayed out)
- [ ] Orange warning banner shows: "Too many tries! Try again in [countdown]"
- [ ] Countdown timer ticks down (15:00, 14:59, etc.)

**Verify in Database:**
```sql
SELECT * FROM public.children WHERE access_code = 'ALI5821';
-- Should have is_locked = true or similar
```

---

### Lockout Timeout

**Steps:**
1. After lockout, wait for timer to reach 0:00 (or modify AsyncStorage to reduce wait)
2. Check if login works again

**Expected Results:**
- [ ] Timer reaches 0:00
- [ ] Account auto-unlocks
- [ ] Can enter code again
- [ ] Can successfully log in
- [ ] Attempt counter resets

**For Quick Testing (15 minutes is long):**
```javascript
// In KidPINLoginScreen.js, temporarily change:
const remaining = Math.max(0, 900000 - elapsed); // 15 minutes
// To:
const remaining = Math.max(0, 30000 - elapsed); // 30 seconds for testing
```

---

### Clear Button

**Steps:**
1. Type a partial code (e.g., "ALI52")
2. Click clear button (X icon)

**Expected Results:**
- [ ] Input field clears (becomes empty)
- [ ] Clear button is **enabled** when code has text
- [ ] Clear button is **disabled** when code is empty

---

### Case Insensitivity

**Steps:**
1. Type access code in lowercase (e.g., "ali5821")
2. Check display

**Expected Results:**
- [ ] Input auto-converts to uppercase: "ALI5821"
- [ ] Login works with lowercase input
- [ ] Display shows uppercase

---

## Phase 3: Data Isolation

### Kids Can Only See Their Parent's Data

**Setup:**
1. Parent A with child "Alice" (ALI5821)
2. Parent B with child "Bob" (BOB7234)
3. Create test events in Parent A account

**Steps:**
1. Log in as Parent A's child (Alice) with code "ALI5821"
2. Check what events/data are visible
3. Log out
4. Log in as Parent B's child (Bob) with code "BOB7234"
5. Check what events/data are visible

**Expected Results:**
- [ ] Alice sees **only** Parent A's events
- [ ] Alice **cannot** see Parent B's events
- [ ] Bob sees **only** Parent B's events
- [ ] Bob **cannot** see Parent A's events
- [ ] Each kid only sees their own parent's data

**Verify in Database:**
```sql
-- Check access code maps to correct parent
SELECT c.id, c.name, c.access_code, c.parent_id, p.email
FROM public.children c
JOIN public.parents p ON c.parent_id = p.id
WHERE c.access_code IN ('ALI5821', 'BOB7234');
```

---

## Phase 4: Edge Cases

### Duplicate Access Code Generation

**Setup:**
1. Create 10+ children
2. Check for duplicates

**Expected Results:**
- [ ] All access codes are unique
- [ ] No duplicates generated
- [ ] Verify in database:

```sql
SELECT access_code, COUNT(*) as count
FROM public.children
GROUP BY access_code
HAVING COUNT(*) > 1;
-- Should return 0 rows (no duplicates)
```

---

### Name Edge Cases

**Test Names:**
1. "A" (single letter)
2. "AB" (two letters)
3. "Alice" (normal)
4. "İbrahim" (special characters)
5. "José María" (accents)

**Expected Results:**
- [ ] Single letter "A" → "AAA[digits]"
- [ ] Two letters "AB" → "ABA[digits]" or "ABX[digits]"
- [ ] Special characters handled gracefully
- [ ] Access code always 7 characters

---

### Numeric Input

**Steps:**
1. Try entering numbers only (e.g., "1234567")
2. Try entering special characters (e.g., "ALI!@#$")

**Expected Results:**
- [ ] Numbers work
- [ ] Special characters filtered or ignored
- [ ] Only alphanumeric accepted

---

## Phase 5: Database Integrity

### Access Code Format

```sql
-- Check all access codes follow pattern
SELECT id, name, access_code,
       CASE
         WHEN access_code ~ '^[A-Z]{3}[0-9]{4}$' THEN 'VALID'
         ELSE 'INVALID'
       END as format_check
FROM public.children
ORDER BY created_at DESC;
-- All should be VALID
```

---

### Backwards Compatibility

**Verify PIN column still exists (for legacy support):**
```sql
-- Check PIN column
SELECT id, name, pin, access_code FROM public.children LIMIT 5;
-- All should have both pin AND access_code populated
```

---

### Unique Constraint

```sql
-- Verify access_code has UNIQUE constraint
SELECT constraint_name, table_name, column_name
FROM information_schema.constraint_column_usage
WHERE table_name = 'children' AND column_name = 'access_code';
-- Should show unique constraint exists
```

---

## Phase 6: Performance Tests

### Query Performance

**Steps:**
1. Create 100+ children
2. Load Children tab
3. Check load time

**Expected Results:**
- [ ] Children tab loads in <2 seconds
- [ ] No noticeable lag
- [ ] All access codes display correctly

**Database Index Check:**
```sql
-- Verify index exists for fast lookups
SELECT indexname FROM pg_indexes
WHERE tablename = 'children' AND indexname LIKE '%access_code%';
-- Should return index name if exists
```

---

## Test Report Template

Use this to document your testing:

```
Test Date: [DATE]
Tester: [NAME]
Environment: [LOCAL/STAGING/PRODUCTION]
App Version: [VERSION]
Database: [DEV/STAGING/PRODUCTION]

Phase 1: Parent Workflows
- [ ] Create new child: PASS/FAIL
- [ ] View children list: PASS/FAIL
- [ ] Share access code: PASS/FAIL
- [ ] Edit child: PASS/FAIL
- [ ] Delete child: PASS/FAIL

Phase 2: Kid Login
- [ ] Successful login: PASS/FAIL
- [ ] Wrong code: PASS/FAIL
- [ ] Lockout (5 attempts): PASS/FAIL
- [ ] Clear button: PASS/FAIL
- [ ] Case insensitive: PASS/FAIL

Phase 3: Data Isolation
- [ ] Alice can't see Bob's data: PASS/FAIL
- [ ] Bob can't see Alice's data: PASS/FAIL

Phase 4: Edge Cases
- [ ] No duplicate codes: PASS/FAIL
- [ ] Name edge cases: PASS/FAIL
- [ ] Numeric input: PASS/FAIL

Phase 5: Database
- [ ] Access code format valid: PASS/FAIL
- [ ] Backwards compatibility: PASS/FAIL
- [ ] Unique constraint works: PASS/FAIL

Phase 6: Performance
- [ ] Children list loads <2s: PASS/FAIL
- [ ] No lag with 100+ children: PASS/FAIL

Issues Found:
- [Issue 1]
- [Issue 2]

Sign Off: [INITIALS]
```

---

## Quick Test (5 minutes)

Run this if you only have 5 minutes:

1. Create one child named "Test"
2. Verify access code displays (e.g., "TES5821")
3. Log out
4. Log in as kid with that code
5. Verify child gets logged in
6. Log out
7. Try logging in with wrong code
8. Verify error message appears

**If all 7 steps work**, the core system is functioning.

---

## Notes

- Tests assume you have Supabase connected properly
- Replace example codes/names with actual values from your tests
- Document any issues found for troubleshooting
- For performance tests, use actual production-like data volumes
