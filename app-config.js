/**
 * ShowThx App Configuration
 * Specifies which edition of the app this is
 *
 * Current Edition: KIDS
 *
 * To switch editions:
 * 1. Change APP_EDITION value below
 * 2. Restart the app
 * 3. Changes will cascade through entire app via EditionContext
 *
 * Supported Editions:
 * - 'kids' (ShowThx Kids) - with parental features, age-appropriate UI
 * - 'wedding' (ShowThx Wedding) - adult version, no parental features
 * - 'pro' (ShowThx Pro) - professional version
 */

export const APP_EDITION = 'kids'; // Current edition

/**
 * App Metadata
 */
export const APP_METADATA = {
  name: 'ShowThx',
  version: '2.0.0',
  buildNumber: 1,
  supportEmail: 'support@showthx.app',
  privacyPolicyUrl: 'https://showthx.app/privacy',
  termsOfServiceUrl: 'https://showthx.app/terms',
  coppa: {
    compliance: true, // COPPA compliant
    minAge: 5,
    maxAge: 17,
  },
};

/**
 * Feature Flags
 * Override per-edition defaults
 */
export const FEATURE_FLAGS = {
  enableBeta: false,
  enableAnalytics: true,
  enableCrashReporting: true,
  enablePushNotifications: false, // Kids edition - no push
  enableSocialSharing: false, // Kids edition - limited social
  enableAds: false, // Kids edition - no ads
};

/**
 * API Configuration
 */
export const API_CONFIG = {
  supabaseUrl: process.env.SUPABASE_URL || 'https://your-project.supabase.co',
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '',
  sendgridApiKey: process.env.SENDGRID_API_KEY || '',
  youtubeAudioLibraryApiKey: process.env.YOUTUBE_API_KEY || '',
};

/**
 * Video Configuration
 */
export const VIDEO_CONFIG = {
  maxDuration: 60, // seconds (per edition override)
  maxFileSize: 500 * 1024 * 1024, // 500MB
  supportedFormats: ['mp4', 'mov', 'webm'],
  aspectRatio: 9 / 16, // Vertical (TikTok/Stories format)
  quality: {
    recording: '720p',
    merge: '1080p',
  },
};

/**
 * Parent/Kid Configuration (Kids Edition Only)
 */
export const KIDS_CONFIG = {
  childPinLength: { min: 4, max: 6 },
  parentPinLength: { min: 4, max: 6 },
  maxLoginAttempts: 5,
  lockoutDurationMinutes: 15,
  sessionTimeoutMinutes: 30,
  coppaAgeVerification: true,
  requireParentalConsent: true,
  requireDataSharing: false,
};

/**
 * Content Moderation
 */
export const MODERATION_CONFIG = {
  enabled: true,
  autoBlockProfanity: true,
  requireApprovalForSending: true, // Parents must approve
  dataRetention: {
    draftVideos: 7, // days
    approvedVideos: 90, // days
    sentVideos: 365, // days (1 year)
  },
};

/**
 * Music Library Configuration
 */
export const MUSIC_CONFIG = {
  source: 'youtube', // YouTube Audio Library
  kidFriendlyOnly: true,
  maxMusicDuration: 300, // seconds
  defaultMood: 'happy',
  availableMoods: ['happy', 'calm', 'energetic', 'uplifting', 'celebratory'],
};

/**
 * Email Configuration
 */
export const EMAIL_CONFIG = {
  fromEmail: 'hello@showthx.app',
  fromName: 'ShowThx',
  videoLinkExpiration: 24, // hours
  allowGuestDownload: false, // Kids edition - disable download
  allowGuestSharing: false, // Kids edition - disable sharing
};

/**
 * Debug Configuration
 */
export const DEBUG_CONFIG = {
  enableLogging: process.env.NODE_ENV === 'development',
  enableDevMenu: process.env.NODE_ENV === 'development',
  mockAuthForDevelopment: false,
  skipParentalConsent: false,
};

export default {
  APP_EDITION,
  APP_METADATA,
  FEATURE_FLAGS,
  API_CONFIG,
  VIDEO_CONFIG,
  KIDS_CONFIG,
  MODERATION_CONFIG,
  MUSIC_CONFIG,
  EMAIL_CONFIG,
  DEBUG_CONFIG,
};
