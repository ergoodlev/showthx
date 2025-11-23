# Video Structure & Features Specification

Complete specification for video recording, decorations, AI features, and integrations.

---

## Video Processing Pipeline

```
┌──────────────────────────────────────────────────────────────┐
│                    KID RECORDS VIDEO                          │
│          (VideoRecordingScreen component)                     │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         ▼
        ┌────────────────────────────────┐
        │  Video Saved to Device         │
        │  - Format: MP4 or MOV          │
        │  - Codec: H264 video/AAC audio │
        │  - Temporary: /cache/videos/   │
        └────────────────────┬───────────┘
                             │
                             ▼
        ┌────────────────────────────────────────┐
        │  Video OPTIONAL: Apply Decorations     │
        │  (DecorationEditorScreen component)    │
        │  - Stickers                            │
        │  - Text overlays                       │
        │  - Filters                             │
        │  - Borders/frames                      │
        └────────────────────┬───────────────────┘
                             │
                             ▼
        ┌────────────────────────────────────────┐
        │  Render Decorated Video (if needed)    │
        │  - Composite decorations onto video    │
        │  - Use FFmpeg or React Native libraries│
        │  - Output: /cache/videos/decorated.mp4 │
        └────────────────────┬───────────────────┘
                             │
                             ▼
        ┌────────────────────────────────────────┐
        │  Compress Video                        │
        │  - Resolution: 720p (1280x720)         │
        │  - Bitrate: 2-5 Mbps                   │
        │  - Optimize for mobile                 │
        └────────────────────┬───────────────────┘
                             │
                             ▼
        ┌────────────────────────────────────────┐
        │  Upload to Supabase Storage            │
        │  - Path: gs://bucket/videos/[UUID].mp4 │
        │  - Thumbnail generated                 │
        │  - Metadata stored in DB               │
        └────────────────────┬───────────────────┘
                             │
                             ▼
        ┌────────────────────────────────────────┐
        │  OPTIONAL: AI Processing               │
        │  - Sentiment analysis                  │
        │  - Scene detection                     │
        │  - Speech-to-text transcription        │
        │  - Face detection (privacy-safe)       │
        └────────────────────┬───────────────────┘
                             │
                             ▼
        ┌────────────────────────────────────────┐
        │  Save to Database                      │
        │  - Status: 'pending_approval'          │
        │  - Duration, file size, metadata       │
        │  - AI results (if processed)           │
        └────────────────────┬───────────────────┘
                             │
                             ▼
        ┌────────────────────────────────────────┐
        │  Parent Reviews in Dashboard           │
        │  - Watch video                         │
        │  - View AI insights (optional)         │
        │  - Approve/reject                      │
        └────────────────────┬───────────────────┘
                             │
                      ┌──────┴──────┐
                      │             │
                      ▼             ▼
              ┌────────────┐  ┌─────────────┐
              │  APPROVED  │  │  REJECTED   │
              │ status=OK  │  │ Delete file │
              │ approved_at│  │ & DB record │
              └────────────┘  └─────────────┘
```

---

## Video Recording Implementation

### VideoRecordingScreen Component

