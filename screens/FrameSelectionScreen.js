/**
 * FrameSelectionScreen
 * Kids select animated Lottie frame for their thank you video
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  StyleSheet,
  Dimensions,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import { useEdition } from '../context/EditionContext';
import { AppBar } from '../components/AppBar';
import { ThankCastButton } from '../components/ThankCastButton';
import { StaticFrameOverlay } from '../components/StaticFrameOverlay';
import {
  FRAME_LIBRARY,
  FRAME_CATEGORIES,
  getFramesByCategory,
  isFrameAvailable,
} from '../services/frameService';

const { width: screenWidth } = Dimensions.get('window');
const CARD_WIDTH = (screenWidth - 48) / 2; // 2 columns with padding

export const FrameSelectionScreen = ({ navigation, route }) => {
  const { edition, theme } = useEdition();
  const isKidsEdition = edition === 'kids';
  const { videoUri, giftId, giftName } = route.params;

  const [selectedFrame, setSelectedFrame] = useState('none');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [frames, setFrames] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load available frames on mount
  useEffect(() => {
    loadFrames();
  }, [selectedCategory]);

  const loadFrames = () => {
    setLoading(true);

    // Get frames for category
    let categoryFrames = getFramesByCategory(selectedCategory);

    // Filter to only available frames (with Lottie files present)
    const availableFrames = categoryFrames.filter(frame => {
      if (frame.id === 'none') return true;
      return isFrameAvailable(frame.id);
    });

    // Show warning if some frames are missing
    const missingCount = categoryFrames.length - availableFrames.length;
    if (missingCount > 0 && selectedCategory === 'all') {
      console.warn(`⚠️ ${missingCount} Lottie frame files are missing. See LOTTIE_DOWNLOAD_INSTRUCTIONS.md`);
    }

    setFrames(availableFrames);
    setLoading(false);
  };

  const handleCategoryChange = (categoryId) => {
    setSelectedCategory(categoryId);
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
    const isNoFrame = item.id === 'none';
    const isStatic = item.frameType === 'static';
    const isLottie = item.frameType === 'lottie';

    return (
      <TouchableOpacity
        onPress={() => setSelectedFrame(item.id)}
        style={[
          styles.frameCard,
          {
            width: CARD_WIDTH,
            borderWidth: isSelected ? 3 : 1,
            borderColor: isSelected ? theme.brandColors.coral : theme.neutralColors.lightGray,
            backgroundColor: theme.neutralColors.white,
          },
        ]}
      >
        {/* Frame Preview */}
        <View style={styles.framePreview}>
          {isNoFrame ? (
            // No frame option
            <View style={styles.noFrameContainer}>
              <Ionicons name="close-circle-outline" size={48} color={theme.neutralColors.mediumGray} />
              <Text style={[styles.noFrameText, { color: theme.neutralColors.mediumGray }]}>
                No Frame
              </Text>
            </View>
          ) : isStatic ? (
            // Static frame preview
            <View style={styles.staticPreviewContainer}>
              <View style={styles.mockVideo} />
              <StaticFrameOverlay frameId={item.staticFrameId} />
            </View>
          ) : isLottie ? (
            // Lottie animation preview
            <LottieView
              source={item.lottieSource()}
              autoPlay
              loop
              style={styles.lottiePreview}
              resizeMode="cover"
            />
          ) : null}

          {/* Selection Indicator */}
          {isSelected && (
            <View style={[styles.selectedBadge, { backgroundColor: theme.brandColors.coral }]}>
              <Ionicons name="checkmark-circle" size={28} color="#FFFFFF" />
            </View>
          )}

          {/* Frame Type Badge */}
          {!isNoFrame && (
            <View
              style={[
                styles.typeBadge,
                { backgroundColor: isStatic ? '#10B981' : '#8B5CF6' },
              ]}
            >
              <Text style={styles.typeBadgeText}>
                {isStatic ? 'READY' : 'ANIMATED'}
              </Text>
            </View>
          )}
        </View>

        {/* Frame Info */}
        <View style={styles.frameInfo}>
          <Text
            style={[
              styles.frameName,
              {
                fontSize: isKidsEdition ? 14 : 13,
                fontFamily: isKidsEdition ? 'Nunito_Bold' : 'Montserrat_SemiBold',
                color: theme.neutralColors.dark,
              },
            ]}
            numberOfLines={1}
          >
            {item.name}
          </Text>
          {item.description && (
            <Text
              style={[
                styles.frameDescription,
                {
                  fontSize: isKidsEdition ? 11 : 10,
                  fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
                  color: theme.neutralColors.mediumGray,
                },
              ]}
              numberOfLines={2}
            >
              {item.description}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderCategoryButton = ({ item }) => {
    const isSelected = selectedCategory === item.id;

    return (
      <TouchableOpacity
        onPress={() => handleCategoryChange(item.id)}
        style={[
          styles.categoryButton,
          {
            backgroundColor: isSelected ? theme.brandColors.coral : theme.neutralColors.lightGray,
          },
        ]}
      >
        <Ionicons
          name={item.icon}
          size={16}
          color={isSelected ? '#FFFFFF' : theme.neutralColors.mediumGray}
        />
        <Text
          style={[
            styles.categoryLabel,
            {
              fontSize: isKidsEdition ? 13 : 12,
              fontFamily: isKidsEdition ? 'Nunito_SemiBold' : 'Montserrat_SemiBold',
              color: isSelected ? '#FFFFFF' : theme.neutralColors.mediumGray,
            },
          ]}
        >
          {item.label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.neutralColors.white }]}>
      <AppBar
        title="Choose Frame"
        onBackPress={() => navigation?.goBack()}
        showBack={true}
      />

      {/* Info Banner */}
      <View
        style={[
          styles.infoBanner,
          { backgroundColor: 'rgba(139, 92, 246, 0.1)' },
        ]}
      >
        <Ionicons name="sparkles" size={20} color="#8B5CF6" />
        <Text
          style={[
            styles.infoBannerText,
            {
              fontSize: isKidsEdition ? 13 : 12,
              fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
              color: theme.neutralColors.dark,
            },
          ]}
        >
          Pick a fun animated frame for your video!
        </Text>
      </View>

      {/* Category Filter */}
      <View style={styles.categoryContainer}>
        <FlatList
          horizontal
          data={FRAME_CATEGORIES}
          renderItem={renderCategoryButton}
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryList}
        />
      </View>

      {/* Frame Grid */}
      <FlatList
        data={frames}
        renderItem={renderFrameCard}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.frameRow}
        contentContainerStyle={styles.frameGrid}
        showsVerticalScrollIndicator={false}
      />

      {/* Action Button */}
      <View
        style={[
          styles.actionContainer,
          {
            borderTopColor: theme.neutralColors.lightGray,
            backgroundColor: theme.neutralColors.white,
          },
        ]}
      >
        {selectedFrame !== 'none' && (
          <View style={styles.selectionIndicator}>
            <Ionicons name="checkmark-circle" size={20} color={theme.brandColors.coral} />
            <Text
              style={[
                styles.selectionText,
                {
                  fontSize: 12,
                  color: theme.brandColors.coral,
                  fontFamily: isKidsEdition ? 'Nunito_SemiBold' : 'Montserrat_SemiBold',
                },
              ]}
            >
              Frame Selected: {frames.find(f => f.id === selectedFrame)?.name}
            </Text>
          </View>
        )}
        <ThankCastButton
          title="Next: Add Music"
          onPress={handleProceed}
          disabled={loading}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  infoBannerText: {
    flex: 1,
  },
  categoryContainer: {
    paddingVertical: 12,
  },
  categoryList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  categoryLabel: {
    fontWeight: '600',
  },
  frameGrid: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  frameRow: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  frameCard: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  framePreview: {
    width: '100%',
    aspectRatio: 9 / 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  staticPreviewContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  mockVideo: {
    position: 'absolute',
    top: '25%',
    left: '25%',
    width: '50%',
    height: '50%',
    backgroundColor: '#CBD5E1',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lottiePreview: {
    width: '100%',
    height: '100%',
  },
  noFrameContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  noFrameText: {
    fontSize: 12,
    fontWeight: '600',
  },
  selectedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  typeBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  typeBadgeText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  frameInfo: {
    padding: 10,
    gap: 2,
  },
  frameName: {
    fontWeight: '600',
  },
  frameDescription: {
    lineHeight: 14,
  },
  actionContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  selectionIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderRadius: 8,
    marginBottom: 12,
  },
  selectionText: {
    flex: 1,
    fontWeight: '600',
  },
});

export default FrameSelectionScreen;
