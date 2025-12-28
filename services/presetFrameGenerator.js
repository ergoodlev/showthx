/**
 * Preset Frame Generator Service
 * Generates PNG images from preset frame shapes for video compositing
 * Uses react-native-view-shot to capture SVG frames as PNG
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { captureRef } from 'react-native-view-shot';
import Svg, { Path, Circle, Rect, Defs, RadialGradient, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { supabase } from '../supabaseClient';

// Frame dimensions for 9:16 portrait video (matching typical phone video)
export const FRAME_WIDTH = 1080;
export const FRAME_HEIGHT = 1920;

// SVG viewBox dimensions (scaled for efficient rendering)
const VB_WIDTH = 108;  // 1080 / 10
const VB_HEIGHT = 192; // 1920 / 10

// Storage bucket for preset frames
const PRESET_FRAMES_BUCKET = 'videos';
const PRESET_FRAMES_FOLDER = 'preset-frames';

/**
 * Generate SVG content for a frame shape
 * Returns the SVG elements for the given frame shape
 */
const generateFrameSVG = (frameShape, primaryColor, borderWidth, borderRadius) => {
  const W = VB_WIDTH;
  const H = VB_HEIGHT;
  const scaledBorderWidth = borderWidth / 2;
  const scaledBorderRadius = borderRadius / 2;

  switch (frameShape) {
    case 'star-burst':
      return generateStarBurstSVG(W, H, primaryColor, scaledBorderRadius);
    case 'cloud-fluffy':
      return generateCloudFluffySVG(W, H, primaryColor, scaledBorderRadius);
    case 'heart-love':
      return generateHeartLoveSVG(W, H, primaryColor, scaledBorderRadius);
    case 'wavy-thick':
      return generateWavyThickSVG(W, H, primaryColor, scaledBorderWidth);
    case 'spikey-fun':
      return generateSpikeyFunSVG(W, H, primaryColor, scaledBorderRadius);
    case 'scalloped-fancy':
      return generateScallopedFancySVG(W, H, primaryColor, scaledBorderRadius);
    case 'neon-glow':
      return generateNeonGlowSVG(W, H, primaryColor, scaledBorderWidth, scaledBorderRadius);
    case 'gradient-frame':
      return generateGradientFrameSVG(W, H, scaledBorderWidth, scaledBorderRadius);
    case 'double-border':
      return generateDoubleBorderSVG(W, H, primaryColor, scaledBorderWidth, scaledBorderRadius);
    case 'bold-classic':
    case 'rounded-thick':
    case 'polaroid':
    default:
      return generateBasicBorderSVG(W, H, primaryColor, scaledBorderWidth, scaledBorderRadius);
  }
};

// Star Burst SVG
const generateStarBurstSVG = (W, H, color, borderRadius) => {
  const stars = [];
  const positions = [
    { x: 10, y: 10 }, { x: W - 10, y: 10 },
    { x: 10, y: H - 10 }, { x: W - 10, y: H - 10 },
    { x: W / 2, y: 6 }, { x: W / 2, y: H - 6 },
    { x: 6, y: H / 2 }, { x: W - 6, y: H / 2 },
    { x: W * 0.25, y: 6 }, { x: W * 0.75, y: 6 },
    { x: W * 0.25, y: H - 6 }, { x: W * 0.75, y: H - 6 },
    { x: 6, y: H * 0.25 }, { x: 6, y: H * 0.75 },
    { x: W - 6, y: H * 0.25 }, { x: W - 6, y: H * 0.75 },
    { x: W * 0.15, y: H * 0.15 }, { x: W * 0.85, y: H * 0.15 },
    { x: W * 0.15, y: H * 0.85 }, { x: W * 0.85, y: H * 0.85 },
  ];

  positions.forEach((pos, i) => {
    const size = 6;
    const starPath = `M${pos.x},${pos.y - size} L${pos.x + size * 0.4},${pos.y + size * 0.4} L${pos.x + size},${pos.y} L${pos.x + size * 0.4},${pos.y - size * 0.4} Z`;
    stars.push(
      <Path key={`star-${i}`} d={starPath} fill={color} opacity={0.9} stroke={color} strokeWidth="0.5" />
    );
  });

  return (
    <>
      <Rect x="2" y="2" width={W - 4} height={H - 4} rx={borderRadius} fill="none" stroke={color} strokeWidth="3" />
      {stars}
    </>
  );
};

