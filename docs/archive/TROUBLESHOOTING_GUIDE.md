# GratituGram Troubleshooting Guide

Solutions for common issues encountered during development and deployment.

---

## Issues During Deployment

### Issue 1: "null value in column 'pin' violates not-null constraint"

**When This Occurs**:
- Creating a new child
- Error appears in console
- Child not saved to database

**Root Cause**:
Code only provides `access_code` but database PIN column requires value (NOT NULL constraint).

**Solution**:

Make sure ManageChildrenScreen generates BOTH PIN and access_code:

```javascript
// ✅ CORRECT - Generate both
if (modalMode === 'create') {
  const accessCode = generateAccessCode(childName);
  const pin = generatePin();  // ← Generate PIN too

  const { error: insertError } = await supabase
    .from('children')
    .insert({
      parent_id: user.id,
      name: childName,
      age: parseInt(childAge),
      access_code: accessCode,
      pin: pin,  // ← Include PIN in insert
    });
}

// ❌ WRONG - Only access_code
const { error: insertError } = await supabase
  .from('children')
  .insert({
    parent_id: user.id,
    name: childName,
    age: parseInt(childAge),
    access_code: accessCode,
    // Missing: pin
  });
```

**Check in Code**:
Open `screens/ManageChildrenScreen.js` → `handleSave()` function
Verify both `accessCode` and `pin` are generated and inserted.

---

### Issue 2: Access Codes Not Displaying (Show Blank or 4-digit PIN)

**When This Occurs**:
- Children tab shows "Login Code:" with blank badge
- Or shows 4-digit PIN instead of 7-character code

**Root Cause**:
Existing children created before access code system don't have values in `access_code` column.

**Solution**:

**Step 1**: Run SQL migration in Supabase

Go to Supabase Dashboard → **SQL Editor** → **New Query**

```sql
-- Check current state
SELECT COUNT(*) as total_children,
       SUM(CASE WHEN access_code IS NULL OR access_code = '' THEN 1 ELSE 0 END) as missing_codes
FROM public.children;

-- Populate missing codes
UPDATE public.children
SET access_code = UPPER(SUBSTR(name, 1, 3)) || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0')
WHERE access_code IS NULL OR access_code = '';

-- Verify
SELECT id, name, access_code FROM public.children ORDER BY created_at DESC;
```

**Step 2**: Reload app
- Pull to refresh on Children tab, OR
- Close and restart the app

**Step 3**: Verify
- Check if access codes now display
- Should see: "Login Code: ALI5821" (or similar)

---

### Issue 3: Modal Appears Blank When Adding Child

**When This Occurs**:
- Click "Add Child" button
- Modal appears but input fields don't render
- Can't type anything

**Root Cause**:
Flex layout conflict - intermediate View with `flex: 1` inside Modal's centeredView.

**Solution**:

Check `screens/ManageChildrenScreen.js` → Modal JSX

```javascript
// ✅ CORRECT - ScrollView directly in Modal
<Modal visible={showModal} onClose={() => setShowModal(false)} size="large">
  <ScrollView
    showsVerticalScrollIndicator={false}
    keyboardShouldPersistTaps="handled"
    scrollEnabled={true}
  >
    {/* Content directly here */}
    <TextField ... />
    <ThankCastButton ... />
  </ScrollView>
</Modal>

// ❌ WRONG - Extra flex: 1 View wrapper
<Modal visible={showModal} onClose={() => setShowModal(false)}>
  <View style={{ flex: 1, padding: theme.spacing.lg }}>
    <ScrollView>
      {/* Content inside nested flex */}
    </ScrollView>
  </View>
</Modal>
```

**If Still Blank**:
1. Force reload in Expo: Press `R` (iOS) or `R` (Android)
2. Clear Expo cache: `expo start --clear`
3. Check browser console for errors

---

### Issue 4: Kids Can't Login - "Invalid Login Code" Error

**When This Occurs**:
- Kid enters what they think is the correct code
- Error: "Invalid Login Code"
- Can't log in

**Possible Causes & Solutions**:

**Cause A**: Wrong Access Code Entered
- **Solution**: Parent re-shares correct code from Children tab

