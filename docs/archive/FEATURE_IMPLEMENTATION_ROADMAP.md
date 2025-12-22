# Feature Implementation Roadmap

Complete checklist for implementing all GratituGram features from core to advanced.

---

## Project Phases

```
PHASE 1: Core App (Current - In Progress)
├── Parent & Kid Authentication ✅ (DONE)
├── Child Management ✅ (DONE)
├── Event & Gift Creation 📋 (Needs verification)
└── Video Recording (Recording only - not editing)

PHASE 2: Video Features (Next Priority)
├── Video Upload & Storage
├── Video Decorations (Stickers, Text, Filters)
├── Video Approval Workflow
└── Parent Dashboard with Video Approval

PHASE 3: AI Features (Medium Priority)
├── Sentiment Analysis
├── Scene Detection
├── Speech-to-Text Transcription
└── Face Detection

PHASE 4: Bulk Operations (Lower Priority)
├── CSV Import (Children, Events, Gifts)
├── JSON/CSV Export
└── Batch Processing

PHASE 5: Advanced Features (Future)
├── Video Sharing
├── Comment System
├── Analytics Dashboard
├── Social Features
└── Mobile Optimizations
```

---

## Phase 1: Core App - Completion Checklist

### Authentication ✅

- [x] Parent signup with email/password
- [x] Parent login
- [x] Parent logout
- [x] Kid access code login (7-character codes)
- [x] Kid logout
- [x] Session persistence
- [x] RLS policies for data isolation

### Child Management ✅

- [x] Parent creates children
- [x] Parent edits child name/age
- [x] Parent deletes child
- [x] Children list with access codes
- [x] Share access code functionality
- [x] Access code auto-generation (ALI5821 format)
- [x] Access code uniqueness constraint

### Events & Gifts 📋

**Database**:
- [ ] Verify EVENT table structure
- [ ] Verify GIFT table structure
- [ ] Verify foreign key relationships
- [ ] Test cascading deletes

**Parent UI**:
- [ ] Events tab/screen in ParentDashboard
- [ ] Create event modal
- [ ] Edit event functionality
- [ ] Delete event functionality
- [ ] Display event list with sorting
- [ ] Add gifts to event
- [ ] Edit gifts
- [ ] Delete gifts
- [ ] Display gift list with order

**Testing**:
- [ ] Can create event
- [ ] Can add gift to event
- [ ] Can edit/delete event
- [ ] Can edit/delete gift
- [ ] Gifts linked to events correctly
- [ ] Parent can see only their events

### Video Recording (Basic)

- [ ] Camera component integration
- [ ] Record video to device
- [ ] Video preview
- [ ] Retake functionality
- [ ] Storage of video URI
- [ ] Max duration validation (5 minutes)
- [ ] Min duration validation (5 seconds)

---

## Phase 2: Video Features - Implementation Checklist

### Video Upload & Storage

```sql
-- Verify table structure
CREATE TABLE public.videos (
  id UUID PRIMARY KEY,
  child_id UUID REFERENCES public.children(id),
  gift_id UUID REFERENCES public.gifts(id),
  parent_id UUID REFERENCES public.parents(id),
  event_id UUID REFERENCES public.events(id),
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  status VARCHAR(50),
  duration_seconds INT,
  file_size_bytes INT,
  created_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ
);
```

**Implementation Tasks**:
- [ ] Create video compression service
  - [ ] Compress to 720p resolution
  - [ ] Target 2-5 Mbps bitrate
  - [ ] Limit to 50MB file size
  - [ ] Support H264/AAC codecs

- [ ] Create video upload service
  - [ ] Upload to Supabase storage
  - [ ] Generate thumbnail
  - [ ] Save metadata to database
  - [ ] Handle upload errors
  - [ ] Show upload progress

- [ ] Create VideoUploadScreen component
  - [ ] Progress indicator
  - [ ] Success/error feedback
  - [ ] Retry functionality
  - [ ] Navigation after upload

**Dependencies**:
- [ ] `expo-video-compression` or similar
- [ ] `react-native-progress` for progress bar
- [ ] Supabase storage bucket created

---

### Video Decorations (Stickers, Text, Filters)

