# ThankCast - Phase 2 UI Implementation Scope

**Status**: Ready to Begin
**Edition Focus**: Kids Edition (Primary)
**Timeline**: 4-6 weeks estimated
**Team**: Solo developer

---

## Executive Summary

Phase 2 builds all user-facing UI screens and flows for ThankCast Kids Edition. This phase transforms the backend infrastructure and design system from Phase 1 into a complete, functional app with:

- **Parent experience**: Signup → Dashboard → Create Events/Gifts → Manage Guests → Review & Approve Videos
- **Kid experience**: PIN Login → View Gifts → Record Thank You → Customize Video → Complete
- **Edition-aware**: All screens automatically adapt between Kids/Wedding/Pro editions

**Key Constraint**: All screens must use Edition-Aware button components and design system. No custom styling.

---

## Phase 2 Goals

1. ✅ Implement all screens for Kids Edition complete user flow
2. ✅ Create reusable form components (text input, select, date picker)
3. ✅ Integrate Supabase authentication for parent signup/login
4. ✅ Build video recording and playback flows
5. ✅ Create video merge preview and customization screens
6. ✅ Implement kid PIN login with security features
7. ✅ Setup email notifications for guest sharing
8. ✅ Ensure COPPA compliance throughout
9. ✅ Test across Kids/Wedding/Pro editions
10. ✅ Deploy to GitHub with clean git history

---

## High-Level Feature Breakdown

```
Phase 2 Features
├── Authentication
│   ├── Parent Signup (Email/Password + COPPA Consent)
│   ├── Parent Login
│   ├── Parent Session Management
│   ├── Kid PIN Login (Simple 4-digit PIN)
│   ├── Kid Session Management
│   └── Logout Flows
│
├── Parent Dashboard
│   ├── Event Management (Create, Edit, Delete, List)
│   ├── Gift Management (Create, Edit, Delete, Assign to Kids)
│   ├── Guest/Recipient Management (Import, Add, Delete, Email List)
│   ├── Video Pending List (Videos awaiting approval)
│   ├── Video Review Screen (Preview + Approve/Reject)
│   └── Send to Guests (Email sharing with 24-hr tokens)
│
├── Kid Experience
│   ├── PIN Login Screen
│   ├── Pending Gifts List (Show gift giver + gift name)
│   ├── Gift Opening Preview (Play parent's gift opening video)
│   ├── Video Recording Screen (Camera + record button)
│   ├── Video Playback & Edit (Preview recorded video)
│   ├── Video Merge Preview (Automatic merge with gift opening)
│   ├── Music Selection (Pick from music library)
│   ├── Video Customization (Music, text overlay, transitions)
│   ├── Video Confirmation (Final preview before submit)
│   └── Success Screen (Thank you + next steps)
│
├── Shared Components
│   ├── AppBar (Header with back, title, menu)
│   ├── TextField (Edition-aware text input)
│   ├── Select/Picker (Dropdown for selections)
│   ├── DatePicker (Pick dates for events)
│   ├── Modal/Dialog (Confirmations, alerts)
│   ├── GiftCard (Display gift info)
│   ├── EventCard (Display event info)
│   ├── VideoPlayer (Play videos with controls)
│   ├── LoadingSpinner (Loading states)
│   ├── ErrorMessage (Error displays)
│   └── SuccessMessage (Success confirmations)
│
└── Infrastructure
    ├── Font Installation (Nunito, Playfair, Montserrat, Inter)
    ├── App.js with EditionProvider
    ├── Screen Navigation Structure
    ├── Supabase Integration
    ├── Error Handling & Loading States
    └── Toast/Alert Notifications
```

---

## Detailed Screen Specifications

### 1. PARENT FLOWS

#### 1.1 Parent Signup Screen
**Path**: `screens/ParentSignup.js`

**Purpose**: New parent account creation with COPPA consent

**Layout**:
```
[Header: ThankCast Logo]
[Title: "Welcome to ThankCast"]
[Subtitle: "Let's create special moments together"]

[Email Input Field]
[Password Input Field]
[Confirm Password Input Field]
[Full Name Input Field]

[Checkbox] I agree to Terms of Service
[Checkbox] I agree to Privacy Policy
[Checkbox] I consent to COPPA requirements for kids app

[Error Message Area (if validation fails)]

[Sign Up Button - ThankCastButton]
[Already have account? Log In - Link]
```

**User Story**:
- New parent visits app
- Enters email, password, confirm password, full name
- Agrees to terms and COPPA consent
- Clicks "Sign Up"
- Validation checks: email format, password strength, all fields filled
- On success: Create parent account in Supabase Auth + insert into `parents` table
- Redirect to Parent Dashboard or "Create First Event" flow
- On error: Show error message, allow retry

**Component Requirements**:
- `TextField` component (reusable text input)
- `ThankCastButton` for signup
- Form validation logic
- Link/Text for login redirect
- Checkbox components

**API Calls**:
- `supabase.auth.signUp()` - Create auth account
- `supabase.from('parents').insert()` - Save parent profile
- `supabase.from('parental_consents').insert()` - Track COPPA consent

**Testing**:
- Valid signup flow end-to-end
- Invalid email format rejection
- Weak password rejection
- Password mismatch error
- Missing COPPA consent error
- Duplicate email error
- Edition-specific styling (kids: 56px buttons, adult: 48px)

