# Lottie Frame Overlay Implementation Guide

## Overview
Implement animated frame overlays with parent text customization for ShowThx videos.

### Architecture
**Kids** → Select animated frame (Lottie preview)
**Parents** → Customize text (message, color, position)
**Export** → Combined frame + text overlay on video

---

## Phase 1: Lottie Frame Library (DONE ✅)

### Installed Packages
- `lottie-react-native@6.7.2` ✅
- Added to `app.json` plugins ✅

### Frame Assets Needed
Download free Lottie animations from [LottieFiles.com](https://lottiefiles.com):

**Recommended Frames:**
1. **Birthday Balloons** - Colorful balloons floating
2. **Confetti** - Celebration confetti
3. **Stars** - Twinkling stars border
4. **Hearts** - Floating hearts
5. **Fireworks** - Celebration fireworks
6. **Dinosaurs** - Cute dinosaur characters (kids)
7. **Unicorns** - Rainbow unicorns (kids)
8. **Space** - Rockets and planets (kids)

**Storage:**
```
/assets/lottie/
  ├── balloons.json
  ├── confetti.json
  ├── stars.json
  ├── hearts.json
  ├── fireworks.json
  ├── dinosaurs.json
  ├── unicorns.json
  └── space.json
```

---

## Phase 2: Frame Service

Create `/services/frameService.js`:

```javascript
/**
 * Frame Service
 * Manages animated Lottie frames and static overlays
 */

// Frame library with Lottie animations for preview
export const FRAME_LIBRARY = [
  {
    id: 'none',
    name: 'No Frame',
    category: 'basic',
    lottieSource: null,
    thumbnail: null,
  },
  {
    id: 'balloons',
    name: 'Birthday Balloons',
    category: 'celebration',
    lottieSource: require('../assets/lottie/balloons.json'),
    thumbnail: require('../assets/frames/balloons-thumb.png'),
    description: 'Colorful floating balloons',
  },
  {
    id: 'confetti',
    name: 'Confetti Party',
    category: 'celebration',
    lottieSource: require('../assets/lottie/confetti.json'),
    thumbnail: require('../assets/frames/confetti-thumb.png'),
    description: 'Celebration confetti shower',
  },
  {
    id: 'stars',
    name: 'Starry Border',
    category: 'elegant',
    lottieSource: require('../assets/lottie/stars.json'),
    thumbnail: require('../assets/frames/stars-thumb.png'),
    description: 'Twinkling stars frame',
  },
  {
    id: 'hearts',
    name: 'Hearts',
    category: 'love',
    lottieSource: require('../assets/lottie/hearts.json'),
    thumbnail: require('../assets/frames/hearts-thumb.png'),
    description: 'Floating hearts',
  },
  {
    id: 'dinosaurs',
    name: 'Dino Friends',
    category: 'kids',
    lottieSource: require('../assets/lottie/dinosaurs.json'),
    thumbnail: require('../assets/frames/dinosaurs-thumb.png'),
    description: 'Cute friendly dinosaurs',
  },
];

export const FRAME_CATEGORIES = [
  'all',
  'celebration',
  'elegant',
  'love',
  'kids',
];

export const getFramesByCategory = (category) => {
  if (category === 'all') return FRAME_LIBRARY;
  return FRAME_LIBRARY.filter(frame => frame.category === category);
};

export const getFrameById = (id) => {
  return FRAME_LIBRARY.find(frame => frame.id === id);
};
```

---

## Phase 3: Frame Selection Screen (Kids)

Create `/screens/FrameSelectionScreen.js`:

```javascript
import React, { useState, useRef } from 'react';
import { View, Text, FlatList, TouchableOpacity, SafeAreaView } from 'react-native';
import LottieView from 'lottie-react-native';
import { useEdition } from '../context/EditionContext';
import { AppBar } from '../components/AppBar';
import { ThankCastButton } from '../components/ThankCastButton';
import { FRAME_LIBRARY, FRAME_CATEGORIES, getFramesByCategory } from '../services/frameService';

export const FrameSelectionScreen = ({ navigation, route }) => {
  const { edition, theme } = useEdition();
  const isKidsEdition = edition === 'kids';
  const { videoUri, giftId, giftName } = route.params;

  const [selectedFrame, setSelectedFrame] = useState('none');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [frames, setFrames] = useState(FRAME_LIBRARY);

  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
    setFrames(getFramesByCategory(category));
  };

  const handleProceed = () => {
    navigation.navigate('MusicSelection', {
      videoUri,
      giftId,
      giftName,
      selectedFrame,
    });
  };

  const renderFrameCard = ({ item }) => {
    const isSelected = selectedFrame === item.id;

    return (
      <TouchableOpacity
        onPress={() => setSelectedFrame(item.id)}
        style={{
          width: '48%',
          aspectRatio: 9/16,
          backgroundColor: theme.neutralColors.white,
          borderWidth: isSelected ? 3 : 1,
          borderColor: isSelected ? theme.brandColors.coral : theme.neutralColors.lightGray,
          borderRadius: 12,
          padding: theme.spacing.sm,
          marginBottom: theme.spacing.md,
          overflow: 'hidden',
        }}
      >
        {/* Lottie Preview */}
        {item.lottieSource && (
          <LottieView
            source={item.lottieSource}
            autoPlay
            loop
            style={{ flex: 1 }}
          />
        )}

        {/* No Frame */}
        {!item.lottieSource && (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ color: theme.neutralColors.mediumGray }}>No Frame</Text>
          </View>
        )}

        {/* Frame Name */}
        <Text
          style={{
            fontSize: isKidsEdition ? 14 : 12,
            fontFamily: isKidsEdition ? 'Nunito_Bold' : 'Montserrat_SemiBold',
            color: theme.neutralColors.dark,
            textAlign: 'center',
            marginTop: theme.spacing.xs,
          }}
        >
          {item.name}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.neutralColors.white }}>
      <AppBar
        title="Choose Frame"
        onBackPress={() => navigation.goBack()}
        showBack
      />

      {/* Category Filter */}
      <View style={{ paddingVertical: theme.spacing.md }}>
        <FlatList
          horizontal
          data={FRAME_CATEGORIES}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => handleCategoryChange(item)}
              style={{
                paddingHorizontal: theme.spacing.md,
                paddingVertical: theme.spacing.sm,
                marginHorizontal: theme.spacing.xs,
                borderRadius: 20,
                backgroundColor: selectedCategory === item
                  ? theme.brandColors.coral
                  : theme.neutralColors.lightGray,
              }}
            >
              <Text
                style={{
                  fontSize: isKidsEdition ? 13 : 12,
                  fontFamily: isKidsEdition ? 'Nunito_SemiBold' : 'Montserrat_SemiBold',
                  color: selectedCategory === item ? '#FFFFFF' : theme.neutralColors.mediumGray,
                  textTransform: 'capitalize',
                }}
              >
                {item}
              </Text>
            </TouchableOpacity>
          )}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: theme.spacing.md }}
        />
      </View>

      {/* Frame Grid */}
      <FlatList
        data={frames}
        renderItem={renderFrameCard}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={{
          justifyContent: 'space-between',
          paddingHorizontal: theme.spacing.md,
        }}
        contentContainerStyle={{ paddingBottom: theme.spacing.xl }}
      />

      {/* Action Button */}
      <View style={{
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.lg,
        borderTopWidth: 1,
        borderTopColor: theme.neutralColors.lightGray,
      }}>
        <ThankCastButton
          title="Next: Add Music"
          onPress={handleProceed}
        />
      </View>
    </SafeAreaView>
  );
};

export default FrameSelectionScreen;
```

---

## Phase 4: Parent Text Customization

Update `VideoCustomizationScreen.js` to include frame preview with parent text overlay.

**Key Features:**
- Show selected Lottie frame animation
- Parent adds custom text
- Text positioning (drag or presets)
- Text color selection
- Real-time preview

---

## Phase 5: Export Strategy (Hybrid Approach)

### Problem: FFmpeg Requires Development Build ❌

### Solution: Static PNG Overlay ✅

**Export Flow:**
1. Kid records video
2. Kid selects Lottie frame (preview only)
3. Parent adds text overlay
4. **Capture frame + text as PNG** using `react-native-view-shot`
5. Store PNG as overlay
6. Video player renders: `Video + PNG overlay`

**Implementation:**
```javascript
import ViewShot from 'react-native-view-shot';

// In VideoCustomizationScreen
const captureOverlay = async () => {
  const uri = await viewShotRef.current.capture();
  // Save PNG overlay
  return uri;
};

// Render
<ViewShot ref={viewShotRef}>
  <LottieView source={frameSource} />
  <Text style={textStyle}>{parentText}</Text>
</ViewShot>
```

---

## Phase 6: Video Rendering

**Playback:**
- Base video
- PNG overlay positioned absolutely
- Text rendered on top

**Limitations:**
- Overlay is static (no Lottie animation in export)
- Good enough for thank you cards
- Parents see animated preview, guests see static overlay

---

## Next Steps

1. **Download Lottie Files** from LottieFiles.com
2. **Create Frame Service** (`/services/frameService.js`)
3. **Build Frame Selection Screen** (`/screens/FrameSelectionScreen.js`)
4. **Add to Navigation** (RootNavigator.js)
5. **Update VideoCustomizationScreen** for parent text
6. **Test full flow**

---

## Benefits

✅ **Kids** get fun animated frame selection
✅ **Parents** customize text easily
✅ **No development build** required
✅ **Works with current setup**
✅ **Scalable** - easy to add more frames

---

## Future Enhancement

If you switch to development build later, you can use FFmpeg to burn Lottie frames directly into video.