```sql
-- Create decorations table
CREATE TABLE public.video_decorations (
  id UUID PRIMARY KEY,
  video_id UUID REFERENCES public.videos(id),
  decoration_type VARCHAR(50),
  decoration_data JSONB,
  layer_order INT,
  visible BOOLEAN,
  created_at TIMESTAMPTZ
);
```

**Sticker Feature**:
- [ ] Create sticker library component
  - [ ] Display sticker categories (holidays, everyday, reactions)
  - [ ] Search functionality
  - [ ] Sticker picker modal
  - [ ] Show preview on video

- [ ] Create sticker placement UI
  - [ ] Drag to position on video
  - [ ] Pinch to scale
  - [ ] Rotate (optional)
  - [ ] Delete sticker

- [ ] Create sticker data structure
  - [ ] Store sticker ID, position, scale
  - [ ] Save to video_decorations table
  - [ ] Support multiple stickers per video

- [ ] Create sticker assets
  - [ ] Design 20+ stickers (PNG with transparency)
  - [ ] Upload to Supabase storage
  - [ ] Create thumbnail versions

**Dependencies**:
- [ ] Design sticker collection
- [ ] `react-native-gesture-handler` for gestures
- [ ] Canvas/SVG library for rendering

**Text Overlay Feature**:
- [ ] Create text editor modal
  - [ ] Text input field
  - [ ] Font size slider
  - [ ] Color picker
  - [ ] Font family selection
  - [ ] Text alignment (left, center, right)

- [ ] Text placement on video
  - [ ] Drag to position
  - [ ] Pinch to scale
  - [ ] Shadow/outline options

- [ ] Save text data
  - [ ] Store text, font, size, color, position
  - [ ] Save to video_decorations table

**Filter Feature**:
- [ ] Create filter picker
  - [ ] Display filter options (warm, cool, vintage, bw, sepia, vivid, holiday)
  - [ ] Show preview on thumbnail
  - [ ] Intensity slider (0-100%)

- [ ] Apply filters
  - [ ] Warm (increase red/yellow)
  - [ ] Cool (increase blue)
  - [ ] Vintage (reduce saturation, add grain)
  - [ ] Black & White (remove color)
  - [ ] Sepia (brown tint)

- [ ] Filter rendering
  - [ ] Use FFmpeg for video filters, OR
  - [ ] Use React Native Image Filter for preview

**Dependencies**:
- [ ] Design filter algorithms
- [ ] `react-native-image-filter` or similar
- [ ] FFmpeg integration for video filters

---

### Video Approval Workflow

```sql
-- Video status enum
ENUM video_status AS ('draft', 'pending_approval', 'approved', 'rejected');
```

**Parent Approval Screen**:
- [ ] Create VideoApprovalScreen component
  - [ ] List of pending videos
  - [ ] Video playback with controls
  - [ ] Video metadata (child name, gift, event)
  - [ ] Approve button
  - [ ] Reject button (with optional reason)
  - [ ] Previous/next navigation

- [ ] Implement approval logic
  - [ ] Approve: Set status = 'approved', set approved_at timestamp
  - [ ] Reject: Delete video, optionally notify child
  - [ ] Hold: Keep as pending for later

- [ ] Create approval notification
  - [ ] Show in dashboard badge (number of pending)
  - [ ] Optional push notification
  - [ ] Link to approval screen

**Child Video Status**:
- [ ] Show approved videos in "Approved Videos" tab
- [ ] Show pending videos in separate list
- [ ] Option to re-record if rejected

**Database Updates**:
- [ ] Add approved_at timestamp
- [ ] Add rejection_reason (optional)
- [ ] Add approver_id (parent who approved)

---

### Parent Dashboard Video Tab

- [ ] Create Videos tab in ParentDashboard
  - [ ] List pending approval videos
  - [ ] Show count of pending
  - [ ] Show count of approved
  - [ ] Filter by child/event
  - [ ] Sort by date
  - [ ] Quick actions (approve/reject)

- [ ] Video analytics
  - [ ] Total videos recorded
  - [ ] Videos approved/pending/rejected
  - [ ] Most recent videos
  - [ ] Most prolific child

