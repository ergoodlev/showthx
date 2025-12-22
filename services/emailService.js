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
      console.error('❌ SendGrid API key not configured');
      console.error('❌ Check .env file for SENDGRID_API_KEY');
      return { success: false, error: 'SendGrid API key not configured. Please add SENDGRID_API_KEY to your .env file.' };
    }

    console.log('📧 Sending email via SendGrid...');
    console.log('📧 Recipients:', msg.personalizations?.map(p => p.to).flat().map(t => t.email));

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
      console.error('❌ SendGrid API error response:', JSON.stringify(error, null, 2));
      console.error('❌ Response status:', response.status);
      console.error('❌ Response status text:', response.statusText);
      throw new Error(error.errors?.[0]?.message || 'SendGrid API error');
    }

    console.log('✅ Email sent successfully via SendGrid');
    return { success: true };
  } catch (error) {
    console.error('❌ SendGrid error:', error);
    console.error('❌ Error type:', typeof error);
    console.error('❌ Error message:', error.message);
    console.error('❌ Error stack:', error.stack);
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
 * Replace mail merge placeholders with actual values
 * Supported placeholders: [name], [guest_name], [child_name], [gift_name], [parent_name]
 */
const replacePlaceholders = (text, data) => {
  if (!text) return text;

  let result = text;

  // Replace all supported placeholders
  result = result.replace(/\[name\]/gi, data.guestName || '');
  result = result.replace(/\[guest_name\]/gi, data.guestName || '');
  result = result.replace(/\[child_name\]/gi, data.childName || '');
  result = result.replace(/\[gift_name\]/gi, data.giftName || '');
  result = result.replace(/\[parent_name\]/gi, data.parentName || '');

  return result;
};

/**
 * Send video to guests via email with customizable content and mail merge support
 * @param {Array} guestsData - Array of guest objects with { email, name }
 * @param {String} giftName - Name of the gift
 * @param {String} videoLink - Link to the video
 * @param {String} expiresIn - How long the link is valid
 * @param {Object} customTemplate - Custom email template { subject, message }
 * @param {String} childName - Name of the child (for mail merge)
 * @param {String} parentName - Name of the parent (for mail merge)
 */
export const sendVideoToGuests = async (guestsData, giftName, videoLink, expiresIn = '30 days', customTemplate = null, childName = '', parentName = '') => {
  try {
    const fromEmail = Constants.expoConfig?.extra?.FROM_EMAIL || 'hello@showthx.com';

    // Build dynamic "from" name: "[child_name] and [parent_name] via ShowThx" or just "ShowThx"
    let fromName = 'ShowThx';
    if (childName && parentName) {
      fromName = `${childName} and ${parentName} via ShowThx`;
    } else if (childName) {
      fromName = `${childName} via ShowThx`;
    } else if (parentName) {
      fromName = `${parentName} via ShowThx`;
    }

    console.log('📧 From name:', fromName);

    // Use custom template or default (simplified to just subject + message)
    const template = customTemplate || {
      subject: `A Thank You Video from ${childName || 'someone special'}!`,
      message: `Hi [name]! ${childName || 'Someone special'} made a thank you video just for you. Click below to watch it!`,
    };

    // SendGrid personalizations - one per recipient for mail merge
    const personalizations = guestsData.map(guest => {
      const mergeData = {
        guestName: guest.name || '',
        childName: childName || '',
        giftName: giftName || '',
        parentName: parentName || '',
      };

      // Replace placeholders in subject and message
      const personalizedSubject = replacePlaceholders(template.subject, mergeData);
      const personalizedMessage = replacePlaceholders(template.message, mergeData);

      return {
        to: [{ email: guest.email }],
        subject: personalizedSubject,
        // Store personalized content for HTML building (NOT sent to SendGrid)
        _content: {
          message: personalizedMessage,
          giftName: giftName,
          videoLink: videoLink,
          expiresIn: expiresIn,
        },
      };
    });

    // Since each personalization has different content, we need to send emails individually
    // or use a single message with custom content per recipient
    const results = [];

    for (const personalization of personalizations) {
      const content = personalization._content;

      // Build the message with dynamic from name
      const msg = {
        personalizations: [{
          to: personalization.to,
        }],
        from: {
          email: fromEmail,
          name: fromName, // e.g., "Emma and John via ShowThx"
        },
        subject: personalization.subject,
        content: [
          {
            type: 'text/html',
            value: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <p style="color: #06b6d4; font-weight: bold; font-size: 12px; margin-bottom: 20px;">#REELYTHANKFUL</p>

                <p style="font-size: 16px; color: #333; line-height: 1.6; margin-bottom: 20px;">${content.message}</p>

                <div style="text-align: center; margin: 30px 0;">
                  <a href="${content.videoLink}" style="background: #06b6d4; color: white; padding: 16px 40px; text-decoration: none; border-radius: 12px; display: inline-block; font-weight: bold; font-size: 16px;">Watch the Video</a>
                </div>

                <p style="color: #666; font-size: 13px; margin-top: 30px;"><strong>Note:</strong> This link expires in ${content.expiresIn}.</p>

                <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />

                <p style="color: #999; font-size: 12px;">Sent with love via <a href="https://showthx.com" style="color: #06b6d4;">ShowThx</a></p>
              </div>
            `,
          },
        ],
      };

      const result = await sendEmailViaSendGrid(msg);
      results.push(result);

      // Small delay between emails to avoid rate limiting
      if (personalizations.length > 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log('📧 Attempting to send video to guests...');
    console.log('📧 Recipients:', guestsData.map(g => `${g.name} <${g.email}>`));
    console.log('📧 Video link:', videoLink);
    console.log('📧 Gift name:', giftName);
    console.log('📧 Child name:', childName || '(not provided)');
    console.log('📧 Parent name:', parentName || '(not provided)');

    // Check if all succeeded
    const allSucceeded = results.every(r => r.success);
    const successCount = results.filter(r => r.success).length;

    if (allSucceeded) {
      console.log(`✅ Video sent to ${successCount} guests with personalization`);
    } else {
      console.error(`⚠️ Sent to ${successCount} of ${guestsData.length} guests. Some failed.`);
    }

    return {
      success: allSucceeded,
      sent: successCount,
      error: allSucceeded ? null : 'Some emails failed to send'
    };
  } catch (error) {
    console.error('❌ Error sending video to guests:', error);
    console.error('❌ Error message:', error.message);
    console.error('❌ Error stack:', error.stack);
    console.error('❌ Full error:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    return { success: false, error: error.message };
  }
};

export default {
  sendParentWelcomeEmail,
  sendVideoReadyNotification,
  sendVideoToGuests,
  getDefaultVideoEmailTemplate,
};