---

#### 1.2 Parent Login Screen
**Path**: `screens/ParentLogin.js`

**Purpose**: Existing parent authentication

**Layout**:
```
[Header: ThankCast Logo]
[Title: "Welcome Back"]

[Email Input Field]
[Password Input Field]
[Forgot Password? - Link]

[Remember Me - Checkbox]
[Error Message Area]

[Log In Button - ThankCastButton]
[Don't have account? Sign Up - Link]
```

**User Story**:
- Returning parent enters email and password
- Clicks "Log In"
- Validation: email and password not empty
- On success: Create session in Supabase and local storage
- Redirect to Parent Dashboard
- On error: Show error message (invalid credentials, account not found, etc.)
- "Remember Me" stores email for next time

**Component Requirements**:
- `TextField` component
- `Checkbox` component
- `ThankCastButton`
- Session management logic

**API Calls**:
- `supabase.auth.signInWithPassword()` - Authenticate
- Load parent profile from `parents` table

**Testing**:
- Valid login flow
- Invalid password error
- Non-existent account error
- Empty field validation
- "Remember Me" functionality
- Edition styling

---

#### 1.3 Parent Dashboard Screen
**Path**: `screens/ParentDashboard.js`

**Purpose**: Main hub for parent account management

**Layout**:
```
[Header: "Hi, [Parent Name]!" - LogOut button]

[Tab Navigation]
├── Events Tab (DEFAULT)
├── Pending Videos Tab
└── Settings Tab

=== EVENTS TAB ===
[Create Event Button - ThankCastButton with + icon]

[List of Events]
├── [EventCard 1]
│   ├── Event name, date, # of kids
│   ├── # gifts, # videos
│   └── [Edit] [Delete] [View Details]
├── [EventCard 2]
└── ...

[No events message if empty]

=== PENDING VIDEOS TAB ===
[List of Videos Awaiting Approval]
├── [VideoCard 1]
│   ├── Kid name, gift, date recorded
│   ├── [Preview] [Approve] [Request Re-record]
├── [VideoCard 2]
└── ...

[No pending videos message if empty]

=== SETTINGS TAB ===
[Change Password Button]
[Update Profile Button]
[View COPPA Consent Button]
[Logout Button]
```

**User Story**:
- Parent logs in and sees dashboard
- Can view all events/parties they created
- Can see pending videos that need approval
- Can click on event to view/manage gifts and guests
- Can click on video to preview and approve/reject
- Can manage account settings
- Can logout

**Component Requirements**:
- `AppBar` with logout
- `TabBar` for navigation between tabs
- `EventCard` component (reusable)
- `VideoCard` component (reusable)
- `ThankCastButton` for actions

**API Calls**:
- `supabase.from('events').select()` - Load parent's events
- `supabase.from('videos').select()` - Load pending videos
- `supabase.auth.signOut()` - Logout

**Testing**:
- Display events correctly
- Display pending videos correctly
- Tab switching
- Empty state messaging
- Logout functionality
- Edition styling

---

#### 1.4 Event Management Screen
**Path**: `screens/EventManagement.js`

**Purpose**: Create and edit events/parties

**Layout**:
```
[Header: "Create Event" or "Edit Event"]

[Event Name Input]
[Event Type Dropdown] (Birthday, Wedding, Graduation, etc.)
[Event Date Picker]
[Event Location Input (Optional)]
[Description Input]

[Kids in This Event]
[List of checkboxes for parent's kids]
[+ Add New Kid button]

[Error/Validation Messages]

[Cancel Button] [Save Button - ThankCastButton]
```

**User Story**:
- Parent navigates to create event or clicks edit on existing event
- Fills in event details
- Selects which kids participate
- Clicks "Save"
- Validation: event name, type, date required
- On success: Insert/update in `events` table
- Redirect back to dashboard
- On error: Show validation error

**Component Requirements**:
- `TextField` component
- `Dropdown/Picker` component
- `DatePicker` component
- Checkbox for kid selection
- Form validation
- `ThankCastButton`

**API Calls**:
- `supabase.from('events').insert()` - Create event
- `supabase.from('events').update()` - Update event
- `supabase.from('children').select()` - Load parent's kids for selection

**Testing**:
- Create new event
- Edit existing event
- Delete event
- Validation errors
- Kid selection
- Date picker functionality
- Edition styling

---

#### 1.5 Gift Management Screen
**Path**: `screens/GiftManagement.js`

**Purpose**: Create and assign gifts to kids in an event

**Layout**:
```
[Header: "Gifts for [Event Name]"]

[Create Gift Button - ThankCastButton with + icon]

[List of Gifts for This Event]
├── [GiftCard 1]
│   ├── Gift name, from (giver name)
│   ├── Assigned to: [Kid 1], [Kid 2] (if shared)
│   ├── Status: Pending, Recorded, Approved
│   └── [Edit] [Delete] [View Details]
├── [GiftCard 2]
└── ...

[No gifts message if empty]
```

**Create/Edit Gift Modal**:
```
[Modal Title: "Create Gift" or "Edit Gift"]

[Gift Name Input] (e.g., "Lego Set")
[Giver Name Input] (e.g., "Uncle Bob")
[Description Input (Optional)]

[Assign to Kids]
[Checkboxes for each kid in event]

[Cancel] [Save - ThankCastButton]
```

