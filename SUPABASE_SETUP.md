# Supabase Setup Guide for ThankCast Kids

## Overview
The app needs a Supabase project configured with database tables, authentication, and storage. Follow these steps to get everything set up.

## Prerequisites
- Supabase project created at https://app.supabase.com
- Your Supabase URL and API keys in `.env` file (already done)

---

## Step 1: Create Database Schema

1. **Open Supabase Dashboard**
   - Go to https://app.supabase.com
   - Select your project

2. **Run SQL Script (USE THE FIXED VERSION)**
   - Go to **SQL Editor** (left sidebar)
   - Click **"New Query"**
   - Open `SUPABASE_SCHEMA_FIXED.sql` from your project folder (NOT the original)
   - Copy the entire contents
   - Paste into the Supabase SQL editor
   - Click **"Run"**

3. **If you get errors:**
   - Copy just **STEP 1** (parents table creation)
   - Run it
   - Then copy **STEP 2** (children table)
   - Run it
   - Continue through all STEPS
   - The FIXED version is structured to run all at once

4. **Verify Tables Created**
   - Go to **Database** → **Tables**
   - You should see these tables:
     - ✓ parents
     - ✓ children
     - ✓ events
     - ✓ gifts
     - ✓ videos
     - ✓ guests
     - ✓ parental_settings

---

## Step 2: Create Storage Bucket

1. **Go to Storage**
   - Left sidebar → **Storage**

2. **Create New Bucket**
   - Click **"New Bucket"**
   - Name: `videos`
   - Make **Private** (NOT Public)
   - Click **"Create Bucket"**

3. **Set Up RLS Policy for Videos Bucket**
   - Click the `videos` bucket
   - Go to **Policies** tab
   - Click **"New Policy"**
   - Choose **"For full customization, use a custom template"**
   - Name: `Users can upload their own videos`
   - Allowed operation: **SELECT, INSERT, UPDATE, DELETE**
   - Policy definition:
     ```sql
     auth.uid() IS NOT NULL
     ```
   - Click **"Review"** then **"Save policy"**

---

## Step 3: Enable Auth

1. **Go to Authentication Settings**
   - Left sidebar → **Authentication**
   - Click **"Providers"**

2. **Enable Email Provider**
   - Email/Password should be enabled by default
   - If not, toggle it **ON**

3. **Configure Auth Settings**
   - Click **"Auth Providers"** (top menu)
   - Scroll to **Email**
   - Enable:
     - ✓ Enable email/password authentication
     - ✓ Confirm email (recommended for production)
     - ✓ Disable sign-ups (optional, for admin-only signups)

4. **User Creation Strategy**
   - For testing: Keep sign-ups enabled
   - For production: Disable and create users via Supabase admin panel

---

## Step 4: Activate SendGrid

1. **Get SendGrid API Key**
   - Log in to SendGrid (https://sendgrid.com)
   - Go to **Settings** → **API Keys**
   - Create a new API key
   - Copy the key

2. **Update .env File**
   - Open `.env` in your project
   - Update: `SENDGRID_API_KEY=your_key_here`
   - Restart the app: `npx expo start`

3. **Test Email Sending**
   - Try signing up with a test email
   - Check that welcome email arrives

---

## Step 5: Test Everything

### Test Parent Signup
1. Open app in Expo Go
2. Tap **"Parent Signup"**
3. Enter:
   - Full Name: `Test Parent`
   - Email: `test@example.com`
   - Password: `TestPassword123`
4. Accept terms and click **"Create Account"**
5. You should see:
   - ✓ Account created
   - ✓ Welcome email sent
   - ✓ Redirected to Parent Dashboard

### Test Parent Login
1. From Auth Choice screen, tap **"Parent Login"**
2. Enter your email and password
3. Click **"Login"**
4. You should see Parent Dashboard

### Test Kid PIN Login
1. Create a child in Parent Dashboard
2. Set PIN: `1234`
3. Log out (from settings)
4. Tap **"Kid Login"**
5. Enter PIN: `1234`
6. You should see Kid Pending Gifts

---

## Common Issues

### Error: "Could not find the table 'public.parents'"
**Solution**: Run the SUPABASE_SCHEMA.sql script (Step 1)

### Error: "SENDGRID_API_KEY not found"
**Solution**: Add the API key to your .env file and restart the app

### Email not sending
**Solution**:
1. Check SendGrid API key is valid
2. Verify SENDGRID_API_KEY is in .env
3. Check SendGrid account is active (may need to verify)
4. Look at app logs for error details

### "Authentication required" on every screen
**Solution**:
1. Check Supabase URL and keys in .env
2. Verify Auth is enabled in Supabase
3. Clear app cache and restart

### Videos bucket not accessible
**Solution**:
1. Verify `videos` bucket exists and is Private
2. Check RLS policy is set up correctly
3. Verify storage credentials in .env

---

## Database Schema Overview

```
parents
├── id (UUID, Primary Key)
├── email (unique)
├── full_name
└── created_at

children
├── id (UUID)
├── parent_id → parents
├── name
├── age
├── pin (4-digit code)
└── pin_lockout_until (for security)

events
├── id (UUID)
├── parent_id → parents
├── name
├── event_date
└── location

gifts
├── id (UUID)
├── event_id → events
├── parent_id → parents
├── child_id → children
├── name
├── recipient_name
├── status (pending, assigned, completed, recorded)

videos
├── id (UUID)
├── gift_id → gifts
├── parent_id → parents
├── video_url (in Storage)
├── music_url
├── customization_data (JSON)
└── status (draft, ready, processing, completed)

guests
├── id (UUID)
├── video_id → videos
├── parent_id → parents
├── email
├── expires_at (link expiration)

parental_settings
├── id (UUID)
├── parent_id → parents (unique)
├── max_video_duration
├── require_email_approval
└── allow_guest_sharing
```

---

## Deprecation Warnings

You may see these warnings - they're safe to ignore for now:

### "Expo AV has been deprecated"
- We use `expo-av` for video playback
- Migration to `expo-video` and `expo-audio` planned for future release
- App works fine with current version

### "SafeAreaView has been deprecated"
- This warning should be gone after the latest bundler refresh
- All imports updated to `react-native-safe-area-context`
- Clear Metro cache if you still see it: `npx expo start -c`

---

## Next Steps

1. ✅ Run SQL schema
2. ✅ Create storage bucket
3. ✅ Enable authentication
4. ✅ Add SendGrid API key
5. 🔄 Test all flows (Parent signup, login, create events, create gifts, record videos)
6. 🔄 Set up video upload to Storage
7. 🔄 Deploy to production

---

## Support

For Supabase help:
- Docs: https://supabase.com/docs
- Dashboard: https://app.supabase.com

For SendGrid help:
- Docs: https://docs.sendgrid.com
- API Reference: https://docs.sendgrid.com/api-reference
