# SendGrid Setup Guide for GratituGram

## Step 1: Create SendGrid Account

1. Go to https://sendgrid.com/
2. Click "Start for Free"
3. Create account with your email
4. **Free tier includes: 100 emails/day forever** (perfect for testing!)

## Step 2: Verify Your Email

1. Check your email for verification link
2. Click to verify your account
3. Complete profile setup

## Step 3: Create API Key

1. Log in to SendGrid dashboard
2. Go to **Settings** → **API Keys**
3. Click "Create API Key"
4. **Name:** `GratituGram Production`
5. **Permissions:** Select "Full Access" (for testing)
6. Click "Create & View"
7. **COPY THE API KEY NOW** - you won't see it again!

Example key format: `SG.xxxxxxxxxxxxxxxxxx.yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy`

## Step 4: Store API Key in Your App

Create a new file: `/Users/ericgoodlev/Desktop/GratituGram/.env`

```
SENDGRID_API_KEY=SG.your_actual_key_here
SENDGRID_FROM_EMAIL=your-verified-email@example.com
```

**IMPORTANT:** Add `.env` to your `.gitignore` file so you don't commit secrets!

## Step 5: Verify Sender Email

1. In SendGrid dashboard, go to **Settings** → **Sender Authentication**
2. Click "Verify a Single Sender"
3. Enter your email (the one you'll send FROM)
4. Check your email and click verification link
5. This email will be the "From" address for all thank you videos

## Step 6: Install Dependencies

```bash
npm install @sendgrid/mail dotenv
npx expo install expo-constants
```

## Step 7: Test Your Setup

Once we implement the email sending code, you can test with:
- Send to yourself first
- Check spam folder if not in inbox
- Verify email formatting looks good

## Costs & Limits

**Free Tier:**
- 100 emails/day
- Perfect for birthday parties (usually 20-30 guests)
- Enough to test with family/friends

**If you need more:**
- **Essentials Plan:** $15/month for 40,000 emails
- **Pro Plan:** $60/month for 120,000 emails

**For your party:** Free tier is plenty!

## Next Steps

After getting your API key:
1. Tell me and we'll implement the actual email sending
2. We'll add video attachments or video links
3. Test sending to yourself
4. Ready for the party!

## Troubleshooting

**Emails going to spam?**
- Make sure sender email is verified
- Add a proper subject line
- Include unsubscribe link (we'll add this)

**API key not working?**
- Check you copied the whole key
- Make sure "Full Access" permissions
- Try creating a new key

**Daily limit reached?**
- Wait 24 hours for reset
- Or upgrade to paid plan
