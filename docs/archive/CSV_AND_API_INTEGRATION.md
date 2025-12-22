# CSV Import & API Integration Specification

Detailed specification for bulk data import via CSV and API integrations.

---

## CSV Import Feature

### Use Case

Parents can bulk import children, events, and gifts via CSV file instead of manually entering them one-by-one.

**Example Scenario**:
- Parent has 5 children
- Parent wants to create holiday gift list for all kids
- Parent can prepare CSV with:
  - 1 event (Christmas 2024)
  - 20 gifts with givers
  - Assign gifts to all children
- Upload via app, all data created in seconds

---

## CSV File Formats

### Format 1: Children Import

**File**: `children.csv`

```csv
name,age,notes
Alice,8,Oldest child
Bob,6,Likes sports
Charlie,5,Shy kid
Diana,7,Very artistic
```

**Database Mapping**:
```sql
INSERT INTO public.children (
  parent_id, name, age, access_code, pin, created_at
) VALUES (
  $parent_id,
  'Alice',
  8,
  generateAccessCode('Alice'),  -- ALI5821
  generatePin(),                 -- 5821
  now()
);
```

**Validation Rules**:
- [ ] name: NOT NULL, max 100 chars
- [ ] age: INT, between 1-18
- [ ] notes: Optional, max 500 chars
- [ ] Duplicate names: Warn but allow (different access codes)

---

### Format 2: Events Import

**File**: `events.csv`

```csv
title,description,event_date,recipient_note
Christmas 2024,Annual holiday celebration,2024-12-25,Record thank you videos!
Birthday Party,Sam's 10th Birthday,2024-12-10,Have fun!
End of Year Gratitude,Celebrate the year,2024-12-31,Share what you're grateful for
```

**Database Mapping**:
```sql
INSERT INTO public.events (
  parent_id, title, description, event_date, recipient_note, created_at
) VALUES (
  $parent_id,
  'Christmas 2024',
  'Annual holiday celebration',
  '2024-12-25',
  'Record thank you videos!',
  now()
);
```

**Validation Rules**:
- [ ] title: NOT NULL, max 255 chars
- [ ] description: Optional, max 1000 chars
- [ ] event_date: ISO 8601 format (YYYY-MM-DD)
- [ ] Date must be future (warn if past)
- [ ] recipient_note: Optional, max 500 chars

---

### Format 3: Gifts Import (Linked to Events)

**File**: `gifts.csv`

```csv
event_title,gift_name,giver_name,description,image_url
Christmas 2024,Bicycle,Mom and Dad,Red mountain bike,https://example.com/bike.jpg
Christmas 2024,Video Game,Grandma,PS5 Game,https://example.com/game.jpg
Christmas 2024,LEGO Set,Aunt Sara,Space Station set,https://example.com/lego.jpg
Birthday Party,Skateboard,Uncle Mike,Pro skateboard,https://example.com/skate.jpg
```

**Database Mapping**:
```sql
-- First find event
SELECT id FROM events WHERE parent_id = $parent_id AND title = 'Christmas 2024'

-- Then insert gifts
INSERT INTO public.gifts (
  event_id, parent_id, name, giver_name, description, image_url, created_at
) VALUES (
  $event_id,
  $parent_id,
  'Bicycle',
  'Mom and Dad',
  'Red mountain bike',
  'https://example.com/bike.jpg',
  now()
);
```

**Validation Rules**:
- [ ] event_title: Must match existing event
- [ ] gift_name: NOT NULL, max 255 chars
- [ ] giver_name: Max 255 chars
- [ ] description: Optional, max 1000 chars
- [ ] image_url: Valid URL (optional)

---

### Format 4: Children-Event Mapping

**Optional Format**: If you need to control which children see which events

**File**: `children_event_mapping.csv`

```csv
child_name,event_title,include
Alice,Christmas 2024,yes
Alice,Birthday Party,yes
Bob,Christmas 2024,yes
Bob,Birthday Party,no
Charlie,Christmas 2024,yes
```

**Implementation**: Store in junction table

```sql
CREATE TABLE IF NOT EXISTS public.children_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID REFERENCES public.children(id),
  event_id UUID REFERENCES public.events(id),
  include BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- By default, children see all parent's events
-- This table allows selective filtering if needed
```