**User Story**:
- Parent views event's gifts
- Can create new gift by clicking "Create Gift"
- Fills in gift name, giver name, description
- Selects which kid(s) should record thank you for this gift
- Clicks "Save"
- Gift appears in list with status "Pending Video"
- Kids can then record thank yous for assigned gifts

**Component Requirements**:
- `GiftCard` component (reusable)
- `TextField` component
- Modal/Dialog for create/edit
- Checkbox for kid assignment
- `ThankCastButton`

**API Calls**:
- `supabase.from('gifts').insert()` - Create gift
- `supabase.from('gifts').update()` - Update gift
- `supabase.from('gift_assignments').insert()` - Assign to kids
- `supabase.from('gifts').delete()` - Delete gift

**Testing**:
- Create gift
- Edit gift
- Delete gift
- Assign to single kid
- Assign to multiple kids
- Validation errors
- Edition styling

---

#### 1.6 Guest Management Screen
**Path**: `screens/GuestManagement.js`

**Purpose**: Manage email list for sharing finalized videos

**Layout**:
```
[Header: "Guests for [Event Name]"]

[Import CSV Button - ThankCastButton]
[Add Guest Button - ThankCastButton with + icon]

[List of Guests]
├── [GuestRow 1]
│   ├── Name, Email
│   ├── Status: Invited, Opened, etc.
│   └── [Delete Button]
├── [GuestRow 2]
└── ...

[No guests message if empty]
```

**Add Guest Modal**:
```
[Modal: Add Guest]

[Guest Name Input]
[Guest Email Input]

[Cancel] [Add - ThankCastButton]
```

**Import CSV Modal**:
```
[Modal: Import Guest List]

[Instructions: CSV format - Name, Email]
[File Picker Button]

[Preview of rows to import]

[Cancel] [Import - ThankCastButton]
```

**User Story**:
- Parent views event's guest list
- Can manually add guests one by one
- Can bulk import from CSV file (Name, Email format)
- Can delete guests
- Once videos are approved, parent can send to all guests with 24-hour share token links

**Component Requirements**:
- `TextField` component
- Modal/Dialog
- `ThankCastButton`
- File picker for CSV import
- CSV parsing logic

**API Calls**:
- `supabase.from('guests').insert()` - Add guest
- `supabase.from('guests').delete()` - Delete guest
- Parse CSV and bulk insert

**Testing**:
- Add single guest
- Bulk import CSV
- Delete guest
- CSV validation (name and email required)
- Duplicate email handling
- Edition styling

---

#### 1.7 Video Review Screen
**Path**: `screens/VideoReview.js`

**Purpose**: Preview kid's thank you video and approve/request re-record

**Layout**:
```
[Header: "Review Video"]

[Video Details]
├── Kid Name: [Name]
├── Gift: [Gift Name] from [Giver]
├── Recorded: [Date & Time]

[VideoPlayer] (plays merged video if ready, or thank you video)
┌─────────────────┐
│  [Video Player] │
│    [▶️ ⏸ ⏹]    │
└─────────────────┘

[Video Status]
├── Thank you video: ✅ Recorded
├── Merged video: ⏳ Processing (or ✅ Ready)

[Buttons Section]

[Reject Button - ThankCastOutlineButton]
└── Reason for rejection input

[Re-Record Button - ThankCastSecondaryButton]
└── Message to kid

[Approve Button - ThankCastButton]
└── Video will be sent to guests

[Cancel Button]
```

**User Story**:
- Parent sees pending videos in dashboard
- Clicks on video to review
- Watches merged video (or just thank you if merge is processing)
- Can approve: video is marked for sending
- Can request re-record: kid sees message and records new video
- Can reject: video deleted, kid must record new one

**Component Requirements**:
- `VideoPlayer` component
- `ThankCastButton`, `ThankCastSecondaryButton`, `ThankCastOutlineButton`
- Status indicators
- Text input for rejection reason
- Loading states

**API Calls**:
- `supabase.from('videos').select()` - Load video
- `supabase.from('videos').update()` - Update status to approved/rejected
- Call video merge service if not yet merged

**Testing**:
- Load and display video
- Video player playback
- Approve flow
- Reject flow
- Re-record request
- Status transitions
- Edition styling

---

#### 1.8 Send to Guests Screen
**Path**: `screens/SendToGuests.js`

**Purpose**: Send approved videos to email list with 24-hour secure share links

**Layout**:
```
[Header: "Send Videos"]

[Summary Section]
├── Event: [Event Name]
├── Videos to Send: [Count]
├── Guest Count: [Count]

[Select Videos Section]
[Checkboxes for each approved video]
├── ☑ [Kid Name] - Thank you for [Gift]
├── ☑ [Kid Name] - Thank you for [Gift]
└── ...

[Select Recipients Section]
[Checkboxes for each guest or "Send to All"]
├── ☑ Send to All Guests
├── ☐ [Guest Name] <Guest Email>
├── ☐ [Guest Name] <Guest Email>
└── ...

[Custom Message Input (Optional)]
"Thank you for celebrating with us!"

[Error/Validation Messages]

[Cancel Button] [Send Button - ThankCastButton]
```

