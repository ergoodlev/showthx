# Device Linking & PIN Authentication Architecture

## Executive Summary

**Yes, kids can download the app on their own device and use a PIN to login.**

The two devices are linked through **a shared Supabase backend database**. All devices point to the same PostgreSQL database instance, so data is automatically synchronized in real-time.

---

## Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                   SUPABASE BACKEND (Shared)                      │
│                  PostgreSQL Database Instance                    │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  parents table          children table          events table      │
│  ┌──────────────────┐  ┌──────────────────┐   ┌────────────────┐ │
│  │ id (UUID)        │  │ id (UUID)        │   │ id (UUID)      │ │
│  │ email            │  │ parent_id (FK)   │   │ parent_id (FK) │ │
│  │ full_name        │  │ name             │   │ name           │ │
│  │ created_at       │  │ age              │   │ event_date     │ │
│  └──────────────────┘  │ pin (4-digit)    │   │ gifts[]        │ │
│                        │ created_at       │   └────────────────┘ │
│                        └──────────────────┘                       │
│                                                                   │
│  gifts table            videos table        gift_assignments     │
│  ┌──────────────────┐  ┌──────────────────┐ ┌────────────────┐  │
│  │ id (UUID)        │  │ id (UUID)        │ │ gift_id (FK)   │  │
│  │ event_id (FK)    │  │ child_id (FK)    │ │ child_id (FK)  │  │
│  │ giver_name       │  │ gift_id (FK)     │ │ created_at     │  │
│  │ description      │  │ status           │ └────────────────┘  │
│  │ created_at       │  │ created_at       │                      │
│  └──────────────────┘  └──────────────────┘                      │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
        ▲                    ▲                         ▲
        │                    │                         │
  (HTTP API)          (HTTP API)                  (HTTP API)
        │                    │                         │
   ┌────┴─────┐         ┌────┴─────┐          ┌───────┴──────┐
   │ PARENT'S  │         │   KID's   │          │  KID 2's    │
   │ iPhone    │         │   iPad    │          │  Android    │
   │           │         │           │          │             │
   │ Login:    │         │ Login:    │          │ Login:      │
   │ • Email   │         │ • PIN:    │          │ • PIN:      │
   │ • Password│         │   5821    │          │   3749      │
   │           │         │           │          │             │
   │ Access:   │         │ Access:   │          │ Access:     │
   │ • Dashboard          │ • Gifts   │          │ • Gifts     │
   │ • Children│         │ • Videos  │          │ • Videos    │
   │ • Events  │         │ • Parent's│          │ • Parent's  │
   │ • Videos  │         │   events  │          │   events    │
   └───────────┘         └───────────┘          └─────────────┘
```

---

## Complete Login Flow

### Part 1: Parent Setup (Parent Device)

```
1. Parent opens app → AuthChoice screen
2. Parent selects "Sign Up" → ParentSignupScreen
3. Parent enters:
   - Email: mom@example.com
   - Password: securepassword123
   - Name: Sarah

4. Backend (authService.parentSignup):
   ✓ Create auth user in Supabase Auth
   ✓ Sign in the user (to establish session)
   ✓ Insert parent profile into parents table:
     { id: 'uuid-parent-123', email: '...', full_name: 'Sarah' }
   ✓ Store session in AsyncStorage: parentSessionId = 'uuid-parent-123'

5. RootNavigator polls and detects:
   parentSessionId exists → Show ParentAppStack

6. Parent sees ParentDashboard with tabs:
   [Events] [Children] [Videos] [Settings]
```

### Part 2: Parent Adds Child (Still Parent Device)

```
1. Parent clicks "Children" tab
2. Parent clicks + button → ManageChildrenScreen (create mode)
3. Parent enters:
   - Child Name: Alice
   - Child Age: 7

4. Backend (ManageChildrenScreen.handleSave):
   ✓ Generate random 4-digit PIN: 5821
   ✓ Insert into children table:
     {
       id: 'uuid-child-456',
       parent_id: 'uuid-parent-123',
       name: 'Alice',
       age: 7,
       pin: '5821',
       created_at: now()
     }

5. PIN displayed on screen in coral badge
6. Parent can share PIN via SMS/email: "Alice's PIN is 5821"
```

### Part 3: Child Login (Different Device)

```
1. Child opens the same app on their tablet
   (Downloaded from app store, same version, same Supabase config)

2. AuthChoice screen shows:
   [Parent Login] [Kid Login with PIN]

3. Child taps "Kid Login with PIN" → KidPINLoginScreen

4. Child enters PIN on number pad: 5821
   (4 big buttons optimized for kids)