---

## CSV Import Implementation

### Service Layer

```javascript
// services/csvImportService.js

import Papa from 'papaparse';  // npm install papaparse

export const parseCSVFile = async (csvUri) => {
  try {
    // Read file from device
    const csvText = await readFileAsString(csvUri);

    // Parse CSV
    const results = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
      transform: (value) => value.trim()
    });

    return {
      headers: results.meta.fields,
      rows: results.data,
      errors: results.errors
    };
  } catch (error) {
    throw new Error(`CSV parsing failed: ${error.message}`);
  }
};

export const validateChildrenCSV = (rows) => {
  const errors = [];
  const warnings = [];

  rows.forEach((row, idx) => {
    const rowNum = idx + 1;

    // Validate name
    if (!row.name || row.name.trim() === '') {
      errors.push(`Row ${rowNum}: name is required`);
    } else if (row.name.length > 100) {
      errors.push(`Row ${rowNum}: name too long (max 100 chars)`);
    }

    // Validate age
    if (!row.age) {
      errors.push(`Row ${rowNum}: age is required`);
    } else {
      const age = parseInt(row.age);
      if (isNaN(age) || age < 1 || age > 18) {
        errors.push(`Row ${rowNum}: age must be 1-18`);
      }
    }

    // Warn on duplicates
    const duplicates = rows.filter(r => r.name === row.name);
    if (duplicates.length > 1) {
      warnings.push(`Row ${rowNum}: duplicate name "${row.name}"`);
    }
  });

  return { valid: errors.length === 0, errors, warnings };
};

export const validateEventsCSV = (rows) => {
  const errors = [];
  const warnings = [];

  rows.forEach((row, idx) => {
    const rowNum = idx + 1;

    if (!row.title || row.title.trim() === '') {
      errors.push(`Row ${rowNum}: title is required`);
    }

    if (!row.event_date) {
      errors.push(`Row ${rowNum}: event_date is required`);
    } else {
      const date = new Date(row.event_date);
      if (isNaN(date.getTime())) {
        errors.push(`Row ${rowNum}: invalid date format (use YYYY-MM-DD)`);
      } else if (date < new Date()) {
        warnings.push(`Row ${rowNum}: event date is in the past`);
      }
    }
  });

  return { valid: errors.length === 0, errors, warnings };
};

export const validateGiftsCSV = (rows, existingEvents) => {
  const errors = [];
  const warnings = [];

  rows.forEach((row, idx) => {
    const rowNum = idx + 1;

    // Validate event exists
    if (!row.event_title) {
      errors.push(`Row ${rowNum}: event_title is required`);
    } else if (!existingEvents.find(e => e.title === row.event_title)) {
      errors.push(`Row ${rowNum}: event "${row.event_title}" not found`);
    }

    // Validate gift name
    if (!row.gift_name || row.gift_name.trim() === '') {
      errors.push(`Row ${rowNum}: gift_name is required`);
    }

    // Validate image URL
    if (row.image_url && !isValidUrl(row.image_url)) {
      warnings.push(`Row ${rowNum}: invalid image URL`);
    }
  });

  return { valid: errors.length === 0, errors, warnings };
};

export const importChildrenFromCSV = async (rows, parentId) => {
  const imported = [];
  const failed = [];

  for (const row of rows) {
    try {
      const accessCode = generateAccessCode(row.name);
      const pin = generatePin();

      const { error } = await supabase.from('children').insert({
        parent_id: parentId,
        name: row.name,
        age: parseInt(row.age),
        access_code: accessCode,
        pin: pin
      });

      if (error) throw error;

      imported.push({
        name: row.name,
        accessCode
      });
    } catch (error) {
      failed.push({
        name: row.name,
        error: error.message
      });
    }
  }

  return { imported, failed };
};

export const importEventsFromCSV = async (rows, parentId) => {
  const imported = [];
  const failed = [];

  for (const row of rows) {
    try {
      const { data, error } = await supabase
        .from('events')
        .insert({
          parent_id: parentId,
          title: row.title,
          description: row.description || null,
          event_date: row.event_date,
          recipient_note: row.recipient_note || null
        })
        .select();

      if (error) throw error;

      imported.push({
        title: row.title,
        eventDate: row.event_date
      });
    } catch (error) {
      failed.push({
        title: row.title,
        error: error.message
      });
    }
  }

  return { imported, failed };
};

export const importGiftsFromCSV = async (rows, parentId) => {
  const imported = [];
  const failed = [];

  for (const row of rows) {
    try {
      // Find event
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('id')
        .eq('parent_id', parentId)
        .eq('title', row.event_title)
        .single();

      if (eventError) throw new Error(`Event "${row.event_title}" not found`);

      // Insert gift
      const { error } = await supabase.from('gifts').insert({
        event_id: event.id,
        parent_id: parentId,
        name: row.gift_name,
        giver_name: row.giver_name || null,
        description: row.description || null,
        image_url: row.image_url || null
      });

      if (error) throw error;

      imported.push({
        giftName: row.gift_name,
        eventTitle: row.event_title
      });
    } catch (error) {
      failed.push({
        giftName: row.gift_name,
        error: error.message
      });
    }
  }

  return { imported, failed };
};
```

