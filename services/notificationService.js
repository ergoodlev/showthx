/**
 * Notification Service
 * Handles push notifications for COPPA-compliant parent alerts
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const PUSH_TOKEN_KEY = 'expoPushToken';
const EXPO_PROJECT_ID = '61a97263-4c4a-4ffb-8088-bd65957d2e06';

// Track if we've already attempted registration this session (prevents repeated errors)
let registrationAttempted = false;

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Check if running in Expo Go (where push notifications don't work)
 */
function isExpoGo() {
  return Constants.appOwnership === 'expo';
}

/**
 * Register for push notifications
 * Must be called from a device (not simulator for iOS)
 * Note: Push notifications require a development build, not Expo Go
 * @returns {Promise<string|null>} Expo push token or null
 */
export async function registerForPushNotifications() {
  // Only attempt registration once per app session
  if (registrationAttempted) {
    return await getStoredPushToken();
  }
  registrationAttempted = true;

  let token = null;

  try {
    // Check if running in Expo Go (push notifications don't work there)
    if (isExpoGo()) {
      console.log('📱 Push notifications are not available in Expo Go. Use a development build for full functionality.');
      return null;
    }

    // Check if device (not simulator)
    if (!Device.isDevice) {
      console.log('📱 Push notifications require a physical device');
      return null;
    }

    // Check existing permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Request permission if not granted
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('❌ Push notification permission denied');
      return null;
    }

    // Get Expo push token using the actual project ID
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: EXPO_PROJECT_ID,
    });
    token = tokenData.data;

    // Store token locally
    await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);
    console.log('✅ Push token:', token);

    // Android-specific channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#06b6d4',
      });

      // Video review channel
      await Notifications.setNotificationChannelAsync('video-review', {
        name: 'Video Reviews',
        description: 'Notifications when your child submits a video for review',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF6B6B',
      });
    }

    return token;
  } catch (error) {
    // Don't spam console with repeated errors
    console.log('📱 Push notifications unavailable:', error.message?.substring(0, 50) || 'Unknown error');
    return null;
  }
}

/**
 * Get stored push token
 */
export async function getStoredPushToken() {
  try {
    return await AsyncStorage.getItem(PUSH_TOKEN_KEY);
  } catch {
    return null;
  }
}

/**
 * Send local notification (immediate, doesn't require server)
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {object} data - Optional data payload
 */
export async function sendLocalNotification(title, body, data = {}) {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: 'default',
      },
      trigger: null, // Immediate
    });
    console.log('📬 Local notification sent:', title);
    return { success: true };
  } catch (error) {
    console.error('❌ Error sending local notification:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send notification when child submits video for review
 * This is a LOCAL notification - sent to the device that called it
 * For cross-device notifications, you'd need a push server
 * @param {string} childName - Name of the child
 * @param {string} giftName - Name of the gift
 */
export async function notifyParentOfPendingVideo(childName, giftName) {
  return await sendLocalNotification(
    `${childName} recorded a video!`,
    `New thank-you video for "${giftName}" is ready for your review.`,
    {
      type: 'video_review',
      childName,
      giftName,
    }
  );
}

/**
 * Schedule a reminder notification
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {number} seconds - Delay in seconds
 */
export async function scheduleNotification(title, body, seconds, data = {}) {
  try {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: 'default',
      },
      trigger: {
        seconds,
      },
    });
    console.log('⏰ Scheduled notification:', id);
    return { success: true, id };
  } catch (error) {
    console.error('❌ Error scheduling notification:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllNotifications() {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    return { success: true };
  } catch (error) {
    console.error('❌ Error canceling notifications:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get badge count
 */
export async function getBadgeCount() {
  try {
    return await Notifications.getBadgeCountAsync();
  } catch {
    return 0;
  }
}

/**
 * Set badge count
 * @param {number} count - Badge number to display
 */
export async function setBadgeCount(count) {
  try {
    await Notifications.setBadgeCountAsync(count);
    return { success: true };
  } catch (error) {
    console.error('❌ Error setting badge count:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Add notification listener
 * @param {function} callback - Function to call when notification received
 * @returns {object} Subscription to remove later
 */
export function addNotificationReceivedListener(callback) {
  return Notifications.addNotificationReceivedListener(callback);
}

/**
 * Add notification response listener (when user taps notification)
 * @param {function} callback - Function to call when user taps notification
 * @returns {object} Subscription to remove later
 */
export function addNotificationResponseListener(callback) {
  return Notifications.addNotificationResponseReceivedListener(callback);
}

export default {
  registerForPushNotifications,
  getStoredPushToken,
  sendLocalNotification,
  notifyParentOfPendingVideo,
  scheduleNotification,
  cancelAllNotifications,
  getBadgeCount,
  setBadgeCount,
  addNotificationReceivedListener,
  addNotificationResponseListener,
};
