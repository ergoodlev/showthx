# Email Template with Mail Merge Feature

## ✅ Feature Complete

The email template system with mail merge is now fully implemented! Parents can create ONE email template per event that applies to ALL videos sent from that event, with personalization for each recipient.

---

## 📋 Overview

### What This Feature Does

1. **Event-Level Templates**: Each event has its own email template stored in the database
2. **Mail Merge**: Emails are personalized for each recipient using placeholders like `[name]`, `[child_name]`, etc.
3. **One Template, All Videos**: The same template is used for all videos from an event
4. **Easy Customization**: Parents can edit the template anytime with a user-friendly interface

---

## 🎯 Mail Merge Placeholders

### Available Placeholders

Use these placeholders in ANY email field (subject, greeting, message, etc.):

| Placeholder | Replaced With | Example |
|------------|---------------|---------|
| `[name]` or `[guest_name]` | Guest's name | "Hi **Sarah**!" |
| `[child_name]` | Child who recorded video | "**Emily** wants to say thank you!" |
| `[gift_name]` | The specific gift name | "Thank you for the **bicycle**" |
| `[parent_name]` | Parent's name | "From **John's** family" |

### Example Template

**Subject:**
```
Thank You from [child_name]!
```
**Greeting:**
```
Hi [name]!
```
**Message:**
```
[child_name] created a special video message to say thank you for [gift_name]. We hope you enjoy watching it!
```

**Result for guest "Sarah" who gave "bicycle" to child "Emily":**
- **Subject:** Thank You from Emily!
- **Greeting:** Hi Sarah!
- **Message:** Emily created a special video message to say thank you for bicycle. We hope you enjoy watching it!

---

## 🗄️ Database Schema

### New Columns in `events` Table

```sql
email_template_subject      TEXT  -- Email subject line
email_template_greeting     TEXT  -- Email headline/greeting
email_template_message      TEXT  -- Main email message
email_template_gift_label   TEXT  -- Gift label text
email_template_button_text  TEXT  -- CTA button text
email_template_sign_off     TEXT  -- Email sign-off
```

**Default Values:**
- Subject: "A Special Thank You Video for You!"
- Greeting: "You've Received a Thank You Video!"
- Message: "Someone special has created a video message just for you to say thank you."
- Gift Label: "Thank you for: [gift_name]"
- Button Text: "Watch the Video"
- Sign Off: "With gratitude,"

---

## 🚀 How to Use

### Step 1: Run Database Migration

```bash
# In Supabase SQL Editor, run:
database/ADD_EVENT_EMAIL_TEMPLATES.sql
```

This adds the email template columns to the events table.

### Step 2: Customize Event Email Template

1. **Go to "Send to Guests" screen** for any video
2. **Click "Customize Email Message"** button
3. **Edit the template fields**:
   - Email Subject
   - Greeting/Headline
   - Message
   - Gift Label
   - Button Text
   - Sign Off
4. **Use placeholders** for personalization (see available placeholders above)
5. **Preview** the template at the bottom of the screen
6. **Click "Save"** to save the template to the event

### Step 3: Send Videos

1. Select guests to send to
2. Click "Send to X Guests"
3. Emails will be **automatically personalized** for each recipient using the mail merge placeholders

---

## 📁 Files Modified

### 1. [services/emailService.js](services/emailService.js)

**Added:**
- `replacePlaceholders()` function - Replaces mail merge placeholders
- Updated `sendVideoToGuests()` to:
  - Accept guest objects with names (not just emails)
  - Accept `childName` and `parentName` parameters
  - Personalize emails for each recipient
  - Send individualized emails with 100ms delay between sends

**Key Changes:**
```javascript
// OLD signature:
sendVideoToGuests(guestEmails, giftName, videoLink, expiresIn, customTemplate)

// NEW signature:
sendVideoToGuests(guestsData, giftName, videoLink, expiresIn, customTemplate, childName, parentName)
```

### 2. [screens/SendToGuestsScreen.js](screens/SendToGuestsScreen.js)

**Added:**
- State for `eventId`, `eventName`, `childName`, `parentName`
- Load email template from event database
- `handleSaveEmailTemplate()` function to save template back to event
- UI section showing available mail merge placeholders
- Fetch child name from videos table
- Fetch parent name from users table

**Key Changes:**
- Loads event email template on mount
- Saves template when "Save" button clicked
- Passes guest objects (with names) to `sendVideoToGuests()`
- Passes `childName` and `parentName` for mail merge

### 3. [database/ADD_EVENT_EMAIL_TEMPLATES.sql](database/ADD_EVENT_EMAIL_TEMPLATES.sql) *(NEW FILE)*

**Purpose:** Adds email template columns to events table

---

## 💡 Use Cases

### Use Case 1: Birthday Party

**Event:** "Emma's 8th Birthday"

**Template:**
- Subject: `Thank You from [child_name]!`
- Greeting: `Hi [name]!`
- Message: `[child_name] had such a wonderful time at the birthday party and loves the [gift_name] you gave! Here's a special video message just for you.`
- Gift Label: `Your gift: [gift_name]`
- Button Text: `Watch Emma's Thank You!`
- Sign Off: `With love and thanks,`

