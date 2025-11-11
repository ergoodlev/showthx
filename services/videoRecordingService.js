/**
 * Video Recording Service
 * Manages video recording with pause/resume, duration tracking, etc.
 */

/**
 * Recording state manager
 * Tracks pause/resume and duration
 */
export class RecordingSession {
  constructor() {
    this.isRecording = false;
    this.isPaused = false;
    this.segments = []; // Array of recorded segments
    this.totalDuration = 0;
    this.startTime = null;
    this.pauseTime = null;
  }

  start() {
    this.isRecording = true;
    this.isPaused = false;
    this.startTime = Date.now();
  }

  pause() {
    if (!this.isRecording || this.isPaused) return;
    this.isPaused = true;
    this.pauseTime = Date.now();
  }

  resume() {
    if (!this.isRecording || !this.isPaused) return;
    const pausedDuration = Date.now() - this.pauseTime;
    this.totalDuration += pausedDuration;
    this.isPaused = false;
    this.pauseTime = null;
  }

  stop() {
    if (!this.isRecording) return;
    const endTime = Date.now();
    const sessionDuration = endTime - this.startTime - this.totalDuration;
    this.segments.push({
      startTime: this.startTime,
      endTime: endTime,
      duration: sessionDuration,
    });
    this.isRecording = false;
    this.isPaused = false;
    return sessionDuration;
  }

  getTotalDuration() {
    if (this.isRecording && !this.isPaused) {
      return Math.floor((Date.now() - this.startTime - this.totalDuration) / 1000);
    }
    return 0;
  }
}

/**
 * Format duration in MM:SS format
 * @param {number} seconds - Total seconds
 * @returns {string} - Formatted time
 */
export function formatDuration(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Check video file size
 * @param {string} videoUri - Video file URI
 * @returns {Promise<number>} - File size in bytes
 */
export async function getVideoFileSize(videoUri) {
  try {
    const FileSystem = require('expo-file-system/legacy');
    const fileInfo = await FileSystem.getInfoAsync(videoUri);
    return fileInfo.size || 0;
  } catch (error) {
    console.error('[RECORDING] Failed to get file size:', error);
    return 0;
  }
}

/**
 * Estimate remaining recording time based on free space
 * Camera quality: ~3-5 MB per minute depending on resolution
 * @returns {Promise<number>} - Estimated minutes remaining
 */
export async function estimateRecordingTimeRemaining() {
  try {
    const FileSystem = require('expo-file-system/legacy');
    const documentDir = FileSystem.documentDirectory;
    const dirInfo = await FileSystem.getInfoAsync(documentDir);

    // Rough estimate: 4MB per minute
    const bytesPerMinute = 4 * 1024 * 1024;
    const estimatedMinutes = Math.floor(dirInfo.size / bytesPerMinute);

    return Math.max(0, estimatedMinutes);
  } catch (error) {
    console.error('[RECORDING] Failed to estimate time:', error);
    return 0;
  }
}

/**
 * Validate video before upload
 * @param {string} videoUri - Video file URI
 * @param {number} minDurationSeconds - Minimum required duration
 * @returns {Promise<object>} - Validation result
 */
export async function validateVideo(videoUri, minDurationSeconds = 3) {
  try {
    const FileSystem = require('expo-file-system/legacy');
    const fileInfo = await FileSystem.getInfoAsync(videoUri);

    if (!fileInfo.exists) {
      return {
        valid: false,
        error: 'Video file not found',
      };
    }

    if (fileInfo.size === 0) {
      return {
        valid: false,
        error: 'Video file is empty',
      };
    }

    if (fileInfo.size > 500 * 1024 * 1024) {
      // 500MB max
      return {
        valid: false,
        error: 'Video is too large (max 500MB)',
      };
    }

    return {
      valid: true,
      size: fileInfo.size,
      sizeFormatted: formatBytes(fileInfo.size),
    };
  } catch (error) {
    console.error('[RECORDING] Validation failed:', error);
    return {
      valid: false,
      error: error.message,
    };
  }
}

/**
 * Format bytes to human readable format
 * @param {number} bytes - Number of bytes
 * @returns {string} - Formatted size
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Calculate video quality based on duration and file size
 * Higher quality = larger file size per minute
 * @param {number} bytes - File size in bytes
 * @param {number} durationSeconds - Video duration
 * @returns {string} - Quality assessment
 */
export function assessVideoQuality(bytes, durationSeconds) {
  const minutes = durationSeconds / 60;
  const bytesPerMinute = bytes / minutes;
  const mbPerMinute = bytesPerMinute / (1024 * 1024);

  if (mbPerMinute < 2) return '480p (low)';
  if (mbPerMinute < 4) return '720p (good)';
  if (mbPerMinute < 8) return '1080p (excellent)';
  return '4K (premium)';
}
