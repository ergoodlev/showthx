# GratituGram Integration & Architecture Guide

## Part 1: ARCHITECTURE OVERVIEW - Login & Credential Model

### Current State vs. Secure Design

**Current Problems:**
- No proper login/authentication flow
- Anyone opening the app can access everything
- Child PIN exists but not enforced
- Parent credentials in storage but no session management
- No parent dashboard for reviewing videos

### Proper Secure Architecture (Recommended)

```
APP FLOW:
┌─────────────────────────────────────────────────────────┐
│ App Launch                                              │
├─────────────────────────────────────────────────────────┤
│ ↓                                                        │
│ Check Parental Consent & Session (AsyncStorage)         │
│ ├─ If no consent → ParentalConsentScreen               │
│ │  (Email + PIN setup, encryption opt-in)              │
│ ├─ If consent but no session → ParentLoginScreen       │
│ │  (Email + PIN verification)                          │
│ └─ If session active → MainAppShell                    │
│    ├─ Parent Dashboard (if parent logged in)           │
│    │  ├─ Review pending videos                         │
│    │  ├─ Approve/reject videos                         │
│    │  ├─ Send videos via email                         │
│    │  ├─ View audit logs                               │
│    │  └─ Manage settings (encryption, retention)       │
│    │                                                    │
│    └─ Child Recording (if child logged in)             │
│       ├─ List of gifts to thank                        │
│       ├─ Recording screen (camera + prompt)            │
│       ├─ Video preview & confirmation                  │
│       └─ Save to local storage                         │
└─────────────────────────────────────────────────────────┘
```

### Three-User Login Model (RECOMMENDED)

**Option 1: Parent-Only with Child PIN (Simpler)**
- Parent logs in with: Email + PIN (4-6 digits)
- Child gets: Simple 4-digit PIN to launch app
- Parent can: See all videos, approve/send, manage settings
- Child can: Only record videos, cannot access settings
- Single device use model

**Option 2: Parent + Child Separate Logins (More Secure)**
- Parent: Email + Strong password (hashed in Supabase auth)
- Child: Name + 4-6 digit PIN (local only)
- Enables: Multi-family support, child profile separation
- Better for: Shared devices, older kids, sibling protection

**Option 3: Parent Email OAuth + Child PIN (Modern)**
- Parent: Email + Sign in with Google/Apple
- Child: 4-digit PIN (optional, device-level)
- Pros: Better security, no password storage
- Cons: Requires OAuth setup

### RECOMMENDED: Option 1 (Parent PIN + Child PIN)

**Why:**
- Simple, appropriate for family use
- No passwords to forget/hack
- Quick daily access (just PIN)
- Parent can supervise from one device
- Secure credential isolation

## Part 2: CREDENTIAL MANAGEMENT

### Storage Strategy

```
LOCAL DEVICE (SecureStore - Encrypted)
├─ Parent PIN (4-6 digits)
├─ Parent Email (masked display)
├─ Child PIN (4-6 digits)
├─ Encryption Keypair (if E2E enabled)
└─ Session Tokens (temporary)

LOCAL DEVICE (AsyncStorage - Unencrypted but isolated)
├─ Parental Consent Flag (boolean)
├─ Current Logged-in User (parent/child)
├─ Session Timestamp
├─ Child Name (display)
└─ Preferences (notifications, language)

SUPABASE (Backend)
├─ Parental Settings Table
│  ├─ Parent Email (hashed index)
│  ├─ PIN Hash (bcrypt)
│  ├─ Encryption Public Key
│  └─ Preferences (retention days, etc)
│
├─ Children Table
│  ├─ Child ID
│  ├─ Name
│  ├─ Parent ID (FK)
│  ├─ Age (optional)
│  └─ Created At
│
├─ Videos Table
│  ├─ Video ID
│  ├─ Parent ID (RLS constraint)
│  ├─ Child ID
│  ├─ Status (draft/approved/sent)
│  ├─ Uploaded At
│  └─ Expires At
│
└─ Audit Logs Table
   ├─ Event Type (login, video_created, approved, shared)
   ├─ User ID (parent)
   ├─ Timestamp
   └─ Details (encrypted)
```

### API Key Security

**NEVER do this:**
```javascript
// ❌ BAD - Keys visible in code
const SENDGRID_API_KEY = 'SG.xxxxx';
const SUPABASE_KEY = 'eyJxxx';
```

**DO this instead:**
```javascript
// ✅ GOOD - Environment variables
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Check if key exists
if (!SENDGRID_API_KEY) {
  console.error('Missing SENDGRID_API_KEY - email disabled');
}
```

## Part 3: ENVIRONMENT SETUP

### Step 1: Install Dependencies

```bash
cd /Users/ericgoodlev/Desktop/GratituGram
npm install
```

### Step 2: Create `.env` file (LOCAL DEVELOPMENT ONLY)

```bash
# Create file
touch .env

# Add this content:
SUPABASE_URL=https://lufpjgmvkccrmefdykki.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SENDGRID_API_KEY=SG.your_sendgrid_key_here
ENCRYPTION_ENABLED=true
```

**SECURITY WARNING:**
- `.env` should be in `.gitignore` (it already is)
- NEVER commit `.env` to git
- Use separate keys for dev/prod
- Rotate keys regularly

### Step 3: Update `app.json` for Expo (PRODUCTION)