```javascript
// screens/VideoRecordingScreen.js

export const VideoRecordingScreen = ({ route, navigation }) => {
  const { gift, event, child } = route.params;
  const [recording, setRecording] = useState(false);
  const [videoUri, setVideoUri] = useState(null);
  const [duration, setDuration] = useState(0);
  const [preview, setPreview] = useState(false);

  const cameraRef = useRef(null);

  const startRecording = async () => {
    if (!cameraRef.current) return;

    try {
      setRecording(true);
      const video = await cameraRef.current.recordAsync({
        quality: '1080p',  // or best available
        maxFileSize: 500 * 1024 * 1024,  // 500MB limit
        maxDuration: 300,  // 5 minutes max
      });

      setVideoUri(video.uri);
      setDuration(video.duration);
      setPreview(true);
    } catch (error) {
      console.error('Recording error:', error);
      Alert.alert('Recording Failed', error.message);
    } finally {
      setRecording(false);
    }
  };

  const stopRecording = async () => {
    if (cameraRef.current) {
      await cameraRef.current.stopAndPausePreview();
    }
  };

  const handleSubmit = async () => {
    // Compress video before upload
    const compressedUri = await compressVideo(videoUri);

    // Navigate to decorator OR upload directly
    navigation.navigate('VideoDecorator', {
      videoUri: compressedUri,
      gift,
      event,
      child
    });
  };

  return (
    <View style={{ flex: 1 }}>
      {!preview ? (
        <>
          <Camera
            ref={cameraRef}
            style={{ flex: 1 }}
            type={CameraType.front}
            ratio="16:9"
          >
            {/* Recording UI */}
            <View style={styles.recordingControls}>
              <TouchableOpacity
                onPress={recording ? stopRecording : startRecording}
                style={[
                  styles.recordButton,
                  { backgroundColor: recording ? '#FF6B6B' : '#4ECDC4' }
                ]}
              >
                <Ionicons
                  name={recording ? 'stop' : 'radio-button-on'}
                  size={32}
                  color="white"
                />
              </TouchableOpacity>
              <Text style={styles.timer}>
                {Math.floor(duration / 60)}:{(duration % 60).toString().padStart(2, '0')}
              </Text>
            </View>
          </Camera>
        </>
      ) : (
        <>
          {/* Video Preview */}
          <Video
            source={{ uri: videoUri }}
            style={{ flex: 1 }}
            controls
            resizeMode="contain"
          />
          <View style={styles.previewControls}>
            <TouchableOpacity
              onPress={() => setPreview(false)}
              style={styles.retakeButton}
            >
              <Text>Retake</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSubmit}
              style={styles.submitButton}
            >
              <Text>Next</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
};

// Video compression function
const compressVideo = async (videoUri) => {
  try {
    const compressedVideo = await VideoCompression.compress(
      videoUri,
      {
        compressionMethod: 'auto',
        maxSize: 15,  // Max 15MB
        quality: 'high',
        saveInFile: false,
      }
    );
    return compressedVideo.uri;
  } catch (error) {
    console.error('Compression error:', error);
    return videoUri;  // Return original if compression fails
  }
};
```

---

## Video Decoration System

### Decoration Types & Data Structure

```javascript
// Each decoration has type-specific data

// 1. STICKER DECORATION
{
  decoration_type: 'sticker',
  decoration_data: {
    sticker_id: 'santa-hat-001',
    sticker_name: 'Santa Hat',
    sticker_url: 'gs://bucket/stickers/santa-hat.png',
    x: 150,              // pixels from left
    y: 50,               // pixels from top
    width: 100,          // pixels
    height: 100,         // pixels
    scale: 1.0,          // zoom factor
    rotation: 0,         // degrees
    opacity: 1.0,        // 0-1
    flipped: false       // horizontal flip
  }
}

// 2. TEXT DECORATION
{
  decoration_type: 'text',
  decoration_data: {
    text: 'Happy Holiday!',
    x: 50,
    y: 100,
    font_size: 32,
    font_family: 'Montserrat_Bold',
    color: '#FF0000',    // hex color
    background_color: null,
    background_padding: 0,
    shadow: true,
    shadow_color: '#000000',
    shadow_blur: 5,
    text_align: 'center', // center, left, right
    max_width: 300,      // wrap width
    rotation: 0,
    opacity: 1.0
  }
}

// 3. FILTER DECORATION
{
  decoration_type: 'filter',
  decoration_data: {
    filter_name: 'warm',  // warm, cool, vintage, bw, sepia
    intensity: 0.8,       // 0-1
    brightness_adj: 0,    // -100 to +100
    contrast_adj: 0,      // -100 to +100
    saturation_adj: 0     // -100 to +100
  }
}

// 4. BORDER/FRAME DECORATION
{
  decoration_type: 'border',
  decoration_data: {
    border_style: 'rounded',  // rounded, dashed, double, gold
    border_width: 10,
    border_color: '#FFD700',
    corner_radius: 20,
    padding: 5,
    shadow: true
  }
}

// 5. EMOJI DECORATION
{
  decoration_type: 'emoji',
  decoration_data: {
    emoji: '🎄',
    x: 300,
    y: 200,
    size: 100,           // base emoji size in pixels
    scale: 1.0,
    rotation: 0,
    opacity: 1.0
  }
}
```

### VideoDecoratorScreen Component

