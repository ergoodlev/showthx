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

// Video overlay effects - simple, clean options
const FRAMES = [
  { id: 'none', label: 'None', icon: 'close-circle-outline', description: 'No overlay' },
  { id: 'minimal', label: 'Clean', icon: 'square-outline', description: 'Simple white border' },
  { id: 'neon-border', label: 'Neon', icon: 'flashlight-outline', description: 'Glowing edge' },
  { id: 'soft-vignette', label: 'Cinematic', icon: 'film-outline', description: 'Dark edges' },
  { id: 'celebration', label: 'Party', icon: 'sparkles-outline', description: 'Confetti dots' },
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
  const [isScrollEnabled, setIsScrollEnabled] = useState(true); // Control scroll during drag

  // Draggable text position (percentage-based for flexibility)
  const [textPosX, setTextPosX] = useState(50); // 0-100% from left
  const [textPosY, setTextPosY] = useState(85); // 0-100% from top

  // Animated values for smooth dragging
  const pan = useRef(new Animated.ValueXY()).current;
  const videoContainerRef = useRef(null);
  const [containerLayout, setContainerLayout] = useState({ width: 200, height: 350 });

  // Use refs to access current values in PanResponder callbacks
  const isDraggableRef = useRef(isDraggable);
  const textPosXRef = useRef(textPosX);
  const textPosYRef = useRef(textPosY);
  const containerLayoutRef = useRef(containerLayout);

  // Keep refs in sync with state
  isDraggableRef.current = isDraggable;
  textPosXRef.current = textPosX;
  textPosYRef.current = textPosY;
  containerLayoutRef.current = containerLayout;

  // PanResponder for draggable text - uses refs to get current values
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => isDraggableRef.current,
      onMoveShouldSetPanResponder: () => isDraggableRef.current,
      onPanResponderGrant: () => {
        // Disable scrolling when dragging starts
        setIsScrollEnabled(false);
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
        // Re-enable scrolling when dragging ends
        setIsScrollEnabled(true);
        pan.flattenOffset();
        // Calculate percentage position using refs for current values
        const layout = containerLayoutRef.current;
        const currentX = textPosXRef.current;
        const currentY = textPosYRef.current;
        const newX = Math.max(10, Math.min(90, currentX + (gesture.dx / layout.width) * 100));
        const newY = Math.max(10, Math.min(90, currentY + (gesture.dy / layout.height) * 100));
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

  // Render frame overlay based on selection - simplified and cleaner
  const renderFrameOverlay = () => {
    if (selectedFrame === 'none') return null;

    const overlayStyles = {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      pointerEvents: 'none',
    };

    switch (selectedFrame) {
      case 'neon-border':
        return (
          <View style={[overlayStyles, {
            borderWidth: 3,
            borderColor: '#06b6d4',
            borderRadius: 10,
            shadowColor: '#06b6d4',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.9,
            shadowRadius: 12,
          }]} />
        );
      case 'soft-vignette':
        return (
          <View style={overlayStyles}>
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 40, backgroundColor: 'rgba(0,0,0,0.4)' }} />
            <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 40, backgroundColor: 'rgba(0,0,0,0.4)' }} />
            <View style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 15, backgroundColor: 'rgba(0,0,0,0.3)' }} />
            <View style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 15, backgroundColor: 'rgba(0,0,0,0.3)' }} />
          </View>
        );
      case 'celebration':
        return (
          <View style={overlayStyles}>
            <View style={{ position: 'absolute', top: 10, left: 10, width: 12, height: 12, borderRadius: 6, backgroundColor: '#FFD700', opacity: 0.9 }} />
            <View style={{ position: 'absolute', top: 10, right: 10, width: 10, height: 10, borderRadius: 5, backgroundColor: '#FF6B6B', opacity: 0.9 }} />
            <View style={{ position: 'absolute', bottom: 10, left: 15, width: 8, height: 8, borderRadius: 4, backgroundColor: '#8B5CF6', opacity: 0.9 }} />
            <View style={{ position: 'absolute', bottom: 10, right: 15, width: 10, height: 10, borderRadius: 5, backgroundColor: '#06b6d4', opacity: 0.9 }} />
            <View style={{ position: 'absolute', top: 30, right: 20, width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFD700', opacity: 0.8 }} />
            <View style={{ position: 'absolute', bottom: 30, left: 25, width: 6, height: 6, borderRadius: 3, backgroundColor: '#FF6B6B', opacity: 0.8 }} />
          </View>
        );
      case 'minimal':
        return (
          <View style={[overlayStyles, {
            margin: 6,
            borderWidth: 2,
            borderColor: 'rgba(255,255,255,0.9)',
            borderRadius: 6,
          }]} />
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

      <ScrollView style={{ flex: 1 }} scrollEnabled={isScrollEnabled}>
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
