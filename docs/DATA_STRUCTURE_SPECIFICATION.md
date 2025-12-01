# Data Structure Specification

Complete database schema and relationship design for GratituGram.

---

## Database Schema Diagram

```
┌────────────────────────────────────────────────────────────────┐
│                         PARENTS                                │
├────────────────────────────────────────────────────────────────┤
│ id (UUID) PK                                                   │
│ email (TEXT, UNIQUE)                                           │
│ full_name (TEXT)                                               │
│ kid_code (TEXT) - Legacy parent code (4 digits)               │
│ created_at (TIMESTAMP)                                         │
│ updated_at (TIMESTAMP)                                         │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     │ parent_id (FK)
                     │
                     ├─────────────────────┐
                     │                     │
                     ▼                     ▼
        ┌──────────────────────┐  ┌──────────────────────┐
        │     CHILDREN         │  │      EVENTS          │
        ├──────────────────────┤  ├──────────────────────┤
        │ id (UUID) PK         │  │ id (UUID) PK         │
        │ parent_id (FK) ──────┼──│ parent_id (FK)       │
        │ name (TEXT)          │  │ title (TEXT)         │
        │ age (INT, 1-18)      │  │ description (TEXT)   │
        │ access_code (VARCHAR)│  │ event_date (DATE)    │
        │ pin (VARCHAR, legacy)│  │ recipient_note (TEXT)│
        │ created_at           │  │ created_at           │
        │ updated_at           │  │ updated_at           │
        └──────────┬───────────┘  └──────────┬──────────┘
                   │                         │
                   │ child_id (FK)           │
                   │                         │ event_id (FK)
                   │                         │
                   │                ┌────────┴────────┐
                   │                │                 │
                   │                ▼                 ▼
                   │         ┌──────────────────────────────────┐
                   │         │           GIFTS                  │
                   │         ├──────────────────────────────────┤
                   │         │ id (UUID) PK                     │
                   │         │ event_id (FK)                    │
                   │         │ parent_id (FK)                   │
                   │         │ name (TEXT)                      │
                   │         │ description (TEXT)               │
                   │         │ image_url (TEXT, optional)       │
                   │         │ giver_name (TEXT)                │
                   │         │ display_order (INT)              │
                   │         │ created_at                       │
                   │         │ updated_at                       │
                   │         └──────────────┬───────────────────┘
                   │                        │
                   │ child_id ────────┐     │ gift_id (FK)
                   │                  │     │
                   │                  ▼     ▼
                   │         ┌──────────────────────────────────┐
                   └────────→│           VIDEOS                 │
                             ├──────────────────────────────────┤
                             │ id (UUID) PK                     │
                             │ child_id (FK)                    │
                             │ gift_id (FK)                     │
                             │ parent_id (FK)                   │
                             │ event_id (FK, denormalized)      │
                             │ video_url (TEXT)                 │
                             │ thumbnail_url (TEXT)             │
                             │ status (ENUM)                    │
                             │ duration_seconds (INT)           │
                             │ file_size_bytes (INT)            │
                             │ created_at                       │
                             │ updated_at                       │
                             │ approved_at (TIMESTAMP, NULL)    │
                             └──────────┬───────────────────────┘
                                        │
                                        │ video_id (FK)
                                        │
                                        ▼
                            ┌──────────────────────────────────┐
                            │    VIDEO_DECORATIONS             │
                            ├──────────────────────────────────┤
                            │ id (UUID) PK                     │
                            │ video_id (FK)                    │
                            │ decoration_type (TEXT)           │
                            │ decoration_data (JSONB)          │
                            │ layer_order (INT)                │
                            │ visible (BOOLEAN)                │
                            │ created_at                       │
                            │ updated_at                       │
                            └──────────────────────────────────┘
```

---

## Detailed Table Specifications

### 1. PARENTS Table

```sql
CREATE TABLE public.parents (
  id UUID PRIMARY KEY DEFAULT auth.uid(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  kid_code VARCHAR(4),  -- Legacy: parent-level code
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_parents_email ON public.parents(email);
```

**Purpose**: Parent account management
**Relationships**: One parent has many children, events, gifts, videos
**RLS Policy**: Parent can only view/edit own records

---

### 2. CHILDREN Table

```sql
CREATE TABLE public.children (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES public.parents(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  age INT NOT NULL CHECK (age >= 1 AND age <= 18),
  access_code VARCHAR(10) UNIQUE NOT NULL,  -- NEW: 7-char code
  pin VARCHAR(4),  -- LEGACY: 4-digit PIN (backwards compatibility)
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_children_parent_id ON public.children(parent_id);
CREATE INDEX idx_children_access_code ON public.children(access_code);
```