```javascript
// screens/VideoDecoratorScreen.js

export const VideoDecoratorScreen = ({ route, navigation }) => {
  const { videoUri, gift, event, child } = route.params;
  const [decorations, setDecorations] = useState([]);
  const [selectedTool, setSelectedTool] = useState(null);  // 'sticker', 'text', 'filter'
  const [showPreview, setShowPreview] = useState(true);

  const addSticker = (stickerData) => {
    setDecorations([
      ...decorations,
      {
        id: uuid.v4(),
        type: 'sticker',
        data: stickerData,
        layer_order: decorations.length
      }
    ]);
  };

  const addText = (textData) => {
    setDecorations([
      ...decorations,
      {
        id: uuid.v4(),
        type: 'text',
        data: textData,
        layer_order: decorations.length
      }
    ]);
  };

  const addFilter = (filterData) => {
    // Filters replace previous filter (only one filter per video)
    const withoutFilter = decorations.filter(d => d.type !== 'filter');
    setDecorations([
      ...withoutFilter,
      {
        id: uuid.v4(),
        type: 'filter',
        data: filterData,
        layer_order: decorations.length
      }
    ]);
  };

  const removeDecoration = (decorationId) => {
    setDecorations(decorations.filter(d => d.id !== decorationId));
  };

  const updateDecoration = (decorationId, newData) => {
    setDecorations(decorations.map(d =>
      d.id === decorationId ? { ...d, data: newData } : d
    ));
  };

  const handleSubmit = async () => {
    // If decorations exist, render them onto video
    let finalVideoUri = videoUri;

    if (decorations.length > 0) {
      try {
        setLoading(true);
        finalVideoUri = await renderDecorationsOnVideo(videoUri, decorations);
      } catch (error) {
        console.error('Rendering error:', error);
        // Continue with undecorated video
      }
    }

    // Upload video
    navigation.navigate('VideoUpload', {
      videoUri: finalVideoUri,
      decorations,
      gift,
      event,
      child
    });
  };

  return (
    <View style={{ flex: 1 }}>
      {/* Video preview with decorations overlay */}
      {showPreview && (
        <VideoPreviewWithDecorations
          videoUri={videoUri}
          decorations={decorations}
          onDecorationPress={(id) => setSelectedDecoration(id)}
        />
      )}

      {/* Toolbar for adding decorations */}
      <DecorationToolbar
        onAddSticker={() => setSelectedTool('sticker')}
        onAddText={() => setSelectedTool('text')}
        onAddFilter={() => setSelectedTool('filter')}
      />

      {/* Tool-specific UI */}
      {selectedTool === 'sticker' && (
        <StickerPicker onSelect={addSticker} />
      )}
      {selectedTool === 'text' && (
        <TextEditor onAdd={addText} />
      )}
      {selectedTool === 'filter' && (
        <FilterPicker onSelect={addFilter} />
      )}

      {/* Submit button */}
      <TouchableOpacity
        onPress={handleSubmit}
        style={styles.submitButton}
      >
        <Text>Upload Video</Text>
      </TouchableOpacity>
    </View>
  );
};
```

---

## Sticker Library

### Available Stickers

```javascript
// decorationLibrary/stickers.js

export const STICKER_LIBRARY = {
  holidays: [
    {
      id: 'santa-hat-001',
      name: 'Santa Hat',
      category: 'holidays',
      image_url: 'gs://bucket/stickers/santa-hat.png',
      thumbnail_url: 'gs://bucket/stickers/thumbnails/santa-hat.png',
      width: 100,
      height: 80,
      tags: ['christmas', 'hat', 'decoration']
    },
    {
      id: 'reindeer-001',
      name: 'Reindeer',
      category: 'holidays',
      image_url: 'gs://bucket/stickers/reindeer.png',
      thumbnail_url: 'gs://bucket/stickers/thumbnails/reindeer.png',
      width: 120,
      height: 100,
      tags: ['christmas', 'animal', 'decoration']
    },
    // ... more holiday stickers
  ],

  everyday: [
    {
      id: 'heart-001',
      name: 'Heart',
      category: 'everyday',
      image_url: 'gs://bucket/stickers/heart.png',
      width: 80,
      height: 80,
      tags: ['love', 'emotion', 'shape']
    },
    // ... more everyday stickers
  ],

  reactions: [
    {
      id: 'thumbs-up-001',
      name: 'Thumbs Up',
      category: 'reactions',
      image_url: 'gs://bucket/stickers/thumbs-up.png',
      width: 60,
      height: 80,
      tags: ['positive', 'approval', 'gesture']
    },
    // ... more reaction stickers
  ],

  confetti: [
    {
      id: 'confetti-rain-001',
      name: 'Confetti Rain',
      category: 'effects',
      image_url: 'gs://bucket/stickers/confetti-rain.gif',  // Animated
      width: 'full',
      height: 'full',
      tags: ['celebration', 'animation', 'full-screen']
    }
  ]
};

// Access stickers
const stickersByCategory = STICKER_LIBRARY.holidays;
const allStickers = Object.values(STICKER_LIBRARY).flat();
```

