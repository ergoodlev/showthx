/**
 * Email Service
 * Handles all email communications via SendGrid REST API
 */

import Constants from 'expo-constants';

const SENDGRID_API_URL = 'https://api.sendgrid.com/v3/mail/send';

/**
 * Send email via SendGrid REST API
 */
const sendEmailViaSendGrid = async (msg) => {
  try {
    const apiKey = Constants.expoConfig?.extra?.SENDGRID_API_KEY;

    if (!apiKey) {
      console.warn('SendGrid API key not configured');
      return { success: false, error: 'SendGrid API key not configured' };
    }

    const response = await fetch(SENDGRID_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(msg),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.errors?.[0]?.message || 'SendGrid API error');
    }

    return { success: true };
  } catch (error) {
    console.error('SendGrid error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send welcome email to parent after signup
 */
export const sendParentWelcomeEmail = async (parentEmail, parentName) => {
  try {
    const fromEmail = Constants.expoConfig?.extra?.FROM_EMAIL || 'ericgoodlev@gmail.com';

    const msg = {
      personalizations: [
        {
          to: [{ email: parentEmail }],
        },
      ],
      from: { email: fromEmail },
      subject: 'Welcome to ThankCast!',
      content: [
        {
          type: 'text/html',
          value: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #FF6B6B;">Welcome to ThankCast!</h2>
              <p>Hi ${parentName},</p>
              <p>Thank you for signing up for ThankCast. We're excited to help you create and share special thank you videos with the people who matter most.</p>

              <h3 style="color: #00A699;">Getting Started:</h3>
              <ol>
                <li>Create an event (birthday, holiday, etc.)</li>
                <li>Add guests and gifts</li>
                <li>Share a PIN with your children</li>
                <li>Let them record thank you videos</li>
                <li>Review and share with guests</li>
              </ol>

              <p style="color: #666; font-size: 14px;">If you have any questions, please don't hesitate to reach out to our support team.</p>

              <p style="margin-top: 30px; color: #999; font-size: 12px;">Best regards,<br/>The ThankCast Team</p>
            </div>
          `,
        },
      ],
    };

    const result = await sendEmailViaSendGrid(msg);
    if (result.success) {
      console.log('Welcome email sent to:', parentEmail);
    }
    return result;
  } catch (error) {
    console.error('Error sending welcome email:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send video review notification to parent
 */
export const sendVideoReadyNotification = async (parentEmail, parentName, childName, giftName) => {
  try {
    const fromEmail = Constants.expoConfig?.extra?.FROM_EMAIL || 'ericgoodlev@gmail.com';

    const msg = {
      personalizations: [
        {
          to: [{ email: parentEmail }],
        },
      ],
      from: { email: fromEmail },
      subject: `New Video from ${childName}: "${giftName}"`,
      content: [
        {
          type: 'text/html',
          value: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #FF6B6B;">New Thank You Video Ready for Review</h2>
              <p>Hi ${parentName},</p>
              <p>${childName} has recorded a new thank you video for <strong>${giftName}</strong>!</p>
              <p style="background: #f0f0f0; padding: 15px; border-radius: 8px;">Please log into ThankCast to review the video.</p>
              <p style="margin-top: 30px; color: #999; font-size: 12px;">Best regards,<br/>The ThankCast Team</p>
            </div>
          `,
        },
      ],
    };

    return await sendEmailViaSendGrid(msg);
  } catch (error) {
    console.error('Error sending video notification:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send video to guests via email
 */
export const sendVideoToGuests = async (guestEmails, giftName, videoLink, expiresIn = '30 days') => {
  try {
    const fromEmail = Constants.expoConfig?.extra?.FROM_EMAIL || 'ericgoodlev@gmail.com';

    // SendGrid accepts multiple recipients in one request
    const msg = {
      personalizations: guestEmails.map(email => ({
        to: [{ email }],
      })),
      from: { email: fromEmail },
      subject: `A Special Thank You Video for You!`,
      content: [
        {
          type: 'text/html',
          value: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #FF6B6B;">You've Received a Thank You Video!</h2>
              <p>Someone special has created a video message just for you.</p>
              <p style="background: #fff3cd; padding: 15px; border-radius: 8px;"><strong>Gift:</strong> ${giftName}</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${videoLink}" style="background: #FF6B6B; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; display: inline-block;">Watch the Video</a>
              </div>
              <p style="color: #666; font-size: 14px;"><strong>Important:</strong> This link expires in ${expiresIn}.</p>
              <p style="margin-top: 30px; color: #999; font-size: 12px;">Best regards,<br/>The ThankCast Team</p>
            </div>
          `,
        },
      ],
    };

    const result = await sendEmailViaSendGrid(msg);
    if (result.success) {
      console.log(`Video sent to ${guestEmails.length} guests`);
    }
    return { success: result.success, sent: result.success ? guestEmails.length : 0, error: result.error };
  } catch (error) {
    console.error('Error sending video to guests:', error);
    return { success: false, error: error.message };
  }
};

export default {
  sendParentWelcomeEmail,
  sendVideoReadyNotification,
  sendVideoToGuests,
};