### UI Component: CSV Import Screen

```javascript
// screens/CSVImportScreen.js

export const CSVImportScreen = ({ navigation }) => {
  const { edition, theme } = useEdition();
  const [importType, setImportType] = useState(null);  // 'children', 'events', 'gifts'
  const [csvData, setCSVData] = useState(null);
  const [validation, setValidation] = useState(null);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState(null);

  const pickCSVFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'text/csv'
      });

      if (result.type === 'success') {
        await processCSVFile(result.uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick file: ' + error.message);
    }
  };

  const processCSVFile = async (uri) => {
    try {
      const parsed = await parseCSVFile(uri);
      setCSVData(parsed);

      // Validate based on import type
      let validation;
      if (importType === 'children') {
        validation = validateChildrenCSV(parsed.rows);
      } else if (importType === 'events') {
        validation = validateEventsCSV(parsed.rows);
      } else if (importType === 'gifts') {
        const { data: events } = await supabase
          .from('events')
          .select('*');
        validation = validateGiftsCSV(parsed.rows, events);
      }

      setValidation(validation);
    } catch (error) {
      Alert.alert('Parse Error', error.message);
    }
  };

  const handleImport = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const parentId = user.id;

    try {
      setImporting(true);

      let result;
      if (importType === 'children') {
        result = await importChildrenFromCSV(csvData.rows, parentId);
      } else if (importType === 'events') {
        result = await importEventsFromCSV(csvData.rows, parentId);
      } else if (importType === 'gifts') {
        result = await importGiftsFromCSV(csvData.rows, parentId);
      }

      setResults(result);
    } catch (error) {
      Alert.alert('Import Failed', error.message);
    } finally {
      setImporting(false);
    }
  };

  if (results) {
    return (
      <SafeAreaView style={{ flex: 1, padding: theme.spacing.md }}>
        <Text style={styles.heading}>Import Results</Text>

        <Text style={styles.subheading}>✅ Imported: {results.imported.length}</Text>
        {results.imported.map((item, idx) => (
          <Text key={idx} style={styles.item}>
            • {item.name || item.title || item.giftName}
          </Text>
        ))}

        {results.failed.length > 0 && (
          <>
            <Text style={styles.subheading}>❌ Failed: {results.failed.length}</Text>
            {results.failed.map((item, idx) => (
              <Text key={idx} style={styles.error}>
                • {item.name || item.title || item.giftName}: {item.error}
              </Text>
            ))}
          </>
        )}

        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.button}
        >
          <Text>Done</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      {/* Import type selection */}
      <View style={{ padding: theme.spacing.md }}>
        <Text style={styles.heading}>Bulk Import via CSV</Text>

        {['children', 'events', 'gifts'].map(type => (
          <TouchableOpacity
            key={type}
            onPress={() => {
              setImportType(type);
              setCSVData(null);
              setValidation(null);
            }}
            style={[
              styles.typeButton,
              importType === type && styles.typeButtonActive
            ]}
          >
            <Text>{type.charAt(0).toUpperCase() + type.slice(1)}</Text>
          </TouchableOpacity>
        ))}

        {importType && !csvData && (
          <TouchableOpacity onPress={pickCSVFile} style={styles.pickButton}>
            <Ionicons name="cloud-upload" size={24} color="white" />
            <Text>Pick CSV File</Text>
          </TouchableOpacity>
        )}

        {csvData && validation && (
          <>
            <Text>
              Rows: {csvData.rows.length}
            </Text>

            {validation.errors.length > 0 && (
              <View style={styles.errorBox}>
                <Text style={styles.errorTitle}>Errors:</Text>
                {validation.errors.map((err, idx) => (
                  <Text key={idx} style={styles.errorText}>{err}</Text>
                ))}
              </View>
            )}

            {validation.warnings.length > 0 && (
              <View style={styles.warningBox}>
                <Text style={styles.warningTitle}>Warnings:</Text>
                {validation.warnings.map((warn, idx) => (
                  <Text key={idx} style={styles.warningText}>{warn}</Text>
                ))}
              </View>
            )}

            {validation.valid && (
              <TouchableOpacity
                onPress={handleImport}
                style={styles.importButton}
                disabled={importing}
              >
                <Text>{importing ? 'Importing...' : 'Import'}</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    </SafeAreaView>
  );
};
```

