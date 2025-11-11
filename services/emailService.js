/**
 * Email Service - SendGrid Integration
 * Sends video sharing emails with secure token-based access
 */

import { generateShareToken } from './secureShareService';
import { logVideoShared } from './auditLogService';

// SendGrid configuration
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || process.env.EXPO_PUBLIC_SENDGRID_API_KEY;
const FROM_EMAIL = 'noreply@gratitugram.app';
const FROM_NAME = 'GratituGram';

/**
 * Send video share email with secure token
 * @param {object} videoMetadata - Video details
 * @param {string} recipientEmail - Email to send to
 * @param {string} senderName - Parent/sender name
 * @param {string} childName - Child's name
 * @returns {Promise<object>} - Email send result
 */
export async function sendVideoShareEmail(
  videoMetadata,
  recipientEmail,
  senderName,
  childName
) {
  try {
    console.log('[EMAIL] Preparing to send video share email');

    // Validate inputs
    if (!recipientEmail || !recipientEmail.includes('@')) {
      throw new Error('Invalid recipient email');
    }

    // Generate secure token for video access
    const shareToken = await generateShareToken(
      videoMetadata.id,
      videoMetadata.userId,
      {
        recipientEmail,
        expiryHours: 24,
        maxUses: 1, // One-time access
      }
    );

    // Create personalized message
    const emailHtml = generateVideoShareEmailTemplate(
      childName,
      senderName,
      videoMetadata.giftName,
      shareToken.token
    );

    // Send via SendGrid API
    const response = await sendWithSendGrid({
      to: recipientEmail,
      subject: `${childName} said thank you! - GratituGram Video`,
      html: emailHtml,
    });

    // Log the email send
    await logVideoShared(videoMetadata.id, videoMetadata.userId, {
      recipientEmail,
      shareTokenId: shareToken.token,
      method: 'email',
    });

    return {
      success: true,
      recipientEmail,
      shareToken: shareToken.token,
      expiresAt: shareToken.expiresAt,
    };
  } catch (error) {
    console.error('[EMAIL ERROR] Failed to send video share email:', error);
    throw error;
  }
}

/**
 * Send approval reminder email to parent
 * @param {string} parentEmail - Parent email
 * @param {string} childName - Child's name
 * @param {string} guestName - Gift giver name
 * @param {string} giftName - Gift name
 * @returns {Promise<boolean>}
 */
export async function sendApprovalReminderEmail(
  parentEmail,
  childName,
  guestName,
  giftName
) {
  try {
    console.log('[EMAIL] Preparing approval reminder email');

    if (!parentEmail || !parentEmail.includes('@')) {
      throw new Error('Invalid parent email');
    }

    const emailHtml = generateApprovalReminderTemplate(
      childName,
      guestName,
      giftName
    );

    await sendWithSendGrid({
      to: parentEmail,
      subject: `[ACTION NEEDED] ${childName}'s thank you video is ready for approval`,
      html: emailHtml,
    });

    console.log('[EMAIL] Approval reminder sent to:', parentEmail);
    return true;
  } catch (error) {
    console.error('[EMAIL ERROR] Failed to send approval reminder:', error);
    return false;
  }
}

/**
 * Send setup confirmation email
 * @param {string} parentEmail - Parent email
 * @param {object} setupDetails - Setup details
 * @returns {Promise<boolean>}
 */
export async function sendSetupConfirmationEmail(parentEmail, setupDetails) {
  try {
    console.log('[EMAIL] Preparing setup confirmation email');

    const emailHtml = generateSetupConfirmationTemplate(setupDetails);

    await sendWithSendGrid({
      to: parentEmail,
      subject: 'Your GratituGram Account is Ready - Child Safety Configured',
      html: emailHtml,
    });

    console.log('[EMAIL] Setup confirmation sent to:', parentEmail);
    return true;
  } catch (error) {
    console.error('[EMAIL ERROR] Failed to send setup confirmation:', error);
    return false;
  }
}

