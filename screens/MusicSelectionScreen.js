/**
 * MusicSelectionScreen
 * Select background music for recorded thank you video
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { useEdition } from '../context/EditionContext';
import { AppBar } from '../components/AppBar';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ThankCastButton } from '../components/ThankCastButton';

// Mock music library - in production, fetch from Supabase
const MUSIC_LIBRARY = [
  { id: '1', title: 'Happy Celebration', artist: 'Studio Tracks', mood: 'Happy', duration: 120, url: 'https://example.com/music/happy1.mp3' },
  { id: '2', title: 'Grateful Feels', artist: 'Uplifting Music', mood: 'Uplifting', duration: 140, url: 'https://example.com/music/uplifting1.mp3' },
  { id: '3', title: 'Warm Moments', artist: 'Emotion Music', mood: 'Calm', duration: 130, url: 'https://example.com/music/calm1.mp3' },
  { id: '4', title: 'Sunshine Joy', artist: 'Happy Tunes', mood: 'Happy', duration: 110, url: 'https://example.com/music/happy2.mp3' },
  { id: '5', title: 'Energetic Vibes', artist: 'Upbeat Music', mood: 'Energetic', duration: 150, url: 'https://example.com/music/energetic1.mp3' },
  { id: '6', title: 'Peaceful Melody', artist: 'Zen Sounds', mood: 'Calm', duration: 135, url: 'https://example.com/music/calm2.mp3' },
  { id: '7', title: 'Celebratory Joy', artist: 'Party Music', mood: 'Celebratory', duration: 125, url: 'https://example.com/music/celebratory1.mp3' },
  { id: '8', title: 'Uplifting Sunrise', artist: 'New Day Music', mood: 'Uplifting', duration: 120, url: 'https://example.com/music/uplifting2.mp3' },
];

const MOODS = ['All', 'Happy', 'Calm', 'Energetic', 'Uplifting', 'Celebratory'];

export const MusicSelectionScreen = ({ navigation, route }) => {
  const { edition, theme } = useEdition();
  const isKidsEdition = edition === 'kids';
  const videoUri = route?.params?.videoUri;
  const giftId = route?.params?.giftId;
  const giftName = route?.params?.giftName;

  const soundRef = useRef(null);
  const [selectedMood, setSelectedMood] = useState('All');
  const [selectedMusic, setSelectedMusic] = useState(null);
  const [loading, setLoading] = useState(false);
  const [previewPlaying, setPreviewPlaying] = useState(null);
  const [filteredMusics, setFilteredMusics] = useState(MUSIC_LIBRARY);

  useEffect(() => {
    // Filter music by mood
    if (selectedMood === 'All') {
      setFilteredMusics(MUSIC_LIBRARY);
    } else {
      setFilteredMusics(MUSIC_LIBRARY.filter(m => m.mood === selectedMood));
    }
  }, [selectedMood]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  const handlePlayPreview = (music) => {
    // Music preview coming soon - show friendly message
    Alert.alert(
      '🎵 Preview Coming Soon',
      `"${music.title}" by ${music.artist}\n\nMusic previews will be available in a future update. For now, select a track and it will be noted for the video.`,
      [{ text: 'Got it!', style: 'default' }]
    );
  };

  const handleSelectMusic = (music) => {
    setSelectedMusic(music);
  };

  const handleNoMusic = () => {
    setSelectedMusic(null);
  };

  const handleProceed = () => {
    navigation?.navigate('VideoCustomization', {
      videoUri,
      giftId,
      giftName,
      musicId: selectedMusic?.id,
      musicTitle: selectedMusic?.title,
    });
  };

  const renderMusicCard = ({ item }) => {
    const isSelected = selectedMusic?.id === item.id;

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
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text
              style={{
                fontSize: isKidsEdition ? 12 : 11,
                fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
                color: isSelected ? 'rgba(255,255,255,0.8)' : theme.neutralColors.mediumGray,
              }}
            >
              {item.artist}
            </Text>
            <Text
              style={{
                fontSize: isKidsEdition ? 12 : 11,
                fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
                color: isSelected ? 'rgba(255,255,255,0.8)' : theme.neutralColors.mediumGray,
              }}
            >
              {item.duration}s
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => handlePlayPreview(item)}
          style={{
            marginLeft: theme.spacing.md,
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: isSelected ? 'rgba(255,255,255,0.3)' : theme.brandColors.coral,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Ionicons
            name={previewPlaying === item.id ? 'pause' : 'play'}
            size={24}
            color={isSelected ? '#FFFFFF' : '#FFFFFF'}
          />
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
        {/* Coming Soon Banner */}
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
              Music Integration Coming Soon!
            </Text>
            <Text
              style={{
                fontSize: isKidsEdition ? 12 : 11,
                fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
                color: theme.neutralColors.mediumGray,
                marginTop: 2,
              }}
            >
              Select your preferred track. Full audio will be added in a future update.
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
              {MOODS.map(mood => (
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
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
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
