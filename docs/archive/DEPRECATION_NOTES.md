# Deprecation Warnings - Reference Guide

## Current Warnings You May See

### 1. Expo AV Deprecated (SAFE TO IGNORE FOR NOW)
```
WARN [expo-av]: Expo AV has been deprecated and will be removed in SDK 54.
Use the `expo-audio` and `expo-video` packages to replace the required functionality.
```

**Status**: ⚠️ Deprecation notice (not an error)
**Impact**: App works fine, but will need migration before SDK 54
**Files Affected**:
- `screens/VideoConfirmationScreen.js` - uses `Video` component
- `screens/VideoCustomizationScreen.js` - uses `Video` component
- `screens/MusicSelectionScreen.js` - uses `Audio` component
- `screens/VideoPlaybackScreen.js` - uses `Video` component
- `screens/ParentVideoReviewScreen.js` - uses `Video` component

**When to Fix**: Before upgrading to Expo SDK 54

**Migration Path**:
1. Replace `expo-av` Video with `expo-video` Video component
2. Replace `expo-av` Audio with `expo-audio` Audio component
3. Update API calls (mostly compatible, minor changes needed)
4. Test video playback and audio functionality

---

### 2. SafeAreaView Deprecated
```
WARN SafeAreaView has been deprecated and will be removed in a future release.
Please use 'react-native-safe-area-context' instead.
```

**Status**: ✅ FIXED (should be gone now)
**What We Did**: Updated all imports to use `react-native-safe-area-context`
**If Warning Still Appears**:
- Clear Metro bundler cache: `npx expo start -c`
- Kill all bundler processes and restart
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`

---

## Migration Timeline

### Current (SDK 53 - Recommended Now)
- ✅ Using `react-native-safe-area-context` (modern)
- ⚠️ Using `expo-av` (legacy, but works)
- ✅ All theme references fixed
- ✅ All SafeAreaView imports fixed

### Before SDK 54 (Future)
- [ ] Migrate from `expo-av` to `expo-video` and `expo-audio`
- [ ] Update video playback components
- [ ] Update audio handling code
- [ ] Test all media functionality

### Production Deployment
- ✅ Current code is production-ready
- ⚠️ Plan video/audio migration before major Expo upgrade
- ✅ All other components are modern and maintained

---

## How to Suppress Warnings (Not Recommended)

If you need to temporarily suppress warnings during development:

### Suppress specific warning:
```javascript
import { LogBox } from 'react-native';

LogBox.ignoreLogs([
  'expo-av',
  'SafeAreaView'
]);
```

**Note**: Better to fix the underlying issue than suppress warnings!

---

## Expo SDK Versions

| SDK | Status | Notes |
|-----|--------|-------|
| 50 | Old | Not supported |
| 51 | Old | Not supported |
| 52 | Old | Not supported |
| 53 | Current | ✅ Recommended |
| 54 | Upcoming | ⚠️ Will remove expo-av |
| 55+ | Future | Plan ahead |

Current version in app.json: **53**

---

## Zero-Effort Items (Already Done)

### SafeAreaView
- ✅ Imported from `react-native-safe-area-context` in all files
- ✅ Package installed: `react-native-safe-area-context@4.8.1`

### Theme System
- ✅ Fixed all `theme.colors.*` → `theme.neutralColors/brandColors/semanticColors`
- ✅ Fixed all screen and component references

### Email/Password Fields
- ✅ Disabled auto-capitalization for email
- ✅ Added iOS autofill support
- ✅ Set proper textContentType values

---

## Migration Checklist for expo-av → expo-video/audio

When ready to migrate (before SDK 54):

```markdown
- [ ] Install expo-video
- [ ] Install expo-audio
- [ ] Update VideoConfirmationScreen
- [ ] Update VideoCustomizationScreen
- [ ] Update MusicSelectionScreen
- [ ] Update VideoPlaybackScreen
- [ ] Update ParentVideoReviewScreen
- [ ] Test video playback
- [ ] Test audio playback
- [ ] Remove expo-av package
- [ ] Run full test suite
```

---

## Resources

- [expo-video Docs](https://docs.expo.dev/versions/latest/sdk/video/)
- [expo-audio Docs](https://docs.expo.dev/versions/latest/sdk/audio/)
- [Migration Guide](https://docs.expo.dev/modules/latest/expo-av-migration/)
- [React Native SafeAreaContext](https://github.com/th3rdwave/react-native-safe-area-context)

---

## Questions?

For deprecation-related questions:
- Check Expo Release Notes: https://expo.dev/changelog
- See Expo Forums: https://forums.expo.dev
- GitHub Issues: https://github.com/expo/expo/issues