/**
 * Send thank you video via email using SendGrid
 * (Legacy support for existing implementation)
 * @param {Object} params - Email parameters
 * @returns {Promise<boolean>}
 */
export async function sendThankYouEmail({ toEmail, toName, videoUrl, giftDescription, childName = 'Your friend' }) {
  try {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email: toEmail, name: toName }],
            subject: `Thank You from ${childName}! 🎁`,
          },
        ],
        from: {
          email: FROM_EMAIL,
          name: FROM_NAME,
        },
        content: [
          {
            type: 'text/html',
            value: generateEmailHTML({ toName, videoUrl, giftDescription, childName }),
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('SendGrid error:', errorData);
      throw new Error(`SendGrid error: ${response.status}`);
    }

    console.log(`Email sent successfully to ${toEmail}`);
    return true;
  } catch (error) {
    console.error('Failed to send email:', error);
    throw error;
  }
}

/**
 * Internal: Send email via SendGrid API
 */
async function sendWithSendGrid({ to, subject, html }) {
  if (!SENDGRID_API_KEY) {
    console.warn('[EMAIL] SendGrid API key not configured. Email not sent.');
    return { success: false, message: 'SendGrid not configured' };
  }

  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SENDGRID_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }], subject }],
      from: { email: FROM_EMAIL, name: FROM_NAME },
      content: [{ type: 'text/html', value: html }],
      replyTo: { email: 'support@gratitugram.app' },
    }),
  });

  if (!response.ok) {
    throw new Error(`SendGrid API error: ${response.status}`);
  }

  return { success: true };
}

/**
 * Generate video share email template with secure token
 */
function generateVideoShareEmailTemplate(childName, senderName, giftName, token) {
  const shareUrl = `https://gratitugram.app/share/${token}`;

  return `
    <!DOCTYPE html>
    <html>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background-color: #F8FAFB;">
      <table width="100%" style="background-color: #F8FAFB; padding: 40px 20px;">
        <tr><td align="center">
          <table width="600" style="background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
            <tr style="background: linear-gradient(135deg, #14B8A6 0%, #F97316 100%);">
              <td style="padding: 40px; text-align: center; color: white;">
                <h1 style="margin: 0; font-size: 32px;">🎁 A Special Thank You Video</h1>
              </td>
            </tr>
            <tr><td style="padding: 40px; background: white;">
              <p style="margin: 0 0 20px 0; color: #333; font-size: 16px;">Hi,</p>
              <p style="margin: 0 0 20px 0; color: #333; font-size: 15px; line-height: 1.6;">
                <strong>${childName}</strong> wanted to say thank you for the wonderful gift: <strong>${giftName}</strong>
              </p>
              <p style="margin: 0 0 24px 0; color: #666; font-size: 15px;">
                Here's a special video from ${childName} and ${senderName}:
              </p>
              <table width="100%" style="margin: 30px 0;"><tr><td align="center">
                <a href="${shareUrl}" style="display: inline-block; background: #14B8A6; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
                  Watch the Video ▶
                </a>
              </td></tr></table>
              <p style="margin: 20px 0 0 0; color: #999; font-size: 12px;">
                This link is secure and expires in 24 hours.
              </p>
            </td></tr>
            <tr><td style="padding: 20px 40px; background: #CCFBF1; text-align: center; color: #0d9488; font-size: 12px;">
              Sent securely by GratituGram
            </td></tr>
          </table>
        </td></tr>
      </table>
    </body>
    </html>
  `;
}

/**
 * Generate approval reminder template
 */
function generateApprovalReminderTemplate(childName, guestName, giftName) {
  return `
    <!DOCTYPE html>
    <html>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">
      <table width="100%" style="background-color: #F8FAFB; padding: 40px 20px;">
        <tr><td align="center">
          <table width="600" style="background: white; border-radius: 12px;">
            <tr style="background: #FEF3C7;"><td style="padding: 30px; text-align: center;">
              <h2 style="margin: 0; color: #D97706; font-size: 24px;">📹 Video Ready for Review</h2>
            </td></tr>
            <tr><td style="padding: 40px;">
              <p style="color: #333; font-size: 15px; margin-bottom: 16px;">Hi,</p>
              <p style="color: #333; font-size: 15px; margin-bottom: 12px;">
                <strong>${childName}'s</strong> thank you video for <strong>${giftName}</strong> from <strong>${guestName}</strong> is ready!
              </p>
              <p style="color: #666; font-size: 15px;">Please review and approve before sharing.</p>
            </td></tr>
          </table>
        </td></tr>
      </table>
    </body>
    </html>
  `;
}

