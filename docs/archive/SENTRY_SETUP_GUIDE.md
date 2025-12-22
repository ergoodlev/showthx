# Sentry Setup Guide for GratituGram

## What is Sentry?

Sentry is an error tracking and performance monitoring service that helps you identify and fix issues in your production app. It automatically captures:
- Crashes and unhandled errors
- Console errors
- Network failures
- Performance issues
- User navigation context (breadcrumbs)

## Step 1: Get Your Sentry DSN

1. Go to [https://sentry.io](https://sentry.io) and create an account (or log in)
2. Create a new project:
   - Click "Projects" → "Create Project"
   - Select **React Native** as the platform
   - Name it "GratituGram" (or your app name)
   - Choose your team
3. Copy your **DSN** (Data Source Name) - it looks like:
   ```
   https://examplePublicKey@o0.ingest.sentry.io/0
   ```

## Step 2: Configure Your App

1. Open `config/sentry.js`
2. Replace `YOUR_SENTRY_DSN_HERE` with your actual DSN:
   ```javascript
   export const SENTRY_DSN = 'https://YOUR_ACTUAL_DSN@sentry.io/PROJECT_ID';
   ```

**IMPORTANT:** The `config/sentry.js` file is already in `.gitignore`, so your DSN won't be committed to Git. This keeps it secure!

## Step 3: Test Sentry (Optional)

To test if Sentry is working, you can temporarily enable it in development:

1. In `config/sentry.js`, set:
   ```javascript
   export const ENABLE_SENTRY_IN_DEV = true;
   ```

2. In `App.js`, modify the `beforeSend` callback:
   ```javascript
   beforeSend(event, hint) {
     if (__DEV__ && !ENABLE_SENTRY_IN_DEV) {
       console.log('Sentry Event (DEV - not sent):', event);
       return null;
     }
     return event;
   },
   ```

3. Add this test button somewhere in your app:
   ```javascript
   <TouchableOpacity onPress={() => {
     throw new Error('Test Sentry Error');
   }}>
     <Text>Test Sentry</Text>
   </TouchableOpacity>
   ```

4. Click the button and check your Sentry dashboard for the error

5. **Remember to set `ENABLE_SENTRY_IN_DEV = false` after testing!**

## Step 4: Build and Deploy

When you build your app with EAS:

```bash
# Build for production (Sentry will be enabled automatically)
eas build --platform ios --profile production

# Or for TestFlight
eas build --platform ios --profile preview
```

Sentry will automatically start capturing errors in your TestFlight builds!

## What Gets Sent to Sentry?

### Automatically:
- ✅ Unhandled JavaScript errors
- ✅ Native crashes (iOS/Android)
- ✅ Console errors (`console.error()`)
- ✅ React component errors (via ErrorBoundary)
- ✅ Network request failures
- ✅ User navigation breadcrumbs
- ✅ App performance metrics

### Manually (using helper functions):
```javascript
import { logError, trackEvent, setUser } from './services/sentryHelper';

// After login
setUser({ id: user.id, email: user.email });

// Track important events
trackEvent('video_uploaded', { giftId: '123' });

// Log handled errors
try {
  await riskyOperation();
} catch (error) {
  logError(error, { tags: { feature: 'video-upload' } });
}
```

## Viewing Errors in Sentry

1. Go to your Sentry project dashboard
2. Click "Issues" to see all errors
3. Click on an issue to see:
   - Error message and stack trace
   - User context (ID, email)
   - Breadcrumbs (what the user did before the error)
   - Device info (OS, app version, etc.)
   - Frequency and user impact

## Privacy & Security

### What Sentry Does NOT Send:
- ❌ User passwords or sensitive data
- ❌ Full database records
- ❌ Video files or media
- ❌ API keys or secrets
- ❌ Development environment errors (by default)

### What to Be Careful About:
- Don't log sensitive user data in breadcrumbs
- Don't include passwords or tokens in error messages
- Review your Sentry data scrubbing settings

## Sentry Features You Should Use

### 1. Error Alerts
Set up email/Slack alerts for critical errors:
- Go to Project Settings → Alerts
- Create alert rules for high-frequency or critical errors

### 2. Performance Monitoring
Already enabled! Track:
- Screen load times
- Network request duration
- App startup time

View in: Performance tab in Sentry dashboard

### 3. Release Tracking
To track which app version has errors:

1. In `config/sentry.js`, uncomment:
   ```javascript
   release: 'gratitugram@1.0.0+1', // Match your app.json version
   ```

2. Or use automatic release tracking with EAS:
   ```bash
   eas build --platform ios --profile production
   ```

### 4. User Feedback
When an error occurs, users can send feedback:
- Already set up in the ErrorBoundary fallback UI
- Users can describe what they were doing when the error occurred

## Debugging with Sentry

When an error is reported:

1. **Check the Stack Trace** - Shows exactly where the error occurred
2. **Review Breadcrumbs** - See what the user did before the error
3. **Check User Context** - Who experienced the error?
4. **Look at Tags** - What screen/feature was affected?
5. **Review Extra Data** - Custom data you logged

## Common Issues

### "Sentry is not capturing errors"
- ✅ Check your DSN is correct in `config/sentry.js`
- ✅ Make sure you're testing in a production build, not dev mode
- ✅ Check Sentry quota (free plan has limits)

### "Too many events in Sentry"
- Reduce `tracesSampleRate` in `App.js` (e.g., from 0.2 to 0.1)
- Filter out non-critical console.log messages
- Set up error filters in Sentry project settings

### "Want to test locally"
- Set `ENABLE_SENTRY_IN_DEV = true` in `config/sentry.js`
- Trigger a test error
- Check your Sentry dashboard
- **Remember to disable dev mode after testing!**

## Cost & Limits

- **Free Plan**: 5,000 errors/month, 10,000 performance transactions
- **Paid Plans**: Start at $26/month for more events
- Monitor your usage: Project Settings → Usage Stats

## Integration with Existing Debug Tools

You already have two debugging systems:

1. **DebugLogsScreen** - View logs in-app (useful for immediate debugging)
2. **Sentry** - Track errors in production (useful for monitoring released app)

Both work together:
- Console errors go to BOTH DebugLogs AND Sentry
- DebugLogs is great for live debugging during development
- Sentry is great for tracking issues in production/TestFlight

## Next Steps

1. ✅ Set your Sentry DSN in `config/sentry.js`
2. ✅ Build and deploy to TestFlight
3. ✅ Monitor your Sentry dashboard for errors
4. ✅ Set up email alerts for critical errors
5. ✅ Review errors weekly and fix issues

## Support

- Sentry Docs: https://docs.sentry.io/platforms/react-native/
- Expo + Sentry: https://docs.expo.dev/guides/using-sentry/
- Questions? Check the Sentry community forum

---

**Remember:** Sentry is most useful in PRODUCTION builds. It's already configured to not send events in development mode to save your quota!
