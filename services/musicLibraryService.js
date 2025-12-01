/**
 * Music Library Service
 * Integrates with YouTube Audio Library for high-quality, royalty-free music
 * Provides music selection for merged video customization
 * All tracks are kid-friendly and royalty-free
 */

import { supabase } from '../supabaseClient';

/**
 * Get all available music tracks
 * @param {object} options - Filter options
 * @param {string} options.mood - Filter by mood (happy, calm, energetic, etc.)
 * @param {string} options.genre - Filter by genre
 * @param {boolean} options.kidFriendlyOnly - Only return kid-friendly tracks (default: true)
 * @param {number} options.maxDuration - Max duration in seconds (for matching video length)
 * @returns {Promise<object[]>} - Array of music tracks
 */
export async function getAllMusicTracks(options = {}) {
  try {
    const {
      mood = null,
      genre = null,
      kidFriendlyOnly = true,
      maxDuration = null,
      limit = 100,
    } = options;

    let query = supabase.from('music_library').select('*');

    if (kidFriendlyOnly) {
      query = query.eq('is_kid_friendly', true);
    }

    if (mood) {
      query = query.eq('mood', mood);
    }

    if (genre) {
      query = query.eq('genre', genre);
    }

    if (maxDuration) {
      query = query.lte('duration', maxDuration);
    }

    query = query.eq('is_featured', false).limit(limit).order('title');

    const { data, error } = await query;

    if (error) throw error;

    console.log(`[MUSIC LIBRARY] Retrieved ${data.length} tracks`);
    return data;
  } catch (error) {
    console.error('[MUSIC LIBRARY ERROR] Failed to get tracks:', error);
    throw error;
  }
}

/**
 * Get featured music tracks (curated for kids)
 * @param {number} limit - Number of tracks to return
 * @returns {Promise<object[]>} - Array of featured tracks
 */
export async function getFeaturedMusicTracks(limit = 12) {
  try {
    const { data, error } = await supabase
      .from('music_library')
      .select('*')
      .eq('is_featured', true)
      .eq('is_kid_friendly', true)
      .limit(limit)
      .order('title');

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('[MUSIC LIBRARY ERROR] Failed to get featured tracks:', error);
    throw error;
  }
}

/**
 * Get music tracks by mood
 * Moods: happy, calm, energetic, uplifting, celebratory
 * @param {string} mood - Mood filter
 * @returns {Promise<object[]>} - Array of tracks with that mood
 */
export async function getMusicByMood(mood) {
  try {
    const { data, error } = await supabase
      .from('music_library')
      .select('*')
      .eq('mood', mood)
      .eq('is_kid_friendly', true)
      .order('title');

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('[MUSIC LIBRARY ERROR] Failed to get tracks by mood:', error);
    throw error;
  }
}

/**
 * Search music tracks
 * @param {string} query - Search query (title, artist, etc.)
 * @returns {Promise<object[]>} - Array of matching tracks
 */
export async function searchMusicTracks(query) {
  try {
    const { data, error } = await supabase
      .from('music_library')
      .select('*')
      .eq('is_kid_friendly', true)
      .or(`title.ilike.%${query}%,artist.ilike.%${query}%`)
      .limit(20);

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('[MUSIC LIBRARY ERROR] Failed to search tracks:', error);
    throw error;
  }
}

/**
 * Get a specific music track by ID
 * @param {string} trackId - Track UUID
 * @returns {Promise<object>} - Track details
 */
export async function getMusicTrack(trackId) {
  try {
    const { data, error } = await supabase
      .from('music_library')
      .select('*')
      .eq('id', trackId)
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('[MUSIC LIBRARY ERROR] Failed to get track:', error);
    throw error;
  }
}

/**
 * Get recommended music for a specific video duration
 * Finds tracks that fit well with the video length
 * @param {number} videoDurationSeconds - Total merged video duration
 * @param {string} mood - Optional mood preference
 * @returns {Promise<object[]>} - Recommended tracks
 */
export async function getRecommendedMusicForDuration(videoDurationSeconds, mood = null) {
  try {
    // Find tracks that are +/- 20% of video duration for good pacing
    const minDuration = Math.round(videoDurationSeconds * 0.8);
    const maxDuration = Math.round(videoDurationSeconds * 1.2);

    let query = supabase
      .from('music_library')
      .select('*')
      .eq('is_kid_friendly', true)
      .gte('duration', minDuration)
      .lte('duration', maxDuration);

    if (mood) {
      query = query.eq('mood', mood);
    }

    const { data, error } = await query.limit(10).order('title');

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('[MUSIC LIBRARY ERROR] Failed to get recommended music:', error);
    throw error;
  }
}

/**
 * Get moods available in the music library
 * @returns {Promise<string[]>} - Array of available moods
 */
