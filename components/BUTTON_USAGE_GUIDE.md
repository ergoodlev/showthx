# ThankCast Button Components Usage Guide

All button components in ThankCast are edition-aware and automatically respond to theme changes via the `useEdition()` hook from `EditionContext`.

## Available Buttons

### 1. ThankCastButton (Primary Button)
Main action button with coral color. Supports optional gradient background for kids edition.

**Basic Usage:**
```javascript
import { ThankCastButton } from './components/ThankCastButton';

export default function MyScreen() {
  return (
    <ThankCastButton
      title="Save Video"
      onPress={() => handleSave()}
    />
  );
}
```

**With Gradient (Kids Edition Only):**
```javascript
<ThankCastButton
  title="Let's Go!"
  gradient={true}
  onPress={() => handleStart()}
/>
```

**Properties:**
- `title` (string) - Button text
- `onPress` (function) - Called when button is pressed
- `loading` (boolean) - Shows loading spinner (default: false)
- `disabled` (boolean) - Disables button (default: false)
- `gradient` (boolean) - Enables gradient background on kids edition (default: false)
- `style` (object) - Custom style overrides
- `textStyle` (object) - Custom text style overrides

**Sizing:**
- Kids Edition: 56px height, rounded corners (20px)
- Adult Edition: 48px height, subtle corners (12px)

---

### 2. ThankCastSecondaryButton (Secondary Button)
Secondary action button with teal color. Good for alternative actions.

**Basic Usage:**
```javascript
<ThankCastSecondaryButton
  title="Skip"
  onPress={() => handleSkip()}
/>
```

**Properties:** Same as ThankCastButton (except no gradient option)

---

### 3. ThankCastOutlineButton (Outline/Tertiary Button)
Button with transparent background and coral border. Good for cancel/back actions.

**Basic Usage:**
```javascript
<ThankCastOutlineButton
  title="Cancel"
  onPress={() => handleCancel()}
/>
```

**Properties:** Same as ThankCastButton (except no gradient option)

**Border Width:**
- Kids Edition: 2px border
- Adult Edition: 1.5px border

---

### 4. ThankCastRecordButton (Large Circular Button)
Specialized button for video recording. Shows white circle when idle, white square when recording.

**Basic Usage:**
```javascript
import { ThankCastRecordButton } from './components/ThankCastButton';
import { useState } from 'react';

export default function RecordingScreen() {
  const [isRecording, setIsRecording] = useState(false);

  return (
    <ThankCastRecordButton
      isRecording={isRecording}
      onPress={() => setIsRecording(!isRecording)}
    />
  );
}
```

**Properties:**
- `onPress` (function) - Called when button is pressed
- `isRecording` (boolean) - Shows recording indicator (square instead of circle)
- `disabled` (boolean) - Disables button (default: false)
- `style` (object) - Custom style overrides

**Sizing:**
- Kids Edition: 80px diameter with large shadow
- Adult Edition: 72px diameter with large shadow

**Visual:**
- Idle: White circle (60% of button size)
- Recording: White square (60% of button size, 4px border radius)

---

### 5. ThankCastSmallButton (Compact Button)
Smaller button for secondary actions or form inputs.

**Basic Usage:**
```javascript
<ThankCastSmallButton
  title="Delete"
  variant="primary"
  onPress={() => handleDelete()}
/>
```

**Properties:**
- `title` (string) - Button text
- `variant` (string) - 'primary', 'secondary', or 'outline' (default: 'primary')
- `onPress` (function) - Called when button is pressed
- `loading` (boolean) - Shows loading spinner (default: false)
- `disabled` (boolean) - Disables button (default: false)
- `style` (object) - Custom style overrides
- `textStyle` (object) - Custom text style overrides

**Sizing:**
- Kids Edition: 44px height, medium corners (16px)
- Adult Edition: 40px height, small corners (6px)

---

### 6. ThankCastIconButton (Icon-Only Button)
Circular button for icon-based actions.

**Basic Usage:**
```javascript
import { ThankCastIconButton } from './components/ThankCastButton';
import { Ionicons } from '@expo/vector-icons';

export default function Toolbar() {
  return (
    <ThankCastIconButton
      size="medium"
      variant="primary"
      icon={<Ionicons name="play" size={24} color="white" />}
      onPress={() => handlePlay()}
    />
  );
}
```

