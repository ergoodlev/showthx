# COPPA Compliance: Manual Tasks Checklist

This document lists the manual tasks YOU need to complete to achieve full COPPA compliance. All code changes have been implemented - these are configuration, database, and external service tasks.

---

## CRITICAL: Before TestFlight/Launch

### 1. Update Legal Text Placeholders

**File:** `constants/legalTexts.js`

Replace the following placeholders with your actual information:

| Placeholder | Replace With | Example |
|-------------|--------------|---------|
| `[INSERT DATE]` | Effective date of policies | "December 22, 2025" |
| `[YOUR COMPANY NAME]` | Your legal business name | "ShowThx Inc." |
| `[INSERT MAILING ADDRESS]` | Your business mailing address | "123 Main St, San Francisco, CA 94102" |

**How to do it:**
```bash
# In your code editor, search and replace:
# 1. Find: [INSERT DATE] → Replace with your date
# 2. Find: [YOUR COMPANY NAME] → Replace with your company name
# 3. Find: [INSERT MAILING ADDRESS] → Replace with your address
```

---

### 2. Verify Supabase Email Confirmation is Enabled

**Location:** Supabase Dashboard > Authentication > Email Templates

1. Go to your Supabase project dashboard
2. Navigate to **Authentication** > **Providers** > **Email**
3. Ensure **"Confirm email"** is ENABLED
4. Customize the confirmation email template if desired

**Why:** COPPA requires verifiable parental consent. Email verification helps ensure the parent account is legitimate.

---

### 3. Set Up Email Forwarding for Required Addresses

**Required email addresses:**

| Email | Purpose |
|-------|---------|
| `COPPA@showthx.com` | Children's privacy inquiries (required by COPPA) |
| `help@showthx.com` | General support |
| `support@showthx.com` | Technical support |

**How to set up:**
- If using Google Workspace: Admin Console > Apps > Gmail > Routing
- If using custom domain: Set up email forwarders in your domain registrar
- Alternative: Create aliases that forward to your primary email

---

### 4. Configure SendGrid API Key

**Location:** `.env` file

1. Create a SendGrid account at https://sendgrid.com
2. Create an API key with "Mail Send" permissions
3. Add to your `.env` file:
```
SENDGRID_API_KEY=your_api_key_here
FROM_EMAIL=hello@showthx.com
```

4. Verify your sender domain in SendGrid for better deliverability

---

### 5. Verify Database Schema Has Required Columns

Run these SQL queries in your Supabase SQL editor to ensure all consent-tracking columns exist:

```sql
-- Check parents table has consent columns
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'parents'
AND column_name IN ('parental_consent_given', 'consent_given_at', 'terms_accepted', 'terms_accepted_at');

-- If any are missing, add them:
ALTER TABLE parents
ADD COLUMN IF NOT EXISTS parental_consent_given BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS consent_given_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS terms_accepted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ;

-- Ensure parental_consents table exists for audit trail
CREATE TABLE IF NOT EXISTS parental_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID REFERENCES parents(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL,
  given BOOLEAN DEFAULT TRUE,
  consent_text TEXT,
  method TEXT DEFAULT 'in_app',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policy for parental_consents
ALTER TABLE parental_consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parents can view own consents" ON parental_consents
  FOR SELECT USING (auth.uid() = parent_id);

CREATE POLICY "Parents can insert own consents" ON parental_consents
  FOR INSERT WITH CHECK (auth.uid() = parent_id);
```

---

## HIGH PRIORITY: Before Public Launch

### 6. Configure App Store Privacy Labels

When submitting to Apple App Store, you must accurately declare data collection:

**Data Types Collected:**
- **Contact Info:** Parent email address
- **Identifiers:** User ID (Supabase auth)
- **User Content:** Thank-you videos (recorded by children)
- **Usage Data:** App interactions (for analytics only)

**Data Linked to User:**
- Parent email address
- Children's first names (linked to parent account)
- Thank-you videos (linked to child profiles)

**Data NOT Collected:**
- Precise location
- Health & fitness data
- Financial info
- Sensitive info
- Contacts from device
- Browsing history

**Privacy Policy URL:** Add your hosted privacy policy URL
**COPPA Compliance:** Check "Yes, this app is directed at children"

---

### 7. Google Play Data Safety Section

Similar to App Store, declare:
- Data shared: None (videos only shared via email links)
- Data collected: Email, user IDs, user content (videos)
- Security practices: Data encrypted in transit, can request deletion

---

## RECOMMENDED: Post-Launch Enhancements

### 8. Set Up Server-Side Scheduled Cleanup (Optional)

The app now runs cleanup on startup, but for more reliable data retention, consider a Supabase Edge Function:

**File:** `supabase/functions/scheduled-cleanup/index.ts`

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

Deno.serve(async () => {
  // Delete draft videos older than 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data: drafts } = await supabase
    .from('videos')
    .select('id')
    .eq('status', 'draft')
    .lt('created_at', sevenDaysAgo.toISOString());

  if (drafts) {
    for (const draft of drafts) {
      await supabase.storage.from('video-storage').remove([`videos/${draft.id}.mp4`]);
      await supabase.from('videos').delete().eq('id', draft.id);
    }
  }

  // Delete approved videos older than 90 days
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const { data: approved } = await supabase
    .from('videos')
    .select('id')
    .eq('status', 'approved')
    .lt('created_at', ninetyDaysAgo.toISOString());

  if (approved) {
    for (const video of approved) {
      await supabase.storage.from('video-storage').remove([`videos/${video.id}.mp4`]);
      await supabase.from('videos').delete().eq('id', video.id);
    }
  }

  return new Response('Cleanup complete');
});
```

Then schedule with cron in Supabase Dashboard > Database > Cron.

---

### 9. Move Audit Logs to Server (Optional)

Currently audit logs are in AsyncStorage (device-only). For compliance audits, consider:

```sql
-- Create server-side audit log table
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID REFERENCES parents(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  event_data JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient querying
CREATE INDEX idx_audit_logs_parent ON audit_logs(parent_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);

-- RLS policy
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parents can view own logs" ON audit_logs
  FOR SELECT USING (auth.uid() = parent_id);
```

---

## Verification Checklist

Before launch, verify these are working:

- [ ] Legal text placeholders replaced with real values
- [ ] Parent signup requires 18+ checkbox AND consent checkboxes
- [ ] Consent timestamps saved to database on signup
- [ ] "Delete All My Data" button in Settings works
- [ ] Delete button appears in video review screen
- [ ] Parent receives email when child submits video
- [ ] Supabase email confirmation is enabled
- [ ] SendGrid emails are sending correctly
- [ ] COPPA@showthx.com receives forwarded emails
- [ ] App Store/Play Store privacy declarations completed

---

## Support Contact

For COPPA-related questions or data deletion requests:
- Email: COPPA@showthx.com
- General: help@showthx.com

---

## Code Changes Made (For Reference)

The following code changes were implemented automatically:

| File | Change |
|------|--------|
| `screens/ParentSignupScreen.js` | Added 18+ checkbox, parental attestation |
| `services/authService.js` | Save consent to database |
| `screens/ParentDashboardScreen.js` | Added "Delete All My Data", COPPA contact info |
| `screens/ParentVideoReviewScreen.js` | Added delete video button |
| `screens/VideoConfirmationScreen.js` | Parent notification email on video submit |
| `navigation/RootNavigator.js` | Auto-cleanup on app startup |

**Git Branch:** `coppa-compliance-fixes`

---

*Generated: December 22, 2025*
*COPPA Compliance Implementation Complete*
