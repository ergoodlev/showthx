# 🚨 ACTION REQUIRED: Set Up Sentry Error Tracking

## ⏱️ Takes 3 Minutes

Your app is now configured with Sentry for error tracking, but you need to add your Sentry DSN to activate it.

---

## Step 1: Get Your DSN (2 min)

1. **Go to:** https://sentry.io
2. **Sign up** (or log in if you have an account)
3. **Create a new project:**
   - Click "Projects" → "Create Project"
   - Platform: **React Native**
   - Project name: **GratituGram**
   - Click "Create Project"
4. **Copy your DSN** - It will be shown on the setup page
   - Looks like: `https://abc123def456@o789.ingest.sentry.io/123456`
   - Or find it later in: Settings → Projects → GratituGram → Client Keys (DSN)

---

## Step 2: Add DSN to Your App (1 min)

1. **Open:** `config/sentry.js`
2. **Find this line:**
   ```javascript
   export const SENTRY_DSN = 'YOUR_SENTRY_DSN_HERE';
   ```
3. **Replace with your actual DSN:**
   ```javascript
   export const SENTRY_DSN = 'https://abc123def456@o789.ingest.sentry.io/123456';
   ```
4. **Save the file**

---

## Step 3: Rebuild Your App

```bash
# For TestFlight
eas build --platform ios

# Or for local development build
eas build --platform ios --profile preview
```

---

## ✅ You're Done!

### What's Now Enabled:

✅ **Automatic Error Tracking**
- Every crash is logged to Sentry
- Every `console.error()` is tracked
- React component errors are caught

✅ **Rich Debugging Context**
- User actions before the error (breadcrumbs)
- Device and OS information
- App version
- Full stack traces

✅ **Email Alerts** (optional)
- Set up in Sentry dashboard: Settings → Alerts
- Get notified of critical errors

✅ **Smart Filtering**
- Development mode errors are NOT sent (saves your quota)
- Only production/TestFlight builds send data

---

## View Your Errors

After deploying:

1. Go to: https://sentry.io
2. Click on **GratituGram** project
3. Click **Issues** to see all errors
4. Click any issue to see details

---

## Example: What You'll See

When a user experiences an error in your TestFlight app, you'll see:

```
Error: Failed to approve video: PGRST301
User: user@example.com
Screen: ParentVideoReviewScreen
Device: iPhone 14 Pro, iOS 17.2
App Version: 1.0.0 (Build 1)

Breadcrumbs:
  → User logged in
  → Navigated to ParentDashboard
  → Clicked "Review Videos"
  → Navigated to ParentVideoReviewScreen
  → Clicked "Approve & Continue"
  → ❌ Error occurred
```

This tells you EXACTLY what the user did and where the error happened!

---

## Help & Documentation

- **Quick Start:** [SENTRY_QUICK_START.md](./SENTRY_QUICK_START.md)
- **Full Guide:** [SENTRY_SETUP_GUIDE.md](./SENTRY_SETUP_GUIDE.md)
- **Sentry Docs:** https://docs.sentry.io/platforms/react-native/

---

## Important Security Note

🔒 **Your DSN is kept secure!**

The file `config/sentry.js` is already added to `.gitignore`, so it won't be committed to GitHub. Your Sentry DSN is private and won't be exposed in your repository.

---

## Questions?

The Sentry DSN is NOT a secret key - it's safe to include in your app. It only allows sending data TO Sentry, not reading it.

However, it's still good practice to keep it in `.gitignore` to avoid quota abuse.

---

**Ready to track errors? Set your DSN in `config/sentry.js` now!** 🚀
