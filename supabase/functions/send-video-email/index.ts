// Supabase Edge Function to send video emails after compositing
// Called by Trigger.dev after video processing completes

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY");
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") || "hello@showthx.com";
const FROM_NAME = Deno.env.get("FROM_NAME") || "ShowThx";

interface EmailPayload {
  jobId: string;
  videoUrl: string;
  recipientEmail: string;
  recipientName?: string;
  emailSubject?: string;
  emailBody?: string;
  childName?: string;
  giftName?: string;
  eventName?: string;
}

serve(async (req: Request) => {
  try {
    // Verify authorization
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!SENDGRID_API_KEY) {
      console.error("SENDGRID_API_KEY not configured");
      return new Response(JSON.stringify({ error: "Email service not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const payload: EmailPayload = await req.json();
    console.log("Received email request:", {
      jobId: payload.jobId,
      recipientEmail: payload.recipientEmail,
      hasVideoUrl: !!payload.videoUrl,
    });

    const {
      videoUrl,
      recipientEmail,
      recipientName = "Friend",
      emailSubject,
      emailBody,
      childName = "Your friend",
      giftName = "gift",
      eventName,
    } = payload;

    // Parse multiple recipients if comma-separated
    const emails = recipientEmail.split(",").map(e => e.trim()).filter(Boolean);
    const names = (recipientName || "").split(",").map(n => n.trim());

    // Build personalized subject - replace placeholders
    const rawSubject = emailSubject || `A special thank you from ${childName}!`;
    const subject = rawSubject
      .replace(/\[child_name\]/gi, childName)
      .replace(/\[name\]/gi, names[0] || recipientName || "Friend");

    // Default email body with video link (no gift name)
    const defaultBody = `
Hi ${names[0] || recipientName || "there"},

${childName} has a special thank you message for you!

Click below to watch your personalized video:
${videoUrl}

${eventName ? `This video was created for ${eventName}.` : ""}

Thank you for being so thoughtful!

With gratitude,
${childName} (via ShowThx)
    `.trim();

    const body = emailBody
      ? emailBody
          .replace(/\[name\]/gi, names[0] || recipientName || "Friend")
          .replace(/\[child_name\]/gi, childName)
          .replace(/\[gift_name\]/gi, giftName)
          .replace(/\[video_link\]/gi, videoUrl)
          .replace(/\[video_url\]/gi, videoUrl)
      : defaultBody;

    // Logo URL - stored in Supabase storage assets bucket (public)
    const logoUrl = "https://lufpjgmvkccrmefdykki.supabase.co/storage/v1/object/public/assets/splash-icon.png";

    // Convert custom message to HTML (escape HTML entities and convert newlines to <br>)
    const escapeHtml = (str: string) => str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

    // If user provided custom emailBody, use it; otherwise use default message
    const customMessageHtml = emailBody
      ? escapeHtml(
          emailBody
            .replace(/\[name\]/gi, names[0] || recipientName || "Friend")
            .replace(/\[child_name\]/gi, childName)
            .replace(/\[gift_name\]/gi, giftName)
        ).replace(/\n/g, '<br>')
      : `${childName} has recorded a special thank you video for you!`;

    // Build HTML email with video thumbnail and play button
    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <tr>
      <td style="padding: 30px 30px 20px; text-align: center; background: linear-gradient(135deg, #FF6B6B 0%, #FFE66D 100%);">
        <img src="${logoUrl}" alt="ShowThx" style="height: 50px; margin-bottom: 15px;" />
        <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          You've got a Thank You!
        </h1>
      </td>
    </tr>
    <tr>
      <td style="padding: 40px 30px;">
        <p style="margin: 0 0 20px; font-size: 18px; color: #333333; line-height: 1.6;">
          Hi ${names[0] || recipientName || "there"},
        </p>
        <p style="margin: 0 0 20px; font-size: 16px; color: #555555; line-height: 1.6;">
          ${customMessageHtml}
        </p>

        <!-- Video Preview Box -->
        <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
          <tr>
            <td style="text-align: center;">
              <a href="${videoUrl}" target="_blank" style="display: inline-block; text-decoration: none;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 16px; padding: 40px 60px; display: inline-block;">
                  <div style="font-size: 64px; margin-bottom: 10px;">▶️</div>
                  <div style="color: #ffffff; font-size: 18px; font-weight: 600;">Watch Your Video</div>
                </div>
              </a>
            </td>
          </tr>
        </table>

        <p style="margin: 0; font-size: 13px; color: #aaaaaa; text-align: center;">
          Having trouble? <a href="${videoUrl}" style="color: #667eea;">Click here</a> to watch
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding: 30px; background-color: #f8f9fa; text-align: center; border-top: 1px solid #eeeeee;">
        <p style="margin: 0 0 10px; font-size: 14px; color: #888888;">
          ${eventName ? `Video created for ${eventName}` : "Made with love"}
        </p>
        <p style="margin: 0; font-size: 12px; color: #aaaaaa;">
          Sent via <a href="https://showthx.com" style="color: #667eea; text-decoration: none;">ShowThx</a> - Teaching kids gratitude, one video at a time
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();

    // Send to each recipient
    const results = [];
    for (let i = 0; i < emails.length; i++) {
      const email = emails[i];
      const name = names[i] || names[0] || recipientName || "Friend";

      console.log(`Sending email to ${email}...`);

      const sendGridResponse = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${SENDGRID_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          personalizations: [
            {
              to: [{ email, name }],
              subject: subject,
            },
          ],
          from: {
            email: FROM_EMAIL,
            name: FROM_NAME,
          },
          content: [
            {
              type: "text/plain",
              value: body,
            },
            {
              type: "text/html",
              value: htmlBody.replace(names[0] || recipientName || "there", name),
            },
          ],
        }),
      });

      if (sendGridResponse.ok) {
        console.log(`Email sent successfully to ${email}`);
        results.push({ email, success: true });
      } else {
        const errorText = await sendGridResponse.text();
        console.error(`Failed to send email to ${email}:`, errorText);
        results.push({ email, success: false, error: errorText });
      }
    }

    const allSuccess = results.every(r => r.success);

    return new Response(
      JSON.stringify({
        success: allSuccess,
        results,
        message: allSuccess
          ? `Email sent to ${emails.length} recipient(s)`
          : `Some emails failed to send`,
      }),
      {
        status: allSuccess ? 200 : 207,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error sending email:", error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