// Cloud Fluffy SVG
const generateCloudFluffySVG = (W, H, color, borderRadius) => {
  return (
    <>
      <Rect x="2" y="2" width={W - 4} height={H - 4} rx={borderRadius} fill="none" stroke={color} strokeWidth="2" opacity={0.5} />
      {/* Corner clouds */}
      <Circle cx="12" cy="12" r="12" fill={color} opacity={0.4} />
      <Circle cx="12" cy="12" r="12" fill="none" stroke={color} strokeWidth="2" opacity={0.9} />
      <Circle cx="20" cy="10" r="8" fill={color} opacity={0.4} />
      <Circle cx="20" cy="10" r="8" fill="none" stroke={color} strokeWidth="2" opacity={0.9} />

      <Circle cx={W - 12} cy="12" r="12" fill={color} opacity={0.4} />
      <Circle cx={W - 12} cy="12" r="12" fill="none" stroke={color} strokeWidth="2" opacity={0.9} />
      <Circle cx={W - 20} cy="10" r="8" fill={color} opacity={0.4} />
      <Circle cx={W - 20} cy="10" r="8" fill="none" stroke={color} strokeWidth="2" opacity={0.9} />

      <Circle cx="12" cy={H - 12} r="12" fill={color} opacity={0.4} />
      <Circle cx="12" cy={H - 12} r="12" fill="none" stroke={color} strokeWidth="2" opacity={0.9} />
      <Circle cx="20" cy={H - 10} r="8" fill={color} opacity={0.4} />
      <Circle cx="20" cy={H - 10} r="8" fill="none" stroke={color} strokeWidth="2" opacity={0.9} />

      <Circle cx={W - 12} cy={H - 12} r="12" fill={color} opacity={0.4} />
      <Circle cx={W - 12} cy={H - 12} r="12" fill="none" stroke={color} strokeWidth="2" opacity={0.9} />
      <Circle cx={W - 20} cy={H - 10} r="8" fill={color} opacity={0.4} />
      <Circle cx={W - 20} cy={H - 10} r="8" fill="none" stroke={color} strokeWidth="2" opacity={0.9} />

      {/* Side clouds */}
      <Circle cx={W / 2} cy="8" r="10" fill={color} opacity={0.4} />
      <Circle cx={W / 2} cy="8" r="10" fill="none" stroke={color} strokeWidth="2" opacity={0.8} />
      <Circle cx={W / 2} cy={H - 8} r="10" fill={color} opacity={0.4} />
      <Circle cx={W / 2} cy={H - 8} r="10" fill="none" stroke={color} strokeWidth="2" opacity={0.8} />
      <Circle cx="8" cy={H / 2} r="10" fill={color} opacity={0.4} />
      <Circle cx="8" cy={H / 2} r="10" fill="none" stroke={color} strokeWidth="2" opacity={0.8} />
      <Circle cx={W - 8} cy={H / 2} r="10" fill={color} opacity={0.4} />
      <Circle cx={W - 8} cy={H / 2} r="10" fill="none" stroke={color} strokeWidth="2" opacity={0.8} />
    </>
  );
};

// Heart Love SVG
const generateHeartLoveSVG = (W, H, color, borderRadius) => {
  const heartPath = (x, y, size = 5) => {
    return `M${x},${y + size * 0.8}
      C${x},${y + size * 0.3} ${x - size * 0.5},${y} ${x - size},${y}
      C${x - size * 1.5},${y} ${x - size * 2},${y + size * 0.5} ${x - size * 2},${y + size}
      C${x - size * 2},${y + size * 1.5} ${x - size},${y + size * 2} ${x},${y + size * 2.5}
      C${x + size},${y + size * 2} ${x + size * 2},${y + size * 1.5} ${x + size * 2},${y + size}
      C${x + size * 2},${y + size * 0.5} ${x + size * 1.5},${y} ${x + size},${y}
      C${x + size * 0.5},${y} ${x},${y + size * 0.3} ${x},${y + size * 0.8} Z`;
  };

  return (
    <>
      {/* Corner hearts */}
      <Path d={heartPath(20, 12, 5)} fill={color} opacity={0.85} stroke={color} strokeWidth="0.5" />
      <Path d={heartPath(W - 20, 12, 5)} fill={color} opacity={0.85} stroke={color} strokeWidth="0.5" />
      <Path d={heartPath(20, H - 20, 5)} fill={color} opacity={0.85} stroke={color} strokeWidth="0.5" />
      <Path d={heartPath(W - 20, H - 20, 5)} fill={color} opacity={0.85} stroke={color} strokeWidth="0.5" />

      {/* Side hearts */}
      <Path d={heartPath(W / 2, 6, 4)} fill={color} opacity={0.75} stroke={color} strokeWidth="0.5" />
      <Path d={heartPath(W / 2, H - 14, 4)} fill={color} opacity={0.75} stroke={color} strokeWidth="0.5" />
      <Path d={heartPath(12, H / 2, 4)} fill={color} opacity={0.75} stroke={color} strokeWidth="0.5" />
      <Path d={heartPath(W - 12, H / 2, 4)} fill={color} opacity={0.75} stroke={color} strokeWidth="0.5" />

      {/* Main border */}
      <Rect x="2" y="2" width={W - 4} height={H - 4} rx={borderRadius} fill="none" stroke={color} strokeWidth="2" opacity={0.6} />
    </>
  );
};

