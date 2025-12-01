/**
 * FrameDecorationScreen
 * Kids decorate the parent-created frame with emojis, textures, and patterns
 * Kids CANNOT change the frame shape or custom text (locked by parent)
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StyleSheet,
  Dimensions,
  PanResponder,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEdition } from '../context/EditionContext';
import { AppBar } from '../components/AppBar';
import { ThankCastButton } from '../components/ThankCastButton';

const { width: screenWidth } = Dimensions.get('window');

// Fun emoji stickers for kids
const EMOJI_STICKERS = [
  { id: 'star', emoji: '⭐', label: 'Star' },
  { id: 'heart', emoji: '❤️', label: 'Heart' },
  { id: 'sparkle', emoji: '✨', label: 'Sparkle' },
  { id: 'rainbow', emoji: '🌈', label: 'Rainbow' },
  { id: 'balloon', emoji: '🎈', label: 'Balloon' },
  { id: 'party', emoji: '🎉', label: 'Party' },
  { id: 'gift', emoji: '🎁', label: 'Gift' },
  { id: 'cake', emoji: '🎂', label: 'Cake' },
  { id: 'smile', emoji: '😊', label: 'Smile' },
  { id: 'love', emoji: '🥰', label: 'Love' },
  { id: 'cool', emoji: '😎', label: 'Cool' },
  { id: 'thumbsup', emoji: '👍', label: 'Thumbs Up' },
];

// Texture/pattern fills
const TEXTURES = [
  { id: 'none', label: 'None', color: 'transparent', icon: 'close-circle-outline' },
  { id: 'sparkle', label: 'Sparkle', color: '#FFD700', icon: 'sparkles' },
  { id: 'confetti', label: 'Confetti', color: '#FF6B6B', icon: 'ellipse' },
  { id: 'hearts', label: 'Hearts', color: '#FF69B4', icon: 'heart' },
  { id: 'stars', label: 'Stars', color: '#9333EA', icon: 'star' },
  { id: 'bubbles', label: 'Bubbles', color: '#06b6d4', icon: 'ellipse-outline' },
];

// Frame fill colors
const FILL_COLORS = [
  { id: 'none', label: 'None', color: 'transparent' },
  { id: 'gold', label: 'Gold', color: '#FFD700' },
  { id: 'pink', label: 'Pink', color: '#FF69B4' },
  { id: 'purple', label: 'Purple', color: '#9333EA' },
  { id: 'teal', label: 'Teal', color: '#06b6d4' },
  { id: 'orange', label: 'Orange', color: '#F97316' },
  { id: 'green', label: 'Green', color: '#22C55E' },
];

// Draggable emoji component
const DraggableEmoji = ({ emoji, initialX, initialY, onRemove, containerLayout }) => {
  const pan = useRef(new Animated.ValueXY({ x: initialX, y: initialY })).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true, // Capture before ScrollView
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true, // Capture before ScrollView
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
      onPanResponderRelease: () => {
        pan.flattenOffset();
      },
    })
  ).current;

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        styles.draggableEmoji,
        {
          transform: pan.getTranslateTransform(),
        },
      ]}
    >
      <Text style={styles.emojiText}>{emoji}</Text>
      <TouchableOpacity style={styles.removeEmojiButton} onPress={onRemove}>
        <Ionicons name="close-circle" size={16} color="#EF4444" />
      </TouchableOpacity>
    </Animated.View>
  );
};

export const FrameDecorationScreen = ({ navigation, route }) => {
  const { theme } = useEdition();
  const frameTemplate = route?.params?.frameTemplate || {};
  const giftId = route?.params?.giftId;
  const giftName = route?.params?.giftName;

  const [placedEmojis, setPlacedEmojis] = useState([]);
  const [selectedTexture, setSelectedTexture] = useState('none');
  const [selectedFillColor, setSelectedFillColor] = useState('none');
  const [containerLayout, setContainerLayout] = useState({ width: 200, height: 350 });

  // Add emoji to frame
  const handleAddEmoji = (emoji) => {
    const newEmoji = {
      id: Date.now(),
      emoji: emoji.emoji,
      x: Math.random() * (containerLayout.width - 50),
      y: Math.random() * (containerLayout.height - 50),
    };
    setPlacedEmojis([...placedEmojis, newEmoji]);
  };

  // Remove emoji
  const handleRemoveEmoji = (emojiId) => {
    setPlacedEmojis(placedEmojis.filter(e => e.id !== emojiId));
  };

  // Continue to recording with decorated frame
  const handleContinue = () => {
    const decorations = {
      emojis: placedEmojis.map(e => ({
        emoji: e.emoji,
        x: e.x / containerLayout.width * 100,
        y: e.y / containerLayout.height * 100,
      })),
      texture: selectedTexture,
      fillColor: selectedFillColor,
    };

    navigation?.navigate('VideoRecording', {
      giftId,
      giftName,
      frameTemplate,
      decorations,
    });
  };

  // Render frame preview with decorations
  const renderFramePreview = () => {
    const shape = frameTemplate.frame_shape || 'rounded';
    const borderRadius = shape === 'rectangle' ? 0 : shape === 'rounded' ? 20 : shape === 'polaroid' ? 4 : shape === 'playful' ? 30 : 8;
    const frameColor = frameTemplate.primary_color || '#06b6d4';
    const customText = frameTemplate.custom_text || '';
    const textPosition = frameTemplate.custom_text_position || 'bottom';
    const textColor = frameTemplate.custom_text_color || '#FFFFFF';
    const fillColor = FILL_COLORS.find(f => f.id === selectedFillColor)?.color || 'transparent';

    return (
      <View
        style={styles.previewContainer}
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          setContainerLayout({ width, height });
        }}
      >
        <View
          style={[
            styles.framePreview,
            {
              borderRadius,
              borderColor: frameColor,
              borderWidth: 4,
              backgroundColor: fillColor !== 'transparent' ? `${fillColor}20` : 'transparent',
            },
          ]}
        >
          {/* Mock video content */}
          <LinearGradient
            colors={['#1e293b', '#0f172a']}
            style={[styles.previewContent, { borderRadius: Math.max(0, borderRadius - 4) }]}
          >
            {/* Texture overlay */}
            {selectedTexture !== 'none' && (
              <View style={styles.textureOverlay}>
                {[...Array(12)].map((_, i) => {
                  const texture = TEXTURES.find(t => t.id === selectedTexture);
                  return (
                    <Ionicons
                      key={i}
                      name={texture?.icon || 'sparkles'}
                      size={16}
                      color={`${texture?.color || '#FFD700'}80`}
                      style={{
                        position: 'absolute',
                        left: `${(i % 4) * 30 + 10}%`,
                        top: `${Math.floor(i / 4) * 35 + 15}%`,
                      }}
                    />
                  );
                })}
              </View>
            )}

            <Ionicons name="videocam" size={40} color="#64748b" />
            <Text style={styles.previewPlaceholder}>Your Video</Text>
          </LinearGradient>

          {/* Parent's locked custom text */}
          {customText && (
            <View
              style={[
                styles.customTextContainer,
                textPosition === 'top' ? styles.textTop : styles.textBottom,
              ]}
            >
              <View style={styles.lockedBadge}>
                <Ionicons name="lock-closed" size={10} color="#FFF" />
              </View>
              <Text style={[styles.customText, { color: textColor }]}>
                {customText}
              </Text>
            </View>
          )}

          {/* Placed emojis */}
          {placedEmojis.map((item) => (
            <DraggableEmoji
              key={item.id}
              emoji={item.emoji}
              initialX={item.x}
              initialY={item.y}
              onRemove={() => handleRemoveEmoji(item.id)}
              containerLayout={containerLayout}
            />
          ))}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <AppBar
        title="Decorate Your Frame"
        onBackPress={() => navigation?.goBack()}
        showBack={true}
      />

      <ScrollView style={styles.scrollView}>
        {/* Instructions */}
        <View style={styles.instructionBar}>
          <Ionicons name="color-palette" size={20} color="#06b6d4" />
          <Text style={styles.instructionText}>
            Tap emojis to add them, then drag to position!
          </Text>
        </View>

        {/* Frame Preview */}
        {renderFramePreview()}

        {/* Emoji Stickers Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Add Stickers</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.emojiRow}>
              {EMOJI_STICKERS.map((sticker) => (
                <TouchableOpacity
                  key={sticker.id}
                  style={styles.emojiButton}
                  onPress={() => handleAddEmoji(sticker)}
                >
                  <Text style={styles.emojiButtonText}>{sticker.emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
          <Text style={styles.emojiCount}>
            {placedEmojis.length} sticker{placedEmojis.length !== 1 ? 's' : ''} added
          </Text>
        </View>

        {/* Texture Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Add Texture</Text>
          <View style={styles.textureRow}>
            {TEXTURES.map((texture) => (
              <TouchableOpacity
                key={texture.id}
                style={[
                  styles.textureButton,
                  selectedTexture === texture.id && styles.textureButtonSelected,
                ]}
                onPress={() => setSelectedTexture(texture.id)}
              >
                <Ionicons
                  name={texture.icon}
                  size={24}
                  color={selectedTexture === texture.id ? '#FFF' : texture.color || '#6B7280'}
                />
                <Text
                  style={[
                    styles.textureLabel,
                    selectedTexture === texture.id && styles.textureLabelSelected,
                  ]}
                >
                  {texture.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Fill Color Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Frame Glow</Text>
          <View style={styles.colorRow}>
            {FILL_COLORS.map((fill) => (
              <TouchableOpacity
                key={fill.id}
                style={[
                  styles.colorButton,
                  { backgroundColor: fill.color || '#E5E7EB' },
                  selectedFillColor === fill.id && styles.colorButtonSelected,
                ]}
                onPress={() => setSelectedFillColor(fill.id)}
              >
                {selectedFillColor === fill.id && (
                  <Ionicons
                    name="checkmark"
                    size={18}
                    color={fill.id === 'none' || fill.id === 'gold' ? '#000' : '#FFF'}
                  />
                )}
                {fill.id === 'none' && selectedFillColor !== fill.id && (
                  <Ionicons name="close" size={16} color="#9CA3AF" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Clear All Button */}
        {placedEmojis.length > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => setPlacedEmojis([])}
          >
            <Ionicons name="trash-outline" size={18} color="#EF4444" />
            <Text style={styles.clearButtonText}>Clear All Stickers</Text>
          </TouchableOpacity>
        )}

        {/* Continue Button */}
        <View style={styles.actionSection}>
          <ThankCastButton
            title="Continue to Recording"
            onPress={handleContinue}
          />
          <TouchableOpacity
            style={styles.skipButton}
            onPress={() => navigation?.navigate('VideoRecording', {
              giftId,
              giftName,
              frameTemplate,
              decorations: null,
            })}
          >
            <Text style={styles.skipButtonText}>Skip Decorations</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollView: {
    flex: 1,
  },
  instructionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  instructionText: {
    fontSize: 14,
    color: '#0E7490',
    fontWeight: '500',
    flex: 1,
  },
  previewContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  framePreview: {
    width: screenWidth * 0.55,
    aspectRatio: 9 / 16,
    overflow: 'visible',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  previewContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1e293b',
  },
  previewPlaceholder: {
    color: '#64748b',
    marginTop: 8,
    fontSize: 12,
  },
  textureOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  customTextContainer: {
    position: 'absolute',
    left: 8,
    right: 8,
    padding: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  textTop: {
    top: 8,
  },
  textBottom: {
    bottom: 8,
  },
  lockedBadge: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 10,
    padding: 2,
  },
  customText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  draggableEmoji: {
    position: 'absolute',
    zIndex: 100,
  },
  emojiText: {
    fontSize: 32,
  },
  removeEmojiButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FFF',
    borderRadius: 10,
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  emojiRow: {
    flexDirection: 'row',
    gap: 8,
  },
  emojiButton: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  emojiButtonText: {
    fontSize: 24,
  },
  emojiCount: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 8,
    textAlign: 'center',
  },
  textureRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  textureButton: {
    width: (screenWidth - 64) / 3.5,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  textureButtonSelected: {
    backgroundColor: '#06b6d4',
    borderColor: '#0891b2',
  },
  textureLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 4,
    fontWeight: '500',
  },
  textureLabelSelected: {
    color: '#FFFFFF',
  },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  colorButtonSelected: {
    borderWidth: 3,
    borderColor: '#1F2937',
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  clearButtonText: {
    fontSize: 14,
    color: '#EF4444',
    fontWeight: '500',
  },
  actionSection: {
    paddingHorizontal: 16,
    paddingVertical: 24,
    paddingBottom: 40,
  },
  skipButton: {
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  skipButtonText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
});

export default FrameDecorationScreen;
