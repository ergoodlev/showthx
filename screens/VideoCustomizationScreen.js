/**
 * VideoCustomizationScreen
 * Add text overlays, transitions, and effects to thank you video
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  PanResponder,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Video } from 'expo-av';
import { useEdition } from '../context/EditionContext';
import { AppBar } from '../components/AppBar';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ThankCastButton } from '../components/ThankCastButton';

const { width: screenWidth } = Dimensions.get('window');

const TRANSITIONS = [
  { id: 'none', label: 'None', icon: 'remove-circle' },
  { id: 'fade', label: 'Fade', icon: 'flash' },
  { id: 'slide', label: 'Slide', icon: 'arrow-forward' },
  { id: 'zoom', label: 'Zoom', icon: 'search' },
];

const TEXT_COLORS = [
  { id: 'white', label: 'White', hex: '#FFFFFF' },
  { id: 'black', label: 'Black', hex: '#000000' },
  { id: 'coral', label: 'Coral', hex: '#FF6B6B' },
  { id: 'teal', label: 'Teal', hex: '#00A699' },
  { id: 'yellow', label: 'Yellow', hex: '#FFD93D' },
];

// Modern frame styles - clean, contemporary designs
const FRAMES = [
  { id: 'none', label: 'None', icon: 'remove-circle-outline' },
  { id: 'gradient-glow', label: 'Glow', icon: 'sunny-outline', colors: ['#FF6B6B', '#FFD93D'] },
  { id: 'neon-border', label: 'Neon', icon: 'flashlight-outline', colors: ['#00F5FF', '#FF00FF'] },
  { id: 'soft-vignette', label: 'Soft', icon: 'ellipse-outline', colors: ['#000000'] },
  { id: 'celebration', label: 'Party', icon: 'sparkles-outline', colors: ['#FFD700', '#FF6B6B'] },
  { id: 'minimal', label: 'Clean', icon: 'square-outline', colors: ['#FFFFFF'] },
];

export const VideoCustomizationScreen = ({ navigation, route }) => {
  const { edition, theme } = useEdition();
  const isKidsEdition = edition === 'kids';
  const videoUri = route?.params?.videoUri;
  const giftId = route?.params?.giftId;
  const giftName = route?.params?.giftName;
  const musicId = route?.params?.musicId;
  const musicTitle = route?.params?.musicTitle;

  const videoRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [selectedTransition, setSelectedTransition] = useState('none');
  const [selectedTextColor, setSelectedTextColor] = useState('white');
  const [overlayText, setOverlayText] = useState('');
  const [showTextPreview, setShowTextPreview] = useState(true);
  const [textPosition, setTextPosition] = useState('bottom'); // top, middle, bottom
  const [selectedFrame, setSelectedFrame] = useState('none');
  const [isDraggable, setIsDraggable] = useState(false);

  // Draggable text position (percentage-based for flexibility)
  const [textPosX, setTextPosX] = useState(50); // 0-100% from left
  const [textPosY, setTextPosY] = useState(85); // 0-100% from top

  // Animated values for smooth dragging
  const pan = useRef(new Animated.ValueXY()).current;
  const videoContainerRef = useRef(null);
  const [containerLayout, setContainerLayout] = useState({ width: 200, height: 350 });

  // PanResponder for draggable text
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => isDraggable,
      onMoveShouldSetPanResponder: () => isDraggable,
      onPanResponderGrant: () => {
        pan.setOffset({
          x: pan.x._value,
          y: pan.y._value,
        });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: (e, gesture) => {
        pan.flattenOffset();
        // Calculate percentage position
        const newX = Math.max(10, Math.min(90, textPosX + (gesture.dx / containerLayout.width) * 100));
        const newY = Math.max(10, Math.min(90, textPosY + (gesture.dy / containerLayout.height) * 100));
        setTextPosX(newX);
        setTextPosY(newY);
        pan.setValue({ x: 0, y: 0 });
      },
    })
  ).current;

  // Update preset position when buttons are pressed
  const setPresetPosition = (position) => {
    setTextPosition(position);
    setIsDraggable(false);
    if (position === 'top') {
      setTextPosX(50);
      setTextPosY(10);
    } else if (position === 'middle') {
      setTextPosX(50);
      setTextPosY(45);
    } else {
      setTextPosX(50);
      setTextPosY(85);
    }
  };

  const handleAddText = () => {
    if (overlayText.trim()) {
      setShowTextPreview(true);
    }
  };

  const handleRemoveText = () => {
    setOverlayText('');
    setShowTextPreview(false);
  };

  const handleProceed = () => {
    navigation?.navigate('VideoConfirmation', {
      videoUri,
      giftId,
      giftName,
      musicId,
      musicTitle,
      transition: selectedTransition,
      overlayText,
      textColor: selectedTextColor,
      textPosition: isDraggable ? 'custom' : textPosition,
      textPosX,
      textPosY,
      frame: selectedFrame,
    });
  };

  // Render frame overlay based on selection
  const renderFrameOverlay = () => {
    const frame = FRAMES.find(f => f.id === selectedFrame);
    if (!frame || selectedFrame === 'none') return null;

    switch (selectedFrame) {
      case 'gradient-glow':
        return (
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none' }}>
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 40, backgroundColor: 'rgba(255,107,107,0.4)' }} />
            <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 40, backgroundColor: 'rgba(255,217,61,0.4)' }} />
            <View style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 8, backgroundColor: 'rgba(255,107,107,0.6)' }} />
            <View style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 8, backgroundColor: 'rgba(255,217,61,0.6)' }} />
          </View>
        );
      case 'neon-border':
        return (
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderWidth: 4, borderColor: '#00F5FF', borderRadius: 12, pointerEvents: 'none', shadowColor: '#00F5FF', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 10 }} />
        );
      case 'soft-vignette':
        return (
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none' }}>
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 50, backgroundColor: 'rgba(0,0,0,0.5)' }} />
            <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 50, backgroundColor: 'rgba(0,0,0,0.5)' }} />
          </View>
        );
      case 'celebration':
        return (
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none' }}>
            <View style={{ position: 'absolute', top: 8, left: 8, width: 20, height: 20, borderRadius: 10, backgroundColor: '#FFD700' }} />
            <View style={{ position: 'absolute', top: 8, right: 8, width: 16, height: 16, borderRadius: 8, backgroundColor: '#FF6B6B' }} />
            <View style={{ position: 'absolute', bottom: 8, left: 20, width: 14, height: 14, borderRadius: 7, backgroundColor: '#FF6B6B' }} />
            <View style={{ position: 'absolute', bottom: 12, right: 16, width: 18, height: 18, borderRadius: 9, backgroundColor: '#FFD700' }} />
            <View style={{ position: 'absolute', top: 40, right: 30, width: 10, height: 10, borderRadius: 5, backgroundColor: '#FFD700' }} />
          </View>
        );
      case 'minimal':
        return (
          <View style={{ position: 'absolute', top: 8, left: 8, right: 8, bottom: 8, borderWidth: 2, borderColor: 'rgba(255,255,255,0.8)', borderRadius: 8, pointerEvents: 'none' }} />
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.neutralColors.white }}>
      <AppBar
        title="Customize Your Video"
        onBackPress={() => navigation?.goBack()}
        showBack={true}
      />

      <ScrollView style={{ flex: 1 }}>
        {/* Video Preview - Portrait aspect ratio for vertical videos */}
        <View
          style={{
            backgroundColor: '#000000',
            aspectRatio: 9 / 16,
            maxHeight: 350,
            alignSelf: 'center',
            width: '60%',
            justifyContent: 'center',
            alignItems: 'center',
            margin: theme.spacing.md,
            borderRadius: 12,
            overflow: 'hidden',
          }}
          onLayout={(e) => {
            const { width, height } = e.nativeEvent.layout;
            setContainerLayout({ width, height });
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

          {/* Frame Overlay Preview */}
          {renderFrameOverlay()}

          {/* Text Overlay Preview */}
          {showTextPreview && overlayText && (
            isDraggable ? (
              <Animated.View
                {...panResponder.panHandlers}
                style={{
                  position: 'absolute',
                  left: `${textPosX}%`,
                  top: `${textPosY}%`,
                  transform: [
                    { translateX: pan.x },
                    { translateY: pan.y },
                    { translateX: -50 },
                    { translateY: -50 },
                  ],
                  paddingHorizontal: theme.spacing.md,
                }}
              >
                <View style={{
                  borderWidth: 2,
                  borderColor: theme.brandColors.coral,
                  borderStyle: 'dashed',
                  borderRadius: 8,
                  padding: 4,
                }}>
                  <Text
                    style={{
                      fontSize: isKidsEdition ? 20 : 16,
                      fontFamily: isKidsEdition ? 'Nunito_Bold' : 'Montserrat_Bold',
                      color: TEXT_COLORS.find(c => c.id === selectedTextColor)?.hex || '#FFFFFF',
                      textAlign: 'center',
                      paddingHorizontal: theme.spacing.md,
                      paddingVertical: 4,
                      backgroundColor: 'rgba(0,0,0,0.3)',
                      borderRadius: 4,
                      overflow: 'hidden',
                      textShadowColor: 'rgba(0,0,0,0.5)',
                      textShadowOffset: { width: 1, height: 1 },
                      textShadowRadius: 3,
                    }}
                  >
                    {overlayText}
                  </Text>
                </View>
              </Animated.View>
            ) : (
              <View
                style={{
                  position: 'absolute',
                  top: textPosition === 'top' ? 12 : textPosition === 'middle' ? '40%' : undefined,
                  bottom: textPosition === 'bottom' ? 12 : undefined,
                  left: 0,
                  right: 0,
                  alignItems: 'center',
                  paddingHorizontal: theme.spacing.md,
                }}
              >
                <Text
                  style={{
                    fontSize: isKidsEdition ? 20 : 16,
                    fontFamily: isKidsEdition ? 'Nunito_Bold' : 'Montserrat_Bold',
                    color: TEXT_COLORS.find(c => c.id === selectedTextColor)?.hex || '#FFFFFF',
                    textAlign: 'center',
                    paddingHorizontal: theme.spacing.md,
                    paddingVertical: 4,
                    backgroundColor: 'rgba(0,0,0,0.3)',
                    borderRadius: 4,
                    overflow: 'hidden',
                    textShadowColor: 'rgba(0,0,0,0.5)',
                    textShadowOffset: { width: 1, height: 1 },
                    textShadowRadius: 3,
                  }}
                >
                  {overlayText}
                </Text>
              </View>
            )
          )}
        </View>

        {/* Text Overlay Section */}
        <View style={{ marginHorizontal: theme.spacing.md, marginBottom: theme.spacing.lg }}>
          <Text
            style={{
              fontSize: isKidsEdition ? 16 : 14,
              fontFamily: isKidsEdition ? 'Nunito_Bold' : 'Montserrat_SemiBold',
              color: theme.neutralColors.dark,
              marginBottom: theme.spacing.sm,
            }}
          >
            Add Text Overlay
          </Text>

          <TextInput
            placeholder="What do you want to say?"
            value={overlayText}
            onChangeText={setOverlayText}
            style={{
              borderWidth: 1,
              borderColor: theme.neutralColors.lightGray,
              borderRadius: 8,
              paddingHorizontal: theme.spacing.sm,
              paddingVertical: theme.spacing.sm,
              fontSize: isKidsEdition ? 14 : 12,
              fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
              color: theme.neutralColors.dark,
              marginBottom: theme.spacing.sm,
              maxHeight: 80,
            }}
            multiline
            placeholderTextColor={theme.neutralColors.mediumGray}
          />

          {/* Text Position Selection */}
          <Text
            style={{
              fontSize: isKidsEdition ? 12 : 11,
              fontFamily: isKidsEdition ? 'Nunito_SemiBold' : 'Montserrat_SemiBold',
              color: theme.neutralColors.mediumGray,
              marginBottom: theme.spacing.sm,
              marginTop: theme.spacing.sm,
            }}
          >
            Text Position
          </Text>
          <View style={{ flexDirection: 'row', gap: theme.spacing.sm, marginBottom: theme.spacing.md }}>
            {['top', 'middle', 'bottom'].map(position => (
              <TouchableOpacity
                key={position}
                onPress={() => setPresetPosition(position)}
                style={{
                  flex: 1,
                  paddingVertical: theme.spacing.sm,
                  borderRadius: 8,
                  backgroundColor: !isDraggable && textPosition === position ? theme.brandColors.coral : theme.neutralColors.lightGray,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Text
                  style={{
                    fontSize: isKidsEdition ? 12 : 11,
                    fontFamily: isKidsEdition ? 'Nunito_SemiBold' : 'Montserrat_SemiBold',
                    color: !isDraggable && textPosition === position ? '#FFFFFF' : theme.neutralColors.mediumGray,
                    textTransform: 'capitalize',
                  }}
                >
                  {position}
                </Text>
              </TouchableOpacity>
            ))}
            {/* Drag option */}
            <TouchableOpacity
              onPress={() => setIsDraggable(true)}
              style={{
                flex: 1,
                paddingVertical: theme.spacing.sm,
                borderRadius: 8,
                backgroundColor: isDraggable ? theme.brandColors.teal : theme.neutralColors.lightGray,
                justifyContent: 'center',
                alignItems: 'center',
                flexDirection: 'row',
                gap: 4,
              }}
            >
              <Ionicons
                name="move"
                size={14}
                color={isDraggable ? '#FFFFFF' : theme.neutralColors.mediumGray}
              />
              <Text
                style={{
                  fontSize: isKidsEdition ? 12 : 11,
                  fontFamily: isKidsEdition ? 'Nunito_SemiBold' : 'Montserrat_SemiBold',
                  color: isDraggable ? '#FFFFFF' : theme.neutralColors.mediumGray,
                }}
              >
                Drag
              </Text>
            </TouchableOpacity>
          </View>
          {isDraggable && (
            <Text
              style={{
                fontSize: isKidsEdition ? 11 : 10,
                fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
                color: theme.brandColors.teal,
                marginBottom: theme.spacing.sm,
                fontStyle: 'italic',
              }}
            >
              Drag the text on the video to position it anywhere
            </Text>
          )}

          {/* Text Color Selection */}
          <Text
            style={{
              fontSize: isKidsEdition ? 12 : 11,
              fontFamily: isKidsEdition ? 'Nunito_SemiBold' : 'Montserrat_SemiBold',
              color: theme.neutralColors.mediumGray,
              marginBottom: theme.spacing.sm,
            }}
          >
            Text Color
          </Text>
          <View style={{ flexDirection: 'row', gap: theme.spacing.sm, marginBottom: theme.spacing.lg }}>
            {TEXT_COLORS.map(color => (
              <TouchableOpacity
                key={color.id}
                onPress={() => setSelectedTextColor(color.id)}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: color.hex,
                  borderWidth: selectedTextColor === color.id ? 3 : 0,
                  borderColor: theme.brandColors.coral,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                {selectedTextColor === color.id && (
                  <Ionicons name="checkmark" size={20} color={color.id === 'white' ? '#000000' : '#FFFFFF'} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Transition Section */}
        <View style={{ marginHorizontal: theme.spacing.md, marginBottom: theme.spacing.lg }}>
          <Text
            style={{
              fontSize: isKidsEdition ? 16 : 14,
              fontFamily: isKidsEdition ? 'Nunito_Bold' : 'Montserrat_SemiBold',
              color: theme.neutralColors.dark,
              marginBottom: theme.spacing.md,
            }}
          >
            Transition Effect
          </Text>

          <View style={{ flexDirection: 'row', gap: theme.spacing.sm, flexWrap: 'wrap' }}>
            {TRANSITIONS.map(transition => (
              <TouchableOpacity
                key={transition.id}
                onPress={() => setSelectedTransition(transition.id)}
                style={{
                  flex: 1,
                  minWidth: '48%',
                  paddingVertical: theme.spacing.md,
                  borderRadius: 8,
                  backgroundColor: selectedTransition === transition.id ? theme.brandColors.coral : theme.neutralColors.lightGray,
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: theme.spacing.xs,
                }}
              >
                <Ionicons
                  name={transition.icon}
                  size={24}
                  color={selectedTransition === transition.id ? '#FFFFFF' : theme.neutralColors.mediumGray}
                />
                <Text
                  style={{
                    fontSize: isKidsEdition ? 12 : 11,
                    fontFamily: isKidsEdition ? 'Nunito_SemiBold' : 'Montserrat_SemiBold',
                    color: selectedTransition === transition.id ? '#FFFFFF' : theme.neutralColors.mediumGray,
                  }}
                >
                  {transition.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Frame Selection Section */}
        <View style={{ marginHorizontal: theme.spacing.md, marginBottom: theme.spacing.lg }}>
          <Text
            style={{
              fontSize: isKidsEdition ? 16 : 14,
              fontFamily: isKidsEdition ? 'Nunito_Bold' : 'Montserrat_SemiBold',
              color: theme.neutralColors.dark,
              marginBottom: theme.spacing.md,
            }}
          >
            Video Frame
          </Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
              {FRAMES.map(frame => (
                <TouchableOpacity
                  key={frame.id}
                  onPress={() => setSelectedFrame(frame.id)}
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: 12,
                    backgroundColor: selectedFrame === frame.id ? theme.brandColors.coral : theme.neutralColors.lightGray,
                    justifyContent: 'center',
                    alignItems: 'center',
                    borderWidth: selectedFrame === frame.id ? 0 : 1,
                    borderColor: theme.neutralColors.mediumGray,
                  }}
                >
                  <Ionicons
                    name={frame.icon}
                    size={28}
                    color={selectedFrame === frame.id ? '#FFFFFF' : theme.neutralColors.dark}
                  />
                  <Text
                    style={{
                      fontSize: isKidsEdition ? 11 : 10,
                      fontFamily: isKidsEdition ? 'Nunito_SemiBold' : 'Montserrat_SemiBold',
                      color: selectedFrame === frame.id ? '#FFFFFF' : theme.neutralColors.mediumGray,
                      marginTop: 4,
                    }}
                  >
                    {frame.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Music Info */}
        {musicTitle && (
          <View
            style={{
              marginHorizontal: theme.spacing.md,
              marginBottom: theme.spacing.lg,
              backgroundColor: theme.neutralColors.lightGray,
              borderRadius: 8,
              padding: theme.spacing.md,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
              <Ionicons name="musical-notes" size={20} color={theme.brandColors.coral} />
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: isKidsEdition ? 12 : 11,
                    fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
                    color: theme.neutralColors.mediumGray,
                  }}
                >
                  Music Selected
                </Text>
                <Text
                  style={{
                    fontSize: isKidsEdition ? 14 : 12,
                    fontFamily: isKidsEdition ? 'Nunito_Bold' : 'Montserrat_SemiBold',
                    color: theme.neutralColors.dark,
                    marginTop: 2,
                  }}
                >
                  {musicTitle}
                </Text>
              </View>
            </View>
          </View>
        )}
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