---

## Filter Library

### Available Filters

```javascript
// decorationLibrary/filters.js

export const FILTER_LIBRARY = {
  // Warm tones - increase red/yellow channels
  warm: {
    name: 'Warm',
    description: 'Cozy warm tones',
    adjustments: {
      brightness: 5,
      saturation: 15,
      color_temp: 2000,  // Kelvin (warm)
    }
  },

  // Cool tones - increase blue channels
  cool: {
    name: 'Cool',
    description: 'Calming cool tones',
    adjustments: {
      brightness: -5,
      saturation: 10,
      color_temp: 7000,  // Kelvin (cool)
    }
  },

  // Vintage - reduce saturation, increase warmth
  vintage: {
    name: 'Vintage',
    description: 'Old-timey nostalgic look',
    adjustments: {
      brightness: 10,
      saturation: -30,
      contrast: -5,
      color_temp: 3500,
      vignette: true,
      grain: true
    }
  },

  // Black & White
  bw: {
    name: 'Black & White',
    description: 'Classic monochrome',
    adjustments: {
      saturation: -100,  // Remove all color
      contrast: 15,
    }
  },

  // Sepia
  sepia: {
    name: 'Sepia',
    description: 'Brown vintage look',
    adjustments: {
      saturation: -50,
      color_overlay: '#704214',  // Brown
      opacity_overlay: 0.3
    }
  },

  // Vivid - increase saturation and contrast
  vivid: {
    name: 'Vivid',
    description: 'Punchy bright colors',
    adjustments: {
      brightness: 10,
      saturation: 40,
      contrast: 20
    }
  },

  // Holiday - red/green tint
  holiday: {
    name: 'Holiday',
    description: 'Red and green festive',
    adjustments: {
      red_channel: 110,
      green_channel: 105,
      blue_channel: 95,
      saturation: 20,
    }
  }
};
```

---

## AI Features Specification

### 1. Sentiment Analysis

**Purpose**: Analyze child's emotional state in video

**Processing**:
```javascript
// After video upload, trigger AI worker
const sentimentAnalysis = async (videoUri) => {
  try {
    // Send to Replicate or Google Video AI API
    const response = await axios.post('/api/ai/analyze-sentiment', {
      video_url: videoUri,
      model: 'sentiment-analysis-v1'
    });

    return {
      overall_sentiment: 'positive',  // positive, neutral, negative
      confidence: 0.92,
      emotions: {
        joy: 0.85,
        gratitude: 0.88,
        excitement: 0.79,
        sadness: 0.05,
        anger: 0.01
      },
      timestamp: new Date()
    };
  } catch (error) {
    console.error('Sentiment analysis failed:', error);
    return null;
  }
};
```

**Database Storage**:
```sql
-- Add to videos table
ALTER TABLE public.videos ADD COLUMN ai_sentiment JSONB;

-- Example data:
{
  "overall_sentiment": "positive",
  "confidence": 0.92,
  "emotions": {
    "joy": 0.85,
    "gratitude": 0.88,
    "excitement": 0.79
  },
  "processed_at": "2024-11-15T15:00:00Z"
}
```

**Display in Parent Dashboard**:
```javascript
{/* Show sentiment emoji */}
{video.ai_sentiment && (
  <View style={styles.sentimentBadge}>
    <Text style={styles.sentimentEmoji}>
      {video.ai_sentiment.overall_sentiment === 'positive' ? '😊' : '😐'}
    </Text>
    <Text>
      Confidence: {(video.ai_sentiment.confidence * 100).toFixed(0)}%
    </Text>
  </View>
)}
```

