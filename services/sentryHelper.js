/**
 * Sentry Helper Service
 * Convenience methods for logging to Sentry
 */

import * as Sentry from '@sentry/react-native';

/**
 * Log a custom error to Sentry
 * @param {Error|string} error - Error object or message
 * @param {object} context - Additional context (tags, extra data, user info)
 */
export const logError = (error, context = {}) => {
  const errorObj = typeof error === 'string' ? new Error(error) : error;

  Sentry.captureException(errorObj, {
    tags: context.tags || {},
    extra: context.extra || {},
    level: context.level || 'error',
  });
};

/**
 * Log a message to Sentry (not an error, just info)
 * @param {string} message - Message to log
 * @param {object} context - Additional context
 */
export const logMessage = (message, context = {}) => {
  Sentry.captureMessage(message, {
    level: context.level || 'info',
    tags: context.tags || {},
    extra: context.extra || {},
  });
};

/**
 * Add a breadcrumb (helpful for tracking user actions leading to errors)
 * @param {string} message - Breadcrumb message
 * @param {string} category - Category (e.g., 'navigation', 'user-action', 'api')
 * @param {object} data - Additional data
 */
export const addBreadcrumb = (message, category = 'custom', data = {}) => {
  Sentry.addBreadcrumb({
    message,
    category,
    data,
    level: 'info',
  });
};

/**
 * Set user context for Sentry (call after login)
 * @param {object} user - User object with id, email, etc.
 */
export const setUser = (user) => {
  if (user) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      // Add other non-PII user fields as needed
    });
  } else {
    // Clear user on logout
    Sentry.setUser(null);
  }
};

/**
 * Set custom tags for this session
 * @param {object} tags - Key-value pairs of tags
 */
export const setTags = (tags) => {
  Object.keys(tags).forEach((key) => {
    Sentry.setTag(key, tags[key]);
  });
};

/**
 * Set custom context data
 * @param {string} contextName - Name of the context
 * @param {object} data - Context data
 */
export const setContext = (contextName, data) => {
  Sentry.setContext(contextName, data);
};

/**
 * Manually capture a handled error (when you catch it but want to track it)
 * @param {Error} error - The caught error
 * @param {object} context - Additional context
 */
export const captureHandledError = (error, context = {}) => {
  Sentry.captureException(error, {
    level: 'warning', // Use 'warning' for handled errors
    tags: {
      ...context.tags,
      handled: 'true',
    },
    extra: context.extra || {},
  });
};

/**
 * Track navigation/screen changes
 * @param {string} screenName - Name of the screen
 * @param {object} params - Route params
 */
export const trackScreenView = (screenName, params = {}) => {
  addBreadcrumb(`Navigated to ${screenName}`, 'navigation', params);
  setTags({ current_screen: screenName });
};

/**
 * Track important events (like video upload, gift creation, etc.)
 * @param {string} eventName - Name of the event
 * @param {object} data - Event data
 */
export const trackEvent = (eventName, data = {}) => {
  addBreadcrumb(eventName, 'user-action', data);
  logMessage(eventName, {
    level: 'info',
    tags: { event_type: 'tracked_event' },
    extra: data,
  });
};

/**
 * Example usage in your code:
 *
 * import { logError, addBreadcrumb, setUser, trackEvent } from './services/sentryHelper';
 *
 * // After user logs in:
 * setUser({ id: user.id, email: user.email });
 *
 * // Track user actions:
 * trackEvent('video_uploaded', { giftId: '123', size: 1024000 });
 *
 * // Add breadcrumbs for debugging:
 * addBreadcrumb('User clicked approve button', 'user-action', { videoId: '456' });
 *
 * // Log errors:
 * try {
 *   await uploadVideo();
 * } catch (error) {
 *   logError(error, {
 *     tags: { feature: 'video-upload' },
 *     extra: { giftId: '123' }
 *   });
 * }
 */

export default {
  logError,
  logMessage,
  addBreadcrumb,
  setUser,
  setTags,
  setContext,
  captureHandledError,
  trackScreenView,
  trackEvent,
};
