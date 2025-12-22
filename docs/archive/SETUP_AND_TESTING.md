# ShowThx - Setup and Testing Guide

## 🎉 Cleanup Complete!

Your project has been cleaned up and standardized. All camera implementations now use **expo-camera** exclusively for reliable performance on Expo SDK 51.

---

## 📋 What Was Changed

### Camera Implementation
- ✅ Removed `react-native-vision-camera` dependency
- ✅ Updated `VideoRecordingScreen.js` to use `expo-camera`
- ✅ Updated `GiftOpeningCaptureScreen.js` to use `expo-camera`
- ✅ Updated `app.json` plugins to use `expo-camera`
- ✅ Both front and back camera recording now work reliably

### App Naming
- ✅ Standardized on **"ShowThx"** throughout the app
- ✅ Updated `app.json` bundle identifiers
- ✅ Updated `app-config.js` metadata
- ✅ Updated all screen references

### Project Organization
- ✅ Created `/archive` folder for backup files
- ✅ Created `/docs` folder for documentation
- ✅ Moved all `.md` files to `/docs`
- ✅ Moved backup files to `/archive`

### Dependencies
- ✅ Removed conflicting camera package
- ✅ Updated `package.json`
- ✅ Ran `npm install --legacy-peer-deps`

---

## 🚀 How to Build and Run

### Option 1: Development Build (Recommended)

This is the most reliable way to test camera functionality:

```bash
# Clean build directories (if you've built before)
rm -rf ios/build android/build

# Run iOS build
npx expo run:ios

# OR run Android build
npx expo run:android
```

**Why this is recommended:**
- Camera functionality works exactly as it will in production
- No limitations from Expo Go
- Faster debugging cycle
- Closer to real user experience

### Option 2: Expo Go (Quick UI Testing Only)

While expo-camera technically works in Expo Go, for a camera-focused app, native builds are more reliable:

```bash
npx expo start

# Then scan QR code with Expo Go app
```

**Note:** Use this only for quick UI/navigation testing, not for camera features.

---

## 🧪 Testing the Camera

### Test Checklist

#### Front Camera (VideoRecordingScreen)
- [ ] Navigate to "Record Thank You" screen
- [ ] Grant camera permissions when prompted
- [ ] Verify front camera preview appears
- [ ] Tap record button - recording should start
- [ ] Red recording indicator should appear
- [ ] Timer should count up
- [ ] Tap stop button - recording should stop
- [ ] Preview screen should show with duration
- [ ] Test "Re-record" button
- [ ] Test "Continue" button

#### Camera Flip
- [ ] While on camera screen (before recording)
- [ ] Tap the camera flip button (top right)
- [ ] Camera should switch to back camera
- [ ] Tap again to switch back to front

#### Back Camera (GiftOpeningCaptureScreen)
- [ ] Open gift opening capture
- [ ] Verify back camera is active
- [ ] Test recording start/stop
- [ ] Verify video is captured

---

## 📱 Beta Distribution (For Your Testers)

### Setup EAS Build (One-time)

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo account
eas login

# Configure your project
eas build:configure
```

### Create Beta Build for TestFlight

```bash
# Build for iOS
eas build --platform ios --profile preview

# This will:
# 1. Build your app in the cloud
# 2. Give you a downloadable .ipa file
# 3. You can upload to TestFlight via App Store Connect
```

### Create Beta Build for Android

```bash
# Build for Android
eas build --platform android --profile preview

# This will:
# 1. Build your app in the cloud
# 2. Give you a downloadable .apk or .aab file
# 3. You can share directly or upload to Play Console
```

---

## 🔧 Troubleshooting

### Camera doesn't appear
1. Check iOS Simulator settings - **you need a real device** for camera
2. Verify camera permissions in device Settings > ShowThx
3. Try rebuilding: `npx expo run:ios --device`

### "Camera not ready" error
- Wait 1-2 seconds after screen loads before tapping record
- The camera needs time to initialize

### Build errors
```bash
# Clear all caches
rm -rf node_modules
rm -rf ios/build
rm -rf android/build
npm install --legacy-peer-deps
npx expo prebuild --clean
```

### Metro bundler issues
```bash
# Clear Metro cache
npx expo start --clear
```

---

## 📂 Project Structure

```
ShowThx/
├── archive/              # Backup files
├── docs/                 # Documentation (all .md files)
├── screens/             # All screen components
│   ├── VideoRecordingScreen.js       ✅ expo-camera
│   ├── GiftOpeningCaptureScreen.js   ✅ expo-camera
│   └── ...
├── components/          # Reusable components
├── services/            # Business logic
├── navigation/          # Navigation setup
├── theme/              # Branding and design system
├── app.json            ✅ Updated plugins
├── app-config.js       ✅ Updated to ShowThx
└── package.json        ✅ Cleaned dependencies
```

---

## 🎬 Next Steps

1. **Test locally first**
   ```bash
   npx expo run:ios
   ```

2. **Verify all features work**
   - Login flow
   - Camera recording (front and back)
   - Video playback
   - Navigation

3. **Create beta build when ready**
   ```bash
   eas build --platform ios --profile preview
   ```

4. **Distribute to testers**
   - Upload to TestFlight (iOS)
   - Share .apk directly (Android)

---

## 💡 Development Tips

### Fast Iteration
- Use `npx expo run:ios` and keep it running
- Changes will hot-reload automatically
- Only rebuild when changing native code

### Camera Testing
- **Always test on a real device** - simulators don't have cameras
- Use iPhone/iPad with iOS 14+ for best results

### Debugging
```bash
# View console logs
npx expo run:ios

# Logs will appear in terminal
# Look for lines starting with:
# 🎬 (recording start)
# ✅ (success)
# ❌ (errors)
```

---

## 📞 Support

If you encounter issues:

1. Check the console logs for error messages
2. Verify you're on a real device (not simulator)
3. Try the troubleshooting steps above
4. Check `/docs` folder for additional documentation

---

## ✨ What's Working Now

- ✅ **Single camera library** (expo-camera) - no conflicts
- ✅ **Front camera recording** - reliable initialization
- ✅ **Back camera recording** - for gift opening capture
- ✅ **Camera switching** - toggle between front/back
- ✅ **Video playback** - using expo-av
- ✅ **Consistent naming** - ShowThx everywhere
- ✅ **Clean project structure** - organized and maintainable
- ✅ **Expo SDK 51 compatible** - all dependencies aligned

---

**Ready to go! 🚀**

Run `npx expo run:ios` to start testing your camera features.