**Purpose**: Store child profiles
**Relationships**: One child belongs to one parent, has many videos, associated with events via gifts
**RLS Policy**:
  - Parents can view/edit/delete their own children
  - Kids can view their own profile (via access_code lookup)

**Access Code Generation**:
```javascript
// Format: NAME_PREFIX (3 letters) + RANDOM (4 digits)
// Example: "ALI5821" for Alice
const generateAccessCode = (name) => {
  const namePrefix = name.substring(0, 3).toUpperCase();
  const randomDigits = Math.floor(1000 + Math.random() * 9000).toString();
  return `${namePrefix}${randomDigits}`;
};
```

---

### 3. EVENTS Table

```sql
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES public.parents(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  recipient_note TEXT,  -- Optional note to children
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_events_parent_id ON public.events(parent_id);
CREATE INDEX idx_events_event_date ON public.events(event_date DESC);
```

**Purpose**: Store gift-giving events (Christmas, Birthday, etc.)
**Relationships**: One parent has many events, each event has many gifts
**Example Data**:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "parent_id": "user-uuid",
  "title": "Christmas 2024",
  "description": "Holiday gift-giving celebration",
  "event_date": "2024-12-25",
  "recipient_note": "Kids, please record a thank you message for each gift you receive!",
  "created_at": "2024-11-01T10:00:00Z"
}
```

---

### 4. GIFTS Table

```sql
CREATE TABLE public.gifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  parent_id UUID NOT NULL REFERENCES public.parents(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,  -- Optional image of gift
  giver_name TEXT,  -- Who gave the gift (e.g., "Grandma", "Aunt Sarah")
  display_order INT DEFAULT 0,  -- Order to display gifts
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_gifts_event_id ON public.gifts(event_id);
CREATE INDEX idx_gifts_parent_id ON public.gifts(parent_id);
CREATE INDEX idx_gifts_display_order ON public.gifts(display_order);
```

**Purpose**: Store individual gifts within events
**Relationships**: Many gifts belong to one event, each gift can have many videos
**Example Data**:
```json
{
  "id": "gift-uuid",
  "event_id": "event-uuid",
  "parent_id": "user-uuid",
  "name": "Bicycle",
  "description": "Red mountain bike with 18 speeds",
  "image_url": "https://bucket.com/gifts/bicycle.jpg",
  "giver_name": "Mom and Dad",
  "display_order": 1,
  "created_at": "2024-11-01T10:05:00Z"
}
```

---

### 5. VIDEOS Table

```sql
CREATE TABLE public.videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  gift_id UUID NOT NULL REFERENCES public.gifts(id) ON DELETE SET NULL,
  parent_id UUID NOT NULL REFERENCES public.parents(id) ON DELETE CASCADE,
  event_id UUID REFERENCES public.events(id),  -- Denormalized for quick filtering

  -- Video file info
  video_url TEXT NOT NULL,  -- Supabase storage URL
  thumbnail_url TEXT,  -- Generated thumbnail
  duration_seconds INT,  -- Duration of video
  file_size_bytes INT,  -- For quota tracking

  -- Status tracking
  status VARCHAR(50) DEFAULT 'pending_approval',  -- Enum-like
  -- Statuses: draft, pending_approval, approved, rejected

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  approved_at TIMESTAMPTZ,  -- When parent approved

  -- Metadata
  description TEXT,  -- Optional child notes
  kid_name_at_recording VARCHAR(255),  -- Snapshot of child name at recording time

  CONSTRAINT fk_gift_parent CHECK (
    -- Ensure gift's parent matches video's parent
    parent_id = (SELECT parent_id FROM gifts WHERE id = gift_id)
  )
);

CREATE INDEX idx_videos_child_id ON public.videos(child_id);
CREATE INDEX idx_videos_gift_id ON public.videos(gift_id);
CREATE INDEX idx_videos_parent_id ON public.videos(parent_id);
CREATE INDEX idx_videos_event_id ON public.videos(event_id);
CREATE INDEX idx_videos_status ON public.videos(status);
CREATE INDEX idx_videos_created_at ON public.videos(created_at DESC);
```

**Purpose**: Store recorded thank-you videos
**Relationships**: One child can have many videos, each video is for one gift
**Status Flow**:
```
draft → pending_approval → approved
                        ↘ rejected