**Properties:**
- `icon` (ReactNode) - Icon component to display
- `onPress` (function) - Called when button is pressed
- `size` (string) - 'small', 'medium', or 'large' (default: 'medium')
- `variant` (string) - 'primary', 'secondary', or 'outline' (default: 'primary')
- `disabled` (boolean) - Disables button (default: false)
- `style` (object) - Custom style overrides

**Sizing:**
- Kids Edition:
  - small: 40px
  - medium: 48px
  - large: 56px
- Adult Edition:
  - small: 36px
  - medium: 44px
  - large: 52px

---

## Complete Example: Form with Multiple Button Types

```javascript
import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import {
  ThankCastButton,
  ThankCastSecondaryButton,
  ThankCastOutlineButton,
  ThankCastSmallButton,
} from './components/ThankCastButton';

export default function VideoForm() {
  const [title, setTitle] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    setIsLoading(true);
    // Save video logic here
    setIsLoading(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Video Title</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter title"
        value={title}
        onChangeText={setTitle}
      />

      {/* Main action button */}
      <ThankCastButton
        title={isLoading ? 'Saving...' : 'Save Video'}
        loading={isLoading}
        disabled={isLoading || !title}
        onPress={handleSubmit}
      />

      {/* Row with multiple buttons */}
      <View style={styles.buttonRow}>
        <ThankCastSecondaryButton
          title="Preview"
          onPress={() => handlePreview()}
        />
        <ThankCastOutlineButton
          title="Cancel"
          onPress={() => handleCancel()}
        />
      </View>

      {/* Action buttons */}
      <View style={styles.actionButtons}>
        <ThankCastSmallButton
          title="Delete Draft"
          variant="outline"
          onPress={() => handleDelete()}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButtons: {
    marginTop: 8,
  },
});
```

---

## Edition-Aware Behavior

All buttons automatically adapt to the current edition set in `EditionContext`:

### Kids Edition
- **Larger buttons** (56px vs 48px)
- **Rounded corners** (20px vs 12px)
- **Generous spacing**
- **Gradient support** on primary button
- **Friendly typography** (Nunito font)
- **Larger shadows** for tactile feel

### Adult Edition (Wedding/Pro)
- **Standard button sizing** (48px)
- **Subtle corners** (12px)
- **Efficient spacing**
- **No gradients** (except hints in icon buttons)
- **Elegant typography** (Montserrat/Inter)
- **Minimal shadows** for refinement

---

## Accessibility

All buttons include:
- `activeOpacity` feedback (0.8)
- `disabled` state handling
- Loading indicators with spinners
- Touch target sizes (minimum 48px for accessibility)
- High contrast colors (WCAG AA compliant)

---

## Customization

### Custom Styles
```javascript
<ThankCastButton
  title="Custom Styled"
  style={{ marginBottom: 12, borderRadius: 24 }}
  textStyle={{ fontSize: 18, letterSpacing: 1 }}
  onPress={handlePress}
/>
```

### Custom Loading
```javascript
<ThankCastButton
  title="Save"
  loading={isSaving}
  onPress={handleSave}
/>
```

---

## Design System Integration

Buttons use values from `theme/thankcast-design-system.js`:
- **Colors**: `theme.brandColors.coral`, `theme.brandColors.teal`
- **Spacing**: `theme.spacing` (edition-specific)
- **Border Radius**: `theme.borderRadius` (edition-specific)
- **Typography**: `theme.typography.button`
- **Shadows**: `theme.shadows.large`, `theme.shadows.small`
- **Gradients**: `theme.gradients.coralToYellow` (kids edition)

Any updates to the design system automatically reflect in all buttons.

---

## Notes for Developers

1. **Always use these components** - Don't create custom buttons. This ensures consistency across the app.

2. **EditionContext Required** - Make sure your app is wrapped with `EditionProvider` in `App.js`

3. **Loading States** - Use the `loading` prop instead of managing separate loading indicators

4. **Disabled State** - Use `disabled` prop to prevent double-submission. Don't hide buttons.

5. **Gradient Buttons** - Only available in kids edition. Adult editions ignore the `gradient` prop.

6. **Icon Buttons** - Always provide icons that contrast well with colors (white or dark gray)

---

## File Location
`/components/ThankCastButton.js`

Export all components from this single file for consistency.
