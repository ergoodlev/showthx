# Sentry Quick Start - 3 Steps

## 1. Get Your DSN (2 minutes)

1. Go to https://sentry.io → Sign up/Login
2. Create Project → Select "React Native"
3. Copy your DSN (looks like: `https://abc123@o0.ingest.sentry.io/456789`)

## 2. Add DSN to Config (30 seconds)

Open `config/sentry.js` and replace:

```javascript
export const SENTRY_DSN = 'YOUR_SENTRY_DSN_HERE';
```

With your actual DSN:

```javascript
export const SENTRY_DSN = 'https://abc123@o0.ingest.sentry.io/456789';
```

**That's it!** Sentry is now active in production builds.

## 3. Deploy & Monitor

```bash
# Build for TestFlight
eas build --platform ios

# After deployment, check Sentry dashboard
# Go to: https://sentry.io → Your Project → Issues
```

---

## What Happens Now?

✅ **Automatic Error Tracking**
- All crashes automatically sent to Sentry
- All `console.error()` logged to Sentry
- React errors caught by ErrorBoundary

✅ **Context for Debugging**
- User actions (breadcrumbs)
- Device info
- App version
- Stack traces

✅ **Development Mode = Safe**
- Sentry is disabled in dev mode (saves your quota)
- Only production/TestFlight builds send data

---

## Optional: Track Custom Events

In your code, add:

```javascript
import { logError, trackEvent, setUser } from './services/sentryHelper';

// After login
setUser({ id: user.id, email: user.email });

// Track important events
trackEvent('video_uploaded', { videoId: '123' });

// Log handled errors
try {
  await somethingRisky();
} catch (error) {
  logError(error, { tags: { feature: 'upload' } });
}
```

---

## Need Help?

- Full guide: [SENTRY_SETUP_GUIDE.md](./SENTRY_SETUP_GUIDE.md)
- Sentry docs: https://docs.sentry.io/platforms/react-native/