---

## Phase 3: AI Features - Implementation Checklist

### Sentiment Analysis

**Setup**:
- [ ] Choose AI service
  - [ ] Google Cloud Video AI
  - [ ] Replicate API
  - [ ] AWS Rekognition
  - [ ] Custom ML model

**Implementation**:
- [ ] Create API integration
  - [ ] Send video URL to AI service
  - [ ] Receive sentiment results
  - [ ] Parse response into standard format

- [ ] Store results
  ```sql
  ALTER TABLE public.videos ADD COLUMN ai_sentiment JSONB;
  -- Example: {"sentiment": "positive", "confidence": 0.92, "emotions": {...}}
  ```

- [ ] Display in dashboard
  - [ ] Show sentiment emoji (😊 for positive)
  - [ ] Show confidence percentage
  - [ ] Show emotion breakdown (joy, gratitude, excitement, etc.)
  - [ ] Aggregate sentiment stats

**Testing**:
- [ ] Test with sample videos
- [ ] Verify sentiment accuracy
- [ ] Check API latency
- [ ] Handle API failures gracefully

---

### Scene Detection

**Implementation**:
- [ ] Integrate Google Cloud Vision API
  - [ ] Detect objects in video frames
  - [ ] Identify scenes (living room, kitchen, outdoor)
  - [ ] Detect activities

- [ ] Store results
  ```sql
  ALTER TABLE public.videos ADD COLUMN ai_scenes JSONB;
  -- Example: {"objects": [...], "setting": "living room", "activities": [...]}
  ```

- [ ] Display insights
  - [ ] Show detected objects
  - [ ] Show confidence scores
  - [ ] Suggest content (e.g., "recorded in bedroom")

---

### Speech-to-Text Transcription

**Setup**:
- [ ] Choose transcription service
  - [ ] Google Cloud Speech-to-Text (best quality)
  - [ ] AWS Transcribe
  - [ ] Replicate Whisper

**Implementation**:
- [ ] Create transcription service
  - [ ] Send video/audio to transcription API
  - [ ] Receive transcript with timestamps
  - [ ] Handle different languages (optional)

- [ ] Store transcript
  ```sql
  ALTER TABLE public.videos ADD COLUMN transcript TEXT;
  ALTER TABLE public.videos ADD COLUMN transcript_segments JSONB;
  -- Example segments: [{text: "Thank you", start: 0.5, end: 1.2, confidence: 0.95}]
  ```

- [ ] Display in dashboard
  - [ ] Show full transcript
  - [ ] Show word-by-word confidence
  - [ ] Option to edit transcript (manual correction)
  - [ ] Search transcripts

- [ ] Generate captions
  - [ ] Create SRT file from segments
  - [ ] Display captions during video playback
  - [ ] Optional caption styling

---

### Face Detection

**Implementation**:
- [ ] Integrate Google Cloud Vision API
  - [ ] Detect faces in video frames
  - [ ] Get face count and visibility

**Privacy Note**:
- [ ] Never store facial recognition data
- [ ] Never identify individuals
- [ ] Only detect presence and visibility

**Storage**:
```sql
ALTER TABLE public.videos ADD COLUMN ai_face_detection JSONB;
-- Example: {"faces_detected": true, "face_count": 1, "visible_percentage": 0.85}
```

**Display**:
- [ ] Show face visibility percentage
- [ ] Use for content moderation (ensure child visible)
- [ ] Flag if no faces detected (quality check)

---

## Phase 4: Bulk Operations - Implementation Checklist

### CSV Import

**Children Import**:
- [ ] Create CSV import screen
- [ ] Parse CSV file (papaparse library)
- [ ] Validate children data
  - [ ] Name: required, max 100 chars
  - [ ] Age: 1-18
  - [ ] Duplicate check
- [ ] Insert children into database
- [ ] Generate access codes automatically
- [ ] Show import results (success/fail)

**Events Import**:
- [ ] Parse events CSV
- [ ] Validate event data
  - [ ] Title: required
  - [ ] Date: valid ISO 8601 format
  - [ ] Check for duplicates
- [ ] Insert events
- [ ] Show results

