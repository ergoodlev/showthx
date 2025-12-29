/**
 * VideoCustomizationScreen
 * Kids can add stickers, filters, and text to their video
 * Enhanced with categorized stickers and video filters
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  PanResponder,
  Animated,
  Dimensions,
  StyleSheet,
} from 'react-native';
import { Video } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import LottieView from 'lottie-react-native';
import { useEdition } from '../context/EditionContext';
import { AppBar } from '../components/AppBar';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ThankCastButton } from '../components/ThankCastButton';
import { CustomFrameOverlay } from '../components/CustomFrameOverlay';
import {
  STICKER_CATEGORIES,
  getStickerCategories,
  getStickersForCategory,
  createPlacedSticker,
  DECORATIONS,
  createPlacedDecoration,
} from '../services/decorationService';
import {
  VIDEO_FILTERS,
  getFilterCategories,
  getFiltersForCategory,
  getFilterById,
} from '../services/videoFilterService';

// Filter Preview Overlay - Visual approximation of filters
const FilterPreviewOverlay = ({ filterId }) => {
  if (!filterId) return null;

  const filter = getFilterById(filterId);
  if (!filter) return null;

  switch (filterId) {
    case 'warm':
      return (
        <View style={[StyleSheet.absoluteFill, filterStyles.overlay]} pointerEvents="none">
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255, 165, 0, 0.15)' }]} />
        </View>
      );
    case 'cool':
      return (
        <View style={[StyleSheet.absoluteFill, filterStyles.overlay]} pointerEvents="none">
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(100, 149, 237, 0.18)' }]} />
        </View>
      );
    case 'vintage':
      return (
        <View style={[StyleSheet.absoluteFill, filterStyles.overlay]} pointerEvents="none">
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(210, 180, 140, 0.2)' }]} />
        </View>
      );
    case 'sepia':
      return (
        <View style={[StyleSheet.absoluteFill, filterStyles.overlay]} pointerEvents="none">
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(112, 66, 20, 0.3)' }]} />
        </View>
      );
    case 'bw':
      return (
        <View style={[StyleSheet.absoluteFill, filterStyles.overlay]} pointerEvents="none">
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(128, 128, 128, 0.6)' }]} />
        </View>
      );
    case 'vignette':
      return (
        <View style={[StyleSheet.absoluteFill, filterStyles.overlay]} pointerEvents="none">
          <LinearGradient
            colors={['transparent', 'transparent', 'rgba(0,0,0,0.5)']}
            locations={[0, 0.5, 1]}
            style={StyleSheet.absoluteFill}
          />
        </View>
      );
    case 'bright':
      return (
        <View style={[StyleSheet.absoluteFill, filterStyles.overlay]} pointerEvents="none">
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255, 255, 255, 0.12)' }]} />
        </View>
      );
    case 'vivid':
      return (
        <View style={[StyleSheet.absoluteFill, filterStyles.overlay]} pointerEvents="none">
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255, 0, 100, 0.05)' }]} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0, 200, 255, 0.05)' }]} />
        </View>
      );
    case 'pop':
      return (
        <View style={[StyleSheet.absoluteFill, filterStyles.overlay]} pointerEvents="none">
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0, 0, 0, 0.08)' }]} />
        </View>
      );
    case 'dreamy':
      return (
        <View style={[StyleSheet.absoluteFill, filterStyles.overlay]} pointerEvents="none">
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255, 182, 193, 0.15)' }]} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255, 255, 255, 0.1)' }]} />
        </View>
      );
    default:
      return null;
  }
};

const filterStyles = StyleSheet.create({
  overlay: {
    zIndex: 5,
    borderRadius: 12,
    overflow: 'hidden',
  },
});

const styles = StyleSheet.create({
  unusedStylePlaceholder: {
    // Placeholder to keep styles object valid
  },
});

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Tab options
const TABS = [
  { id: 'stickers', label: 'Stickers', icon: '✨' },
  { id: 'filters', label: 'Filters', icon: '🎨' },
];

export const VideoCustomizationScreen = ({ navigation, route }) => {
  const { edition, theme } = useEdition();
  const isKidsEdition = edition === 'kids';
  const videoUri = route?.params?.videoUri;
  const giftId = route?.params?.giftId;
  const giftName = route?.params?.giftName;
  const frameTemplate = route?.params?.frameTemplate || null;

  const videoRef = useRef(null);
  const videoContainerRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [placedDecorations, setPlacedDecorations] = useState([]);
  const [isDraggingSticker, setIsDraggingSticker] = useState(false);
  const [activeTab, setActiveTab] = useState('stickers');
  const [activeStickerCategory, setActiveStickerCategory] = useState('party');
  const [selectedForDelete, setSelectedForDelete] = useState(null); // Track which sticker has delete button visible
  const [selectedFilter, setSelectedFilter] = useState(null); // Selected video filter
  const [activeFilterCategory, setActiveFilterCategory] = useState('color');

  const handleAddDecoration = (stickerId) => {
    // Clear any delete selection when adding a new sticker
    setSelectedForDelete(null);

    // Create a new sticker instance at a random position
    const randomX = 20 + Math.random() * 60;
    const randomY = 20 + Math.random() * 60;
    const newSticker = createPlacedSticker(stickerId, randomX, randomY, 1.0);

    if (newSticker) {
      setPlacedDecorations([...placedDecorations, newSticker]);
    }
  };

  const handleRemoveDecoration = (decorationInstanceId) => {
    setPlacedDecorations(placedDecorations.filter(d => d.id !== decorationInstanceId));
  };

  const handleUpdateDecorationPosition = (decorationInstanceId, newX, newY) => {
    setPlacedDecorations(placedDecorations.map(d =>
      d.id === decorationInstanceId ? { ...d, x: newX, y: newY } : d
    ));
  };

  const handleProceed = () => {
    navigation?.navigate('VideoConfirmation', {
      videoUri,
      giftId,
      giftName,
      decorations: placedDecorations,
      frameTemplate,
      videoFilter: selectedFilter,
    });
  };

  // Get stickers for current category
  const currentStickers = getStickersForCategory(activeStickerCategory);
  const stickerCategories = getStickerCategories();

  // Draggable Sticker Component
  const DraggableSticker = ({ decoration, children }) => {
    const pan = useRef(new Animated.ValueXY()).current;

    const panResponder = useRef(
      PanResponder.create({
        // Don't capture on start - allow long press to work
        onStartShouldSetPanResponder: () => false,
        onStartShouldSetPanResponderCapture: () => false,
        // Only capture when user actually moves (drags)
        onMoveShouldSetPanResponder: (_, gestureState) => {
          // Only capture if there's actual movement (threshold of 5px)
          return Math.abs(gestureState.dx) > 5 || Math.abs(gestureState.dy) > 5;
        },
        onMoveShouldSetPanResponderCapture: (_, gestureState) => {
          return Math.abs(gestureState.dx) > 5 || Math.abs(gestureState.dy) > 5;
        },
        onPanResponderGrant: () => {
          setIsDraggingSticker(true);
          pan.setOffset({
            x: pan.x._value,
            y: pan.y._value,
          });
        },
        onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
          useNativeDriver: false,
        }),
        onPanResponderRelease: (e, gesture) => {
          pan.flattenOffset();

          if (videoContainerRef.current) {
            videoContainerRef.current.measure((fx, fy, width, height, px, py) => {
              const currentXPx = (decoration.x / 100) * width;
              const currentYPx = (decoration.y / 100) * height;
              const newXPx = currentXPx + gesture.dx;
              const newYPx = currentYPx + gesture.dy;
              const newX = Math.max(5, Math.min(95, (newXPx / width) * 100));
              const newY = Math.max(5, Math.min(95, (newYPx / height) * 100));

              handleUpdateDecorationPosition(decoration.id, newX, newY);
              pan.setValue({ x: 0, y: 0 });
              setIsDraggingSticker(false);
            });
          } else {
            setIsDraggingSticker(false);
          }
        },
      })
    ).current;

    return (
      <Animated.View
        {...panResponder.panHandlers}
        style={{
          position: 'absolute',
          left: `${decoration.x}%`,
          top: `${decoration.y}%`,
          transform: [
            { translateX: -20 },
            { translateY: -20 },
            { translateX: pan.x },
            { translateY: pan.y },
            { scale: decoration.scale },
          ],
        }}
      >
        {children}
      </Animated.View>
    );
  };

  // Render sticker picker with categories
  const renderStickerPicker = () => (
    <View style={{ marginHorizontal: theme.spacing.md, marginBottom: theme.spacing.lg }}>
      {/* Category Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginBottom: theme.spacing.md }}
        contentContainerStyle={{ paddingRight: theme.spacing.md }}
      >
        {stickerCategories.map(category => (
          <TouchableOpacity
            key={category.id}
            onPress={() => setActiveStickerCategory(category.id)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 14,
              paddingVertical: 8,
              marginRight: 8,
              borderRadius: 20,
              backgroundColor: activeStickerCategory === category.id
                ? theme.brandColors.teal
                : theme.neutralColors.lightGray,
            }}
          >
            <Text style={{ fontSize: 16, marginRight: 4 }}>{category.icon}</Text>
            <Text
              style={{
                fontSize: 13,
                fontFamily: isKidsEdition ? 'Nunito_SemiBold' : 'Montserrat_SemiBold',
                color: activeStickerCategory === category.id
                  ? '#FFFFFF'
                  : theme.neutralColors.dark,
              }}
            >
              {category.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Instructions */}
      <Text
        style={{
          fontSize: isKidsEdition ? 12 : 11,
          fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
          color: theme.neutralColors.mediumGray,
          marginBottom: theme.spacing.sm,
        }}
      >
        Tap to add • Drag to move • Long-press to delete
      </Text>

      {/* Sticker Grid */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
          {currentStickers.map(sticker => (
            <TouchableOpacity
              key={sticker.id}
              onPress={() => handleAddDecoration(sticker.id)}
              style={{
                width: 65,
                height: 65,
                backgroundColor: theme.neutralColors.lightGray,
                borderRadius: 12,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 32 }}>{sticker.emoji}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Placed count */}
      {placedDecorations.length > 0 && (
        <View
          style={{
            marginTop: theme.spacing.md,
            padding: theme.spacing.sm,
            backgroundColor: 'rgba(0, 166, 153, 0.1)',
            borderRadius: 8,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Text
            style={{
              fontSize: isKidsEdition ? 12 : 11,
              fontFamily: isKidsEdition ? 'Nunito_SemiBold' : 'Montserrat_SemiBold',
              color: theme.brandColors.teal,
            }}
          >
            {placedDecorations.length} sticker{placedDecorations.length !== 1 ? 's' : ''} added!
          </Text>
          <TouchableOpacity onPress={() => setPlacedDecorations([])}>
            <Text
              style={{
                fontSize: 11,
                fontFamily: isKidsEdition ? 'Nunito_SemiBold' : 'Montserrat_SemiBold',
                color: theme.neutralColors.mediumGray,
              }}
            >
              Clear All
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  // Render filter picker with categories
  const renderFilterPicker = () => {
    const filterCategories = getFilterCategories();
    const currentFilters = getFiltersForCategory(activeFilterCategory);

    return (
      <View style={{ marginHorizontal: theme.spacing.md, marginBottom: theme.spacing.lg }}>
        {/* Category Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginBottom: theme.spacing.md }}
          contentContainerStyle={{ paddingRight: theme.spacing.md }}
        >
          {filterCategories.map(category => (
            <TouchableOpacity
              key={category}
              onPress={() => setActiveFilterCategory(category)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 14,
                paddingVertical: 8,
                marginRight: 8,
                borderRadius: 20,
                backgroundColor: activeFilterCategory === category
                  ? theme.brandColors.coral
                  : theme.neutralColors.lightGray,
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontFamily: isKidsEdition ? 'Nunito_SemiBold' : 'Montserrat_SemiBold',
                  color: activeFilterCategory === category
                    ? '#FFFFFF'
                    : theme.neutralColors.dark,
                  textTransform: 'capitalize',
                }}
              >
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Instructions */}
        <Text
          style={{
            fontSize: isKidsEdition ? 12 : 11,
            fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
            color: theme.neutralColors.mediumGray,
            marginBottom: theme.spacing.sm,
          }}
        >
          Tap to apply filter • Tap again to remove
        </Text>

        {/* Filter Grid */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
            {/* None option */}
            <TouchableOpacity
              onPress={() => setSelectedFilter(null)}
              style={{
                width: 65,
                height: 65,
                backgroundColor: selectedFilter === null
                  ? theme.brandColors.teal
                  : theme.neutralColors.lightGray,
                borderRadius: 12,
                justifyContent: 'center',
                alignItems: 'center',
                borderWidth: selectedFilter === null ? 2 : 0,
                borderColor: theme.brandColors.teal,
              }}
            >
              <Ionicons
                name="close-circle-outline"
                size={24}
                color={selectedFilter === null ? '#FFFFFF' : theme.neutralColors.mediumGray}
              />
              <Text style={{
                fontSize: 10,
                color: selectedFilter === null ? '#FFFFFF' : theme.neutralColors.mediumGray,
                marginTop: 2,
              }}>
                None
              </Text>
            </TouchableOpacity>

            {currentFilters.map(filter => (
              <TouchableOpacity
                key={filter.id}
                onPress={() => setSelectedFilter(selectedFilter === filter.id ? null : filter.id)}
                style={{
                  width: 65,
                  height: 65,
                  backgroundColor: selectedFilter === filter.id
                    ? theme.brandColors.coral
                    : theme.neutralColors.lightGray,
                  borderRadius: 12,
                  justifyContent: 'center',
                  alignItems: 'center',
                  borderWidth: selectedFilter === filter.id ? 2 : 0,
                  borderColor: theme.brandColors.coral,
                }}
              >
                <Text style={{ fontSize: 24 }}>{filter.icon}</Text>
                <Text style={{
                  fontSize: 10,
                  color: selectedFilter === filter.id ? '#FFFFFF' : theme.neutralColors.dark,
                  marginTop: 2,
                }}>
                  {filter.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Selected filter info */}
        {selectedFilter && (
          <View
            style={{
              marginTop: theme.spacing.md,
              padding: theme.spacing.sm,
              backgroundColor: 'rgba(255, 107, 107, 0.1)',
              borderRadius: 8,
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: 20, marginRight: 8 }}>
              {getFilterById(selectedFilter)?.icon}
            </Text>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: isKidsEdition ? 13 : 12,
                  fontFamily: isKidsEdition ? 'Nunito_SemiBold' : 'Montserrat_SemiBold',
                  color: theme.brandColors.coral,
                }}
              >
                {getFilterById(selectedFilter)?.name} Filter
              </Text>
              <Text
                style={{
                  fontSize: 11,
                  color: theme.neutralColors.mediumGray,
                }}
              >
                {getFilterById(selectedFilter)?.description}
              </Text>
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.neutralColors.white }}>
      <AppBar
        title="Decorate Your Video"
        onBackPress={() => navigation?.goBack()}
        showBack={true}
      />

      <ScrollView
        style={{ flex: 1 }}
        scrollEnabled={!isDraggingSticker}
        nestedScrollEnabled={false}
      >
        {/* Video Preview */}
        <View
          ref={videoContainerRef}
          onStartShouldSetResponder={() => true}
          style={{
            backgroundColor: '#000000',
            aspectRatio: 9 / 16,
            maxHeight: 320,
            alignSelf: 'center',
            width: '55%',
            justifyContent: 'center',
            alignItems: 'center',
            margin: theme.spacing.md,
            borderRadius: 12,
            overflow: 'hidden',
          }}
        >
          <Video
            ref={videoRef}
            source={{ uri: videoUri }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="contain"
            useNativeControls={false}
            isLooping
          />

          {/* Filter Preview Overlay */}
          <FilterPreviewOverlay filterId={selectedFilter} />

          {/* Frame Overlay */}
          {frameTemplate && (
            <CustomFrameOverlay frameTemplate={frameTemplate} />
          )}

          {/* Custom Text Overlay */}
          {frameTemplate?.custom_text && (
            <View
              style={{
                position: 'absolute',
                left: 16,
                right: 16,
                [frameTemplate.custom_text_position === 'top' ? 'top' : 'bottom']:
                  frameTemplate.custom_text_position === 'top' ? '3%' : '8%',
                alignItems: 'center',
                zIndex: 5,
              }}
              pointerEvents="none"
            >
              <View style={{
                backgroundColor: 'rgba(0,0,0,0.5)',
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 8,
                maxWidth: '90%',
              }}>
                <Text
                  style={{
                    color: frameTemplate.custom_text_color || '#FFFFFF',
                    fontSize: 14,
                    fontWeight: '600',
                    textAlign: 'center',
                    textShadowColor: 'rgba(0,0,0,0.8)',
                    textShadowOffset: { width: 1, height: 1 },
                    textShadowRadius: 2,
                  }}
                  numberOfLines={3}
                >
                  {frameTemplate.custom_text}
                </Text>
              </View>
            </View>
          )}

          {/* Filter Indicator removed - native iOS filters will be added in future update */}

          {/* Decoration Overlays */}
          {placedDecorations.map(decoration => (
            <DraggableSticker key={decoration.id} decoration={decoration}>
              <View style={{ position: 'relative' }}>
                <TouchableOpacity
                  onLongPress={() => setSelectedForDelete(decoration.id)}
                  onPress={() => {
                    // Tap to deselect if this sticker is selected for delete
                    if (selectedForDelete === decoration.id) {
                      setSelectedForDelete(null);
                    }
                  }}
                  delayLongPress={500}
                >
                  {decoration.lottieSource ? (
                    <LottieView
                      source={decoration.lottieSource}
                      autoPlay
                      loop
                      style={{ width: 40, height: 40 }}
                    />
                  ) : (
                    <Text
                      style={{
                        fontSize: 40,
                        textShadowColor: 'rgba(0,0,0,0.3)',
                        textShadowOffset: { width: 1, height: 1 },
                        textShadowRadius: 2,
                      }}
                    >
                      {decoration.emoji}
                    </Text>
                  )}
                </TouchableOpacity>
                {/* Delete button - shows after long-press */}
                {selectedForDelete === decoration.id && (
                  <TouchableOpacity
                    style={{
                      position: 'absolute',
                      top: -8,
                      right: -8,
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      backgroundColor: '#EF4444',
                      justifyContent: 'center',
                      alignItems: 'center',
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.3,
                      shadowRadius: 2,
                      elevation: 4,
                      zIndex: 100,
                    }}
                    onPress={() => {
                      handleRemoveDecoration(decoration.id);
                      setSelectedForDelete(null);
                    }}
                  >
                    <Ionicons name="close" size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                )}
              </View>
            </DraggableSticker>
          ))}
        </View>

        {/* Tab Bar */}
        <View
          style={{
            flexDirection: 'row',
            marginHorizontal: theme.spacing.md,
            marginBottom: theme.spacing.md,
            backgroundColor: theme.neutralColors.lightGray,
            borderRadius: 12,
            padding: 4,
          }}
        >
          {TABS.map(tab => (
            <TouchableOpacity
              key={tab.id}
              onPress={() => setActiveTab(tab.id)}
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 10,
                borderRadius: 10,
                backgroundColor: activeTab === tab.id ? '#FFFFFF' : 'transparent',
                shadowColor: activeTab === tab.id ? '#000' : 'transparent',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.1,
                shadowRadius: 2,
                elevation: activeTab === tab.id ? 2 : 0,
              }}
            >
              <Text style={{ fontSize: 16, marginRight: 6 }}>{tab.icon}</Text>
              <Text
                style={{
                  fontSize: 14,
                  fontFamily: isKidsEdition ? 'Nunito_Bold' : 'Montserrat_SemiBold',
                  color: activeTab === tab.id
                    ? theme.brandColors.teal
                    : theme.neutralColors.mediumGray,
                }}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab Content */}
        {activeTab === 'stickers' && renderStickerPicker()}
        {activeTab === 'filters' && renderFilterPicker()}
      </ScrollView>

      {/* Action Buttons */}
      <View
        style={{
          backgroundColor: theme.neutralColors.white,
          paddingVertical: theme.spacing.lg,
          paddingHorizontal: theme.spacing.md,
          borderTopWidth: 1,
          borderTopColor: theme.neutralColors.lightGray,
        }}
      >
        <ThankCastButton
          title="Review & Submit"
          onPress={handleProceed}
          loading={loading}
          disabled={loading}
          style={{ marginBottom: theme.spacing.md }}
        />
        <TouchableOpacity
          onPress={() => navigation?.goBack()}
          style={{
            paddingVertical: theme.spacing.md,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Text
            style={{
              fontSize: isKidsEdition ? 14 : 12,
              fontFamily: isKidsEdition ? 'Nunito_SemiBold' : 'Montserrat_SemiBold',
              color: theme.brandColors.teal,
            }}
          >
            Back
          </Text>
        </TouchableOpacity>
      </View>

      <LoadingSpinner visible={loading} message="Customizing video..." fullScreen />
    </SafeAreaView>
  );
};

export default VideoCustomizationScreen;