---

## API Integration (Stubbed)

### Stubbed API Architecture

**Concept**: Create local mock APIs that can later be replaced with real backends

```javascript
// services/api/index.js

// Environment-based API selection
const API_MODE = __DEV__ ? 'stub' : 'production';

export const getAPI = () => {
  if (API_MODE === 'stub') {
    return StubbedAPI;
  } else {
    return ProductionAPI;
  }
};
```

### Stubbed API Endpoints

```javascript
// services/api/stubbed.js

class StubbedAPI {
  // AI Analysis endpoints
  async analyzeSentiment(videoUrl) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Return mock data
    return {
      overall_sentiment: ['positive', 'neutral', 'negative'][Math.floor(Math.random() * 3)],
      confidence: 0.85 + Math.random() * 0.15,
      emotions: {
        joy: Math.random(),
        gratitude: Math.random(),
        excitement: Math.random(),
        sadness: Math.random() * 0.3,
        anger: Math.random() * 0.2
      }
    };
  }

  async detectScenes(videoUrl) {
    await new Promise(resolve => setTimeout(resolve, 1500));

    return {
      detected_scenes: [
        { object: 'person', confidence: 0.95, count: 1 },
        { object: 'room_indoor', confidence: 0.87 },
        { object: 'toy', confidence: 0.72, count: Math.floor(Math.random() * 5) + 1 }
      ],
      background: 'living room',
      lighting: 'natural'
    };
  }

  async transcribeVideo(videoUrl) {
    await new Promise(resolve => setTimeout(resolve, 3000));

    const transcripts = [
      "Thank you so much for the amazing gift! I love it!",
      "This is the best present ever! Thank you so much!",
      "I'm so grateful for this gift. Thank you!",
      "Wow, this is incredible! Thank you for thinking of me!"
    ];

    return {
      transcript: transcripts[Math.floor(Math.random() * transcripts.length)],
      language_confidence: 0.94,
      segments: [
        {
          text: "Thank you",
          start_time: 0.5,
          end_time: 1.2
        },
        {
          text: "for the gift",
          start_time: 1.5,
          end_time: 2.5
        }
      ]
    };
  }

  async detectFaces(videoUrl) {
    await new Promise(resolve => setTimeout(resolve, 1000));

    return {
      faces_detected: true,
      face_count: 1,
      visible_percentage: 0.75 + Math.random() * 0.25,
      confidence: 0.90 + Math.random() * 0.09
    };
  }

  // Export endpoints
  async exportToCSV(dataType, parentId) {
    const csvContent = `name,date,status\n...`;
    return csvContent;
  }

  async exportToJSON(dataType, parentId) {
    return {
      export_id: uuid.v4(),
      data_type: dataType,
      created_at: new Date().toISOString(),
      records: []
    };
  }
}

export const StubbedAPI = new StubbedAPI();
```

