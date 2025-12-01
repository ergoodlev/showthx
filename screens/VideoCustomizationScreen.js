/**
 * VideoCustomizationScreen
 * Kids can add simple decorations (stickers) to their video
 * Phase 4: Decorations system for kids
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
} from 'react-native';
import { Video } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import { useEdition } from '../context/EditionContext';
import { AppBar } from '../components/AppBar';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ThankCastButton } from '../components/ThankCastButton';
import { DECORATIONS, createPlacedDecoration } from '../services/decorationService';

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

  const handleAddDecoration = (decorationId) => {
    // Create a new decoration instance at a random position
    const randomX = 20 + Math.random() * 60;
    const randomY = 20 + Math.random() * 60;
    const newDecoration = createPlacedDecoration(decorationId, randomX, randomY, 1.0);

    if (newDecoration) {
      setPlacedDecorations([...placedDecorations, newDecoration]);
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
      frameTemplate, // Pass frameTemplate forward
    });
  };

  // Draggable Sticker Component
  const DraggableSticker = ({ decoration, children }) => {
    const pan = useRef(new Animated.ValueXY()).current;

    const panResponder = useRef(
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
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

          // Get VIDEO CONTAINER dimensions to calculate percentage
          if (videoContainerRef.current) {
            videoContainerRef.current.measure((fx, fy, width, height, px, py) => {
              // Calculate new position as percentage of container
              const currentXPx = (decoration.x / 100) * width;
              const currentYPx = (decoration.y / 100) * height;
              const newXPx = currentXPx + gesture.dx;
              const newYPx = currentYPx + gesture.dy;
              const newX = Math.max(5, Math.min(95, (newXPx / width) * 100));
              const newY = Math.max(5, Math.min(95, (newYPx / height) * 100));

              handleUpdateDecorationPosition(decoration.id, newX, newY);
              pan.setValue({ x: 0, y: 0 });
            });
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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.neutralColors.white }}>
      <AppBar
        title="Decorate Your Video"
        onBackPress={() => navigation?.goBack()}
        showBack={true}
      />

      <ScrollView style={{ flex: 1 }}>
        {/* Video Preview - Portrait aspect ratio for vertical videos */}
        <View
          ref={videoContainerRef}
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
        >
          <Video
            ref={videoRef}
            source={{ uri: videoUri }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="contain"
            useNativeControls={false}
            isLooping
          />

          {/* Decoration Overlays - Draggable */}
          {placedDecorations.map(decoration => (
            <DraggableSticker key={decoration.id} decoration={decoration}>
              <TouchableOpacity
                onLongPress={() => handleRemoveDecoration(decoration.id)}
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
            </DraggableSticker>
          ))}
        </View>

        {/* Decoration Picker */}
        <View style={{ marginHorizontal: theme.spacing.md, marginBottom: theme.spacing.lg }}>
          <Text
            style={{
              fontSize: isKidsEdition ? 16 : 14,
              fontFamily: isKidsEdition ? 'Nunito_Bold' : 'Montserrat_SemiBold',
              color: theme.neutralColors.dark,
              marginBottom: theme.spacing.sm,
            }}
          >
            Add Stickers to Your Video!
          </Text>
          <Text
            style={{
              fontSize: isKidsEdition ? 12 : 11,
              fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
              color: theme.neutralColors.mediumGray,
              marginBottom: theme.spacing.md,
            }}
          >
            Tap a sticker to add it to your video. Drag stickers to reposition them. Long-press a sticker on the video to remove it.
          </Text>

          {/* Decoration Grid */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
            {DECORATIONS.map(decoration => (
              <TouchableOpacity
                key={decoration.id}
                onPress={() => handleAddDecoration(decoration.id)}
                style={{
                  width: 70,
                  height: 70,
                  backgroundColor: theme.neutralColors.lightGray,
                  borderRadius: 12,
                  justifyContent: 'center',
                  alignItems: 'center',
                  borderWidth: 2,
                  borderColor: 'transparent',
                }}
              >
                {decoration.lottieSource ? (
                  <LottieView
                    source={decoration.lottieSource}
                    autoPlay
                    loop
                    style={{ width: 40, height: 40 }}
                  />
                ) : (
                  <Text style={{ fontSize: 36 }}>{decoration.emoji}</Text>
                )}
                <Text
                  style={{
                    fontSize: isKidsEdition ? 10 : 9,
                    fontFamily: isKidsEdition ? 'Nunito_SemiBold' : 'Montserrat_SemiBold',
                    color: theme.neutralColors.mediumGray,
                    marginTop: 2,
                  }}
                >
                  {decoration.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Placed Decorations Info */}
          {placedDecorations.length > 0 && (
            <View
              style={{
                marginTop: theme.spacing.md,
                padding: theme.spacing.sm,
                backgroundColor: 'rgba(0, 166, 153, 0.1)',
                borderRadius: 8,
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
            </View>
          )}
        </View>
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