**Confirmation Screen** (After clicking Send):
```
✅ Success!

Sent [N] videos to [M] guests

Links expire in 24 hours
Guests can view, share, download (if enabled)

[Back to Dashboard - ThankCastButton]
```

**User Story**:
- Parent has multiple approved videos
- Navigates to "Send to Guests"
- Selects which videos to send
- Selects which guests to send to
- Optionally adds custom message
- Clicks "Send"
- System generates 24-hour share tokens for each video
- Sends emails with links to each guest
- Shows success confirmation

**Component Requirements**:
- Checkbox for video selection
- Checkbox for guest selection
- `TextField` for custom message
- `ThankCastButton`
- Email template rendering

**API Calls**:
- `supabase.from('video_share_tokens').insert()` - Create share tokens
- Call email service to send emails
- `supabase.from('emails_sent').insert()` - Log email sends

**Testing**:
- Select videos
- Select guests
- Token generation
- Email sending
- Success notification
- Edition styling

---

### 2. KID FLOWS

#### 2.1 Kid PIN Login Screen
**Path**: `screens/KidPINLogin.js`

**Purpose**: Simple, kid-friendly PIN entry for kids to login

**Design**: Large number pad similar to ATM, kid-friendly colors (Kids edition)

**Layout**:
```
[Header: "Hi! Enter your PIN"]
[Subtitle: "Ask a grown-up if you need help"]

[PIN Display Area]
[●●●●] (circles for each entered digit)

[Large Number Pad - 0-9]
┌───────┬───────┬───────┐
│ [1]   │ [2]   │ [3]   │
├───────┼───────┼───────┤
│ [4]   │ [5]   │ [6]   │
├───────┼───────┼───────┤
│ [7]   │ [8]   │ [9]   │
├───────┼───────┴───────┤
│       │ [0]           │
└───────┴───────────────┘

[Clear Button (← )]
[Enter Button]

[Error Message Area]
[Failed attempts counter]
[Lockout message if exceeded max attempts]
```

**User Story**:
- Kid opens app
- Sees PIN login screen
- Taps number buttons to enter their 4-digit PIN
- Can clear and re-enter if wrong
- On success: Enter kid dashboard
- On wrong PIN: Show error, allow retry up to 5 times
- After 5 wrong attempts: Lock for 15 minutes

**Component Requirements**:
- Large button grid (56px kids size)
- PIN display indicator
- Numeric keypad buttons
- Error message display
- Lockout timer

**API Calls**:
- Query `children` table by PIN
- Validate PIN (hashed comparison)
- Check login attempts
- Create kid session

**Security Considerations**:
- PIN stored hashed in database
- Max 5 attempts with 15-min lockout
- Session expires after 30 minutes of inactivity
- Clear PIN from memory after authentication

**Testing**:
- Valid PIN entry
- Invalid PIN rejection
- Attempt counter
- Lockout after 5 attempts
- Lockout timer functionality
- Edition styling (large kids buttons)
- Session creation

---

#### 2.2 Kid Pending Gifts Screen
**Path**: `screens/KidPendingGifts.js`

**Purpose**: Show kid gifts awaiting thank you videos

**Layout**:
```
[Header: "Thanks to Give"]
[Subtitle: "Your gifts & givers"]

[List of Pending Gifts]
├── [GiftCard 1 - LARGE, KID-FRIENDLY]
│   ├── Gift Name: [Big, colorful text] "LEGO SET"
│   ├── From: "Uncle Bob"
│   ├── Status: 🎥 Record Thank You
│   └── [Record Button - ThankCastRecordButton or ThankCastButton]
│
├── [GiftCard 2]
│   ├── Gift Name: "BICYCLE"
│   ├── From: "Grandma"
│   ├── Status: ✅ You recorded! 🎬 Parent reviewing
│   └── [View Status Button]
│
└── ...

[No gifts message if all done]
"Great job! All thank yous recorded 🎉"

[Logout Button - Small, bottom right]
```

**User Story**:
- Kid logs in with PIN
- Sees all gifts assigned to them
- For each gift, sees giver name and status
- Status indicators:
  - "Record Thank You" = Not yet recorded
  - "Parent Reviewing" = Recorded, awaiting parent approval
  - "Ready to Send" = Parent approved, will be sent to guests
- Clicks "Record" to start recording thank you video
- Can view previously recorded thank you (preview)

**Component Requirements**:
- `GiftCard` component (kid-friendly, large)
- `ThankCastButton` for recording
- Status icons/badges
- Logout button
- Kid-friendly colors and fonts (Nunito)

**API Calls**:
- `supabase.from('gift_assignments').select()` - Load assigned gifts
- `supabase.from('videos').select()` - Load recorded videos for each gift

**Testing**:
- Display pending gifts correctly
- Display recorded gifts with status
- Button functionality
- Logout
- Edition styling (kids: large, friendly, Nunito)
- Empty state messaging

---

#### 2.3 Gift Opening Preview Screen
**Path**: `screens/GiftOpeningPreview.js`

**Purpose**: Show parent's gift opening video before recording thank you

**Optional Screen** - Allow kid to see what gift they're thanking for