```json
{
  "expo": {
    "name": "GratituGram",
    "slug": "gratitugram",
    "version": "1.0.0",
    "env": {
      "production": {
        "SUPABASE_URL": "https://lufpjgmvkccrmefdykki.supabase.co",
        "EXPO_PUBLIC_SUPABASE_ANON_KEY": "eyJ...",
        "SENDGRID_API_KEY": "SG...",
        "ENCRYPTION_ENABLED": "true"
      },
      "staging": {
        "SUPABASE_URL": "https://staging.supabase.co",
        "EXPO_PUBLIC_SUPABASE_ANON_KEY": "staging_key",
        "SENDGRID_API_KEY": "staging_key",
        "ENCRYPTION_ENABLED": "false"
      }
    }
  }
}
```

### Step 4: Create `eas.json` (for Expo Application Services)

```bash
eas build --platform ios --profile production
```

```json
{
  "cli": {
    "version": ">= 5.0.0"
  },
  "build": {
    "production": {
      "channel": "production",
      "distribution": "store",
      "env": {
        "SUPABASE_URL": "https://lufpjgmvkccrmefdykki.supabase.co",
        "EXPO_PUBLIC_SUPABASE_ANON_KEY": "production_key",
        "SENDGRID_API_KEY": "production_key"
      }
    }
  }
}
```

## Part 4: SUPABASE SETUP

### Step 1: Deploy Schema

```bash
# Connect to Supabase
open "https://app.supabase.com/project/lufpjgmvkccrmefdykki"

# SQL Editor → New Query
# Paste entire contents of: supabase-security-schema.sql
# Run the migrations

# Verify tables created:
# Tables → children, videos, parental_settings, audit_logs, video_share_tokens
```

### Step 2: Configure Storage Bucket

```
Storage → New Bucket → "video-storage"

Policies:
- SELECT: Allow authenticated users to view their own videos
  auth.uid() = user_id

- INSERT: Allow authenticated users to upload their own videos
  auth.uid() = user_id

- DELETE: Allow authenticated users to delete their own videos
  auth.uid() = user_id
```

### Step 3: Test Supabase Connection

```javascript
// In App.js terminal/logs:
console.log('[SUPABASE] Testing connection...');
const { data, error } = await supabase
  .from('children')
  .select('count(*)')
  .single();

if (error) {
  console.error('[SUPABASE] Connection failed:', error);
} else {
  console.log('[SUPABASE] Connected successfully');
}
```

## Part 5: SENDGRID SETUP

### Step 1: Get API Key

1. Sign up: https://sendgrid.com
2. Settings → API Keys → Create API Key
3. Copy key starting with `SG.`
4. Add to `.env`: `SENDGRID_API_KEY=SG.xxxx`

### Step 2: Verify Sender Email

SendGrid requires:
- Sender email: `noreply@gratitugram.app` (or your domain)
- Verification: SendGrid will send confirmation email
- Update in [services/emailService.js](services/emailService.js#L11)

```javascript
const FROM_EMAIL = 'noreply@gratitugram.app'; // UPDATE THIS
const FROM_NAME = 'GratituGram';
```

### Step 3: Test Email Sending

```javascript
import { sendSetupConfirmationEmail } from './services/emailService';

// Test
await sendSetupConfirmationEmail('test@example.com', {
  encryptionEnabled: false
});
```

## Part 6: MISSING IMPLEMENTATIONS

### Priority 1 (CRITICAL - Do First):
- [ ] **Parent Login Screen** - Email + PIN verification
- [ ] **Parent Dashboard** - Video review/approval interface
- [ ] **Session Management** - Track logged-in parent
- [ ] **Video Pause/Resume** - Recording control enhancement

### Priority 2 (HIGH):
- [ ] **Child PIN Screen** - Launch gate before recording
- [ ] **Supabase Integration** - Push videos to cloud
- [ ] **CSV Import UI** - Finish guest import flow
- [ ] **RLS Policy Testing** - Verify user isolation

### Priority 3 (MEDIUM):
- [ ] **Video Composition** - Merge gift opening + thank you
- [ ] **Email Sending** - Test SendGrid integration
- [ ] **Encryption Setup** - Keypair generation UI
- [ ] **Audit Logging** - Verify audit trail records

## Part 7: TESTING CHECKLIST

```
[ ] Parental Consent → Email + PIN setup works
[ ] Parent Login → Can sign in with PIN
[ ] Child Recording → Child can record thank you video
[ ] Video Approval → Parent sees pending videos
[ ] CSV Import → Can import guests from CSV
[ ] Video Sending → Can send approved video via email
[ ] Encryption → Optional E2E encryption works
[ ] Security → RLS prevents parent A from seeing parent B's videos
[ ] Audit Logging → All actions logged
[ ] Auto-Delete → Drafts expire after 7 days
```

## Summary: What's Missing

1. **Parent Login Screen** (~150 lines)
2. **Parent Dashboard** (~300 lines)
3. **Session Management** (~100 lines)
4. **Video Pause/Resume** (~50 lines code + UI)
5. **Child PIN Gate** (~100 lines)
6. **Environment Variable Setup** (~30 min)
7. **Supabase Migration** (~30 min)
8. **Test Suite** (~200 lines)

**Total Implementation Time: 4-6 hours**

---

See next sections for step-by-step implementation of each component.