### 2. Scene Detection

**Purpose**: Identify objects, scenes, and context in video

**Processing**:
```javascript
const sceneDetection = async (videoUri) => {
  const response = await axios.post('/api/ai/detect-scenes', {
    video_url: videoUri
  });

  return {
    detected_scenes: [
      { object: 'person', confidence: 0.95, count: 1 },
      { object: 'room_indoor', confidence: 0.87 },
      { object: 'toy', confidence: 0.72, count: 3 }
    ],
    background: 'living room',
    lighting: 'natural',
    processed_at: new Date()
  };
};
```

**Use Cases**:
- Help parents understand video context
- Safety: Detect if video recorded in appropriate location
- Stats: Aggregate data about recording preferences

### 3. Speech-to-Text Transcription

**Purpose**: Transcribe what child says in video

**Processing**:
```javascript
const transcribeAudio = async (videoUri) => {
  const response = await axios.post('/api/ai/transcribe', {
    video_url: videoUri,
    language: 'en-US'
  });

  return {
    transcript: "Thank you so much for the bicycle! It's amazing!",
    segments: [
      {
        text: "Thank you so much for the bicycle!",
        start_time: 0.5,
        end_time: 2.3,
        confidence: 0.94
      },
      {
        text: "It's amazing!",
        start_time: 2.5,
        end_time: 3.8,
        confidence: 0.89
      }
    ],
    language_confidence: 0.96,
    processed_at: new Date()
  };
};
```

**Database Storage**:
```sql
ALTER TABLE public.videos ADD COLUMN transcript TEXT;
ALTER TABLE public.videos ADD COLUMN transcript_segments JSONB;
```

**Display Options**:
- Show captions on video during playback
- Display full transcript in parent dashboard
- Search transcripts for specific words

### 4. Face Detection & Privacy

**Purpose**: Detect if child's face is visible (non-identifying)

**Processing**:
```javascript
const detectFaces = async (videoUri) => {
  const response = await axios.post('/api/ai/detect-faces', {
    video_url: videoUri,
    privacy_mode: true  // Don't identify, just detect presence
  });

  return {
    faces_detected: true,
    face_count: 1,
    visible_percentage: 0.85,  // 85% of video shows face
    confidence: 0.92,
    processed_at: new Date()
  };
};
```

**Privacy Note**:
- Never store facial recognition data
- Only detect presence, not identity
- Use for content moderation only

### 5. Duration Validation

**Purpose**: Ensure video meets requirements

```javascript
const validateVideoLength = (durationSeconds) => {
  const MIN_DURATION = 5;      // At least 5 seconds
  const MAX_DURATION = 300;    // Max 5 minutes

  if (durationSeconds < MIN_DURATION) {
    return {
      valid: false,
      message: 'Video too short. Please record at least 5 seconds.'
    };
  }

  if (durationSeconds > MAX_DURATION) {
    return {
      valid: false,
      message: 'Video too long. Please keep it under 5 minutes.'
    };
  }

  return { valid: true };
};
```

---

## AI Processing Worker

### Background Processing Setup

```javascript
// services/aiProcessingService.js

export const queueVideoForAIProcessing = async (videoId) => {
  try {
    // Queue video for asynchronous processing
    const response = await axios.post('/api/ai/queue-processing', {
      video_id: videoId,
      tasks: [
        'sentiment_analysis',
        'scene_detection',
        'transcription',
        'face_detection'
      ]
    });

    // Store processing job ID
    await supabase
      .from('videos')
      .update({
        ai_processing_job_id: response.data.job_id,
        ai_processing_status: 'queued'
      })
      .eq('id', videoId);

    return response.data;
  } catch (error) {
    console.error('Failed to queue AI processing:', error);
  }
};

export const checkAIProcessingStatus = async (videoId) => {
  const { data: video } = await supabase
    .from('videos')
    .select('ai_processing_job_id, ai_processing_status')
    .eq('id', videoId)
    .single();

  if (!video.ai_processing_job_id) return null;

  const response = await axios.get(`/api/ai/status/${video.ai_processing_job_id}`);

  return response.data;  // { status: 'processing', results: {...} }
};

export const updateAIResults = async (videoId, results) => {
  await supabase
    .from('videos')
    .update({
      ai_sentiment: results.sentiment,
      ai_scenes: results.scenes,
      transcript: results.transcript,
      ai_face_detection: results.face_detection,
      ai_processing_status: 'completed',
      ai_processing_completed_at: new Date().toISOString()
    })
    .eq('id', videoId);
};
```

