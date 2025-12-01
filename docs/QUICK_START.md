# GratituGram - Quick Start Guide

## 5-Minute Setup

### Step 1: Install Dependencies (2 min)

```bash
cd /Users/ericgoodlev/Desktop/GratituGram

# Install all packages including new security libraries
npm install

# Verify installation
npm ls expo-secure-store tweetnacl
```

**Expected Output:**
```
expo-secure-store@14.0.2
tweetnacl@1.0.3
```

---

### Step 2: Create `.env` File (1 min)

**Create the file:**
```bash
touch .env
```

**Edit `.env` and add:**
```
# Supabase (Already configured, no changes needed)
SUPABASE_URL=https://lufpjgmvkccrmefdykki.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# SendGrid (Get your API key from SendGrid)
SENDGRID_API_KEY=SG.your_api_key_here

# Feature Flags
ENCRYPTION_ENABLED=true
CSV_IMPORT_ENABLED=true
```

**WHERE TO GET SENDGRID KEY:**
1. Go to https://sendgrid.com
2. Sign up or log in
3. Settings → API Keys → Create API Key
4. Copy the key starting with `SG.`
5. Paste in `.env` above

**SECURITY WARNING:**
- `✅ DO` commit `.gitignore` (it already excludes `.env`)
- `❌ DON'T` commit `.env` file (contains secrets)
- Verify `.gitignore` has `.env` in it:

```bash
grep ".env" /Users/ericgoodlev/Desktop/GratituGram/.gitignore
```

---

### Step 3: Update App.js Imports (2 min)

**In App.js, add these imports at the top:**

```javascript
import ParentLoginScreen from './screens/ParentLoginScreen';
import ParentDashboardScreen from './screens/ParentDashboardScreen';
import ChildPinScreen from './screens/ChildPinScreen';
import { getParentSession, loginParent, logoutParent } from './services/sessionService';
import { getParentEmail } from './services/secureStorageService';
```

**Update the main view switch statement (~line 800) to:**

```javascript
// After ParentalConsentScreen check, add:

if (hasConsent && !parentSession) {
  return (
    <ParentLoginScreen
      parentEmail={parentEmail}
      onLoginSuccess={(session) => {
        setParentSession(session);
        setView('dashboard');
      }}
    />
  );
}

// In your view switch (around line 1000+):
case 'dashboard':
  return (
    <ParentDashboardScreen
      pendingVideos={pendingVideos}
      onApproveVideo={handleApproveVideo}
      onRejectVideo={handleRejectVideo}
      onLogout={() => {
        setParentSession(null);
        setView('login');
      }}
    />
  );

case 'childPin':
  return (
    <ChildPinScreen
      childName={childName}
      onAccessGranted={() => setView('record')}
      onCancel={() => setView('home')}
    />
  );
```

---

## Configuration Guide

### Supabase Schema Deployment

**Method 1: Supabase Dashboard (EASIEST)**

