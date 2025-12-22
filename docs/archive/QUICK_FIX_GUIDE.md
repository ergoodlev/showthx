# GratituGram - Quick Fix Priority Guide

## Priority Levels & Timeline

### MUST FIX FIRST (Blocks entire workflow)
**Estimated Time: 2-3 hours**

These are the CRITICAL blockers preventing the app from working at all.

#### 1. Choose & Lock Schema Version (30 min)
**Status:** DECISION NEEDED
**Files:** Multiple schema files creating confusion

**Decision Needed:**
```
Option A: Use SUPABASE_SCHEMA_MINIMAL.sql
  Pros: Simpler, fewer tables
  Cons: Requires adding missing columns/tables
  
Option B: Use supabase-schema-phase2.sql  
  Pros: More complete, has all needed tables
  Cons: More complex, might have extra features
```

**What to do:**
1. Go to Supabase console → SQL Editor
2. Clear existing schema (if possible)
3. Run ONLY ONE schema file completely
4. Document which one in app config

---

#### 2. Create ManageChildrenScreen.js (1 hour)
**Blocker:** Without this, parent can't create kids, so gift assignment fails

**What it needs:**
```javascript
// ManageChildrenScreen.js
- Display list of parent's children
- Add button → Modal to create new child
- Form fields:
  - Name (required)
  - Age (optional)
  - PIN (required, 4-6 digits)
- Edit/Delete buttons for each child
- Display PIN prominently after creation
```

**Where to add it:**
```
ParentDashboardScreen (SETTINGS tab)
  → Replace current settings content with:
    1. Parent profile section (existing)
    2. Manage Children section (NEW)
    3. Logout button (existing)
```

**Code template:**
```javascript
// Insert into children table
const { error } = await supabase
  .from('children')
  .insert({
    parent_id: user.id,
    name: childName,
    age: childAge || null,
    pin: childPin,
    created_at: new Date().toISOString(),
  });
```

---

#### 3. Fix authService.js - validateKidPin() (30 min)
**Blocker:** Kid can't login, so can't access gifts

**Current Code Problem (Line 171-202):**
```javascript
// WRONG - queries parents table
const { data: parent } = await supabase
  .from('parents')
  .select('id, full_name, child_name')
  .eq('kid_code', pin)
  .single();
```

**Fixed Code:**
```javascript
const { data: child } = await supabase
  .from('children')
  .select('id, name, parent_id')
  .eq('pin', pin)
  .single();

if (!child) {
  return { success: false, error: 'Invalid PIN' };
}

// Store child ID, not PIN
await AsyncStorage.setItem(KID_SESSION_KEY, child.id);
await AsyncStorage.setItem('kidName', child.name);
await AsyncStorage.setItem('parentId', child.parent_id);

return {
  success: true,
  childId: child.id,
  childName: child.name,
};
```

---

#### 4. Update KidPendingGiftsScreen Query (30 min)
**Blocker:** Kid can't see assigned gifts

**Current Code Problem (Line 62-80):**
```javascript
// Wrong column name: children_id should be child_id
.eq('children_id', storedKidId)
```

**Fixed Code:**
```javascript
// Use stored child ID from session
const storedChildId = await AsyncStorage.getItem(KID_SESSION_KEY);

const { data: giftsData, error: giftsError } = await supabase
  .from('gift_assignments')
  .select(`
    gift:gifts(
      id,
      name,
      giver_name,
      event_id,
      event:events(name)
    ),
    video:videos(id, status, recorded_at)
  `)
  .eq('child_id', storedChildId);  // Fixed column name
```

---

#### 5. Fix Gift Column References (30 min)
**Blocker:** Gift creation fails due to missing column

**In GiftManagementScreen.js (Line 140-143):**

Current:
```javascript
const giftData = {
  name: giftName,
  giver_name: giverName,  // May not exist in minimal schema
  description: description || null,
  event_id: eventId,
};
```

**If using MINIMAL SCHEMA:**
```javascript
// Add giver_name column to gifts table first:
ALTER TABLE gifts ADD COLUMN giver_name VARCHAR(255);

// Then use:
const giftData = {
  name: giftName,
  giver_name: giverName,
  description: description || null,
  event_id: eventId,
};
```

**If using PHASE2 SCHEMA:**
```javascript
// Use correct column names from phase2:
const giftData = {
  gift_name: giftName,
  gift_giver_name: giverName,
  gift_description: description || null,
  event_id: eventId,
};

// Then update display code to use:
item.gift_name
item.gift_giver_name
item.gift_description
```

---

### IMPORTANT NEXT (High priority, enables testing)
**Estimated Time: 1-2 hours**

#### 6. Create gift_assignments Table (if needed)
**Check:** Does your Supabase have this table?

**If using MINIMAL SCHEMA - Table is missing!**
```sql
CREATE TABLE IF NOT EXISTS public.gift_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gift_id UUID NOT NULL REFERENCES public.gifts(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  parent_id UUID NOT NULL REFERENCES public.parents(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_gift_assignments_gift_id ON public.gift_assignments(gift_id);
CREATE INDEX idx_gift_assignments_child_id ON public.gift_assignments(child_id);
```

---

#### 7. Fix ParentDashboardScreen Event Query (30 min)
**Issue:** Gift count may not load correctly

**Current (Line 81-88):**
```javascript
.select('*, gifts:gifts(count)')  // May fail
```