---

## Storage & File Management

### Video Storage Structure

```
gs://bucket/
├── videos/
│   ├── [UUID].mp4                 # Main video file
│   ├── [UUID]-decorated.mp4       # If decorations applied
│   ├── [UUID]-compressed.mp4      # Compressed version
│   └── metadata/
│       └── [UUID].json            # Video metadata
├── thumbnails/
│   └── [UUID].jpg                 # Generated thumbnail
└── stickers/
    ├── santa-hat.png
    ├── reindeer.png
    └── ...
```

### File Size Limits

```javascript
const VIDEO_LIMITS = {
  MAX_DURATION: 300,        // 5 minutes
  MIN_DURATION: 5,          // 5 seconds
  MAX_FILE_SIZE: 500,       // MB
  TARGET_BITRATE: 2500,     // kbps (for compression)
  RESOLUTION: '720p',       // 1280x720
  CODECS: {
    video: 'h264',
    audio: 'aac'
  }
};
```

---

## Video Upload Process

```javascript
// services/videoUploadService.js

export const uploadVideo = async (videoUri, metadata) => {
  const {
    videoFile,
    childId,
    giftId,
    eventId,
    parentId,
    decorations
  } = metadata;

  const videoId = uuid.v4();
  const fileName = `${videoId}.mp4`;

  try {
    // 1. Upload video file
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('videos')
      .upload(fileName, videoFile);

    if (uploadError) throw uploadError;

    // 2. Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('videos')
      .getPublicUrl(fileName);

    // 3. Generate thumbnail
    const thumbnailUrl = await generateVideoThumbnail(videoUri);

    // 4. Create database record
    const { error: dbError } = await supabase
      .from('videos')
      .insert({
        id: videoId,
        child_id: childId,
        gift_id: giftId,
        event_id: eventId,
        parent_id: parentId,
        video_url: publicUrl,
        thumbnail_url: thumbnailUrl,
        status: 'pending_approval',
        file_size_bytes: videoFile.size,
        duration_seconds: metadata.duration
      });

    if (dbError) throw dbError;

    // 5. Save decorations to separate table
    if (decorations && decorations.length > 0) {
      const decorationRecords = decorations.map((d, idx) => ({
        video_id: videoId,
        decoration_type: d.type,
        decoration_data: d.data,
        layer_order: idx,
        visible: true
      }));

      await supabase
        .from('video_decorations')
        .insert(decorationRecords);
    }

    // 6. Queue for AI processing
    await queueVideoForAIProcessing(videoId);

    return { success: true, videoId, publicUrl };
  } catch (error) {
    console.error('Upload failed:', error);
    return { success: false, error: error.message };
  }
};
```

---

## Summary of Features

| Feature | Status | Database | UI | Implementation |
|---------|--------|----------|----|----|
| Video Recording | ✅ | VIDEO | VideoRecordingScreen | Expo Camera |
| Video Compression | ✅ | FILE_SIZE | Upload | FFmpeg/React Native Video Compression |
| Stickers | 📋 | VIDEO_DECORATIONS | DecorationScreen | Custom rendering + library |
| Text Overlays | 📋 | VIDEO_DECORATIONS | TextEditor | React Native View composition |
| Filters | 📋 | VIDEO_DECORATIONS | FilterPicker | Image processing library |
| Video Upload | ✅ | VIDEOS, STORAGE | UploadScreen | Supabase Storage |
| Sentiment AI | 📋 | VIDEOS.AI_SENTIMENT | Dashboard | Replicate/Google API |
| Transcription | 📋 | VIDEOS.TRANSCRIPT | Viewer | Google Cloud Speech-to-Text |
| Scene Detection | 📋 | VIDEOS.AI_SCENES | Analytics | Google Vision API |
| Face Detection | 📋 | VIDEOS.AI_FACE_DETECTION | Content Moderation | Google Vision API |

✅ = Implemented
📋 = Planned (requires implementation)