**Gifts Import**:
- [ ] Parse gifts CSV
- [ ] Link gifts to events by title
- [ ] Validate gift data
  - [ ] Event must exist
  - [ ] Gift name: required
- [ ] Insert gifts with correct event_id
- [ ] Show results

**Error Handling**:
- [ ] Show validation errors before import
- [ ] Allow user to fix and retry
- [ ] Show which rows failed during import
- [ ] Option to skip and continue

---

### Export Functionality

**CSV Export**:
- [ ] Export children
  - [ ] Format: name, age, access_code, created_at
  - [ ] Download to device
  - [ ] Share functionality

- [ ] Export events
  - [ ] Format: title, description, date, gifts_count
  - [ ] Include child associations

- [ ] Export videos (with metadata)
  - [ ] Format: child_name, gift_name, status, date, duration
  - [ ] Include AI results if available

**JSON Export**:
- [ ] Export complete data structure
  - [ ] All children
  - [ ] All events
  - [ ] All gifts
  - [ ] All videos with metadata
  - [ ] Include timestamps

- [ ] Backup functionality
  - [ ] Export for backup/archival
  - [ ] Import from backup (future)

---

## Dependency & Library Checklist

### Core Libraries

- [ ] `react-native`: ^0.73.0
- [ ] `expo`: ^50.0.0
- [ ] `@react-navigation/native`: ^6.0
- [ ] `@supabase/supabase-js`: ^2.0

### Video & Media

- [ ] `expo-camera`: ^13.0
- [ ] `expo-video`: For video playback
- [ ] `react-native-video`: Alternative video player
- [ ] `react-native-video-compress`: Video compression
- [ ] OR `ffmpeg-kit-react-native`: More control

### UI & Gestures

- [ ] `react-native-gesture-handler`: ^2.0
- [ ] `react-native-reanimated`: Smooth animations
- [ ] `@react-native-picker/picker`: For dropdowns
- [ ] `react-native-image-picker`: File selection

### CSV & Data

- [ ] `papaparse`: ^5.4 - CSV parsing
- [ ] `uuid`: ^9.0 - Generate UUIDs
- [ ] `date-fns`: Date utilities

### AI & APIs

- [ ] `@google-cloud/video-intelligence`: Google Video AI
- [ ] `replicate`: Replicate API client (if using)
- [ ] `axios`: HTTP client for APIs

### Storage & File System

- [ ] `expo-file-system`: File operations
- [ ] `expo-sharing`: Share files
- [ ] `expo-document-picker`: File picker

### Image Processing

- [ ] `react-native-image-filter`: Apply filters
- [ ] `react-native-svg`: SVG rendering
- [ ] `rn-fetch-blob`: Blob operations (if needed)

---

## NPM Installation Commands

```bash
# Core additions
npm install papaparse uuid date-fns axios

# Video & Media
expo install expo-video react-native-video
npm install react-native-video-compress  # or ffmpeg-kit-react-native

# Gestures
expo install react-native-gesture-handler react-native-reanimated

# UI Components
expo install @react-native-picker/picker
expo install react-native-image-picker

# AI APIs (choose one)
npm install google-cloud/video-intelligence  # Google
npm install replicate  # Replicate

# File Operations
expo install expo-file-system expo-sharing expo-document-picker

# Image Processing
npm install react-native-image-filter react-native-svg rn-fetch-blob
```

---

## File Structure for New Features

