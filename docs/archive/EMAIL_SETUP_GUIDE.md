# SendGrid Email Setup Guide

## Error You're Seeing

```
❌ SendGrid API error: The provided authorization grant is invalid, expired, or revoked
❌ Response status: 401
```

This means your SendGrid API key is either missing, invalid, or expired.

## How to Fix

### Step 1: Get a SendGrid API Key

1. Go to [https://sendgrid.com](https://sendgrid.com)
2. Sign up or log in
3. Go to **Settings** → **API Keys**
4. Click **Create API Key**
5. Give it a name (e.g., "ShowThx App")
6. Choose **Full Access** permissions
7. Click **Create & View**
8. **IMPORTANT:** Copy the API key immediately (you won't be able to see it again!)

### Step 2: Add API Key to Your .env File

1. Open your `.env` file in the project root
2. Find or add the line:
   ```
   SENDGRID_API_KEY=your_api_key_here
   ```
3. Replace `your_api_key_here` with the API key you copied
4. **Do NOT add quotes** around the key
5. **Do NOT commit this file to git** (it's in .gitignore)

Example:
```env
SENDGRID_API_KEY=SG.aBcDeFgHiJkLmNoPqRsTuVwXyZ.1234567890abcdefghijklmnopqrstuvwxyz
FROM_EMAIL=your-email@example.com
FROM_NAME=ShowThx
```

### Step 3: Update FROM_EMAIL

In the same `.env` file, make sure you have:

```env
FROM_EMAIL=noreply@your-domain.com
FROM_NAME=ShowThx
```

**Important:** The FROM_EMAIL must be:
- A verified sender in SendGrid
- OR from a verified domain in SendGrid

### Step 4: Verify Sender in SendGrid

1. Go to SendGrid Dashboard
2. Go to **Settings** → **Sender Authentication**
3. Click **Verify a Single Sender**
4. Fill in the form with your email address
5. Check your email for verification link
6. Click the verification link

### Step 5: Restart the App

After updating `.env`:

```bash
# Kill the current expo process
pkill -f "expo start"

# Start fresh
npx expo start --clear
```

## Testing Email Sending

After setup:

1. Approve a video
2. Go to "Send to Guests" screen
3. Select a guest
4. Click "Send via Email"
5. Check console logs for:
   ```
   ✅ Email sent successfully via SendGrid
   ✅ Video sent to 1 guests
   ```

## Troubleshooting

### Error: "The from address does not match a verified Sender Identity"

**Solution:** Verify your sender email in SendGrid (Step 4 above)

### Error: "Substitution data was not provided for personalization"

**Solution:** Make sure the email template variables match the data being sent

### Error: "403 Forbidden"

**Solution:** Your API key doesn't have the right permissions. Create a new key with "Full Access"

### Error: "Invalid API Key"

**Solution:**
1. Check for typos in .env file
2. Make sure there are no spaces before/after the key
3. Create a new API key if the old one was revoked

## Alternative: Use a Different Email Service

If SendGrid doesn't work for you, you can:

1. **Use Supabase Edge Functions** for email (requires setup)
2. **Use another service** like Mailgun, Postmark, or AWS SES
3. **Use mailto: links** for manual email sending

Let me know if you'd like to switch to a different email service!

## For Production

**Important:**
- Get a dedicated SendGrid account for production
- Use environment-specific API keys (dev vs prod)
- Set up proper sender authentication
- Monitor email delivery rates in SendGrid dashboard
- Set up email templates in SendGrid for better deliverability
