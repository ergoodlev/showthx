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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Video } from 'expo-av';
import { useEdition } from '../context/EditionContext';
import { AppBar } from '../components/AppBar';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ThankCastButton } from '../components/ThankCastButton';

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
      textPosition,
    });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.neutral.white }}>
      <AppBar
        title="Customize Your Video"
        onBackPress={() => navigation?.goBack()}
        showBack={true}
      />

      <ScrollView style={{ flex: 1 }}>
        {/* Video Preview */}
        <View
          style={{
            backgroundColor: '#000000',
            height: 200,
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

          {/* Text Overlay Preview */}
          {showTextPreview && overlayText && (
            <View
              style={{
                position: 'absolute',
                width: '100%',
                justifyContent: textPosition === 'top' ? 'flex-start' : textPosition === 'middle' ? 'center' : 'flex-end',
                alignItems: 'center',
                paddingVertical: theme.spacing.md,
              }}
            >
              <Text
                style={{
                  fontSize: isKidsEdition ? 20 : 16,
                  fontFamily: isKidsEdition ? 'Nunito_Bold' : 'Montserrat_Bold',
                  color: TEXT_COLORS.find(c => c.id === selectedTextColor)?.hex || '#FFFFFF',
                  textAlign: 'center',
                  paddingHorizontal: theme.spacing.md,
                  textShadowColor: 'rgba(0,0,0,0.5)',
                  textShadowOffset: { width: 1, height: 1 },
                  textShadowRadius: 3,
                }}
              >
                {overlayText}
              </Text>
            </View>
          )}
        </View>

        {/* Text Overlay Section */}
        <View style={{ marginHorizontal: theme.spacing.md, marginBottom: theme.spacing.lg }}>
          <Text
            style={{
              fontSize: isKidsEdition ? 16 : 14,
              fontFamily: isKidsEdition ? 'Nunito_Bold' : 'Montserrat_SemiBold',
              color: theme.colors.neutral.dark,
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
              borderColor: theme.colors.neutral.lightGray,
              borderRadius: 8,
              paddingHorizontal: theme.spacing.sm,
              paddingVertical: theme.spacing.sm,
              fontSize: isKidsEdition ? 14 : 12,
              fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
              color: theme.colors.neutral.dark,
              marginBottom: theme.spacing.sm,
              maxHeight: 80,
            }}
            multiline
            placeholderTextColor={theme.colors.neutral.mediumGray}
          />

          {/* Text Position Selection */}
          <Text
            style={{
              fontSize: isKidsEdition ? 12 : 11,
              fontFamily: isKidsEdition ? 'Nunito_SemiBold' : 'Montserrat_SemiBold',
              color: theme.colors.neutral.mediumGray,
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
                onPress={() => setTextPosition(position)}
                style={{
                  flex: 1,
                  paddingVertical: theme.spacing.sm,
                  borderRadius: 8,
                  backgroundColor: textPosition === position ? theme.colors.brand.coral : theme.colors.neutral.lightGray,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Text
                  style={{
                    fontSize: isKidsEdition ? 12 : 11,
                    fontFamily: isKidsEdition ? 'Nunito_SemiBold' : 'Montserrat_SemiBold',
                    color: textPosition === position ? '#FFFFFF' : theme.colors.neutral.mediumGray,
                    textTransform: 'capitalize',
                  }}
                >
                  {position}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Text Color Selection */}
          <Text
            style={{
              fontSize: isKidsEdition ? 12 : 11,
              fontFamily: isKidsEdition ? 'Nunito_SemiBold' : 'Montserrat_SemiBold',
              color: theme.colors.neutral.mediumGray,
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
                  borderColor: theme.colors.brand.coral,
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
              color: theme.colors.neutral.dark,
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
                  backgroundColor: selectedTransition === transition.id ? theme.colors.brand.coral : theme.colors.neutral.lightGray,
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: theme.spacing.xs,
                }}
              >
                <Ionicons
                  name={transition.icon}
                  size={24}
                  color={selectedTransition === transition.id ? '#FFFFFF' : theme.colors.neutral.mediumGray}
                />
                <Text
                  style={{
                    fontSize: isKidsEdition ? 12 : 11,
                    fontFamily: isKidsEdition ? 'Nunito_SemiBold' : 'Montserrat_SemiBold',
                    color: selectedTransition === transition.id ? '#FFFFFF' : theme.colors.neutral.mediumGray,
                  }}
                >
                  {transition.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Music Info */}
        {musicTitle && (
          <View
            style={{
              marginHorizontal: theme.spacing.md,
              marginBottom: theme.spacing.lg,
              backgroundColor: theme.colors.neutral.lightGray,
              borderRadius: 8,
              padding: theme.spacing.md,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
              <Ionicons name="musical-notes" size={20} color={theme.colors.brand.coral} />
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: isKidsEdition ? 12 : 11,
                    fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
                    color: theme.colors.neutral.mediumGray,
                  }}
                >
                  Music Selected
                </Text>
                <Text
                  style={{
                    fontSize: isKidsEdition ? 14 : 12,
                    fontFamily: isKidsEdition ? 'Nunito_Bold' : 'Montserrat_SemiBold',
                    color: theme.colors.neutral.dark,
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
          backgroundColor: theme.colors.neutral.white,
          paddingVertical: theme.spacing.lg,
          paddingHorizontal: theme.spacing.md,
          borderTopWidth: 1,
          borderTopColor: theme.colors.neutral.lightGray,
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
              color: theme.colors.brand.teal,
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