1. Open [Supabase Dashboard](https://app.supabase.com/project/lufpjgmvkccrmefdykki)
2. Go to: **SQL Editor** → **New Query**
3. Copy-paste entire contents of `supabase-security-schema.sql`
4. Click **Execute**
5. Verify tables created in **Database** → **Tables**

**Expected tables to see:**
- `children`
- `videos`
- `parental_settings`
- `video_share_tokens`
- `audit_logs`

**Method 2: Via SQL File (Command Line)**

```bash
# If you have psql installed:
psql -h lufpjgmvkccrmefdykki.supabase.co \
     -U postgres \
     -d postgres \
     -f /Users/ericgoodlev/Desktop/GratituGram/supabase-security-schema.sql
```

### Configure Storage Bucket

1. Supabase Dashboard → **Storage**
2. Click **New Bucket** → Name: `video-storage`
3. Select **Public** (for simplicity; later use private with signed URLs)
4. Click **Create Bucket**

**Then add security policies:**

1. Click `video-storage` bucket
2. **Policies** tab → **New Policy**
3. Create 3 policies:

```sql
-- Policy 1: SELECT (View own videos)
SELECT auth.uid() = user_id

-- Policy 2: INSERT (Upload own videos)
INSERT auth.uid() = user_id

-- Policy 3: DELETE (Delete own videos)
DELETE auth.uid() = user_id
```

---

## Testing Checklist

### 1. Run the App

```bash
npx expo start
```

Options:
- Press `i` for iOS simulator
- Press `a` for Android emulator
- Press `w` for web (basic testing only)

### 2. Test Parent Consent Flow

**Steps:**
1. App opens → Should show `ParentalConsentScreen`
2. Enter email: `test@example.com`
3. Set PIN: `1234`
4. Accept COPPA consent checkboxes
5. Should complete and show main home screen

**Expected result:** ✅ Parental consent saved

### 3. Test Parent Login

**Steps:**
1. Close app and reopen
2. Should show `ParentLoginScreen` (not consent again)
3. Enter PIN: `1234`
4. Should show `ParentDashboardScreen`

**Expected result:** ✅ Session created

### 4. Test Child Recording

**Steps:**
1. From Dashboard, click on any guest
2. Try to record without PIN → Should show `ChildPinScreen`
3. Enter any 4-digit PIN: `5678`
4. Should show camera recording screen

**Expected result:** ✅ Child mode activated

### 5. Test Video Upload (Basic)

**Steps:**
1. Record a 5-10 second test video
2. Preview and confirm
3. Check if saved locally

**Expected result:** ✅ Video saved to device

### 6. Test SendGrid (Email)

**Steps:**
1. In Dashboard, click video → "Send" button
2. Enter recipient email
3. Check if email arrives

**Expected result:** ✅ Email received with secure link

### 7. Test Encryption (Optional)

If user enabled E2E during consent setup:
1. Verify encryption key in SecureStore
2. Test encryption/decryption service

```javascript
// In App.js, add temporary test:
import { generateKeypair, encryptForRecipient } from './services/encryptionService';

// Call once:
const keys = await generateKeypair();
console.log('[TEST] Keypair generated:', keys.publicKey);
```

---

## Environment Variable Cheat Sheet

### Local Development (`.env`)
```
SUPABASE_URL=https://lufpjgmvkccrmefdykki.supabase.co
SUPABASE_ANON_KEY=eyJ...
SENDGRID_API_KEY=SG.xxx
ENCRYPTION_ENABLED=true
```

### Production (in `app.json` or `eas.json`)
```json
{
  "env": {
    "SUPABASE_URL": "https://lufpjgmvkccrmefdykki.supabase.co",
    "EXPO_PUBLIC_SUPABASE_ANON_KEY": "eyJ...",
    "SENDGRID_API_KEY": "SG.xxx"
  }
}
```

### Access in Code
```javascript
// Public vars (visible in code, safe to expose)
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;

// Private vars (never exposed to client)
const SENDGRID_KEY = process.env.SENDGRID_API_KEY;
```

---

## Common Issues & Fixes

### Issue: "Cannot find module 'expo-secure-store'"

**Fix:**
```bash
npm install expo-secure-store tweetnacl
npm start --clear
```

### Issue: "SendGrid API key not working"

**Fix:**
1. Verify API key starts with `SG.`
2. Check it's in `.env` (not in code)
3. Restart expo: `npm start --clear`
4. Test with curl:
```bash
curl -X POST "https://api.sendgrid.com/v3/mail/send" \
  -H "Authorization: Bearer YOUR_KEY_HERE" \
  -H "Content-Type: application/json" \
  -d '{"personalizations":[{"to":[{"email":"test@example.com"}]}]}'
```

### Issue: "Supabase connection failed"

**Fix:**
1. Verify internet connection
2. Check Supabase URL is correct
3. Test in SQL Editor at https://app.supabase.com
4. Check RLS policies aren't blocking (temporarily disable if testing)

### Issue: "Child PIN doesn't match"

**Fix:**
- Child PIN and Parent PIN are stored separately
- They can be different
- Child PIN is optional (can skip with empty)

### Issue: "Videos not uploading to cloud"

**Fix:**
1. Check Supabase bucket exists: `video-storage`
2. Verify bucket has storage policies
3. Test upload directly in Supabase dashboard
4. Check video file isn't corrupted:

```javascript
import { validateVideo } from './services/videoRecordingService';
const result = await validateVideo(videoUri);
console.log('[TEST] Video valid:', result);
```

---

## Next Steps After Setup

### Priority 1: Test Everything
- [ ] Run through all testing checkboxes above
- [ ] Test with real device (not just simulator)
- [ ] Test email sending with real email

### Priority 2: Integrate into App.js
- [ ] Add all new screens to view router
- [ ] Add session management state
- [ ] Add parent email state
- [ ] Test full flow end-to-end

### Priority 3: Enable Features
- [ ] CSV import (already partially built)
- [ ] Video composition (merge videos)
- [ ] Automatic cleanup (7-day expiry)
- [ ] Audit logging (already logs to local storage)

### Priority 4: Production Deploy
- [ ] Build iOS app: `eas build --platform ios`
- [ ] Build Android app: `eas build --platform android`
- [ ] Submit to App Store / Google Play
- [ ] Set production environment variables in EAS

---

## File Structure

```
GratituGram/
├── .env                           # ← Create this
├── .gitignore                     # ← Already has .env
├── package.json                   # ← Updated with new deps
├── App.js                         # ← Main app (needs updates)
├── supabaseClient.js              # ← Already configured
├── INTEGRATION_GUIDE.md           # ← Architecture docs
├── QUICK_START.md                 # ← THIS FILE
│
├── services/
│   ├── secureStorageService.js    # ✅ NEW - Secure storage
│   ├── encryptionService.js       # ✅ NEW - E2E encryption
│   ├── sessionService.js          # ✅ NEW - Login sessions
│   ├── auditLogService.js         # ✅ NEW - Audit trail
│   ├── dataRetentionService.js    # ✅ NEW - Auto-delete
│   ├── secureShareService.js      # ✅ NEW - Share tokens
│   ├── videoCompositionService.js # ✅ NEW - Video merge
│   ├── videoRecordingService.js   # ✅ NEW - Recording mgmt
│   ├── emailService.js            # ✅ NEW - SendGrid
│   ├── promptService.js           # ✓ Existing - AI prompts
│   └── videoStorageService.js     # ✓ Existing - Cloud upload
│
├── screens/
│   ├── ParentalConsentScreen.js   # ✅ NEW - COPPA setup
│   ├── ParentLoginScreen.js       # ✅ NEW - Login
│   ├── ParentDashboardScreen.js   # ✅ NEW - Management
│   ├── ChildPinScreen.js          # ✅ NEW - Child gate
│   ├── GiftOpeningCaptureScreen.js # ✅ NEW - Rear camera
│   └── (other existing screens)   # ✓ Existing
│
└── supabase-security-schema.sql   # ✅ NEW - Database
```

---

## Support

**Need help?**

1. Check `INTEGRATION_GUIDE.md` for detailed architecture
2. Review service documentation in code comments
3. Check Supabase docs: https://supabase.com/docs
4. Check Expo docs: https://docs.expo.dev
5. SendGrid docs: https://docs.sendgrid.com

**Security questions?**

- PIN stored in SecureStore (encrypted)
- Email stored in SecureStore (encrypted)
- Session tokens in AsyncStorage (app-specific)
- Encryption keys optional, stored securely
- All API keys in environment variables
- Supabase RLS prevents cross-user access

---

**Ready to start?**

```bash
cd /Users/ericgoodlev/Desktop/GratituGram
npm install
# Then follow Step 2-3 above
```

Happy coding! 🚀