```
GratituGram/
├── screens/
│   ├── VideoRecordingScreen.js           (NEW - Phase 2)
│   ├── VideoDecoratorScreen.js           (NEW - Phase 2)
│   ├── VideoApprovalScreen.js            (NEW - Phase 2)
│   ├── VideoViewerScreen.js              (NEW - Phase 2)
│   ├── CSVImportScreen.js                (NEW - Phase 4)
│   └── ExportScreen.js                   (NEW - Phase 4)
├── components/
│   ├── StickerPicker.js                  (NEW - Phase 2)
│   ├── TextEditor.js                     (NEW - Phase 2)
│   ├── FilterPicker.js                   (NEW - Phase 2)
│   ├── VideoPreviewWithDecorations.js    (NEW - Phase 2)
│   └── VideoCard.js                      (NEW - Phase 2)
├── services/
│   ├── videoService.js                   (NEW - Phase 2)
│   ├── videoCompressionService.js        (NEW - Phase 2)
│   ├── aiService.js                      (NEW - Phase 3)
│   ├── csvImportService.js               (NEW - Phase 4)
│   ├── exportService.js                  (NEW - Phase 4)
│   └── api/
│       ├── index.js                      (NEW - Phase 3)
│       ├── stubbed.js                    (NEW - Phase 3)
│       └── production.js                 (NEW - Phase 3)
├── decorationLibrary/
│   ├── stickers.js                       (NEW - Phase 2)
│   └── filters.js                        (NEW - Phase 2)
└── types/
    └── decorations.ts                    (NEW - Phase 2)
```

---

## Testing Strategy

### Phase 1 Testing (Core App)
```javascript
// Unit tests
- [ ] Access code generation uniqueness
- [ ] Age validation (1-18)
- [ ] Email validation
- [ ] Authentication flow

// Integration tests
- [ ] Parent signup → login → create child
- [ ] Child login with access code
- [ ] Create event → add gift → child sees gift
- [ ] Session persistence

// E2E tests
- [ ] Complete parent workflow
- [ ] Complete child workflow
- [ ] Device linking (parent device + kid device)
```

### Phase 2 Testing (Video)
```javascript
// Video recording tests
- [ ] Record video 5-300 seconds
- [ ] Compression works
- [ ] Upload succeeds
- [ ] Database record created

// Decoration tests
- [ ] Add sticker → position → render
- [ ] Add text → change font → render
- [ ] Apply filter → see preview
- [ ] Save decorations to DB

// Approval workflow tests
- [ ] Parent sees pending video
- [ ] Approve → status changes
- [ ] Reject → video removed
- [ ] Child sees approved videos
```

### Phase 3 Testing (AI)
```javascript
// AI integration tests (using stubbed APIs)
- [ ] Queue video for processing
- [ ] Check processing status
- [ ] Receive sentiment results
- [ ] Display results in dashboard
- [ ] Handle API failures

// Real API tests (when ready)
- [ ] Send real video to API
- [ ] Verify result quality
- [ ] Check API latency
- [ ] Test quota limits
```

### Phase 4 Testing (CSV)
```javascript
// CSV import tests
- [ ] Valid CSV imports successfully
- [ ] Invalid CSV shows errors
- [ ] Duplicate detection works
- [ ] Data validates correctly
- [ ] Access codes generated

// Export tests
- [ ] CSV export downloads
- [ ] JSON export valid structure
- [ ] Share functionality works
- [ ] Export includes all data
```

---

## Estimated Timeline

| Phase | Features | Effort | Timeline |
|-------|----------|--------|----------|
| 1 | Core auth, children, events | 40 hours | ✅ 1-2 weeks (in progress) |
| 2 | Video recording, decorations | 60 hours | 2-3 weeks |
| 3 | AI sentiment, transcription | 40 hours | 2-3 weeks |
| 4 | CSV import, exports | 30 hours | 1-2 weeks |
| **Total** | | **170 hours** | **6-10 weeks** |

---

## Success Metrics

- [ ] Phase 1: Parents can create children, events, gifts; kids can log in
- [ ] Phase 2: Kids can record decorated videos; parents can approve
- [ ] Phase 3: AI provides insights (sentiment, transcript, scenes)
- [ ] Phase 4: Parents can bulk import and export data
- [ ] Overall: App has <2s load time, <1% crash rate, >95% test coverage

---

## Next Actions (Immediate)

1. **Today**:
   - [ ] Verify Phase 1 completion (events, gifts, basic video recording)
   - [ ] Test complete parent → child workflow
   - [ ] Deploy Phase 1 to production

2. **This Week**:
   - [ ] Start Phase 2 planning
   - [ ] Design sticker library
   - [ ] Set up video compression

3. **Next Week**:
   - [ ] Implement VideoRecordingScreen
   - [ ] Implement VideoDecoratorScreen
   - [ ] Set up video upload

---

**All features documented. Ready for implementation. Good night!** 🌙