// Wavy Thick SVG
const generateWavyThickSVG = (W, H, color, borderWidth) => {
  const waveFreq = 16;
  const waveAmp = 3;

  let topWave = `M2,${8 + waveAmp}`;
  let bottomWave = `M2,${H - 8 - waveAmp}`;
  let leftWave = `M${8 + waveAmp},2`;
  let rightWave = `M${W - 8 - waveAmp},2`;

  for (let i = 2; i <= W - 2; i += 2) {
    const wave = Math.sin((i / W) * Math.PI * waveFreq) * waveAmp;
    topWave += ` L${i},${8 + waveAmp + wave}`;
    bottomWave += ` L${i},${H - 8 - waveAmp + wave}`;
  }
  for (let i = 2; i <= H - 2; i += 2) {
    const wave = Math.sin((i / H) * Math.PI * waveFreq) * waveAmp;
    leftWave += ` L${8 + waveAmp + wave},${i}`;
    rightWave += ` L${W - 8 - waveAmp + wave},${i}`;
  }

  return (
    <>
      <Path d={topWave} stroke={color} strokeWidth={borderWidth} fill="none" />
      <Path d={bottomWave} stroke={color} strokeWidth={borderWidth} fill="none" />
      <Path d={leftWave} stroke={color} strokeWidth={borderWidth} fill="none" />
      <Path d={rightWave} stroke={color} strokeWidth={borderWidth} fill="none" />
    </>
  );
};

// Spikey Fun SVG
const generateSpikeyFunSVG = (W, H, color, borderRadius) => {
  const spikes = [];
  const numSpikesHoriz = 18;
  const numSpikesVert = 32;

  // Top and bottom spikes
  for (let i = 1; i <= numSpikesHoriz; i++) {
    const x = (W / (numSpikesHoriz + 1)) * i;
    spikes.push(<Path key={`t${i}`} d={`M${x},8 L${x - 3},0 L${x + 3},0 Z`} fill={color} opacity={0.9} />);
    spikes.push(<Path key={`b${i}`} d={`M${x},${H - 8} L${x - 3},${H} L${x + 3},${H} Z`} fill={color} opacity={0.9} />);
  }

  // Left and right spikes
  for (let i = 1; i <= numSpikesVert; i++) {
    const y = (H / (numSpikesVert + 1)) * i;
    spikes.push(<Path key={`l${i}`} d={`M8,${y} L0,${y - 3} L0,${y + 3} Z`} fill={color} opacity={0.9} />);
    spikes.push(<Path key={`r${i}`} d={`M${W - 8},${y} L${W},${y - 3} L${W},${y + 3} Z`} fill={color} opacity={0.9} />);
  }

  return (
    <>
      <Rect x="2" y="2" width={W - 4} height={H - 4} rx={borderRadius} fill="none" stroke={color} strokeWidth="2" />
      {spikes}
    </>
  );
};

