/**
 * Music Service
 * Provides royalty-free music from Mixkit for thank you videos
 *
 * All tracks are from Mixkit.co - 100% royalty-free for commercial and non-commercial use
 * License: https://mixkit.co/license/
 */

import { Audio } from 'expo-av';

// Curated Mixkit tracks suitable for thank you videos
// These are direct URLs from Mixkit's CDN
const MIXKIT_TRACKS = [
  // Happy & Celebratory
  {
    id: 'mixkit-happy-1',
    title: 'Happy Birthday',
    artist: 'Mixkit',
    mood: 'Happy',
    duration: 32,
    url: 'https://assets.mixkit.co/music/preview/mixkit-happy-birthday-227.mp3',
    category: 'celebration',
  },
  {
    id: 'mixkit-happy-2',
    title: 'Feeling Happy',
    artist: 'Mixkit',
    mood: 'Happy',
    duration: 105,
    url: 'https://assets.mixkit.co/music/preview/mixkit-feeling-happy-5.mp3',
    category: 'upbeat',
  },
  {
    id: 'mixkit-happy-3',
    title: 'A Very Happy Christmas',
    artist: 'Mixkit',
    mood: 'Happy',
    duration: 124,
    url: 'https://assets.mixkit.co/music/preview/mixkit-a-very-happy-christmas-897.mp3',
    category: 'celebration',
  },
  {
    id: 'mixkit-uplifting-1',
    title: 'Life is a Dream',
    artist: 'Mixkit',
    mood: 'Uplifting',
    duration: 163,
    url: 'https://assets.mixkit.co/music/preview/mixkit-life-is-a-dream-837.mp3',
    category: 'inspirational',
  },
  {
    id: 'mixkit-uplifting-2',
    title: 'Raising Me Higher',
    artist: 'Mixkit',
    mood: 'Uplifting',
    duration: 144,
    url: 'https://assets.mixkit.co/music/preview/mixkit-raising-me-higher-34.mp3',
    category: 'inspirational',
  },
  {
    id: 'mixkit-uplifting-3',
    title: 'Sun and His Daughter',
    artist: 'Mixkit',
    mood: 'Uplifting',
    duration: 185,
    url: 'https://assets.mixkit.co/music/preview/mixkit-sun-and-his-daughter-580.mp3',
    category: 'inspirational',
  },
  // Calm & Gentle
  {
    id: 'mixkit-calm-1',
    title: 'Sleepy Cat',
    artist: 'Mixkit',
    mood: 'Calm',
    duration: 104,
    url: 'https://assets.mixkit.co/music/preview/mixkit-sleepy-cat-135.mp3',
    category: 'gentle',
  },
  {
    id: 'mixkit-calm-2',
    title: 'Dreaming Big',
    artist: 'Mixkit',
    mood: 'Calm',
    duration: 122,
    url: 'https://assets.mixkit.co/music/preview/mixkit-dreaming-big-31.mp3',
    category: 'gentle',
  },
  {
    id: 'mixkit-calm-3',
    title: 'Serene View',
    artist: 'Mixkit',
    mood: 'Calm',
    duration: 138,
    url: 'https://assets.mixkit.co/music/preview/mixkit-serene-view-443.mp3',
    category: 'gentle',
  },
  // Fun & Playful (for kids)
  {
    id: 'mixkit-fun-1',
    title: 'Cheerful',
    artist: 'Mixkit',
    mood: 'Fun',
    duration: 108,
    url: 'https://assets.mixkit.co/music/preview/mixkit-cheerful-5.mp3',
    category: 'playful',
  },
  {
    id: 'mixkit-fun-2',
    title: 'Fun Times',
    artist: 'Mixkit',
    mood: 'Fun',
    duration: 92,
    url: 'https://assets.mixkit.co/music/preview/mixkit-fun-times-7.mp3',
    category: 'playful',
  },
  {
    id: 'mixkit-fun-3',
    title: 'Kids Fun',
    artist: 'Mixkit',
    mood: 'Fun',
    duration: 115,
    url: 'https://assets.mixkit.co/music/preview/mixkit-kids-fun-12.mp3',
    category: 'playful',
  },
  // Energetic
  {
    id: 'mixkit-energy-1',
    title: 'Hip Hop 02',
    artist: 'Mixkit',
    mood: 'Energetic',
    duration: 142,
    url: 'https://assets.mixkit.co/music/preview/mixkit-hip-hop-02-738.mp3',
    category: 'energetic',
  },
  {
    id: 'mixkit-energy-2',
    title: 'Tech House Vibes',
    artist: 'Mixkit',
    mood: 'Energetic',
    duration: 133,
    url: 'https://assets.mixkit.co/music/preview/mixkit-tech-house-vibes-130.mp3',
    category: 'energetic',
  },
  // Celebratory
  {
    id: 'mixkit-celebrate-1',
    title: 'Fireworks Celebration',
    artist: 'Mixkit',
    mood: 'Celebratory',
    duration: 67,
    url: 'https://assets.mixkit.co/music/preview/mixkit-fireworks-celebration-695.mp3',
    category: 'celebration',
  },
  {
    id: 'mixkit-celebrate-2',
    title: 'Just Kidding',
    artist: 'Mixkit',
    mood: 'Celebratory',
    duration: 102,
    url: 'https://assets.mixkit.co/music/preview/mixkit-just-kidding-11.mp3',
    category: 'celebration',
  },
];