```

**Example Data**:
```json
{
  "id": "video-uuid",
  "child_id": "alice-uuid",
  "gift_id": "gift-uuid",
  "parent_id": "user-uuid",
  "event_id": "event-uuid",
  "video_url": "gs://bucket/videos/video-uuid.mp4",
  "thumbnail_url": "gs://bucket/thumbnails/video-uuid.jpg",
  "duration_seconds": 45,
  "file_size_bytes": 15728640,
  "status": "pending_approval",
  "created_at": "2024-11-15T14:30:00Z",
  "description": "Alice saying thank you for the bicycle"
}
```

---

### 6. VIDEO_DECORATIONS Table (NEW)

```sql
CREATE TABLE public.video_decorations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,

  -- Decoration details
  decoration_type VARCHAR(50) NOT NULL,  -- 'sticker', 'text', 'filter', 'border', etc.
  decoration_data JSONB NOT NULL,  -- Flexible JSON for decoration config

  -- Layering
  layer_order INT NOT NULL DEFAULT 0,  -- Z-index for rendering order
  visible BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_video_decorations_video_id ON public.video_decorations(video_id);
CREATE INDEX idx_video_decorations_type ON public.video_decorations(decoration_type);

-- Example decoration_data structure:
-- Sticker: {"type": "sticker", "sticker_id": "santa-123", "x": 100, "y": 200, "scale": 1.5}
-- Text: {"type": "text", "text": "Happy Holiday!", "x": 50, "y": 50, "font_size": 24, "color": "#FF0000"}
-- Filter: {"type": "filter", "filter_name": "warm", "intensity": 0.8}
```

**Purpose**: Store decorations/overlays added to videos
**Relationships**: One video can have many decorations
**Example Data**:
```json
{
  "id": "decoration-uuid",
  "video_id": "video-uuid",
  "decoration_type": "sticker",
  "decoration_data": {
    "sticker_id": "santa-hat-001",
    "x": 150,
    "y": 50,
    "scale": 1.2,
    "rotation": 15
  },
  "layer_order": 1,
  "visible": true,
  "created_at": "2024-11-15T15:00:00Z"
}
```

---

## Relationships & Constraints

### Child-Event Relationship (Implicit)

A child doesn't directly belong to an event. Instead:
- Parent creates event
- Parent adds gifts to event
- Child records videos for gifts
- This implicitly links child to event

```
Parent creates Event "Christmas"
  └─ Parent adds Gift "Toy" to Event
     └─ Child "Alice" records Video for Gift "Toy"
        └─ Video is "for" Christmas event (via event_id denormalization)
```

### Data Isolation by Parent

All queries filter by `parent_id`:

**Parent viewing their children's events/gifts/videos**:
```sql
-- Get all gifts for parent's events
SELECT g.* FROM gifts g
JOIN events e ON g.event_id = e.id
WHERE e.parent_id = $parent_id;

-- Get all videos for parent's children
SELECT v.* FROM videos v
WHERE v.parent_id = $parent_id;
```

**Child viewing their own videos**:
```sql
-- Get all gifts available to record videos for
SELECT g.* FROM gifts g
JOIN events e ON g.event_id = e.id
WHERE e.parent_id = (
  SELECT parent_id FROM children WHERE id = $child_id
);

-- Get videos already recorded
SELECT v.* FROM videos v
WHERE v.child_id = $child_id;
```

---

## Denormalization Strategy

### Why Denormalize?

Some data is duplicated for **performance** and **query simplicity**:

#### 1. Parent ID in VIDEOS

**Denormalized**: `videos.parent_id`

Why?
- Quick filtering: `WHERE parent_id = $id` (instead of joining events → gifts → videos)
- RLS enforcement: Every row has parent_id for policy
- Backup: Ensure referential integrity

**Query without denormalization** (SLOW):
```sql
SELECT v.* FROM videos v
JOIN gifts g ON v.gift_id = g.id
JOIN events e ON g.event_id = e.id
WHERE e.parent_id = $parent_id;
-- 3 JOINs!
```

**Query with denormalization** (FAST):
```sql
SELECT v.* FROM videos v
WHERE v.parent_id = $parent_id;
-- Direct single-table query + index
```

#### 2. Event ID in VIDEOS

**Denormalized**: `videos.event_id`

Why?
- Quick filtering by event: `WHERE event_id = $id`
- Display: Show which event a video is for
- Stats: Count videos per event

---

## Constraints & Validation

### Database-Level Constraints

```sql
-- Child age validation
ALTER TABLE public.children
ADD CONSTRAINT valid_age CHECK (age >= 1 AND age <= 18);