5. Backend (authService.validateKidPin):
   ✓ Query children table: SELECT * WHERE pin = '5821'
   ✓ Finds: { id: 'uuid-child-456', parent_id: 'uuid-parent-123', name: 'Alice', age: 7 }
   ✓ Store session in AsyncStorage:
     - kidSessionId = '5821'           (the PIN itself is the token)
     - parentId = 'uuid-parent-123'    (to fetch parent's data)
     - childId = 'uuid-child-456'      (to know which child this is)
     - childName = 'Alice'

6. RootNavigator polls and detects:
   kidSessionId exists → Show KidAppStack

7. Child sees KidPendingGifts screen:
   - Lists all gifts from parent's events
   - Can create videos for each gift
```

---

## How Devices Stay In Sync

### Real-Time Data Sync Example:

```
TIME: 10:00 AM - Parent Device

Parent creates event:
  Click ParentDashboard → Events tab → + button
  → Fill form: "Alice's Birthday Party" on Oct 20
  → Insert into events table with parent_id = 'uuid-parent-123'
  → Event appears in parent's list


TIME: 10:01 AM - Kid Device (Same Moment!)

Kid device polls/subscribed to events table:
  Query: SELECT * FROM events WHERE parent_id = 'uuid-parent-123'
  → Gets: "Alice's Birthday Party" with new gifts attached
  → "Alice's Birthday Party" appears in kid's gift list
  → Kid can immediately create video for this gift
```

**The magic: Both devices query the same backend, so changes appear instantly.**

---

## Data Access Control (RLS Policies)

Each table has Row Level Security (RLS) policies that enforce who can see what:

### Events Table Policy:
```sql
CREATE POLICY "Parents can see own events" ON public.events
FOR SELECT USING (auth.uid()::text = parent_id::text);

CREATE POLICY "Kids can see parent's events" ON public.events
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM children
    WHERE children.id = auth.uid()::text
    AND children.parent_id = events.parent_id
  )
);
```

### Children Table Policy:
```sql
CREATE POLICY "Parents can see own children" ON public.children
FOR SELECT USING (auth.uid()::text = parent_id::text);
```

**Translation:**
- Parent logged in with email/password can see their own events
- Kid logged in with PIN can see parent's events
- A kid can't see other parents' events (protected by RLS)

---

## Session Storage (Device-Local)

Each device independently tracks sessions in **AsyncStorage** (phone storage):

### Parent Device AsyncStorage:
```javascript
{
  parentSessionId: 'uuid-parent-123',
  parentEmail: 'mom@example.com',
}
```

### Kid Device AsyncStorage:
```javascript
{
  kidSessionId: '5821',                // The PIN
  parentId: 'uuid-parent-123',         // Which parent to fetch from
  childId: 'uuid-child-456',           // Which child this is
  childName: 'Alice',
}
```

**Why two devices can run simultaneously:**
- Parent device: authenticated as parent user via email/password
- Kid device: authenticated as kid via PIN
- Different credentials, different AsyncStorage keys
- Both fetch from same backend using their respective identifiers

---

## Complete Data Model & Relationships

```
Parent Creates Event:
┌─────────────┐
│  parents    │ (parent_id = 'uuid-parent-123')
└─────────────┘
       │
       ├─► Has Children
       │   ┌──────────────┐
       │   │  children    │ (parent_id = 'uuid-parent-123')
       │   │  - Alice     │
       │   │  - Bob       │
       │   └──────────────┘
       │
       ├─► Has Events
       │   ┌──────────────┐
       │   │   events     │ (parent_id = 'uuid-parent-123')
       │   │  - Birthday  │
       │   │  - Holidays  │
       │   └──────────────┘
       │        │
       │        └─► Has Gifts
       │            ┌──────────────┐
       │            │   gifts      │ (event_id = 'uuid-event-789')
       │            │ - Lego       │
       │            │ - Book       │
       │            └──────────────┘
       │                 │
       │                 └─► Can Have Videos
       │                     ┌──────────────┐
       │                     │   videos     │ (gift_id = 'uuid-gift-001')
       │                     │ - Child says │
       │                     │   thank you  │
       │                     └──────────────┘
       │
       └─► Has Videos (recorded by kids)
           ┌──────────────┐
           │   videos     │ (child_id = 'uuid-child-456')
           │              │
           └──────────────┘
