/**
 * MusicSelectionScreen
 * Select background music for recorded thank you video
 * Uses royalty-free Mixkit tracks
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useEdition } from '../context/EditionContext';
import { AppBar } from '../components/AppBar';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ThankCastButton } from '../components/ThankCastButton';
import {
  getMusicLibrary,
  getMusicByMood,
  playMusicPreview,
  stopMusicPreview,
  formatDuration,
  MUSIC_MOODS,
} from '../services/musicService';

export const MusicSelectionScreen = ({ navigation, route }) => {
  const { edition, theme } = useEdition();
  const isKidsEdition = edition === 'kids';
  const videoUri = route?.params?.videoUri;
  const giftId = route?.params?.giftId;
  const giftName = route?.params?.giftName;

  const [selectedMood, setSelectedMood] = useState('All');
  const [selectedMusic, setSelectedMusic] = useState(null);
  const [loading, setLoading] = useState(false);
  const [previewPlaying, setPreviewPlaying] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(null);
  const [musicLibrary, setMusicLibrary] = useState([]);
  const [filteredMusics, setFilteredMusics] = useState([]);

  // Load music library on mount
  useEffect(() => {
    const library = getMusicLibrary();
    setMusicLibrary(library);
    setFilteredMusics(library);
  }, []);

  // Filter music when mood changes
  useEffect(() => {
    const filtered = getMusicByMood(selectedMood);
    setFilteredMusics(filtered);
  }, [selectedMood]);

  // Stop music when leaving the screen
  useFocusEffect(
    useCallback(() => {
      return () => {
        // Cleanup: stop music when screen loses focus
        stopMusicPreview();
        setPreviewPlaying(null);
      };
    }, [])
  );

  const handlePlayPreview = async (music) => {
    try {
      // If same track is playing, stop it
      if (previewPlaying === music.id) {
        await stopMusicPreview();
        setPreviewPlaying(null);
        return;
      }

      // Stop current preview if any
      if (previewPlaying) {
        await stopMusicPreview();
        setPreviewPlaying(null);
      }

      // Start loading indicator
      setPreviewLoading(music.id);

      // Play the new track
      const result = await playMusicPreview(music);

      setPreviewLoading(null);

      if (result.success) {
        setPreviewPlaying(music.id);
      } else {
        Alert.alert(
          'Playback Error',
          'Could not play this track. Please try another one.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Preview error:', error);
      setPreviewLoading(null);
      setPreviewPlaying(null);
    }
  };

  const handleSelectMusic = (music) => {
    setSelectedMusic(music);
  };

  const handleNoMusic = async () => {
    // Stop any playing preview
    if (previewPlaying) {
      await stopMusicPreview();
      setPreviewPlaying(null);
    }
    setSelectedMusic(null);
  };

  const handleProceed = async () => {
    // Stop any playing preview before navigating
    if (previewPlaying) {
      await stopMusicPreview();
      setPreviewPlaying(null);
    }

    navigation?.navigate('VideoCustomization', {
      videoUri,
      giftId,
      giftName,
      musicId: selectedMusic?.id,
      musicTitle: selectedMusic?.title,
      musicUrl: selectedMusic?.url,
    });
  };

  const renderMusicCard = ({ item }) => {
    const isSelected = selectedMusic?.id === item.id;
    const isPlaying = previewPlaying === item.id;
    const isLoadingPreview = previewLoading === item.id;

    return (
      <TouchableOpacity
        onPress={() => handleSelectMusic(item)}
        style={{
          backgroundColor: isSelected ? theme.brandColors.coral : theme.neutralColors.white,
          borderColor: isSelected ? theme.brandColors.coral : theme.neutralColors.lightGray,
          borderWidth: 2,
          borderRadius: 12,
          padding: theme.spacing.md,
          marginBottom: theme.spacing.sm,
          marginHorizontal: theme.spacing.md,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: isKidsEdition ? 16 : 14,
              fontFamily: isKidsEdition ? 'Nunito_Bold' : 'Montserrat_SemiBold',
              color: isSelected ? '#FFFFFF' : theme.neutralColors.dark,
              marginBottom: theme.spacing.xs,
            }}
          >
            {item.title}
          </Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View
                style={{
                  backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : 'rgba(0,166,153,0.1)',
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: 10,
                }}
              >
                <Text
                  style={{
                    fontSize: isKidsEdition ? 11 : 10,
                    fontFamily: isKidsEdition ? 'Nunito_SemiBold' : 'Montserrat_SemiBold',
                    color: isSelected ? 'rgba(255,255,255,0.9)' : theme.brandColors.teal,
                  }}
                >
                  {item.mood}
                </Text>
              </View>
              <Text
                style={{
                  fontSize: isKidsEdition ? 12 : 11,
                  fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
                  color: isSelected ? 'rgba(255,255,255,0.8)' : theme.neutralColors.mediumGray,
                }}
              >
                {formatDuration(item.duration)}
              </Text>
            </View>
          </View>
        </View>

        {/* Play/Pause button */}
        <TouchableOpacity
          onPress={() => handlePlayPreview(item)}
          style={{
            marginLeft: theme.spacing.md,
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: isPlaying
              ? theme.brandColors.teal
              : isSelected
              ? 'rgba(255,255,255,0.3)'
              : theme.brandColors.coral,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          {isLoadingPreview ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons
              name={isPlaying ? 'pause' : 'play'}
              size={24}
              color="#FFFFFF"
            />
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.neutralColors.white }}>
      <AppBar
        title="Choose Music"
        onBackPress={() => navigation?.goBack()}
        showBack={true}
      />

      <ScrollView style={{ flex: 1 }}>
        {/* Mixkit Info Banner */}
        <View
          style={{
            backgroundColor: 'rgba(78, 205, 196, 0.15)',
            borderRadius: 12,
            padding: theme.spacing.md,
            marginHorizontal: theme.spacing.md,
            marginTop: theme.spacing.md,
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing.sm,
          }}
        >
          <Ionicons name="musical-notes" size={24} color={theme.brandColors.teal} />
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: isKidsEdition ? 14 : 12,
                fontFamily: isKidsEdition ? 'Nunito_Bold' : 'Montserrat_SemiBold',
                color: theme.brandColors.teal,
              }}
            >
              Royalty-Free Music
            </Text>
            <Text
              style={{
                fontSize: isKidsEdition ? 12 : 11,
                fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
                color: theme.neutralColors.mediumGray,
                marginTop: 2,
              }}
            >
              Tap play to preview any track, then select it for your video.
            </Text>
          </View>
        </View>

        {/* Mood Filter */}
        <View style={{ marginTop: theme.spacing.lg, marginBottom: theme.spacing.lg }}>
          <Text
            style={{
              fontSize: isKidsEdition ? 14 : 12,
              fontFamily: isKidsEdition ? 'Nunito_SemiBold' : 'Montserrat_SemiBold',
              color: theme.neutralColors.dark,
              marginBottom: theme.spacing.md,
              marginLeft: theme.spacing.md,
            }}
          >
            Filter by Mood
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', paddingHorizontal: theme.spacing.md, gap: theme.spacing.sm }}>
              {MUSIC_MOODS.map(mood => (
                <TouchableOpacity
                  key={mood}
                  onPress={() => setSelectedMood(mood)}
                  style={{
                    paddingHorizontal: theme.spacing.md,
                    paddingVertical: theme.spacing.sm,
                    borderRadius: 20,
                    backgroundColor: selectedMood === mood ? theme.brandColors.coral : theme.neutralColors.lightGray,
                  }}
                >
                  <Text
                    style={{
                      fontSize: isKidsEdition ? 13 : 12,
                      fontFamily: isKidsEdition ? 'Nunito_SemiBold' : 'Montserrat_SemiBold',
                      color: selectedMood === mood ? '#FFFFFF' : theme.neutralColors.mediumGray,
                    }}
                  >
                    {mood}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* No Music Option */}
        <TouchableOpacity
          onPress={handleNoMusic}
          style={{
            backgroundColor: selectedMusic === null ? theme.brandColors.coral : theme.neutralColors.white,
            borderColor: selectedMusic === null ? theme.brandColors.coral : theme.neutralColors.lightGray,
            borderWidth: 2,
            borderRadius: 12,
            padding: theme.spacing.md,
            marginHorizontal: theme.spacing.md,
            marginBottom: theme.spacing.lg,
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            gap: theme.spacing.sm,
          }}
        >
          <Ionicons
            name="volume-mute"
            size={20}
            color={selectedMusic === null ? '#FFFFFF' : theme.neutralColors.mediumGray}
          />
          <Text
            style={{
              fontSize: isKidsEdition ? 16 : 14,
              fontFamily: isKidsEdition ? 'Nunito_Bold' : 'Montserrat_SemiBold',
              color: selectedMusic === null ? '#FFFFFF' : theme.neutralColors.dark,
            }}
          >
            No Music
          </Text>
        </TouchableOpacity>

        {/* Track Count */}
        <Text
          style={{
            fontSize: isKidsEdition ? 12 : 11,
            fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
            color: theme.neutralColors.mediumGray,
            marginLeft: theme.spacing.md,
            marginBottom: theme.spacing.sm,
          }}
        >
          {filteredMusics.length} track{filteredMusics.length !== 1 ? 's' : ''} available
        </Text>

        {/* Music List */}
        <FlatList
          data={filteredMusics}
          renderItem={renderMusicCard}
          keyExtractor={item => item.id}
          scrollEnabled={false}
          contentContainerStyle={{ paddingBottom: theme.spacing.lg }}
        />
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
        {selectedMusic && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: 'rgba(255, 107, 107, 0.1)',
              padding: theme.spacing.sm,
              borderRadius: 8,
              marginBottom: theme.spacing.md,
            }}
          >
            <Ionicons name="checkmark-circle" size={20} color={theme.brandColors.coral} />
            <Text
              style={{
                fontSize: 12,
                color: theme.brandColors.coral,
                marginLeft: 6,
                fontWeight: '600',
              }}
            >
              Selected: {selectedMusic.title}
            </Text>
          </View>
        )}
        <ThankCastButton
          title="Next: Customize"
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

      <LoadingSpinner visible={loading} message="Loading music library..." fullScreen />
    </SafeAreaView>
  );
};

export default MusicSelectionScreen;