**Layout**:
```
[Header: "Watch [Giver Name]'s Gift"]

[Video Player]
┌─────────────────┐
│  [Video - Gift  │
│   Opening]      │
│   [▶️ ⏸ ⏹]    │
└─────────────────┘

[Gift Info]
├── Gift: [Name]
├── From: [Giver]

[Buttons]
[Got It! - ThankCastButton]
└── Proceed to recording

[Back Button - ThankCastOutlineButton]
```

**User Story** (Optional Flow):
- Kid taps "Record" for a gift
- First sees parent's gift opening video
- Can watch the video to understand what gift they're thanking for
- Clicks "Got It!" to proceed to recording
- Or "Back" to return to gifts list

**Note**: This screen is optional. Kids could go directly to recording.

**Component Requirements**:
- `VideoPlayer` component
- `ThankCastButton`
- `ThankCastOutlineButton`

**Testing**:
- Video playback
- Navigation to recording screen
- Back button functionality

---

#### 2.4 Video Recording Screen
**Path**: `screens/VideoRecording.js`

**Purpose**: Capture kid's thank you video

**Layout**:
```
[Header: "Record Thank You for [Gift Name]"]

[Camera View/Preview]
┌──────────────────────┐
│                      │
│  [Camera Preview]    │
│  OR                  │
│  [Video Playback]    │
│                      │
└──────────────────────┘

[Recording Info]
├── Recording Time: 00:45 / 01:00 (45 seconds remaining)
├── Status: Recording... (or "Ready to Record")

[Large Record/Stop Button]
[ThankCastRecordButton with isRecording state]

[Controls Row]
├── [Flip Camera Button - ThankCastIconButton]
├── [Delete Video Button - ThankCastIconButton]
└── [Next Button - ThankCastButton] (if video recorded)

[Error/Status Messages]
```

**User Story**:
- Kid taps "Record" for a gift
- Camera opens
- Kid can see themselves in preview
- Can flip between front/back camera
- Clicks large record button to start recording
- Max 60 seconds (Kids edition)
- Timer counts up
- When time reaches 60 seconds, recording stops automatically
- Can watch playback of recorded video
- Can delete and re-record
- When satisfied, clicks "Next" to proceed to music selection

**Component Requirements**:
- `ThankCastRecordButton` (large, red circle for recording)
- `ThankCastIconButton` for flip camera
- Camera integration (expo-camera)
- Video playback
- Time counter
- Error handling

**API Calls**:
- `supabase.storage.from('videos').upload()` - Upload video file
- Save video metadata to `videos` table

**Technical Notes**:
- Use `expo-camera` and `expo-av` for camera and playback
- Auto-stop at 60 seconds (Kids edition max)
- Store video URI locally during recording
- Upload to Supabase storage when proceeding

**Testing**:
- Camera permission handling
- Record start/stop
- Timer accuracy
- Video playback
- Delete and re-record
- Camera flip functionality
- Max duration enforcement
- Edition styling

---

#### 2.5 Video Playback & Edit Screen
**Path**: `screens/VideoPlayback.js`

**Purpose**: Preview recorded thank you video before customization

**Layout**:
```
[Header: "Review Your Thank You"]

[Video Player - FULL SCREEN PREVIEW]
┌──────────────────────┐
│                      │
│  [Video Playback]    │
│                      │
│   [▶️ ⏸ ⏹]         │
└──────────────────────┘

[Video Info]
├── Duration: 00:45
├── File Size: 12 MB

[Action Buttons]

[Re-Record Button - ThankCastSecondaryButton]
└── Record a new video

[Delete Button - ThankCastOutlineButton]
└── Delete and start over

[Next Button - ThankCastButton]
└── Continue to customization
```

**User Story**:
- After recording, kid sees full-screen video playback
- Can play/pause/rewind video
- Can re-record if not happy
- Can delete video completely
- When satisfied, clicks "Next" to proceed to music selection

**Component Requirements**:
- `VideoPlayer` component (full screen)
- `ThankCastButton`, `ThankCastSecondaryButton`, `ThankCastOutlineButton`
- Video duration display

**Testing**:
- Video playback
- Player controls
- Navigation
- Delete functionality
- Edition styling

---

#### 2.6 Video Merge Preview Screen
**Path**: `screens/VideoMergePreview.js`

**Purpose**: Show automatic merge of gift opening + thank you video

**Layout**:
```
[Header: "Your Merged Video"]

[Merge Status]
├── 🎬 Merging videos...
├── ⏳ Adding music...
├── ✅ Ready!

[Merged Video Player]
┌──────────────────────┐
│                      │
│  [Merged Video]      │
│                      │
│   [▶️ ⏸ ⏹]         │
└──────────────────────┘

[Video Details]
├── Gift Opening: ✅
├── Your Thank You: ✅
├── Music: [None yet - will select next]
├── Duration: 1:32

[Info Box]
"Videos are automatically merged!
Gift opening + your thank you
You can add music and customize next."

[Next Button - ThankCastButton]
└── Select Music & Customize
```

**Technical Detail**:
- This screen appears after music selection
- Calls `videoMergeService.mergeVideos()` which:
  - Takes gift opening video + thank you video
  - Calls Supabase Edge Function (FFmpeg backend)
  - Processes with side-by-side or PiP layout
  - Returns merged video URL
  - Shows preview to kid