// Scalloped Fancy SVG
const generateScallopedFancySVG = (W, H, color, borderRadius) => {
  const scallops = [];
  const numScallopsHoriz = 16;
  const numScallopsVert = 28;

  // Top and bottom scallops
  for (let i = 0; i <= numScallopsHoriz; i++) {
    const x = (W / numScallopsHoriz) * i;
    scallops.push(<Circle key={`t${i}`} cx={x} cy="6" r="5" fill={color} opacity={0.35} />);
    scallops.push(<Circle key={`to${i}`} cx={x} cy="6" r="5" fill="none" stroke={color} strokeWidth="2" />);
    scallops.push(<Circle key={`b${i}`} cx={x} cy={H - 6} r="5" fill={color} opacity={0.35} />);
    scallops.push(<Circle key={`bo${i}`} cx={x} cy={H - 6} r="5" fill="none" stroke={color} strokeWidth="2" />);
  }

  // Left and right scallops
  for (let i = 0; i <= numScallopsVert; i++) {
    const y = (H / numScallopsVert) * i;
    scallops.push(<Circle key={`l${i}`} cx="6" cy={y} r="5" fill={color} opacity={0.35} />);
    scallops.push(<Circle key={`lo${i}`} cx="6" cy={y} r="5" fill="none" stroke={color} strokeWidth="2" />);
    scallops.push(<Circle key={`r${i}`} cx={W - 6} cy={y} r="5" fill={color} opacity={0.35} />);
    scallops.push(<Circle key={`ro${i}`} cx={W - 6} cy={y} r="5" fill="none" stroke={color} strokeWidth="2" />);
  }

  return (
    <>
      {scallops}
      <Rect x="12" y="12" width={W - 24} height={H - 24} rx={borderRadius} fill="none" stroke={color} strokeWidth="2" opacity={0.5} />
    </>
  );
};

// Neon Glow SVG
const generateNeonGlowSVG = (W, H, color, borderWidth, borderRadius) => {
  return (
    <>
      <Defs>
        <RadialGradient id="neonGlow">
          <Stop offset="0%" stopColor={color} stopOpacity="1" />
          <Stop offset="100%" stopColor={color} stopOpacity="0.3" />
        </RadialGradient>
      </Defs>
      <Rect x="4" y="4" width={W - 8} height={H - 8} rx={borderRadius} fill="none" stroke={color} strokeWidth={borderWidth * 2} opacity={1} />
      <Rect x="3" y="3" width={W - 6} height={H - 6} rx={borderRadius} fill="none" stroke={color} strokeWidth={borderWidth} opacity={0.6} />
      <Rect x="2" y="2" width={W - 4} height={H - 4} rx={borderRadius} fill="none" stroke={color} strokeWidth={borderWidth * 0.5} opacity={0.3} />
    </>
  );
};

// Gradient Frame SVG
const generateGradientFrameSVG = (W, H, borderWidth, borderRadius) => {
  return (
    <>
      <Defs>
        <SvgLinearGradient id="rainbowGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#FF0000" />
          <Stop offset="17%" stopColor="#FF7F00" />
          <Stop offset="33%" stopColor="#FFFF00" />
          <Stop offset="50%" stopColor="#00FF00" />
          <Stop offset="67%" stopColor="#0000FF" />
          <Stop offset="83%" stopColor="#4B0082" />
          <Stop offset="100%" stopColor="#9400D3" />
        </SvgLinearGradient>
      </Defs>
      <Rect x="4" y="4" width={W - 8} height={H - 8} rx={borderRadius} fill="none" stroke="url(#rainbowGradient)" strokeWidth={borderWidth * 2} />
      <Rect x="6" y="6" width={W - 12} height={H - 12} rx={borderRadius} fill="none" stroke="url(#rainbowGradient)" strokeWidth={borderWidth} opacity={0.5} />
    </>
  );
};

// Double Border SVG
const generateDoubleBorderSVG = (W, H, color, borderWidth, borderRadius) => {
  return (
    <>
      <Rect x="8" y="8" width={W - 16} height={H - 16} rx={borderRadius} fill="none" stroke={color} strokeWidth={borderWidth} opacity={0.5} />
      <Rect x="16" y="16" width={W - 32} height={H - 32} rx={Math.max(0, borderRadius - 4)} fill="none" stroke={color} strokeWidth={borderWidth * 2} />
    </>
  );
};

// Basic Border SVG (for bold-classic, rounded-thick, polaroid)
const generateBasicBorderSVG = (W, H, color, borderWidth, borderRadius) => {
  return (
    <Rect x="8" y="8" width={W - 16} height={H - 16} rx={borderRadius} fill="none" stroke={color} strokeWidth={borderWidth * 2} />
  );
};

/**
 * React component for rendering a frame to capture
 * This is rendered off-screen and captured as PNG
 */