**Fixed:**
```javascript
// Option 1: Simple, no count
const { data: eventList } = await supabase
  .from('events')
  .select('*')
  .eq('parent_id', user.id);

// Option 2: Get gift counts separately
const { data: eventList } = await supabase
  .from('events')
  .select('*')
  .eq('parent_id', user.id);

// In UI: count gifts manually
const eventWithCounts = eventList?.map(event => ({
  ...event,
  giftCount: gifts.filter(g => g.event_id === event.id).length
}));
```

---

#### 8. Add RLS Policies for gift_assignments (if needed)
**Check:** If table exists, ensure RLS is enabled

```sql
-- Enable RLS
ALTER TABLE public.gift_assignments ENABLE ROW LEVEL SECURITY;

-- Parents can view their gift assignments
CREATE POLICY "Parents can view own gift assignments" 
  ON public.gift_assignments 
  FOR SELECT 
  USING (auth.uid()::text = parent_id::text);

CREATE POLICY "Parents can insert own gift assignments" 
  ON public.gift_assignments 
  FOR INSERT 
  WITH CHECK (auth.uid()::text = parent_id::text);
```

---

## Testing Checklist - Phase 1

Use this to verify everything works:

### Parent Setup
- [ ] Parent signs up with email/password
- [ ] Parent logs in
- [ ] Parent can access ParentDashboard
- [ ] Parent can access Settings tab
- [ ] Parent can add a child (name, PIN)
- [ ] Child PIN is displayed
- [ ] Child appears in list

### Event Creation
- [ ] Parent can create event
- [ ] Event shows in EVENTS tab
- [ ] Event displays event type
- [ ] Can edit event
- [ ] Can delete event

### Gift Management
- [ ] Parent can tap event to open GiftManagementScreen
- [ ] Child list appears with checkboxes
- [ ] Parent can add gift
- [ ] Parent enters: name, giver name, description
- [ ] Parent selects child (checkbox)
- [ ] Gift appears in list with selected child

### Kid Login
- [ ] App switches to AuthChoice screen (logout first)
- [ ] Select "I'm a Child"
- [ ] Kid PIN login screen appears
- [ ] Kid enters PIN
- [ ] Kid accesses KidPendingGiftsScreen
- [ ] Gift list appears with assigned gifts

### Kid Recording
- [ ] Gift appears with "Record" button
- [ ] Kid can record video
- [ ] Video preview works
- [ ] Can proceed to customization

### Parent Review
- [ ] Parent sees pending video in VIDEOS tab
- [ ] Parent can review video
- [ ] Parent can approve/reject video

---

## Deployment Checklist

Before deploying to production:

- [ ] Choose schema version and delete old schema files
- [ ] Update all code to use chosen schema's column names
- [ ] Create ManageChildrenScreen and integrate into Settings
- [ ] Test complete flow: Parent signup → Create event → Create child → Create gift → Kid login → Record video → Parent review
- [ ] Verify all Supabase queries work without errors
- [ ] Test PIN validation with multiple children
- [ ] Test edge cases (invalid PIN, no children, no gifts)
- [ ] Document schema version in app config
- [ ] Update README with setup instructions

---

## Files to Modify (Priority Order)

```
1. HIGHEST PRIORITY (Blocks entire app):
   - authService.js (validateKidPin function)
   - Create: ManageChildrenScreen.js
   - GiftManagementScreen.js (gift data structure)
   
2. HIGH PRIORITY (Enables testing):
   - KidPendingGiftsScreen.js (query column names)
   - ParentDashboardScreen.js (event query)
   - Supabase schema (add gift_assignments if needed)
   
3. MEDIUM PRIORITY (Polish):
   - VideoRecordingScreen.js (video upload)
   - ParentVideoReviewScreen.js (approval flow)
   - SendToGuestsScreen.js (email sending)
```

---

## Common Errors & Solutions

### "Column 'giver_name' doesn't exist"
**Solution:** Add column to schema or rename to match phase2 (gift_giver_name)

### "Relation 'gift_assignments' doesn't exist"
**Solution:** Create table using SQL from section 6 above

### "Child not found with PIN"
**Solution:** Verify authService.js fix is applied, check children table has data

### "Gift count showing 0 for all events"
**Solution:** Simplify event query per step 7, remove gifts:gifts(count)

### "No kids appear in checkboxes"
**Solution:** Ensure ManageChildrenScreen is created and parent added children

---

## Schema Decision Matrix

| Aspect | Minimal | Phase 2 |
|--------|---------|---------|
| **Setup time** | Faster | Slower |
| **Column naming** | Simple (name) | Prefixed (gift_name) |
| **Missing tables** | Yes (gift_assignments) | No |
| **RLS complexity** | Simpler | More complex |
| **Features** | Core only | Advanced |
| **Code changes** | More (add tables) | Fewer (align names) |

**Recommendation:** Use Phase 2 schema - it's already complete

---

## How to Get Help If Stuck

1. **Check WORKFLOW_ANALYSIS.md** - Full detailed analysis
2. **Check WORKFLOW_DIAGRAMS.md** - Visual flows showing where issues are
3. **Check file line numbers** - Issues reference specific line numbers
4. **Test incrementally** - Fix one component, test, move to next
5. **Check Supabase logs** - Database errors show in Supabase SQL editor