**User Story**:
- After recording thank you, system automatically merges with gift opening
- Kid sees status of merge process
- Once complete, can preview merged video
- Then proceeds to music selection

**Component Requirements**:
- `VideoPlayer` for merged video preview
- Status indicators (processing, complete)
- `ThankCastButton` for next

**API Calls**:
- Call `videoMergeService.mergeVideos()` with config:
  - Gift opening video ID
  - Thank you video ID
  - Layout preset (e.g., 'side-by-side', 'pip')
  - Duration for music timing
- Save merge result to `merged_video_customizations` table

**Testing**:
- Merge status display
- Video preview playback
- Error handling if merge fails
- Edition styling

---

#### 2.7 Music Selection Screen
**Path**: `screens/MusicSelection.js`

**Purpose**: Kid selects background music for merged video

**Layout**:
```
[Header: "Pick Music for Your Video"]

[Mood Filter]
[Buttons: All, Happy, Calm, Energetic, Uplifting, Celebratory]
(Only show moods available)

[Music List]
├── [MusicCard 1]
│   ├── Title: "Sunny Day"
│   ├── Artist: "YouTube Audio Library"
│   ├── Duration: 2:34
│   ├── Mood: Happy
│   ├── [Play Preview Button - ThankCastIconButton]
│   └── [Select Button - ThankCastButton]
│
├── [MusicCard 2]
│   └── ...
│
└── [No Music Option]
    └── "No thanks, skip music"

[Currently Selected]
[Shows selected music or "None"]
[ThankCastButton to deselect]

[Next Button - ThankCastButton]
└── Continue to customization
```

**User Story**:
- After merge preview, kid selects music
- Can filter by mood to find right song
- Can listen to preview of each track
- Can scroll through library
- Selects one song (or no music)
- Selected music is used in final merge
- Proceeds to customization

**Component Requirements**:
- Music card display
- Mood filter buttons
- Audio player for previews
- Selection indicator
- `ThankCastButton`

**API Calls**:
- `musicLibraryService.getMusicByMood(mood)` - Load filtered tracks
- `musicLibraryService.getRecommendedMusicForDuration()` - Smart recommendations
- `supabase.from('merged_video_customizations').update()` - Save music selection

**Testing**:
- Load music library
- Filter by mood
- Preview playback
- Selection/deselection
- Edition styling

---

#### 2.8 Video Customization Screen
**Path**: `screens/VideoCustomization.js`

**Purpose**: Customize merged video with transitions, text overlay, layout

**Layout**:
```
[Header: "Customize Your Video"]

[Preview Player]
┌──────────────────────┐
│  [Video Preview]     │
│   [▶️ ⏸ ⏹]         │
└──────────────────────┘

[Customization Options]

1️⃣ [Layout Section - COLLAPSIBLE]
   Radio Buttons:
   ○ Side-by-Side (default)
   ○ Picture-in-Picture
   ○ Split-Screen
   [Live preview updates]

2️⃣ [Transition Section - COLLAPSIBLE]
   Radio Buttons:
   ○ Fade (default)
   ○ Slide
   ○ Zoom
   [Live preview updates]

3️⃣ [Text Overlay Section - COLLAPSIBLE]
   [Optional Text Input]
   "Add a message..."
   [Color Picker or preset colors]
   [Font Size Slider]
   [Preview updates]

4️⃣ [Music Section - COLLAPSIBLE]
   [Currently Selected Music]
   [Change Music Button]

[Back Button] [Next Button - ThankCastButton]
```

**User Story**:
- Kid can customize how videos are merged
- Can choose layout style (side-by-side, PiP, split-screen)
- Can add transition effect
- Can add optional text overlay with custom message
- Can adjust text color and size
- Live preview shows changes
- Can go back to change music
- When done, proceeds to final confirmation

**Component Requirements**:
- Radio button groups
- Text input
- Color picker (or color selector buttons)
- Slider for font size
- `ThankCastButton`
- Live video preview updates

**API Calls**:
- `supabase.from('merged_video_customizations').update()` - Save customizations
- Call `videoMergeService.mergeVideos()` again with new customization options

**Testing**:
- Layout selection
- Transition selection
- Text overlay input and preview
- Color selection
- Font size adjustment
- Live preview updates
- Edition styling

---

#### 2.9 Video Confirmation Screen
**Path**: `screens/VideoConfirmation.js`

**Purpose**: Final preview before submitting thank you video

**Layout**:
```
[Header: "All Set!"]

[Final Video Preview]
┌──────────────────────┐
│  [FINAL MERGED]      │
│  [VIDEO - PREVIEW]   │
│                      │
│   [▶️ ⏸ ⏹]         │
└──────────────────────┘

[Summary Section]
├── Gift: [Gift Name]
├── From: [Giver Name]
├── Music: [Music Title] (or None)
├── Customizations: Layout - [Layout Name]

[Info Box]
✅ Ready to submit!

Your thank you video will be:
1. Sent to [Parent Name] for review
2. If approved, shared with guests
3. Kept safe for memories

[Buttons]

[Edit Button - ThankCastSecondaryButton]
└── Go back and change settings

[Submit Button - ThankCastButton]
└── Send to Parent for Review

[Info]
"Parent will review and approve
before sending to guests"
```