### Production API Integration

```javascript
// services/api/production.js

class ProductionAPI {
  constructor() {
    this.baseUrl = 'https://api.gratitugrambackend.com';
    this.apiKey = process.env.GRATITUGRAM_API_KEY;
  }

  async analyzeSentiment(videoUrl) {
    const response = await fetch(`${this.baseUrl}/ai/sentiment`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        video_url: videoUrl
      })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    return response.json();
  }

  async detectScenes(videoUrl) {
    // ... similar pattern
  }

  async transcribeVideo(videoUrl) {
    // ... similar pattern
  }

  async detectFaces(videoUrl) {
    // ... similar pattern
  }
}

export const ProductionAPI = new ProductionAPI();
```

### Usage in Components

```javascript
// screens/VideoApprovalScreen.js

const { API_MODE } = useAPI();

const loadVideoAnalysis = async (videoId) => {
  try {
    // Use either stubbed or production API
    const api = getAPI();

    const sentiment = await api.analyzeSentiment(videoUrl);
    const scenes = await api.detectScenes(videoUrl);
    const transcript = await api.transcribeVideo(videoUrl);
    const faces = await api.detectFaces(videoUrl);

    setAnalysis({
      sentiment,
      scenes,
      transcript,
      faces
    });
  } catch (error) {
    console.error('Analysis failed:', error);
  }
};
```

---

## API Endpoints Roadmap

### Planned Endpoints

```
POST /api/ai/sentiment
  Input: { video_url, model_version }
  Output: { sentiment, confidence, emotions }

POST /api/ai/scenes
  Input: { video_url }
  Output: { scenes, background, lighting }

POST /api/ai/transcribe
  Input: { video_url, language }
  Output: { transcript, segments, confidence }

POST /api/ai/faces
  Input: { video_url }
  Output: { faces_detected, count, confidence }

POST /api/export/csv
  Input: { data_type, parent_id, format }
  Output: { csv_file_url }

POST /api/export/json
  Input: { data_type, parent_id }
  Output: { json_data }

GET /api/health
  Output: { status, version }

GET /api/stickers/library
  Output: { stickers: [...] }

GET /api/filters/library
  Output: { filters: [...] }
```

---

## Data Export Implementation

### Export Formats

```javascript
// services/exportService.js

export const exportToCSV = async (dataType, parentId) => {
  const { data: { user } } = await supabase.auth.getUser();

  let rows = [];
  let headers = [];

  if (dataType === 'children') {
    const { data: children } = await supabase
      .from('children')
      .select('*')
      .eq('parent_id', user.id);

    headers = ['name', 'age', 'access_code', 'created_at'];
    rows = children.map(c => [c.name, c.age, c.access_code, c.created_at]);
  }
  // ... more data types

  // Convert to CSV
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  return csvContent;
};

export const exportToJSON = async (dataType, parentId) => {
  const data = await loadDataForExport(dataType, parentId);

  return {
    export_type: dataType,
    parent_id: parentId,
    exported_at: new Date().toISOString(),
    version: '1.0',
    records: data
  };
};

export const downloadExport = async (content, filename) => {
  const uri = FileSystem.documentDirectory + filename;

  await FileSystem.writeAsStringAsync(uri, content);

  // Trigger share/download
  await Share.share({
    url: uri,
    title: filename
  });

  return uri;
};
```

---

## Summary

| Feature | Status | Implementation | Database |
|---------|--------|---|---|
| CSV Import - Children | 📋 | CSVImportScreen | CHILDREN |
| CSV Import - Events | 📋 | CSVImportScreen | EVENTS |
| CSV Import - Gifts | 📋 | CSVImportScreen | GIFTS |
| CSV Validation | 📋 | csvImportService | - |
| JSON Export | 📋 | exportService | Query |
| CSV Export | 📋 | exportService | Query |
| Stubbed APIs | 📋 | StubbedAPI class | - |
| Production APIs | 📋 | ProductionAPI class | External |
| AI Sentiment (Stub) | 📋 | StubbedAPI | - |
| AI Transcription (Stub) | 📋 | StubbedAPI | - |

📋 = Planned (provides specification)
