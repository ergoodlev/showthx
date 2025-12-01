# 🚀 GratituGram Build Guide

Complete guide for building and deploying your app using EAS (Expo Application Services).

## 📋 Prerequisites

✅ EAS CLI installed and logged in
✅ Apple Developer Account (for iOS builds)
✅ Expo account with project configured
✅ Environment variables configured

---

## 🔐 Step 1: Set Up Environment Variables in EAS

You need to add your environment variables to EAS so they're available during cloud builds.

### Option A: Using EAS CLI (Recommended)

```bash
# Add Supabase credentials
npx eas secret:create --scope project --name SUPABASE_URL --value "https://lufpjgmvkccrmefdykki.supabase.co" --type string
npx eas secret:create --scope project --name SUPABASE_ANON_KEY --value "your_supabase_anon_key" --type string

# Add SendGrid credentials
npx eas secret:create --scope project --name SENDGRID_API_KEY --value "your_sendgrid_api_key" --type string
npx eas secret:create --scope project --name FROM_EMAIL --value "hello@showthx.app" --type string
```

### Option B: Using EAS Dashboard

1. Go to https://expo.dev/accounts/ericgoodlev/projects/showthx/secrets
2. Click "Create" for each variable:
   - **SUPABASE_URL**: `https://lufpjgmvkccrmefdykki.supabase.co`
   - **SUPABASE_ANON_KEY**: `[your anon key]`
   - **SENDGRID_API_KEY**: `[your sendgrid key]`
   - **FROM_EMAIL**: `hello@showthx.app`

**IMPORTANT**: Mark sensitive values as "Secret" so they're encrypted!

---

## 🛠️ Step 2: Using the Build Script

We've created an easy-to-use build script for you!

### Run the Interactive Builder

```bash
./build.sh
```

This will show you a menu with all build options:

```
╔════════════════════════════════════════╗
║     GratituGram Build Script           ║
║     EAS Cloud Builds Made Easy         ║
╚════════════════════════════════════════╝

Select Build Type:
1) iOS Development
2) iOS Preview (TestFlight)
3) iOS Production
4) Android Development
5) Android Preview
6) Android Preview
7) Both Platforms (Preview)
8) Both Platforms (Production)
9) Check Build Status
0) Exit
```

### Quick Commands (Alternative)

If you prefer direct commands:

```bash
# iOS Preview Build (Recommended for testing)
npx eas build --profile preview --platform ios

# iOS Production Build
npx eas build --profile production --platform ios

# Android Preview Build
npx eas build --profile preview --platform android

# Check build status
npx eas build:list
```

---

## 📱 Step 3: iOS Build Process

### First-Time Setup

When you run your first iOS build, EAS will ask:

1. **"Do you want to log in to your Apple account?"**
   - Answer: `Yes`
   - Enter your Apple ID email
   - Enter your app-specific password (if using 2FA)

2. **"Which bundle identifier would you like to use?"**
   - Use existing: `com.yourcompany.showthx`

3. **"Do you want EAS to manage credentials?"**
   - Answer: `Yes` (recommended)
   - EAS will automatically generate certificates

### Build Time

- ⏱️ **Development**: ~5-10 minutes
- ⏱️ **Preview**: ~10-15 minutes
- ⏱️ **Production**: ~15-20 minutes

### Monitor Your Build

EAS will provide a URL like:
```
https://expo.dev/accounts/ericgoodlev/projects/showthx/builds/[build-id]
```

Open this in your browser to watch real-time progress!

---

## 📦 Step 4: After the Build Completes

### Download Options

**Option 1: Download Directly**
```bash
# Get the latest build
npx eas build:list

# Download by ID
npx eas build:download --id [build-id]
```

**Option 2: Use the Dashboard**
1. Visit your build URL
2. Click "Download" button
3. Save the `.ipa` (iOS) or `.apk`/`.aab` (Android) file

### Testing on Device

**iOS (.ipa file)**:
- Upload to TestFlight via App Store Connect
- Or use EAS Submit:
  ```bash
  npx eas submit --platform ios
  ```

**Android (.apk file)**:
- Install directly on device
- Or upload to Google Play Console

---

## 🔄 Updating for New Builds

Before each new build:

1. **Update version** in `app.json`:
   ```json
   {
     "version": "1.0.1"
   }
   ```

2. **Commit your changes**:
   ```bash
   git add .
   git commit -m "Version 1.0.1"
   ```

3. **Run the build**:
   ```bash
   ./build.sh
   ```

---

## 🚨 Troubleshooting

### Build Fails: "Apple credentials invalid"

**Solution**: Generate an app-specific password
1. Go to https://appleid.apple.com
2. Sign in → Security → App-Specific Passwords
3. Generate new password
4. Use this instead of your regular password

### Build Fails: "Bundle identifier already exists"

**Solution**: Update `app.json`:
```json
{
  "ios": {
    "bundleIdentifier": "com.yourcompany.showthx-new"
  }
}
```

### Build Fails: "Environment variable not found"

**Solution**: Add the missing variable to EAS:
```bash
npx eas secret:create --scope project --name VARIABLE_NAME --value "value"
```

### Build Takes Too Long

- **Normal**: 10-20 minutes for first build
- **If stuck**: Check build logs in dashboard
- **If failed**: Review error messages and retry

---

## 📊 Build Profiles Explained

| Profile | Purpose | Use Case |
|---------|---------|----------|
| **development** | Development builds with dev tools | Local testing with development features |
| **preview** | Pre-release testing | TestFlight, internal testing |
| **production** | App Store release | Public release to users |

---

## 🎯 Quick Start Commands

```bash
# Set up environment variables (one-time)
npx eas secret:create --scope project --name SUPABASE_URL --value "https://lufpjgmvkccrmefdykki.supabase.co"
npx eas secret:create --scope project --name SUPABASE_ANON_KEY --value "your_key_here"

# Build iOS preview
./build.sh  # Then select option 2

# OR directly:
npx eas build --profile preview --platform ios

# Check status
npx eas build:list

# Submit to App Store (after successful build)
npx eas submit --platform ios
```

---

## 📚 Additional Resources

- **EAS Build Docs**: https://docs.expo.dev/build/introduction/
- **EAS Submit Docs**: https://docs.expo.dev/submit/introduction/
- **Expo Dashboard**: https://expo.dev/accounts/ericgoodlev/projects/showthx
- **Build Troubleshooting**: https://docs.expo.dev/build-reference/troubleshooting/

---

## ✅ Pre-Build Checklist

Before running a build, ensure:

- [ ] All code changes committed to git
- [ ] Version number updated in `app.json`
- [ ] Environment variables set in EAS
- [ ] Apple Developer account active (for iOS)
- [ ] Bundle identifier unique and registered
- [ ] No local build errors (`npx expo start` works)

---

## 🎉 Ready to Build!

You're all set! Run:

```bash
./build.sh
```

And select your build type. Good luck! 🚀
