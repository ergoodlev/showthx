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
      subject: 'Welcome to ShowThx! #REELYTHANKFUL',
      content: [
        {
          type: 'text/html',
          value: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #06b6d4;">Welcome to ShowThx!</h2>
              <p style="color: #06b6d4; font-weight: bold; font-size: 16px;">#REELYTHANKFUL</p>
              <p>Hi ${parentName},</p>
              <p>Thank you for signing up for ShowThx. We're excited to help you create and share special thank you videos with the people who matter most.</p>

              <h3 style="color: #06b6d4;">Getting Started:</h3>
              <ol>
                <li>Create an event (birthday, holiday, etc.)</li>
                <li>Add guests and gifts</li>
                <li>Design a custom frame for your videos</li>
                <li>Share a PIN with your children</li>
                <li>Let them record and decorate thank you videos</li>
                <li>Review and share with guests</li>
              </ol>

              <p style="color: #666; font-size: 14px;">If you have any questions, please don't hesitate to reach out to our support team.</p>

              <p style="margin-top: 30px; color: #999; font-size: 12px;">Best regards,<br/>The ShowThx Team</p>
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
              <h2 style="color: #06b6d4;">New Thank You Video Ready for Review</h2>
              <p>Hi ${parentName},</p>
              <p>${childName} has recorded a new thank you video for <strong>${giftName}</strong>!</p>
              <p style="background: #e0f2fe; padding: 15px; border-radius: 8px; border-left: 4px solid #06b6d4;">Please log into ShowThx to review the video before sharing.</p>
              <p style="margin-top: 30px; color: #999; font-size: 12px;">Best regards,<br/>The ShowThx Team<br/>#REELYTHANKFUL</p>
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
 * Get default email template for video sharing
 */
export const getDefaultVideoEmailTemplate = (giftName, childName = '') => {
  return {
    subject: `A Special Thank You Video for You!`,
    greeting: `You've Received a Thank You Video!`,
    message: childName
      ? `${childName} has created a special video message just for you to say thank you.`
      : `Someone special has created a video message just for you.`,
    giftLabel: `Thank you for: ${giftName}`,
    buttonText: `Watch the Video`,
    signOff: `With gratitude,`,
  };
};

/**
 * Send video to guests via email with customizable content
 */
export const sendVideoToGuests = async (guestEmails, giftName, videoLink, expiresIn = '30 days', customTemplate = null) => {
  try {
    const fromEmail = Constants.expoConfig?.extra?.FROM_EMAIL || 'ericgoodlev@gmail.com';

    // Use custom template or default
    const template = customTemplate || getDefaultVideoEmailTemplate(giftName);

    // SendGrid accepts multiple recipients in one request
    const msg = {
      personalizations: guestEmails.map(email => ({
        to: [{ email }],
      })),
      from: { email: fromEmail },
      subject: template.subject,
      content: [
        {
          type: 'text/html',
          value: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #06b6d4;">${template.greeting}</h2>
              <p style="color: #06b6d4; font-weight: bold;">#REELYTHANKFUL</p>
              <p>${template.message}</p>
              <p style="background: #e0f2fe; padding: 15px; border-radius: 8px; border-left: 4px solid #06b6d4;"><strong>${template.giftLabel}</strong></p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${videoLink}" style="background: #06b6d4; color: white; padding: 14px 36px; text-decoration: none; border-radius: 12px; display: inline-block; font-weight: bold;">${template.buttonText}</a>
              </div>
              <p style="color: #666; font-size: 14px;"><strong>Important:</strong> This link expires in ${expiresIn}.</p>
              <p style="margin-top: 30px; color: #999; font-size: 12px;">${template.signOff}<br/>The ShowThx Team</p>
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
  getDefaultVideoEmailTemplate,
};