export async function getAvailableMoods() {
  try {
    const { data, error } = await supabase
      .from('music_library')
      .select('mood')
      .eq('is_kid_friendly', true)
      .is('mood', 'not.is.null')
      .then(({ data }) => {
        return {
          data: [...new Set(data.map(d => d.mood))].sort(),
        };
      });

    return data;
  } catch (error) {
    console.error('[MUSIC LIBRARY ERROR] Failed to get moods:', error);
    return [];
  }
}

/**
 * Get genres available in the music library
 * @returns {Promise<string[]>} - Array of available genres
 */
export async function getAvailableGenres() {
  try {
    const { data, error } = await supabase
      .from('music_library')
      .select('genre')
      .eq('is_kid_friendly', true)
      .is('genre', 'not.is.null')
      .then(({ data }) => {
        return {
          data: [...new Set(data.map(d => d.genre))].sort(),
        };
      });

    return data;
  } catch (error) {
    console.error('[MUSIC LIBRARY ERROR] Failed to get genres:', error);
    return [];
  }
}

/**
 * Seed music library with YouTube Audio Library tracks
 * This would be called during app initialization to populate the library
 * YouTube Audio Library API: https://www.youtube.com/audiolibrary
 *
 * For now, returns sample data structure:
 * @returns {object[]} - Sample tracks for seeding
 */
export function getSampleMusicLibraryData() {
  return [
    {
      title: 'Sunny Days',
      artist: 'Kevin MacLeod',
      duration: 142,
      genre: 'Pop',
      mood: 'happy',
      license: 'CC-BY-4.0',
      source: 'youtube',
      is_kid_friendly: true,
      is_featured: true,
    },
    {
      title: 'Ukulele Happy',
      artist: 'Kevin MacLeod',
      duration: 105,
      genre: 'Ukulele',
      mood: 'happy',
      license: 'CC-BY-4.0',
      source: 'youtube',
      is_kid_friendly: true,
      is_featured: true,
    },
    {
      title: 'Carefree',
      artist: 'Kevin MacLeod',
      duration: 240,
      genre: 'Indie',
      mood: 'uplifting',
      license: 'CC-BY-4.0',
      source: 'youtube',
      is_kid_friendly: true,
      is_featured: true,
    },
    {
      title: 'Peaceful Piano',
      artist: 'Benjamin Tissot',
      duration: 180,
      genre: 'Piano',
      mood: 'calm',
      license: 'CC-BY-4.0',
      source: 'youtube',
      is_kid_friendly: true,
      is_featured: false,
    },
    {
      title: 'Celebration Time',
      artist: 'Kevin MacLeod',
      duration: 165,
      genre: 'Pop',
      mood: 'celebratory',
      license: 'CC-BY-4.0',
      source: 'youtube',
      is_kid_friendly: true,
      is_featured: true,
    },
  ];
}

/**
 * Seed the music library into Supabase
 * Run this once during initial setup
 * @returns {Promise<void>}
 */
export async function seedMusicLibrary() {
  try {
    const sampleTracks = getSampleMusicLibraryData();

    // Check if library already seeded
    const { count } = await supabase
      .from('music_library')
      .select('*', { count: 'exact' });

    if (count > 0) {
      console.log('[MUSIC LIBRARY] Library already seeded, skipping');
      return;
    }

    // Insert sample tracks
    const { data, error } = await supabase
      .from('music_library')
      .insert(sampleTracks);

    if (error) throw error;

    console.log('[MUSIC LIBRARY] Successfully seeded with', sampleTracks.length, 'tracks');
  } catch (error) {
    console.error('[MUSIC LIBRARY ERROR] Failed to seed library:', error);
  }
}

/**
 * Format track duration for display
 * @param {number} seconds - Duration in seconds
 * @returns {string} - Formatted duration (MM:SS)
 */
export function formatDuration(seconds) {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Get music track recommendations for kid
 * Returns popular, uplifting tracks that work well in merged videos
 * @param {object} options - Options
 * @param {number} options.videoDuration - Video duration in seconds
 * @param {string} options.mood - Preferred mood
 * @returns {Promise<object[]>} - Recommended tracks
 */
export async function getKidRecommendedMusic(options = {}) {
  try {
    const { videoDuration, mood = 'happy' } = options;

    const recommendations = await getRecommendedMusicForDuration(videoDuration, mood);

    // Return up to 5 recommendations
    return recommendations.slice(0, 5).map(track => ({
      id: track.id,
      title: track.title,
      artist: track.artist,
      duration: track.duration,
      durationFormatted: formatDuration(track.duration),
      mood: track.mood,
      thumbnail: track.thumbnail_url,
      preview_url: track.url, // In production, provide a preview URL
    }));
  } catch (error) {
    console.error('[MUSIC LIBRARY ERROR] Failed to get recommendations:', error);
    return [];
  }
}