/**
 * Generate setup confirmation template
 */
function generateSetupConfirmationTemplate({ encryptionEnabled }) {
  return `
    <!DOCTYPE html>
    <html>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">
      <table width="100%" style="background-color: #F8FAFB; padding: 40px 20px;">
        <tr><td align="center">
          <table width="600" style="background: white; border-radius: 12px;">
            <tr style="background: linear-gradient(135deg, #14B8A6 0%, #F97316 100%);"><td style="padding: 40px; text-align: center; color: white;">
              <h1 style="margin: 0; font-size: 28px;">✓ Account Secure</h1>
            </td></tr>
            <tr><td style="padding: 40px;">
              <p style="color: #333; font-size: 15px; margin-bottom: 20px;">Your GratituGram account is configured with:</p>
              <ul style="color: #666; font-size: 14px; line-height: 1.8; padding-left: 20px;">
                <li>Secure local storage with encryption</li>
                <li>Automatic video deletion after 7-90 days</li>
                <li>Complete audit logging</li>
                <li>PIN-protected parental controls</li>
                ${encryptionEnabled ? '<li>End-to-end encryption enabled</li>' : ''}
                <li>COPPA compliant</li>
              </ul>
            </td></tr>
          </table>
        </td></tr>
      </table>
    </body>
    </html>
  `;
}

/**
 * Generate beautiful HTML email template (legacy)
 */
function generateEmailHTML({ toName, videoUrl, giftDescription, childName }) {
  return `
<!DOCTYPE html>
<html>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #14B8A6 0%, #F97316 100%); border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.1);">
          <tr><td style="padding: 40px 40px 30px; text-align: center;">
            <h1 style="margin: 0; color: white; font-size: 32px; font-weight: bold;">🎉 Thank You! 🎉</h1>
            <p style="margin: 10px 0 0; color: rgba(255,255,255,0.9); font-size: 18px;">From ${childName}</p>
          </td></tr>
          <tr><td style="background-color: white; padding: 40px;">
            <p style="margin: 0 0 20px; color: #374151; font-size: 18px; line-height: 1.6;">Hi ${toName},</p>
            <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">
              Thank you so much for the <strong>${giftDescription}</strong>! I made you a special video to say thanks.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;"><tr><td align="center">
              <a href="${videoUrl}" style="display: inline-block; background: linear-gradient(135deg, #14B8A6 0%, #F97316 100%); color: white; text-decoration: none; padding: 16px 40px; border-radius: 12px; font-size: 18px; font-weight: 600; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);">▶ Watch My Thank You Video</a>
            </td></tr></table>
          </td></tr>
          <tr><td style="background-color: #f9fafb; padding: 30px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0; color: #9ca3af; font-size: 12px;">Made with ❤️ using GratituGram</p>
          </td></tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
}

/**
 * Send multiple emails with rate limiting
 * @param {Array} emailList - Array of email parameters
 * @param {Function} onProgress - Progress callback (sent, total)
 */
export async function sendBulkEmails(emailList, onProgress) {
  const results = {
    sent: 0,
    failed: 0,
    errors: [],
  };

  for (let i = 0; i < emailList.length; i++) {
    try {
      await sendThankYouEmail(emailList[i]);
      results.sent++;

      if (onProgress) {
        onProgress(results.sent, emailList.length);
      }

      // Rate limiting: wait 100ms between emails to avoid hitting SendGrid limits
      if (i < emailList.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error) {
      results.failed++;
      results.errors.push({
        email: emailList[i].toEmail,
        error: error.message,
      });
    }
  }

  return results;
}