export const FrameCaptureView = React.forwardRef(({ frameShape, primaryColor, borderWidth, borderRadius }, ref) => {
  return (
    <View
      ref={ref}
      style={{
        width: FRAME_WIDTH,
        height: FRAME_HEIGHT,
        backgroundColor: 'transparent',
      }}
      collapsable={false}
    >
      <Svg
        width={FRAME_WIDTH}
        height={FRAME_HEIGHT}
        viewBox={`0 0 ${VB_WIDTH} ${VB_HEIGHT}`}
        preserveAspectRatio="xMidYMid meet"
      >
        {generateFrameSVG(frameShape, primaryColor, borderWidth, borderRadius)}
      </Svg>
    </View>
  );
});

/**
 * Generate a PNG from a preset frame shape
 * @param {object} params - Frame parameters
 * @param {React.RefObject} viewRef - Reference to the FrameCaptureView
 * @returns {Promise<{success: boolean, localPath?: string, error?: string}>}
 */
export const captureFrameAsPNG = async (viewRef) => {
  try {
    if (!viewRef?.current) {
      throw new Error('View reference not available');
    }

    console.log('[PRESET_FRAME] Capturing frame as PNG...');

    // Capture the view as PNG
    const uri = await captureRef(viewRef, {
      format: 'png',
      quality: 1.0,
      result: 'tmpfile',
    });

    console.log('[PRESET_FRAME] Frame captured:', uri);

    return {
      success: true,
      localPath: uri,
    };
  } catch (error) {
    console.error('[PRESET_FRAME] Error capturing frame:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Upload a captured frame PNG to Supabase Storage
 * @param {string} localPath - Local file path of the PNG
 * @param {string} parentId - Parent user ID
 * @param {string} frameName - Name of the frame (for file naming)
 * @returns {Promise<{success: boolean, storagePath?: string, error?: string}>}
 */
export const uploadFramePNG = async (localPath, parentId, frameName) => {
  try {
    console.log('[PRESET_FRAME] Uploading frame PNG to storage...');

    // Read file as base64
    const base64Data = await FileSystem.readAsStringAsync(localPath, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Convert to bytes
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Generate storage path
    const timestamp = Date.now();
    const safeName = frameName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    const storagePath = `${PRESET_FRAMES_FOLDER}/${parentId}/${timestamp}_${safeName}.png`;

    // Upload to Supabase
    const { error: uploadError } = await supabase.storage
      .from(PRESET_FRAMES_BUCKET)
      .upload(storagePath, bytes.buffer, {
        contentType: 'image/png',
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    console.log('[PRESET_FRAME] Frame PNG uploaded:', storagePath);

    // Clean up local file
    await FileSystem.deleteAsync(localPath, { idempotent: true });

    return {
      success: true,
      storagePath,
    };
  } catch (error) {
    console.error('[PRESET_FRAME] Error uploading frame:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Generate and upload a preset frame PNG
 * This is the main function to call from FrameCreationScreen
 * @param {object} params - Frame parameters
 * @param {React.RefObject} viewRef - Reference to FrameCaptureView
 * @returns {Promise<{success: boolean, storagePath?: string, error?: string}>}
 */
export const generatePresetFramePNG = async (viewRef, parentId, frameName) => {
  try {
    // Step 1: Capture as PNG
    const captureResult = await captureFrameAsPNG(viewRef);
    if (!captureResult.success) {
      throw new Error(captureResult.error || 'Failed to capture frame');
    }

    // Step 2: Upload to storage
    const uploadResult = await uploadFramePNG(captureResult.localPath, parentId, frameName);
    if (!uploadResult.success) {
      throw new Error(uploadResult.error || 'Failed to upload frame');
    }

    return {
      success: true,
      storagePath: uploadResult.storagePath,
    };
  } catch (error) {
    console.error('[PRESET_FRAME] Error generating preset frame PNG:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Check if a frame shape requires PNG generation
 * AI frames already have PNGs, only preset shapes need generation
 */
export const needsPNGGeneration = (frameMode, frameShape) => {
  // AI frames already have PNGs from DALL-E
  if (frameMode === 'ai') return false;

  // All preset shapes need PNG generation for compositing
  return true;
};

export default {
  FRAME_WIDTH,
  FRAME_HEIGHT,
  FrameCaptureView,
  captureFrameAsPNG,
  uploadFramePNG,
  generatePresetFramePNG,
  needsPNGGeneration,
};