// Available mood filters
export const MUSIC_MOODS = ['All', 'Happy', 'Calm', 'Energetic', 'Uplifting', 'Fun', 'Celebratory'];

/**
 * Get all available music tracks
 */
export const getMusicLibrary = () => {
  return MIXKIT_TRACKS;
};

/**
 * Get music filtered by mood
 */
export const getMusicByMood = (mood) => {
  if (mood === 'All') {
    return MIXKIT_TRACKS;
  }
  return MIXKIT_TRACKS.filter(track => track.mood === mood);
};

/**
 * Get a specific track by ID
 */
export const getMusicById = (id) => {
  return MIXKIT_TRACKS.find(track => track.id === id);
};

/**
 * Music player singleton for preview playback
 */
let currentSound = null;
let currentPlayingId = null;

/**
 * Play a music preview with robust error handling
 */
export const playMusicPreview = async (track) => {
  try {
    console.log('🎵 [MusicService] Starting playback for:', track.title);

    // Stop any currently playing track
    await stopMusicPreview();
    console.log('🎵 [MusicService] Stopped previous track');

    // Configure audio session for music playback
    console.log('🎵 [MusicService] Configuring audio mode...');
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
        allowsRecordingIOS: false,
      });
      console.log('✅ [MusicService] Audio mode configured successfully');
    } catch (audioModeError) {
      console.warn('⚠️ [MusicService] Audio mode config warning:', audioModeError);
      console.warn('⚠️ [MusicService] Continuing anyway...');
      // Continue anyway - non-fatal
    }

    // Validate track URL
    if (!track?.url) {
      console.error('❌ [MusicService] No track URL provided');
      return { success: false, error: 'Invalid track - no URL' };
    }

    console.log('🎵 [MusicService] Loading from URL:', track.url);
    console.log('🎵 [MusicService] Track details:', JSON.stringify(track, null, 2));

    // Create and play the sound with extended timeout
    const loadPromise = Audio.Sound.createAsync(
      { uri: track.url },
      { shouldPlay: true, volume: 0.8 },
      (status) => {
        // Playback status callback
        if (status.isLoaded) {
          console.log('🎵 [MusicService] Playback status:', {
            isPlaying: status.isPlaying,
            positionMillis: status.positionMillis,
            durationMillis: status.durationMillis,
          });
        }
        if (status.didJustFinish) {
          console.log('🎵 [MusicService] Track finished playing');
          currentPlayingId = null;
        }
        if (status.error) {
          console.error('❌ [MusicService] Playback error:', status.error);
          currentPlayingId = null;
        }
      }
    );

    // Add timeout for slow networks (increased to 30 seconds)
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        console.error('❌ [MusicService] Loading timed out after 30 seconds');
        reject(new Error('Loading timed out - please check your internet connection'));
      }, 30000);
    });

    console.log('🎵 [MusicService] Waiting for sound to load...');
    const result = await Promise.race([loadPromise, timeoutPromise]);

    if (!result || !result.sound) {
      console.error('❌ [MusicService] No sound object returned');
      return { success: false, error: 'Failed to load audio' };
    }

    const { sound } = result;
    currentSound = sound;
    currentPlayingId = track.id;

    console.log('✅ [MusicService] Music started playing:', track.title);
    console.log('✅ [MusicService] Sound object created successfully');

    return { success: true, trackId: track.id };
  } catch (error) {
    console.error('❌ [MusicService] Error playing music preview:', error);
    console.error('❌ [MusicService] Error stack:', error.stack);
    console.error('❌ [MusicService] Error details:', JSON.stringify(error, null, 2));

    // User-friendly error messages
    let errorMessage = 'Could not play this track';
    if (error.message?.includes('timed out')) {
      errorMessage = 'Loading timed out - check your internet connection';
    } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
      errorMessage = 'Network error - please try again';
    } else if (error.message?.includes('format') || error.message?.includes('codec')) {
      errorMessage = 'Audio format not supported';
    } else if (error.message?.includes('404') || error.message?.includes('not found')) {
      errorMessage = 'Track not available - URL may have changed';
    }

    console.error('❌ [MusicService] Returning error:', errorMessage);
    return { success: false, error: errorMessage };
  }
};

/**
 * Stop the currently playing preview
 */
export const stopMusicPreview = async () => {
  try {
    if (currentSound) {
      await currentSound.stopAsync();
      await currentSound.unloadAsync();
      currentSound = null;
      currentPlayingId = null;
    }
    return { success: true };
  } catch (error) {
    console.error('Error stopping music preview:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get the currently playing track ID
 */
export const getCurrentPlayingId = () => {
  return currentPlayingId;
};

/**
 * Pause the current preview
 */
export const pauseMusicPreview = async () => {
  try {
    if (currentSound) {
      await currentSound.pauseAsync();
      return { success: true };
    }
    return { success: false, error: 'No sound playing' };
  } catch (error) {
    console.error('Error pausing music:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Resume the current preview
 */
export const resumeMusicPreview = async () => {
  try {
    if (currentSound) {
      await currentSound.playAsync();
      return { success: true };
    }
    return { success: false, error: 'No sound to resume' };
  } catch (error) {
    console.error('Error resuming music:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Format duration from seconds to mm:ss
 */
export const formatDuration = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
};

export default {
  getMusicLibrary,
  getMusicByMood,
  getMusicById,
  playMusicPreview,
  stopMusicPreview,
  pauseMusicPreview,
  resumeMusicPreview,
  getCurrentPlayingId,
  formatDuration,
  MUSIC_MOODS,
};