```

---

## Frontend Code Flow Summary

### Parent App (/screens/ParentDashboardScreen.js):
```javascript
const loadDashboardData = async () => {
  // Get current parent's ID
  const { data: { user } } = await supabase.auth.getUser();

  // Load parent's children
  const { data: childList } = await supabase
    .from('children')
    .select('id, name, age, pin')
    .eq('parent_id', user.id);  // ← Filtered by parent ID

  // Load parent's events
  const { data: eventList } = await supabase
    .from('events')
    .select('*')
    .eq('parent_id', user.id);  // ← Filtered by parent ID
};
```

### Kid App (/screens/KidPINLoginScreen.js):
```javascript
const handleSubmit = async () => {
  // Kid enters PIN
  const result = await validateKidPin('5821');

  // validateKidPin queries:
  // SELECT * FROM children WHERE pin = '5821'
  // Returns: { id, parent_id, name, age, pin }

  // Store in AsyncStorage
  await AsyncStorage.setItem('parentId', result.parent_id);
  await AsyncStorage.setItem('childId', result.childId);
};
```

Later, when kid views gifts:
```javascript
const { parentId, childId } = await getKidSession();

// Load parent's events
const { data: events } = await supabase
  .from('events')
  .select('*, gifts(*)')
  .eq('parent_id', parentId);  // ← Uses parentId from PIN lookup
```

---

## Security Features

1. **PIN is 4 digits, not a password**
   - Easy for kids to remember
   - Parent can change it anytime
   - Can be brute-force protected (lockout after 5 attempts)

2. **Row Level Security (RLS)**
   - Database enforces access rules
   - Even if kid guesses another PIN, can't access other parents' data
   - Parent can only modify their own events

3. **Device Independence**
   - Each device maintains its own session
   - Logout on one device doesn't affect the other
   - Parent can be logged in while kid is also logged in

4. **Data Isolation**
   - Each parent only sees their own data
   - Each kid only sees their parent's data
   - Gifts are assigned to specific children

---

## Example: Complete Daily Workflow

```
MORNING - Parent's iPhone:

1. Parent opens app (already logged in from yesterday)
2. Goes to Events tab
3. Creates "Soccer Game" event for Saturday
4. Adds "Nike Shoes" gift
5. RootNavigator instantly shows event in list
6. Parent notes Jill can't come to the soccer game
7. Goes to Children tab
8. Clicks Jill's profile, notes she's unavailable
9. Parent logs out


SAME MORNING - Kid's Tablet (Different Room):

1. Kid opens app
2. Enters PIN: 5821
3. KidPendingGifts screen loads immediately shows:
   - "Lego Set" from Birthday Party (needs video)
   - "Soccer Game" (just added by parent)
4. Kid clicks "Soccer Game" to see if there are gifts
5. Sees "Nike Shoes" (parent just added)
6. Kid records thank you video for "Nike Shoes"
7. Click submit


EVENING - Parent's iPhone:

1. Parent opens app, logs in again
2. Goes to ParentDashboard
3. Videos tab shows:
   - 1 pending review: Kid's thank you for Nike Shoes
4. Parent watches video
5. Clicks approve
6. Kid immediately sees on their device that it's approved
```

---

## Why This Architecture Works

| Aspect | How It Works |
|--------|-------------|
| **Device Linking** | Same Supabase project = shared database |
| **Real-Time Sync** | All devices query same backend |
| **Multiple Users** | Different credentials (email/password vs PIN) |
| **Data Privacy** | RLS policies enforce access rules |
| **Offline Support** | AsyncStorage allows offline session storage |
| **Scalability** | Supabase handles millions of concurrent users |
| **Security** | Firebase Auth + PostgreSQL RLS is industry standard |

---

## Technical Stack

```
Frontend:
├── React Native / Expo (shared codebase for all devices)
├── AsyncStorage (device-local session storage)
├── Ionicons (UI icons)
└── Navigation (React Navigation for app routing)

Backend:
├── Supabase (managed PostgreSQL + Auth)
├── PostgreSQL (relational database)
├── Row Level Security (RLS) policies
├── Realtime subscriptions (optional, for live updates)
└── Auth with JWT tokens

Device Communication:
└── HTTP REST API (HTTPS for security)
```

---

## Summary

**To answer your original question:**

1. **Can kids download the app and use PIN?** ✅ Yes
   - Download same Expo app from app store
   - Open to AuthChoice screen
   - Tap "Kid Login with PIN"
   - Enter 4-digit PIN
   - Instantly logged in

2. **How are devices linked?**
   - Frontend: Both devices point to same `supabaseClient.ts` config
   - Backend: Same PostgreSQL database instance
   - Result: Data changes instantly propagate to all devices

3. **Frontend & Backend:**
   - Frontend: Each app (parent/kid) makes HTTP queries to Supabase API
   - Backend: PostgreSQL enforces RLS to control who sees what
   - Sync: Query responses arrive in milliseconds, devices stay in perfect sync
