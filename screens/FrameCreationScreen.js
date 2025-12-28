/**
 * FrameCreationScreen
 * Parents create frame templates with shape + custom text
 * Kids can later decorate with emojis/textures but cannot change text
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  StyleSheet,
  Dimensions,
  Alert,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEdition } from '../context/EditionContext';
import { AppBar } from '../components/AppBar';
import { ThankCastButton } from '../components/ThankCastButton';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { CustomFrameOverlay } from '../components/CustomFrameOverlay';
import { supabase } from '../supabaseClient';
import { ensureParentProfile } from '../services/authService';
import {
  isAIFrameAvailable,
  generateAIFrame,
  saveAIFrameAsTemplate,
  FRAME_STYLE_PRESETS,
  FRAME_COLOR_SCHEMES,
} from '../services/aiFrameService';
import {
  FrameCaptureView,
  generatePresetFramePNG,
  needsPNGGeneration,
} from '../services/presetFrameGenerator';

const { width: screenWidth } = Dimensions.get('window');

// Frame shapes with their visual properties - BOLD, THICK, PROMINENT frames!
const FRAME_SHAPES = [
  {
    id: 'bold-classic',
    label: 'Bold',
    icon: 'square-outline',
    borderRadius: 4,
    borderWidth: 16,
    description: 'Thick, bold frame',
    shadowOpacity: 0.5,
    shadowRadius: 12,
  },
  {
    id: 'rounded-thick',
    label: 'Rounded',
    icon: 'tablet-portrait-outline',
    borderRadius: 24,
    borderWidth: 14,
    description: 'Soft, thick edges',
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  {
    id: 'double-border',
    label: 'Double',
    icon: 'copy-outline',
    borderRadius: 12,
    borderWidth: 8,
    hasDoubleBorder: true,
    outerBorderWidth: 4,
    description: 'Double layer frame',
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  {
    id: 'polaroid',
    label: 'Polaroid',
    icon: 'image-outline',
    borderRadius: 4,
    borderWidth: 16,
    description: 'Classic photo style',
    hasBorder: true,
    bottomPadding: 50,
    shadowOpacity: 0.4,
    shadowRadius: 15,
  },
  {
    id: 'neon-glow',
    label: 'Neon',
    icon: 'flashlight-outline',
    borderRadius: 16,
    borderWidth: 6,
    isNeon: true,
    description: 'Glowing neon effect',
    shadowOpacity: 1.0,
    shadowRadius: 20,
  },
  {
    id: 'wavy-thick',
    label: 'Wavy',
    icon: 'water-outline',
    borderRadius: 30,
    borderWidth: 14,
    isWavy: true,
    description: 'Fun wavy edges',
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  {
    id: 'star-burst',
    label: 'Star',
    icon: 'star-outline',
    borderRadius: 8,
    borderWidth: 12,
    isStar: true,
    description: 'Exciting star burst',
    shadowOpacity: 0.6,
    shadowRadius: 15,
  },
  {
    id: 'spikey-fun',
    label: 'Spikey',
    icon: 'flash-outline',
    borderRadius: 4,
    borderWidth: 10,
    isSpikey: true,
    description: 'Fun spikey edges',
    shadowOpacity: 0.5,
    shadowRadius: 12,
  },
  {
    id: 'cloud-fluffy',
    label: 'Cloud',
    icon: 'cloud-outline',
    borderRadius: 50,
    borderWidth: 16,
    isCloud: true,
    description: 'Fluffy cloud shape',
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  {
    id: 'heart-love',
    label: 'Heart',
    icon: 'heart-outline',
    borderRadius: 24,
    borderWidth: 14,
    isHeart: true,
    description: 'Loving heart frame',
    shadowOpacity: 0.5,
    shadowRadius: 15,
  },
  {
    id: 'scalloped-fancy',
    label: 'Scalloped',
    icon: 'flower-outline',
    borderRadius: 20,
    borderWidth: 12,
    isScalloped: true,
    description: 'Fancy decorative edge',
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  {
    id: 'gradient-frame',
    label: 'Gradient',
    icon: 'color-palette-outline',
    borderRadius: 16,
    borderWidth: 12,
    isGradient: true,
    description: 'Colorful gradient',
    shadowOpacity: 0.5,
    shadowRadius: 12,
  },
];

const TEXT_POSITIONS = [
  { id: 'top', label: 'Top', icon: 'arrow-up' },
  { id: 'bottom', label: 'Bottom', icon: 'arrow-down' },
];

const TEXT_COLORS = [
  { id: '#FFFFFF', label: 'White' },
  { id: '#000000', label: 'Black' },
  { id: '#06b6d4', label: 'Teal' },
  { id: '#FFD700', label: 'Gold' },
  { id: '#FF6B6B', label: 'Coral' },
];

const TEXT_FONTS = [
  { id: 'default', label: 'Default' },
  { id: 'playful', label: 'Playful' },
  { id: 'elegant', label: 'Elegant' },
  { id: 'bold', label: 'Bold' },
];

const FRAME_COLORS = [
  { id: '#06b6d4', label: 'Teal' },
  { id: '#8B5CF6', label: 'Purple' },
  { id: '#F59E0B', label: 'Amber' },
  { id: '#EF4444', label: 'Red' },
  { id: '#10B981', label: 'Green' },
  { id: '#EC4899', label: 'Pink' },
  { id: '#FFFFFF', label: 'White' },
  { id: '#1F2937', label: 'Dark' },
];

export const FrameCreationScreen = ({ navigation, route }) => {
  const { edition, theme } = useEdition();
  const eventId = route?.params?.eventId;
  const eventName = route?.params?.eventName;
  const childId = route?.params?.childId;
  const existingFrame = route?.params?.existingFrame;

  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Saving frame...');
  const [frameName, setFrameName] = useState(existingFrame?.name || '');
  const [selectedShape, setSelectedShape] = useState(existingFrame?.frame_shape || 'rounded-thick');
  const [customText, setCustomText] = useState(existingFrame?.custom_text || '');
  const [textPosition, setTextPosition] = useState(existingFrame?.custom_text_position || 'bottom');
  const [textColor, setTextColor] = useState(existingFrame?.custom_text_color || '#FFFFFF');
  const [textFont, setTextFont] = useState(existingFrame?.custom_text_font || 'default');
  const [frameColor, setFrameColor] = useState(existingFrame?.primary_color || '#06b6d4');

  // AI Frame state
  const [frameMode, setFrameMode] = useState('preset'); // 'preset' or 'ai'
  const [aiPreset, setAiPreset] = useState(null);
  const [aiCustomPrompt, setAiCustomPrompt] = useState('');
  const [aiColorScheme, setAiColorScheme] = useState('rainbow');
  const [generatedFrameUrl, setGeneratedFrameUrl] = useState(null);
  const [generatedFramePath, setGeneratedFramePath] = useState(null);

  // Ref for preset frame PNG capture
  const frameCaptureRef = useRef(null);

  const aiAvailable = isAIFrameAvailable();

  // Get current shape config
  const currentShape = FRAME_SHAPES.find(s => s.id === selectedShape) || FRAME_SHAPES[1];

  // Generate AI frame
  const handleGenerateAIFrame = async () => {
    const promptToUse = aiPreset || aiCustomPrompt.trim();
    if (!promptToUse) {
      Alert.alert('Description Required', 'Please select a style preset or enter a custom description.');
      return;
    }

    try {
      setLoading(true);
      setLoadingMessage('Creating your custom frame with AI...');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'You must be logged in to generate AI frames.');
        return;
      }

      console.log('[FRAME] Generating AI frame:', { preset: aiPreset, prompt: aiCustomPrompt, color: aiColorScheme });

      const result = await generateAIFrame(promptToUse, aiColorScheme, user.id);

      if (!result.success) {
        throw new Error(result.error || 'Failed to generate frame');
      }

      console.log('[FRAME] AI frame generated:', result.framePath);
      setGeneratedFramePath(result.framePath);

      // Get signed URL for preview
      const { data: urlData } = await supabase.storage
        .from(result.bucket || 'ai-frames')
        .createSignedUrl(result.framePath, 3600);

      if (urlData?.signedUrl) {
        setGeneratedFrameUrl(urlData.signedUrl);
      }

      Alert.alert(
        'Frame Generated!',
        'Your AI frame has been created. You can now save it as a template.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('[FRAME] AI generation error:', error);
      Alert.alert('Generation Failed', error.message || 'Failed to generate AI frame. Please try again.');
    } finally {
      setLoading(false);
      setLoadingMessage('Saving frame...');
    }
  };

  const handleSave = async () => {
    if (!frameName.trim()) {
      Alert.alert('Name Required', 'Please enter a name for this frame template.');
      return;
    }

    // For AI mode, require a generated frame
    if (frameMode === 'ai' && !generatedFramePath) {
      Alert.alert('Generate Frame First', 'Please generate an AI frame before saving.');
      return;
    }

    try {
      setLoading(true);
      setLoadingMessage('Saving frame...');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'You must be logged in to create frames.');
        return;
      }

      // Ensure parent profile exists before creating frame (safety net for new users)
      const profileResult = await ensureParentProfile(user.id);
      if (!profileResult.success) {
        console.error('❌ Failed to ensure parent profile:', profileResult.error);
        Alert.alert('Error', 'Unable to verify your account. Please try logging out and back in.');
        setLoading(false);
        return;
      }

      // Generate PNG for preset frames (not AI frames - they already have PNGs)
      let framePngPath = null;
      if (frameMode === 'ai') {
        framePngPath = generatedFramePath;
      } else if (needsPNGGeneration(frameMode, selectedShape)) {
        setLoadingMessage('Generating frame image...');
        console.log('[FRAME] Generating PNG for preset shape:', selectedShape);

        // Small delay to ensure the capture view is rendered
        await new Promise(resolve => setTimeout(resolve, 100));

        const pngResult = await generatePresetFramePNG(
          frameCaptureRef,
          user.id,
          frameName.trim()
        );

        if (pngResult.success) {
          framePngPath = pngResult.storagePath;
          console.log('[FRAME] PNG generated and uploaded:', framePngPath);
        } else {
          console.warn('[FRAME] PNG generation failed:', pngResult.error);
          // Continue without PNG - compositing will fall back to simple border
          Alert.alert(
            'Frame Image Warning',
            'Could not generate frame image for video compositing. The frame will still be saved but may appear as a simple border in shared videos.'
          );
        }
      }

      setLoadingMessage('Saving frame...');

      const frameData = {
        parent_id: user.id,
        name: frameName.trim(),
        frame_shape: frameMode === 'ai' ? 'ai-generated' : selectedShape,
        custom_text: customText.trim(),
        custom_text_position: textPosition,
        custom_text_color: textColor,
        custom_text_font: textFont,
        primary_color: frameMode === 'ai'
          ? (FRAME_COLOR_SCHEMES.find(c => c.id === aiColorScheme)?.hex || '#06B6D4')
          : frameColor,
        border_width: currentShape.borderWidth || 4,
        border_radius: currentShape.borderRadius || 0,
        frame_type: frameMode === 'ai' ? 'ai' : 'custom',
        // PNG path for compositing (both AI and preset frames now have this!)
        frame_png_path: framePngPath,
        is_ai_generated: frameMode === 'ai',
        ai_prompt: frameMode === 'ai' ? (aiPreset || aiCustomPrompt) : null,
      };

      let frameId;

      if (existingFrame?.id) {
        // Update existing
        const { error } = await supabase
          .from('frame_templates')
          .update(frameData)
          .eq('id', existingFrame.id);

        if (error) throw error;
        frameId = existingFrame.id;
      } else {
        // Create new
        const { data, error } = await supabase
          .from('frame_templates')
          .insert(frameData)
          .select('id')
          .single();

        if (error) throw error;
        frameId = data.id;

        // Create assignment if event specified
        if (eventId) {
          console.log('🔗 Creating frame assignment:', {
            frameId,
            eventId,
            childId: childId || null,
            priority: childId ? 50 : 25,
          });

          // IMPORTANT: Deactivate existing event-level assignments first
          // This ensures the new frame becomes the active one
          const deactivateQuery = supabase
            .from('frame_assignments')
            .update({ is_active: false })
            .eq('event_id', eventId)
            .eq('is_active', true);

          // Only deactivate event-level assignments (not child-specific)
          if (!childId) {
            deactivateQuery.is('child_id', null).is('gift_id', null).is('guest_id', null);
          } else {
            // For child-specific, only deactivate that child's assignments
            deactivateQuery.eq('child_id', childId);
          }

          const { error: deactivateError } = await deactivateQuery;
          if (deactivateError) {
            console.warn('⚠️ Could not deactivate old assignments:', deactivateError.message);
            // Continue anyway - new assignment will still be created
          } else {
            console.log('✅ Deactivated old frame assignments for event');
          }

          const { data: assignmentData, error: assignError } = await supabase
            .from('frame_assignments')
            .insert({
              frame_template_id: frameId,
              event_id: eventId,
              child_id: childId || null,
              priority: childId ? 50 : 25,
              is_active: true,
            })
            .select();

          if (assignError) {
            console.error('❌ Failed to create frame assignment:', {
              code: assignError.code,
              message: assignError.message,
              details: assignError.details,
            });
            // Show warning to user but don't block frame creation
            Alert.alert(
              'Assignment Warning',
              'Frame template saved but could not be assigned to the event. You can assign it manually later.\n\nError: ' + assignError.message
            );
          } else {
            console.log('✅ Frame assignment created:', assignmentData);
          }
        } else {
          console.log('ℹ️  No eventId provided, skipping assignment creation');
        }
      }

      Alert.alert(
        'Frame Saved!',
        existingFrame ? 'Your frame template has been updated.' : 'Your frame template has been created.',
        [{ text: 'OK', onPress: () => navigation?.goBack() }]
      );
    } catch (error) {
      console.error('Error saving frame:', error);
      // Show more helpful error message
      let errorMessage = 'Failed to save frame template.';
      if (error.message?.includes('relation') && error.message?.includes('does not exist')) {
        errorMessage = 'Frame templates table not set up. Please run the frame_templates SQL migration in Supabase.';
      } else if (error.message?.includes('permission') || error.code === '42501') {
        errorMessage = 'Permission denied. Please check RLS policies in Supabase.';
      } else if (error.message) {
        errorMessage = `Error: ${error.message}`;
      }
      Alert.alert('Save Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Render frame preview with actual SVG frame overlay
  const renderFramePreview = () => {
    // Create mock frameTemplate object for preview
    const mockFrameTemplate = {
      id: 'preview',
      name: frameName || 'Preview',
      frame_shape: selectedShape,
      primary_color: frameColor,
      border_width: currentShape.borderWidth || 4,
      border_radius: currentShape.borderRadius || 0,
      custom_text: customText,
      custom_text_position: textPosition,
      custom_text_color: textColor,
      custom_text_font: textFont,
      frame_type: 'custom',
    };

    return (
      <View style={styles.previewContainer}>
        {/* Preview container with aspect ratio for vertical video */}
        <View
          style={{
            backgroundColor: '#000000',
            aspectRatio: 9 / 16,
            width: '70%',
            alignSelf: 'center',
            borderRadius: 12,
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          {/* Mock video content area */}
          <LinearGradient
            colors={['#1e293b', '#0f172a']}
            style={{
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 0,
            }}
          >
            <Ionicons name="videocam" size={40} color="#64748b" />
            <Text style={styles.previewPlaceholder}>Frame Preview</Text>
          </LinearGradient>

          {/* Actual CustomFrameOverlay component - same as used in videos */}
          <View style={[StyleSheet.absoluteFill, { zIndex: 10 }]} pointerEvents="none">
            <CustomFrameOverlay frameTemplate={mockFrameTemplate} />
          </View>

          {/* Custom text overlay */}
          {customText && (
            <View
              style={[
                styles.textOverlay,
                textPosition === 'top' ? styles.textTop : styles.textBottom,
                { zIndex: 15 },
              ]}
              pointerEvents="none"
            >
              <View style={{ backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 }}>
                <Text
                  style={[
                    styles.customTextPreview,
                    { color: textColor },
                    textFont === 'playful' && styles.fontPlayful,
                    textFont === 'elegant' && styles.fontElegant,
                    textFont === 'bold' && styles.fontBold,
                  ]}
                >
                  {customText}
                </Text>
              </View>
            </View>
          )}
        </View>

        <Text style={styles.previewHint}>
          Preview of how the frame will look in videos
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Off-screen frame capture view for generating PNG */}
      <View style={styles.offScreenCapture} pointerEvents="none">
        <FrameCaptureView
          ref={frameCaptureRef}
          frameShape={selectedShape}
          primaryColor={frameColor}
          borderWidth={currentShape.borderWidth || 16}
          borderRadius={currentShape.borderRadius || 12}
        />
      </View>

      <AppBar
        title={existingFrame ? 'Edit Frame' : 'Create Frame'}
        onBackPress={() => navigation?.goBack()}
        showBack={true}
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Event context */}
        {eventName && (
          <View style={styles.contextBar}>
            <Ionicons name="calendar" size={16} color="#06b6d4" />
            <Text style={styles.contextText}>For: {eventName}</Text>
          </View>
        )}

        {/* Frame Preview */}
        {renderFramePreview()}

        {/* Mode Tabs: Preset vs AI */}
        {aiAvailable && (
          <View style={styles.section}>
            <View style={styles.modeTabs}>
              <TouchableOpacity
                onPress={() => setFrameMode('preset')}
                style={[
                  styles.modeTab,
                  frameMode === 'preset' && styles.modeTabActive,
                ]}
              >
                <Ionicons
                  name="shapes-outline"
                  size={20}
                  color={frameMode === 'preset' ? '#FFFFFF' : '#6B7280'}
                />
                <Text style={[
                  styles.modeTabText,
                  frameMode === 'preset' && styles.modeTabTextActive,
                ]}>
                  Preset Shapes
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setFrameMode('ai')}
                style={[
                  styles.modeTab,
                  frameMode === 'ai' && styles.modeTabActive,
                ]}
              >
                <Ionicons
                  name="sparkles-outline"
                  size={20}
                  color={frameMode === 'ai' ? '#FFFFFF' : '#6B7280'}
                />
                <Text style={[
                  styles.modeTabText,
                  frameMode === 'ai' && styles.modeTabTextActive,
                ]}>
                  AI Generated
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* AI Frame Options */}
        {frameMode === 'ai' && (
          <>
            {/* Style Presets */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Choose a Style</Text>
              <Text style={styles.sectionHint}>Select a preset or enter your own description</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.shapeRow}>
                  {FRAME_STYLE_PRESETS.map((preset) => (
                    <TouchableOpacity
                      key={preset.id}
                      onPress={() => {
                        setAiPreset(aiPreset === preset.id ? null : preset.id);
                        if (aiPreset !== preset.id) setAiCustomPrompt('');
                      }}
                      style={[
                        styles.shapeOption,
                        aiPreset === preset.id && styles.shapeOptionSelected,
                      ]}
                    >
                      <Text style={{ fontSize: 28 }}>{preset.icon}</Text>
                      <Text
                        style={[
                          styles.shapeLabel,
                          aiPreset === preset.id && styles.shapeLabelSelected,
                        ]}
                      >
                        {preset.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* Custom Description */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Or Describe Your Frame</Text>
              <TextInput
                value={aiCustomPrompt}
                onChangeText={(text) => {
                  setAiCustomPrompt(text);
                  if (text) setAiPreset(null);
                }}
                placeholder="e.g., jungle theme with monkeys and vines"
                style={styles.textInput}
                placeholderTextColor="#9CA3AF"
                multiline
                maxLength={200}
              />
              <Text style={styles.charCount}>{aiCustomPrompt.length}/200</Text>
            </View>

            {/* Color Scheme */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Color Scheme</Text>
              <View style={styles.colorRow}>
                {FRAME_COLOR_SCHEMES.map((color) => (
                  <TouchableOpacity
                    key={color.id}
                    onPress={() => setAiColorScheme(color.id)}
                    style={[
                      styles.colorSwatch,
                      { backgroundColor: color.hex || '#FF69B4' },
                      color.id === 'rainbow' && styles.rainbowSwatch,
                      aiColorScheme === color.id && styles.colorSwatchSelected,
                    ]}
                  >
                    {aiColorScheme === color.id && (
                      <Ionicons name="checkmark" size={18} color="#FFF" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Generate Button */}
            <View style={styles.section}>
              <TouchableOpacity
                onPress={handleGenerateAIFrame}
                disabled={loading || (!aiPreset && !aiCustomPrompt.trim())}
                style={[
                  styles.generateButton,
                  (!aiPreset && !aiCustomPrompt.trim()) && styles.generateButtonDisabled,
                ]}
              >
                <Ionicons name="sparkles" size={24} color="#FFFFFF" />
                <Text style={styles.generateButtonText}>Generate Frame with AI</Text>
              </TouchableOpacity>
            </View>

            {/* Generated Frame Preview */}
            {generatedFrameUrl && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Generated Frame</Text>
                <View style={styles.generatedPreview}>
                  <Image
                    source={{ uri: generatedFrameUrl }}
                    style={styles.generatedImage}
                    resizeMode="contain"
                  />
                </View>
                <TouchableOpacity
                  onPress={() => {
                    setGeneratedFrameUrl(null);
                    setGeneratedFramePath(null);
                  }}
                  style={styles.regenerateButton}
                >
                  <Ionicons name="refresh" size={18} color="#06b6d4" />
                  <Text style={styles.regenerateText}>Generate New</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}

        {/* Frame Name */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Frame Name</Text>
          <TextInput
            value={frameName}
            onChangeText={setFrameName}
            placeholder="Birthday Frame, Holiday Frame, etc."
            style={styles.textInput}
            placeholderTextColor="#9CA3AF"
          />
        </View>

        {/* Frame Shape Selection - Only for preset mode */}
        {frameMode === 'preset' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Frame Shape</Text>
            <Text style={styles.sectionHint}>Kids cannot change the shape</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.shapeRow}>
                {FRAME_SHAPES.map((shape) => (
                  <TouchableOpacity
                    key={shape.id}
                    onPress={() => setSelectedShape(shape.id)}
                    style={[
                      styles.shapeOption,
                      selectedShape === shape.id && styles.shapeOptionSelected,
                    ]}
                  >
                    <Ionicons
                      name={shape.icon}
                      size={28}
                      color={selectedShape === shape.id ? '#FFFFFF' : '#6B7280'}
                    />
                    <Text
                      style={[
                        styles.shapeLabel,
                        selectedShape === shape.id && styles.shapeLabelSelected,
                      ]}
                    >
                      {shape.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        {/* Custom Text */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Custom Text (Locked)</Text>
          <Text style={styles.sectionHint}>Kids cannot edit this text</Text>
          <TextInput
            value={customText}
            onChangeText={setCustomText}
            placeholder="Thanks for coming to my party!"
            style={styles.textInput}
            placeholderTextColor="#9CA3AF"
            multiline
            maxLength={100}
          />
          <Text style={styles.charCount}>{customText.length}/100</Text>
        </View>

        {/* Text Position */}
        {customText.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Text Position</Text>
            <View style={styles.optionRow}>
              {TEXT_POSITIONS.map((pos) => (
                <TouchableOpacity
                  key={pos.id}
                  onPress={() => setTextPosition(pos.id)}
                  style={[
                    styles.optionButton,
                    textPosition === pos.id && styles.optionButtonSelected,
                  ]}
                >
                  <Ionicons
                    name={pos.icon}
                    size={20}
                    color={textPosition === pos.id ? '#FFFFFF' : '#6B7280'}
                  />
                  <Text
                    style={[
                      styles.optionLabel,
                      textPosition === pos.id && styles.optionLabelSelected,
                    ]}
                  >
                    {pos.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Text Color */}
        {customText.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Text Color</Text>
            <View style={styles.colorRow}>
              {TEXT_COLORS.map((color) => (
                <TouchableOpacity
                  key={color.id}
                  onPress={() => setTextColor(color.id)}
                  style={[
                    styles.colorSwatch,
                    { backgroundColor: color.id },
                    textColor === color.id && styles.colorSwatchSelected,
                    color.id === '#FFFFFF' && styles.whiteSwatch,
                  ]}
                >
                  {textColor === color.id && (
                    <Ionicons
                      name="checkmark"
                      size={18}
                      color={color.id === '#FFFFFF' || color.id === '#FFD700' ? '#000' : '#FFF'}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Frame Border Color - Only for preset mode */}
        {frameMode === 'preset' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Frame Color</Text>
            <View style={styles.colorRow}>
              {FRAME_COLORS.map((color) => (
                <TouchableOpacity
                  key={color.id}
                  onPress={() => setFrameColor(color.id)}
                  style={[
                    styles.colorSwatch,
                    { backgroundColor: color.id },
                    frameColor === color.id && styles.colorSwatchSelected,
                    color.id === '#FFFFFF' && styles.whiteSwatch,
                  ]}
                >
                  {frameColor === color.id && (
                    <Ionicons
                      name="checkmark"
                      size={18}
                      color={color.id === '#FFFFFF' || color.id === '#F59E0B' ? '#000' : '#FFF'}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Save Button */}
        <View style={styles.saveSection}>
          <ThankCastButton
            title={existingFrame ? 'Save Changes' : 'Create Frame'}
            onPress={handleSave}
            loading={loading}
            disabled={loading}
          />
        </View>
      </ScrollView>

      <LoadingSpinner visible={loading} message={loadingMessage} fullScreen />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  // Off-screen view for capturing frame as PNG
  offScreenCapture: {
    position: 'absolute',
    left: -9999,
    top: -9999,
    opacity: 0,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  contextBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  contextText: {
    fontSize: 14,
    color: '#0E7490',
    fontWeight: '500',
  },
  previewContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  framePreview: {
    width: screenWidth * 0.5,
    aspectRatio: 9 / 16,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  scallopedFrame: {
    // Scalloped effect approximated with shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  previewContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewPlaceholder: {
    color: '#64748b',
    marginTop: 8,
    fontSize: 12,
  },
  textOverlay: {
    position: 'absolute',
    left: 8,
    right: 8,
    padding: 8,
  },
  textTop: {
    top: 8,
  },
  textBottom: {
    bottom: 8,
  },
  customTextPreview: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  fontPlayful: {
    fontWeight: '700',
    letterSpacing: 1,
  },
  fontElegant: {
    fontStyle: 'italic',
    fontWeight: '400',
  },
  fontBold: {
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  polaroidCaption: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 40,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  polaroidCaptionText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  previewHint: {
    marginTop: 12,
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  sectionHint: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  textInput: {
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1F2937',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  charCount: {
    fontSize: 11,
    color: '#9CA3AF',
    textAlign: 'right',
    marginTop: 4,
  },
  shapeRow: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 4,
  },
  shapeOption: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  shapeOptionSelected: {
    backgroundColor: '#06b6d4',
    borderColor: '#0891b2',
  },
  shapeLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 4,
    fontWeight: '500',
  },
  shapeLabelSelected: {
    color: '#FFFFFF',
  },
  optionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  optionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  optionButtonSelected: {
    backgroundColor: '#06b6d4',
    borderColor: '#0891b2',
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  optionLabelSelected: {
    color: '#FFFFFF',
  },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorSwatch: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorSwatchSelected: {
    borderWidth: 3,
    borderColor: '#1F2937',
  },
  whiteSwatch: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  saveSection: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 16,
  },
  // AI Frame Mode Tabs
  modeTabs: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 4,
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
  },
  modeTabActive: {
    backgroundColor: '#06b6d4',
  },
  modeTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  modeTabTextActive: {
    color: '#FFFFFF',
  },
  // AI Generate Button
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#8B5CF6',
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  generateButtonDisabled: {
    backgroundColor: '#D1D5DB',
    shadowOpacity: 0,
  },
  generateButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // Generated Frame Preview
  generatedPreview: {
    backgroundColor: '#000000',
    borderRadius: 12,
    overflow: 'hidden',
    aspectRatio: 9 / 16,
    width: '70%',
    alignSelf: 'center',
  },
  generatedImage: {
    width: '100%',
    height: '100%',
  },
  regenerateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
    paddingVertical: 10,
  },
  regenerateText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#06b6d4',
  },
  // Rainbow color swatch
  rainbowSwatch: {
    backgroundColor: 'transparent',
    borderWidth: 3,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
});

export default FrameCreationScreen;
