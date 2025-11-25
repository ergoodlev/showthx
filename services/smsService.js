/**
 * SMS Service
 * Handles SMS messaging using Expo SMS
 * Opens native SMS composer for sending messages
 */

import * as SMS from 'expo-sms';
import { Alert, Platform } from 'react-native';

/**
 * Check if SMS is available on the device
 */
export const checkSMSAvailable = async () => {
  const isAvailable = await SMS.isAvailableAsync();
  return isAvailable;
};

/**
 * Send thank you video link via SMS
 * Opens native SMS composer - user must tap send
 */
export const sendVideoViaSMS = async (phoneNumbers, giftName, videoLink) => {
  try {
    const isAvailable = await SMS.isAvailableAsync();

    if (!isAvailable) {
      return {
        success: false,
        error: 'SMS is not available on this device'
      };
    }

    const message = `🎁 You've received a thank you video!

Someone special has recorded a video message just for you.

Thank you for: ${giftName}

📺 Watch the video: ${videoLink}

This link expires in 24 hours.

#REELYTHANKFUL - Sent via ShowThx`;

    // Open SMS composer with pre-filled message
    const { result } = await SMS.sendSMSAsync(
      phoneNumbers,
      message
    );

    // On iOS, result can be 'sent', 'cancelled', or 'unknown'
    // On Android, it's always 'unknown' because we can't know if user actually sent
    if (result === 'sent') {
      return { success: true, status: 'sent' };
    } else if (result === 'cancelled') {
      return { success: false, error: 'Message was cancelled' };
    } else {
      // 'unknown' - user probably sent it on Android, or we can't tell
      return { success: true, status: 'pending' };
    }
  } catch (error) {
    console.error('SMS error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send access code to kid via SMS
 */
export const sendAccessCodeViaSMS = async (phoneNumber, childName, accessCode) => {
  try {
    const isAvailable = await SMS.isAvailableAsync();

    if (!isAvailable) {
      return {
        success: false,
        error: 'SMS is not available on this device'
      };
    }

    const message = `Hey ${childName}! 🎁

Your ShowThx access code is: ${accessCode}

Use this code to log in and record your thank you videos!

#REELYTHANKFUL`;

    const { result } = await SMS.sendSMSAsync(
      [phoneNumber],
      message
    );

    return {
      success: result !== 'cancelled',
      status: result
    };
  } catch (error) {
    console.error('SMS error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Prompt user to choose SMS or Email
 * Returns a promise that resolves when user chooses
 */
export const promptSendMethod = () => {
  return new Promise((resolve) => {
    Alert.alert(
      'How would you like to share?',
      'Choose how to send the video link',
      [
        {
          text: 'Email',
          onPress: () => resolve('email'),
        },
        {
          text: 'Text Message (SMS)',
          onPress: () => resolve('sms'),
        },
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => resolve(null),
        },
      ]
    );
  });
};

export default {
  checkSMSAvailable,
  sendVideoViaSMS,
  sendAccessCodeViaSMS,
  promptSendMethod,
};