-- Ensure gift parent matches video parent
ALTER TABLE public.videos
ADD CONSTRAINT parent_gift_consistency CHECK (
  parent_id = (SELECT parent_id FROM gifts WHERE id = gift_id)
);

-- Prevent orphaned videos
ALTER TABLE public.videos
ADD CONSTRAINT child_belongs_to_parent CHECK (
  (SELECT parent_id FROM children WHERE id = child_id) = parent_id
);

-- Ensure access code is set
ALTER TABLE public.children
ADD CONSTRAINT access_code_required CHECK (access_code IS NOT NULL AND access_code != '');

-- Unique combination: child can only have one "draft" or "pending" video per gift
CREATE UNIQUE INDEX unique_pending_per_child_gift ON public.videos(child_id, gift_id, status)
WHERE status IN ('draft', 'pending_approval');
```

---

## Relationships Summary

```
PARENT (1)
  ├─ MANY CHILDREN
  │   └─ MANY VIDEOS (recorded by child)
  │       └─ MANY VIDEO_DECORATIONS (applied to video)
  │
  ├─ MANY EVENTS
  │   └─ MANY GIFTS
  │       └─ MANY VIDEOS (for gift)
  │           └─ MANY VIDEO_DECORATIONS
  │
  └─ MANY VIDEOS (owns all videos by any child)
  └─ MANY GIFTS (owns all gifts in events)
```

---

## Query Patterns

### Common Queries

**1. Load dashboard for parent**:
```sql
SELECT COUNT(*) as child_count, COUNT(*) FILTER (WHERE status = 'pending_approval') as pending_videos
FROM children c
LEFT JOIN videos v ON c.id = v.child_id
WHERE c.parent_id = $parent_id;
```

**2. Load events with gift counts**:
```sql
SELECT e.*, COUNT(g.id) as gift_count, COUNT(v.id) as video_count
FROM events e
LEFT JOIN gifts g ON e.id = g.event_id
LEFT JOIN videos v ON g.id = v.gift_id
WHERE e.parent_id = $parent_id
GROUP BY e.id
ORDER BY e.event_date DESC;
```

**3. Load pending videos for approval**:
```sql
SELECT v.*, c.name as child_name, g.name as gift_name, e.title as event_title
FROM videos v
JOIN children c ON v.child_id = c.id
JOIN gifts g ON v.gift_id = g.id
JOIN events e ON v.event_id = e.id
WHERE v.parent_id = $parent_id AND v.status = 'pending_approval'
ORDER BY v.created_at DESC;
```

**4. Load gifts pending videos (for kid)**:
```sql
SELECT g.*, COUNT(v.id) FILTER (WHERE v.status = 'approved') as has_video
FROM gifts g
JOIN events e ON g.event_id = e.id
WHERE e.parent_id = (SELECT parent_id FROM children WHERE id = $child_id)
  AND NOT EXISTS (
    SELECT 1 FROM videos v
    WHERE v.gift_id = g.id AND v.child_id = $child_id AND v.status = 'draft'
  )
GROUP BY g.id
ORDER BY e.event_date DESC, g.display_order ASC;
```

---

## Future Extensions

### Potential Additional Tables

1. **VIDEO_SHARES**: Track who videos are shared with
   ```sql
   parent_id, video_id, shared_with_email, shared_at
   ```

2. **VIDEO_COMMENTS**: Parents comment on videos
   ```sql
   parent_id, video_id, comment_text, created_at
   ```

3. **DECORATIONS_LIBRARY**: Pre-made stickers/filters
   ```sql
   decoration_id, type, name, image_url, category
   ```

4. **VIDEO_AI_ANALYSIS**: AI processing results
   ```sql
   video_id, analysis_type, result_data, processed_at
   ```

5. **CSV_IMPORTS**: Track bulk imports
   ```sql
   parent_id, import_file_name, import_data, imported_count, imported_at
   ```

---

## Summary

- **Normalized Core**: PARENTS, CHILDREN, EVENTS, GIFTS, VIDEOS
- **Denormalized Optimization**: parent_id, event_id in VIDEOS
- **Constraints**: Age, parent consistency, access code required
- **Relationships**: One parent → many everything else, cascading deletes
- **Scalability**: Indexes on all foreign keys and frequently queried fields
- **Security**: parent_id on every table for RLS enforcement

This structure supports:
✅ Parent management of children, events, gifts
✅ Kid video recording and decorations
✅ Parent video approval workflow
✅ Data isolation between families
✅ Scaling to millions of users