**User Story**:
- Final review before submitting
- See complete merge with all customizations
- Can edit if wants to change anything
- Clicks "Submit"
- Video status changed to "Pending Parent Approval"
- Redirected to success screen

**Component Requirements**:
- `VideoPlayer` final preview
- Summary display
- `ThankCastButton` for submit
- `ThankCastSecondaryButton` for edit

**API Calls**:
- `supabase.from('videos').update()` - Set status to 'pending_approval'
- Notify parent (via email or dashboard) that video is ready for review

**Testing**:
- Display final merged video
- Display customization summary
- Edit button functionality
- Submit functionality
- Edition styling

---

#### 2.10 Success Screen
**Path**: `screens/VideoSuccess.js`

**Purpose**: Confirmation that thank you video was submitted

**Layout**:
```
[Large Success Icon] 🎉

[Title: "Thank You Submitted!"]

[Message Box]
"Great job recording your thank you!
[Parent Name] will review your video
and share it with guests.

You can record more thank yous
for your other gifts anytime!"

[Gift Summary]
Gift: [Name]
From: [Giver]
Status: ⏳ Parent reviewing...

[Buttons]

[Record Another - ThankCastButton]
└── Go back to gifts list

[All Done! - ThankCastSecondaryButton]
└── Logout and come back later
```

**User Story**:
- After submit, kid sees success confirmation
- Can choose to record another thank you
- Or logout and come back later
- Parent will be notified of new video

**Component Requirements**:
- Success icon
- Message display
- `ThankCastButton` and `ThankCastSecondaryButton`

**Testing**:
- Display confirmation message
- Button navigation
- Edition styling

---

### 3. SHARED/REUSABLE COMPONENTS

These components are used across multiple screens:

#### 3.1 TextField
**Path**: `components/TextField.js`

- Edition-aware text input (different padding/height for kids vs adult)
- Props: placeholder, value, onChangeText, editable, secureTextEntry, keyboardType, validation
- Shows validation errors
- Kids edition: taller, rounder, friendlier

#### 3.2 Dropdown/Picker
**Path**: `components/Picker.js`

- Select from list of options
- Edition-aware styling
- Props: items, selectedValue, onValueChange, placeholder

#### 3.3 DatePicker
**Path**: `components/DatePicker.js`

- Pick date for events
- Kids edition: large calendar, friendly colors
- Adult edition: compact calendar
- Props: date, onDateChange, minDate, maxDate

#### 3.4 Modal/Dialog
**Path**: `components/Modal.js`

- Reusable modal for confirmations, forms, alerts
- Props: visible, onClose, title, children, buttons
- Kids edition: larger, friendlier
- Adult edition: elegant

#### 3.5 Card Components
**Path**: `components/EventCard.js`, `components/GiftCard.js`, `components/VideoCard.js`

- Display event, gift, or video information
- Edition-aware styling and spacing
- Reusable across dashboard and kid screens

#### 3.6 AppBar
**Path**: `components/AppBar.js`

- Header with title, back button, menu
- Edition-aware styling
- Props: title, onBackPress, menuItems, rightButton

#### 3.7 VideoPlayer
**Path**: `components/VideoPlayer.js`

- Play videos with standard controls
- Full-screen support
- Props: source, paused, onPlayPauseToggle, onFullscreenToggle

#### 3.8 LoadingSpinner
**Path**: `components/LoadingSpinner.js`

- Show loading state
- Edition-aware colors and size
- Props: visible, message

#### 3.9 ErrorMessage
**Path**: `components/ErrorMessage.js`

- Display error messages
- Props: message, onDismiss

#### 3.10 SuccessMessage
**Path**: `components/SuccessMessage.js`

- Display success messages
- Props: message, duration, onDismiss

---

## Infrastructure Requirements

### 1. Font Installation
```bash
npm install expo-google-fonts/nunito
npm install expo-google-fonts/playfair-display
npm install expo-google-fonts/montserrat
npm install expo-google-fonts/inter
npm install expo-font
```

### 2. Update App.js
- Wrap entire app with `EditionProvider`
- Add font loading with `expo-font`
- Setup navigation structure
- Initialize Supabase client

### 3. Navigation Structure
```
App.js (EditionProvider)
├── AuthStack (when not logged in)
│   ├── ParentSignup
│   ├── ParentLogin
│   └── ForgotPassword (future)
│
├── ParentStack (when parent logged in)
│   ├── ParentDashboard (home)
│   ├── EventManagement
│   ├── GiftManagement
│   ├── GuestManagement
│   ├── VideoReview
│   └── SendToGuests
│
└── KidStack (when kid logged in)
    ├── KidPendingGifts (home)
    ├── GiftOpeningPreview
    ├── VideoRecording
    ├── VideoPlayback
    ├── MusicSelection
    ├── VideoCustomization
    ├── VideoConfirmation
    └── VideoSuccess
```

### 4. Supabase Integration
- Deploy `supabase-schema-phase2.sql` to Supabase
- Setup Row-Level Security (RLS) policies
- Initialize `supabaseClient.js` (already exists)
- Test auth flow with Supabase Auth

### 5. Email Service
- Setup SendGrid account
- Create email templates for:
  - Welcome email (parent signup)
  - Video ready for review (parent)
  - Video shared (guest)
  - Re-record request (kid notification)