**Cause B**: Access Code Not Populated in Database
- **Check**: Run this SQL:
  ```sql
  SELECT id, name, access_code FROM public.children
  WHERE name = '[child name]';
  ```
  If `access_code` is NULL or empty, run migration (Issue #2)

**Cause C**: Typo in Code
- **Solution**: Make sure code is exactly as displayed
- Note: Input auto-uppercases, so "ali5821" → "ALI5821" (should work)

**Cause D**: Case Sensitivity Issue
- **Note**: App auto-uppercases input
- "ali5821" should convert to "ALI5821" automatically
- If not working, check KidPINLoginScreen:
  ```javascript
  value={pin.toUpperCase()}  // ← Ensure toUpperCase() is there
  onChangeText={(text) => setPin(text.toUpperCase().slice(0, 7))}
  ```

**Cause E**: Database Not Updated After Code Changes
- **Solution**:
  1. Stop Expo server: `Ctrl+C`
  2. Clear cache: `expo start --clear`
  3. Try again

---

## Issues During Testing

### Issue 5: Kid Login Button Disabled Even with 7 Characters

**When This Occurs**:
- Child types 7 characters (e.g., "ALI5821")
- Checkmark button still gray/disabled

**Root Cause**:
Submit button validation still checks for old length (4 instead of 7).

**Solution**:

Check `screens/KidPINLoginScreen.js` → `handleSubmit()` and button styling

```javascript
// ✅ CORRECT - Check for 7 characters
const handleSubmit = async () => {
  if (locked || pin.length !== 7) return;  // ← Check for 7
  // ...
};

<TouchableOpacity
  disabled={locked || pin.length !== 7}  // ← Disable if not 7
  // ...
  backgroundColor: locked || pin.length !== 7
    ? theme.neutralColors.lightGray
    : theme.semanticColors.success
>

// ❌ WRONG - Still checking for 4
const handleSubmit = async () => {
  if (locked || pin.length !== 4) return;  // ← Old code
  // ...
};

disabled={locked || pin.length !== 4}  // ← Still old check
```

**If Still Disabled**:
- Make sure `pin` state updates as user types
- Check that TextInput has `onChangeText` handler:
  ```javascript
  <TextInput
    onChangeText={(text) => setPin(text.toUpperCase().slice(0, 7))}
    maxLength={7}
    // ...
  />
  ```

---

### Issue 6: Account Lockout Doesn't Time Out

**When This Occurs**:
- After 5 failed attempts, account locked
- Timer shows 15:00
- Timer doesn't count down or takes forever

**Root Cause**:
- Timer interval not clearing properly
- Component not updating
- Or lockout time stored incorrectly

**Solution**:

Check `screens/KidPINLoginScreen.js` → Lockout countdown effect

```javascript
// ✅ CORRECT - Cleanup interval
useEffect(() => {
  if (!locked || !lockTime) return;

  const timer = setInterval(() => {
    const now = Date.now();
    const elapsed = now - lockTime;
    const remaining = 900000 - elapsed; // 15 minutes

    if (remaining <= 0) {
      setLocked(false);
      setAttempts(0);
      setLockTime(null);
    }
  }, 1000);

  return () => clearInterval(timer);  // ← Clean up interval
}, [locked, lockTime]);

// ❌ WRONG - No cleanup, interval never stops
useEffect(() => {
  const timer = setInterval(() => {
    // ... logic
  }, 1000);
  // Missing: return () => clearInterval(timer);
}, [locked, lockTime]);
```

**For Testing**: Modify timeout during testing
```javascript
// In development, use 30 seconds instead of 15 minutes:
const remaining = Math.max(0, 30000 - elapsed); // 30 seconds for testing
// Then revert before deploying to production
```

---

### Issue 7: Data Not Refreshing After Changes

**When This Occurs**:
- Parent creates a child
- Child doesn't appear in list
- Or old data still showing

**Root Cause**:
- Query not run after mutation
- App not refetching data
- Cache not cleared

**Solution**:

Check that screen uses `useFocusEffect` to reload data:

```javascript
// ✅ CORRECT - Reload when screen focused
useFocusEffect(
  useCallback(() => {
    loadChildren();  // ← Refetch data when screen comes into focus
  }, [])
);

// ✅ CORRECT - After creating/editing
const handleSave = async () => {
  // ... create/edit logic
  setShowModal(false);
  await loadChildren();  // ← Refetch after save
};

// ❌ WRONG - No refetch after modal closes
const handleSave = async () => {
  // ... create/edit logic
  setShowModal(false);
  // Missing: await loadChildren();
};
```

**Manual Fix** (for testing):
- Pull down to refresh (if RefreshControl enabled)
- Close and reopen app
- Navigate away and back to screen

---

### Issue 8: "Cannot read property 'access_code' of undefined"

**When This Occurs**:
- App crashes when viewing Children tab
- Error in console: "Cannot read property 'access_code'"

**Root Cause**:
- `item` object doesn't have `access_code` field
- Query didn't select it
- Data structure mismatch

**Solution**:

Check query in `screens/ParentDashboardScreen.js` → `loadDashboardData()`

```javascript
// ✅ CORRECT - Include access_code in select
const { data: childList, error: childrenError } = await supabase
  .from('children')
  .select('id, name, age, access_code, created_at')  // ← Include access_code
  .eq('parent_id', user.id)
  .order('created_at', { ascending: false });

// ❌ WRONG - Missing access_code
const { data: childList, error: childrenError } = await supabase
  .from('children')
  .select('id, name, age, created_at')  // ← Missing access_code
  .eq('parent_id', user.id)
  .order('created_at', { ascending: false });
```

**Also check** that display uses correct field:
```javascript
// ✅ CORRECT
<Text>Login Code: {item.access_code}</Text>

// ❌ WRONG
<Text>Login Code: {item.pin}</Text>
// (This would show old 4-digit PIN)

// ❌ WRONG
<Text>Login Code: {item.code}</Text>
// (Wrong field name)
```

---

## Issues with Supabase

### Issue 9: "No rows found" Error

**When This Occurs**:
- Kid tries to login
- Error: "No rows found" or "single() returned 0 rows"

**Root Cause**:
- Access code doesn't exist in database
- Typo in code
- Database query issue

**Solution**:

**Step 1**: Verify code in database
```sql
SELECT * FROM public.children WHERE access_code = 'ALI5821';
-- Should return 1 row
```

If no rows:
- Access code not in database
- Run migration for existing children (Issue #2)
- Or create new child (which auto-generates code)

**Step 2**: Check kid typed code correctly
- Parent shares code again
- Kid re-types carefully

**Step 3**: Check query in authService.js
```javascript
// ✅ CORRECT
const { data: child, error } = await supabase
  .from('children')
  .select('id, parent_id, name, access_code')
  .eq('access_code', accessCode)  // ← Match exactly
  .single();

// ❌ WRONG - Wrong field name
const { data: child, error } = await supabase
  .from('children')
  .select('id, parent_id, name, access_code')
  .eq('code', accessCode)  // ← Wrong field
  .single();
```

---

### Issue 10: RLS Policy Error

**When This Occurs**:
- Error: "new row violates row-level security policy"
- Or: "permission denied for schema 'public'"

**Root Cause**:
- RLS policy not configured correctly
- User doesn't have permission to insert/update
- Not authenticated

**Solution**:

**For Parent Inserts**:
Ensure parent is authenticated via Supabase Auth
```javascript
// ✅ CORRECT - User is signed in
const { data: { user } } = await supabase.auth.getUser();
if (!user) return;
// Now user.id can be used for RLS
```

**Check RLS Policy**:
In Supabase Dashboard → Authentication → Policies

Should have policies like:
```sql
-- Allow parents to insert children
CREATE POLICY "parents_can_create_children" ON children
  FOR INSERT
  WITH CHECK (parent_id = auth.uid());

-- Allow kids to view their own data
CREATE POLICY "kids_can_view_events" ON events
  FOR SELECT
  USING (parent_id = (SELECT parent_id FROM children WHERE id = (SELECT child_id FROM current_session)));
```

**Verify Policy**:
```sql
SELECT * FROM pg_policies WHERE tablename = 'children';
-- Should list policies
```

---

## Issues with Network/Sync

### Issue 11: Videos Not Uploading

**When This Occurs**:
- Kid records video
- Video stays "pending"
- Error about upload failing

**Root Cause**:
- Network issue
- Storage quota exceeded
- Video file too large
- Wrong bucket configuration

**Solution**:

**Check Network**:
```javascript
// Add network check in VideoRecordingScreen
const { isConnected } = await NetInfo.fetch();
if (!isConnected) {
  Alert.alert('No Internet', 'Please connect to WiFi or cellular data');
  return;
}
```

**Check Bucket**:
Verify Supabase storage bucket exists and is public:
1. Supabase Dashboard → Storage
2. Should have bucket: "videos" or similar
3. Set RLS policy to allow authenticated users

**Check File Size**:
```javascript
// Limit video size
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB
if (videoFile.size > MAX_VIDEO_SIZE) {
  Alert.alert('File Too Large', 'Maximum video size is 100MB');
  return;
}
```

---

### Issue 12: Database Changes Not Reflecting in App

**When This Occurs**:
- Made SQL changes in Supabase
- App still shows old data
- Restart doesn't help

**Root Cause**:
- Expo cache not cleared
- App reloading old bundle
- GraphQL subscription not working

**Solution**:

**Clear Expo Cache**:
```bash
# Stop Expo server
Ctrl+C

# Clear cache and restart
expo start --clear
```

**Or Clear Device Cache**:
```bash
# iOS
xcrun simctl erase all

# Android
emulator -avd [emulator_name] -wipe-data
```

**Force Reload**:
- While app running, press `R` (iOS) or double-R (Android)

---

## General Debugging Tips

### Enable Logging

Add logging throughout app to debug issues:

```javascript
// In authService.js
export const validateKidPin = async (accessCode) => {
  console.log('🔐 Validating access code:', accessCode);

  try {
    const { data: child, error } = await supabase
      .from('children')
      .select('id, parent_id, name, access_code')
      .eq('access_code', accessCode)
      .single();

    console.log('📊 Database result:', { child, error });

    if (error || !child) {
      console.error('❌ Access code not found:', error);
      return { success: false, error: 'Invalid Login Code' };
    }

    console.log('✅ Access code valid for child:', child.name);
    // ...
  } catch (error) {
    console.error('💥 Exception in validateKidPin:', error);
    // ...
  }
};
```

### View Logs in Supabase

Supabase Dashboard → Logs:
- PostgreSQL logs
- Authentication logs
- API usage

Look for errors when operations fail.

### Use Supabase CLI

```bash
# Connect to Supabase project
supabase projects list
supabase projects select

# View realtime logs
supabase logs function --tail

# Test queries directly
supabase sql
```

### Check Network Tab

In Expo DevTools:
1. Open DevTools menu
2. Go to Network tab
3. Watch API calls
4. Check response body for errors

---

## Common Error Messages & Fixes

| Error Message | Cause | Fix |
|---|---|---|
| "Invalid Login Code" | Access code not in database | Run migration or verify code |
| "Wrong code. Try again." | Typo in code entered | Parent re-shares correct code |
| "Too many attempts" | 5 failed logins | Wait 15 minutes |
| "Modal appears blank" | Flex layout issue | Remove intermediate View wrapper |
| "Cannot save child" | PIN field missing | Generate both PIN and access_code |
| "Access code not displayed" | Column value NULL | Run SQL migration |
| "Button still disabled" | Length check outdated | Update to check length !== 7 |
| "Data not refreshing" | Query not re-run | Add useFocusEffect or call refetch |
| "No rows found" | .single() returned nothing | Verify data exists in database |
| "RLS policy error" | User not authenticated | Ensure user logged in first |

---

## When All Else Fails

### Nuclear Option: Reset Everything

```bash
# Stop everything
Ctrl+C
expo start --clear

# Close app completely (iOS: swipe up; Android: back button)

# Close Expo
Ctrl+C again

# Reopen Expo
expo start --localhost
```

### Reset Database (Development Only!)

⚠️ **WARNING**: This will DELETE all data. Only in development.

```sql
-- Backup first!
-- Then reset:
DELETE FROM public.videos;
DELETE FROM public.gifts;
DELETE FROM public.events;
DELETE FROM public.children;
DELETE FROM public.parents;

-- Restart fresh
```

### Get Help

1. **Check Logs**: Supabase Dashboard → Logs
2. **Search Docs**: [Expo Docs](https://docs.expo.dev), [Supabase Docs](https://supabase.com/docs)
3. **Check Discord**: Expo Discord, Supabase Discord
4. **Isolate Issue**: Identify which part fails (auth, database, UI, network)

---

## Reference Files

- **Deployment Guide**: `DEPLOYMENT_GUIDE.md`
- **Testing Checklist**: `TESTING_CHECKLIST.md`
- **Workflow Documentation**: `WORKFLOW_DOCUMENTATION.md`
- **Architecture Guide**: `ARCHITECTURE_DEVICE_LINKING.md`