**Result for Sarah who gave "LEGO Set":**
- Subject: Thank You from Emma!
- Greeting: Hi Sarah!
- Message: Emma had such a wonderful time at the birthday party and loves the LEGO Set you gave! Here's a special video message just for you.
- Gift Label: Your gift: LEGO Set
- Button: Watch Emma's Thank You!

### Use Case 2: Holiday Gifts

**Event:** "Christmas 2025"

**Template:**
- Subject: `[child_name]'s Holiday Thank You for [name]`
- Greeting: `Dear [name],`
- Message: `Happy Holidays! [child_name] is so grateful for the [gift_name]. We hope you enjoy this heartfelt video message.`
- Gift Label: `Thank you for: [gift_name]`
- Button Text: `Play Video Message`
- Sign Off: `Warm wishes, [parent_name] and family`

---

## 🔧 Technical Implementation

### How It Works

1. **Template Storage**: Email templates stored in `events` table
2. **Template Loading**: When opening "Send to Guests", template loaded from event
3. **Personalization**: When sending, placeholders replaced per recipient:
   ```javascript
   replacePlaceholders(template.subject, {
     guestName: 'Sarah',
     childName: 'Emma',
     giftName: 'LEGO Set',
     parentName: 'John'
   })
   ```
4. **Individual Emails**: Each guest gets a personalized email (not BCC)
5. **Rate Limiting**: 100ms delay between emails to avoid SendGrid rate limits

### Email Sending Flow

```
1. User clicks "Send to Guests"
   ↓
2. Load event email template from database
   ↓
3. Load child name from videos table
   ↓
4. Load parent name from users table
   ↓
5. For each selected guest:
   a. Replace placeholders with guest's data
   b. Send personalized email
   c. Wait 100ms (rate limiting)
   ↓
6. Update gift status to 'sent'
   ↓
7. Navigate to success screen
```

---

## 🐛 Troubleshooting

### Template Not Saving

**Problem:** Click "Save" but template doesn't persist

**Solutions:**
1. Check that `ADD_EVENT_EMAIL_TEMPLATES.sql` was run
2. Verify event has ID in database
3. Check console logs for error messages

### Placeholders Not Being Replaced

**Problem:** Email shows `[name]` instead of actual name

**Solutions:**
1. Check guest has name in database (not just email)
2. Verify child name was fetched from videos table
3. Check parent name was fetched from users table
4. Review console logs for missing data warnings

### Emails Not Personalized

**Problem:** All guests get same generic email

**Solutions:**
1. Check that placeholders are used in template (e.g., `Hi [name]!`)
2. Verify guest objects include both `email` and `name` fields
3. Check console logs for "Mail merge placeholders" messages

---

## 📊 Console Logs

### What You'll See

**When loading template:**
```
✅ Loaded email template from event: Emma's 8th Birthday
✅ Loaded child name for mail merge: Emma
✅ Loaded parent name for mail merge: John
```

**When saving template:**
```
✅ Email template saved to event: Emma's 8th Birthday
```

**When sending emails:**
```
📧 Attempting to send video to guests...
📧 Recipients: Sarah <sarah@email.com>, Mike <mike@email.com>
📧 Video link: https://...
📧 Gift name: LEGO Set
📧 Child name: Emma
📧 Parent name: John
✅ Video sent to 2 guests with personalization
```

---

## ✅ Testing Checklist

### Before Using:
- [ ] Run `ADD_EVENT_EMAIL_TEMPLATES.sql` in Supabase
- [ ] Verify SendGrid API key is configured
- [ ] Verify sender email is verified in SendGrid

### Test Template Creation:
- [ ] Open "Send to Guests" screen
- [ ] Click "Customize Email Message"
- [ ] See event name in modal title
- [ ] See mail merge placeholders guide
- [ ] Edit template fields
- [ ] See live preview update
- [ ] Click "Save"
- [ ] See success message in console
- [ ] Close and reopen - template should persist

### Test Mail Merge:
- [ ] Add placeholder `[name]` to greeting
- [ ] Add placeholder `[child_name]` to message
- [ ] Add placeholder `[gift_name]` to gift label
- [ ] Send test email
- [ ] Verify placeholders were replaced with actual values
- [ ] Check that different guests got different names

---

## 🎉 Summary

**What's Been Implemented:**

✅ **Event-level email templates** stored in database
✅ **Mail merge placeholders** for personalization
✅ **User-friendly UI** for template editing
✅ **Live preview** of template
✅ **Automatic data fetching** (child name, parent name, guest names)
✅ **Per-recipient personalization** with individual emails
✅ **Rate limiting** to avoid SendGrid limits
✅ **Comprehensive error logging**

**Next Steps for User:**

1. Run `database/ADD_EVENT_EMAIL_TEMPLATES.sql`
2. Configure SendGrid API key (see [EMAIL_SETUP_GUIDE.md](EMAIL_SETUP_GUIDE.md))
3. Run `database/FIX_VIDEO_URL_LENGTH.sql` (for video submission)
4. Test email template customization
5. Send test video with mail merge

---

**Happy sending! 📧✨**