- Implement `services/emailService.js` (partially exists)

### 6. Error Handling & Toast Notifications
- Create toast notification system
- Global error handling
- Network error handling
- Form validation with user-friendly messages

---

## User Stories by Priority

### Priority 1 (Must Have - Blocks Testing)
- [ ] Parent Signup/Login
- [ ] Parent Dashboard (events list)
- [ ] Kid PIN Login
- [ ] Kid Pending Gifts List
- [ ] Video Recording Screen
- [ ] Video Merge (automatic)
- [ ] Video Review & Approval

### Priority 2 (Should Have - MVP Complete)
- [ ] Event Management
- [ ] Gift Management
- [ ] Music Selection
- [ ] Video Customization
- [ ] Send to Guests

### Priority 3 (Nice to Have - Polish)
- [ ] Guest Management with CSV import
- [ ] Gift Opening Preview (optional for kids)
- [ ] Advanced video customization (transitions, text overlays)
- [ ] Parent Settings/Profile management
- [ ] Analytics & insights

---

## Testing Plan

### Unit Tests
- Form validation logic
- Video merge service
- Music library filtering
- PIN validation logic
- Edition-aware theming

### Integration Tests
- Parent signup → login → dashboard flow
- Kid PIN login → pending gifts → recording flow
- Video merge process
- Email sending
- Supabase CRUD operations

### UI/UX Tests
- Button styling across editions
- Responsive layout across screen sizes
- Loading states
- Error messages
- Navigation between screens

### Edition Testing
- All screens look correct in Kids edition
- All screens adapt to Wedding edition
- All screens adapt to Pro edition
- Feature flags work correctly

### COPPA Compliance
- Parental consent required for signup
- PIN login security
- Session timeout (30 min)
- Max login attempts with lockout
- No tracking/analytics without consent
- Data retention policies

### Performance
- Video upload/download speed
- Video merge processing time
- App startup time
- Memory usage during video recording
- Database query performance

---

## Estimated Timeline

```
Week 1: Infrastructure & Components
├── Font installation
├── EditionProvider integration in App.js
├── Navigation structure setup
├── Create all reusable components (TextField, Modal, Cards, etc.)
└── Setup Supabase schema and auth

Week 2: Parent Auth & Dashboard
├── Parent Signup screen
├── Parent Login screen
├── Parent Dashboard (events list)
├── Event Management screen
└── Testing

Week 3: Gift & Video Management
├── Gift Management screen
├── Guest Management screen (basic)
├── Video Review screen
└── Send to Guests screen

Week 4: Kid Recording Flow
├── Kid PIN Login screen
├── Kid Pending Gifts list
├── Video Recording screen
├── Video Playback screen
└── Video Merge preview

Week 5: Video Customization
├── Music Selection screen
├── Video Customization screen
├── Video Confirmation screen
├── Video Success screen
└── Integration testing

Week 6: Polish & Deployment
├── Bug fixes and refinement
├── Cross-edition testing
├── COPPA compliance verification
├── Performance optimization
├── Deploy to GitHub
└── Beta testing setup
```

**Estimated Total**: 4-6 weeks for solo developer

---

## Dependencies

### Existing (Already Installed)
- ✅ expo & React Native
- ✅ expo-camera (video recording)
- ✅ expo-av (video playback)
- ✅ expo-linear-gradient (for button gradients)
- ✅ @supabase/supabase-js
- ✅ @expo/vector-icons

### Need to Install
- expo-google-fonts (Nunito, Playfair, Montserrat, Inter)
- expo-font (load fonts)
- react-native-picker (dropdown)
- react-native-date-picker (date picker)

### Already Built (Phase 1)
- ✅ ThankCast Design System (`theme/thankcast-design-system.js`)
- ✅ EditionContext (`context/EditionContext.js`)
- ✅ ThankCastButton components (`components/ThankCastButton.js`)
- ✅ VideoMergeService (`services/videoMergeService.js`)
- ✅ MusicLibraryService (`services/musicLibraryService.js`)
- ✅ Supabase Schema (`supabase-schema-phase2.sql`)

---

## Next Steps

1. ✅ **Install Fonts**
   ```bash
   npm install expo-google-fonts/nunito expo-google-fonts/playfair-display expo-google-fonts/montserrat expo-google-fonts/inter expo-font
   ```

2. ✅ **Update App.js with EditionProvider**
   - Wrap app with EditionProvider
   - Load fonts on startup
   - Setup navigation

3. ✅ **Create reusable components**
   - TextField
   - Modal
   - Card components
   - AppBar

4. ✅ **Build Priority 1 screens**
   - Parent Signup/Login
   - Parent Dashboard
   - Kid PIN Login
   - Video Recording

5. ✅ **Test end-to-end flows**
   - Parent signup → Dashboard
   - Kid PIN login → Recording → Submit

6. ✅ **Build remaining screens**
   - Priority 2: Event/Gift/Guest management
   - Priority 3: Advanced customization

7. ✅ **Final testing & deployment**
   - Cross-edition testing
   - COPPA compliance check
   - Performance optimization
   - Commit and push to GitHub

---

**Status**: Ready to Begin Phase 2 Implementation 🚀

All infrastructure from Phase 1 is complete. Phase 2 scope is fully defined and ready for development.

