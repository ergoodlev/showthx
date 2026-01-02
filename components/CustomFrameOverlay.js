/**
 * CustomFrameOverlay
 * Renders custom frame templates created by parents in FrameCreationScreen
 * NOW WITH SVG DECORATIVE SHAPES! ⭐☁️❤️
 * Supports AI-generated PNG frames via frame_png_path
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Dimensions, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Circle, Ellipse, Rect, Defs, RadialGradient, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { supabase } from '../supabaseClient';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Portrait video aspect ratio (9:16) - viewBox dimensions
const VB_WIDTH = 56;  // 9:16 ratio
const VB_HEIGHT = 100;

/**
 * Render a custom frame overlay based on frameTemplate data
 * @param {object} frameTemplate - Frame template from database with frame_shape, primary_color, etc.
 */
export const CustomFrameOverlay = ({ frameTemplate, style }) => {
  const [aiFrameUrl, setAiFrameUrl] = useState(null);
  const [aiFrameLoading, setAiFrameLoading] = useState(false);

  // Load AI frame URL if frame_png_path is set
  useEffect(() => {
    const loadAIFrameUrl = async () => {
      if (frameTemplate?.frame_shape === 'ai-generated' && frameTemplate?.frame_png_path) {
        setAiFrameLoading(true);
        try {
          const framePath = frameTemplate.frame_png_path;

          // AI frames are always stored in 'ai-frames' bucket
          // Paths are like: {userId}/{timestamp}_frame.png
          console.log('🖼️  Loading AI frame from ai-frames bucket:', { path: framePath });

          const { data, error } = await supabase.storage
            .from('ai-frames')
            .createSignedUrl(framePath, 86400); // 24 hour URL

          if (error) {
            console.error('❌ Failed to load AI frame from ai-frames bucket:', error);
            // Try videos bucket as fallback (legacy storage location)
            console.log('⚠️  Trying videos bucket as fallback...');
            const { data: fallbackData, error: fallbackError } = await supabase.storage
              .from('videos')
              .createSignedUrl(`ai-frames/${framePath}`, 86400);

            if (fallbackError) {
              console.error('❌ Failed to load AI frame from videos bucket:', fallbackError);
            } else if (fallbackData?.signedUrl) {
              console.log('✅ AI frame loaded from videos bucket (fallback)');
              setAiFrameUrl(fallbackData.signedUrl);
            }
          } else if (data?.signedUrl) {
            console.log('✅ AI frame URL loaded successfully');
            setAiFrameUrl(data.signedUrl);
          }
        } catch (err) {
          console.error('❌ Error loading AI frame:', err);
        } finally {
          setAiFrameLoading(false);
        }
      }
    };

    loadAIFrameUrl();
  }, [frameTemplate?.frame_png_path, frameTemplate?.frame_shape]);

  if (!frameTemplate || !frameTemplate.frame_shape) {
    console.log('⚠️  CustomFrameOverlay: No frameTemplate provided');
    return null;
  }

  const {
    frame_shape,
    primary_color = '#06b6d4',
    border_width = 4,
    border_radius = 12,
  } = frameTemplate;

  console.log('🎨 CustomFrameOverlay rendering:', {
    frame_shape,
    primary_color,
    border_width,
    border_radius,
    isSVGShape: ['star-burst', 'cloud-fluffy', 'heart-love', 'wavy-thick', 'spikey-fun', 'scalloped-fancy', 'neon-glow'].includes(frame_shape)
  });

  // STAR-BURST: Star points radiating from corners and edges
  const renderStarBurst = () => {
    const stars = [];
    const W = VB_WIDTH;
    const H = VB_HEIGHT;
    const positions = [
      // Corners
      { x: 5, y: 5 },
      { x: W - 5, y: 5 },
      { x: 5, y: H - 5 },
      { x: W - 5, y: H - 5 },
      // Top/Bottom edges
      { x: W / 2, y: 3 },
      { x: W / 2, y: H - 3 },
      // Left/Right edges
      { x: 3, y: H / 2 },
      { x: W - 3, y: H / 2 },
      // Additional mid-points
      { x: W * 0.25, y: 3 },
      { x: W * 0.75, y: 3 },
      { x: W * 0.25, y: H - 3 },
      { x: W * 0.75, y: H - 3 },
      { x: 3, y: H * 0.25 },
      { x: 3, y: H * 0.75 },
      { x: W - 3, y: H * 0.25 },
      { x: W - 3, y: H * 0.75 },
    ];

    positions.forEach((pos, i) => {
      const size = 3;
      const starPath = `M${pos.x},${pos.y - size} L${pos.x + size * 0.4},${pos.y + size * 0.4} L${pos.x + size},${pos.y} L${pos.x + size * 0.4},${pos.y - size * 0.4} Z`;
      stars.push(
        <Path
          key={`star-${i}`}
          d={starPath}
          fill={primary_color}
          opacity={0.9}
          stroke={primary_color}
          strokeWidth="0.3"
        />
      );
    });

    return (
      <View style={[StyleSheet.absoluteFill, style]} pointerEvents="none">
        <Svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
          <Rect
            x="1"
            y="1"
            width={W - 2}
            height={H - 2}
            rx={border_radius / 6}
            fill="none"
            stroke={primary_color}
            strokeWidth="1.5"
          />
          {stars}
        </Svg>
      </View>
    );
  };

  // CLOUD-FLUFFY: Cloud-like bubbles around the border
  const renderCloudFluffy = () => {
    const W = VB_WIDTH;
    const H = VB_HEIGHT;
    return (
      <View style={[StyleSheet.absoluteFill, style]} pointerEvents="none">
        <Svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
          {/* Main border */}
          <Rect
            x="1"
            y="1"
            width={W - 2}
            height={H - 2}
            rx={border_radius / 4}
            fill="none"
            stroke={primary_color}
            strokeWidth="1"
            opacity={0.5}
          />
          {/* Cloud bubbles at corners */}
          <Circle cx="6" cy="6" r="6" fill={primary_color} opacity={0.3} />
          <Circle cx="6" cy="6" r="6" fill="none" stroke={primary_color} strokeWidth="1.2" opacity={0.8} />
          <Circle cx="10" cy="5" r="4" fill={primary_color} opacity={0.3} />
          <Circle cx="10" cy="5" r="4" fill="none" stroke={primary_color} strokeWidth="1.2" opacity={0.8} />

          <Circle cx={W - 6} cy="6" r="6" fill={primary_color} opacity={0.3} />
          <Circle cx={W - 6} cy="6" r="6" fill="none" stroke={primary_color} strokeWidth="1.2" opacity={0.8} />
          <Circle cx={W - 10} cy="5" r="4" fill={primary_color} opacity={0.3} />
          <Circle cx={W - 10} cy="5" r="4" fill="none" stroke={primary_color} strokeWidth="1.2" opacity={0.8} />

          <Circle cx="6" cy={H - 6} r="6" fill={primary_color} opacity={0.3} />
          <Circle cx="6" cy={H - 6} r="6" fill="none" stroke={primary_color} strokeWidth="1.2" opacity={0.8} />
          <Circle cx="10" cy={H - 5} r="4" fill={primary_color} opacity={0.3} />
          <Circle cx="10" cy={H - 5} r="4" fill="none" stroke={primary_color} strokeWidth="1.2" opacity={0.8} />

          <Circle cx={W - 6} cy={H - 6} r="6" fill={primary_color} opacity={0.3} />
          <Circle cx={W - 6} cy={H - 6} r="6" fill="none" stroke={primary_color} strokeWidth="1.2" opacity={0.8} />
          <Circle cx={W - 10} cy={H - 5} r="4" fill={primary_color} opacity={0.3} />
          <Circle cx={W - 10} cy={H - 5} r="4" fill="none" stroke={primary_color} strokeWidth="1.2" opacity={0.8} />

          {/* Cloud bubbles on sides */}
          <Circle cx={W / 2} cy="4" r="5" fill={primary_color} opacity={0.3} />
          <Circle cx={W / 2} cy="4" r="5" fill="none" stroke={primary_color} strokeWidth="1.2" opacity={0.7} />
          <Circle cx={W / 2} cy={H - 4} r="5" fill={primary_color} opacity={0.3} />
          <Circle cx={W / 2} cy={H - 4} r="5" fill="none" stroke={primary_color} strokeWidth="1.2" opacity={0.7} />
          <Circle cx="4" cy={H / 2} r="5" fill={primary_color} opacity={0.3} />
          <Circle cx="4" cy={H / 2} r="5" fill="none" stroke={primary_color} strokeWidth="1.2" opacity={0.7} />
          <Circle cx={W - 4} cy={H / 2} r="5" fill={primary_color} opacity={0.3} />
          <Circle cx={W - 4} cy={H / 2} r="5" fill="none" stroke={primary_color} strokeWidth="1.2" opacity={0.7} />
        </Svg>
      </View>
    );
  };

  // HEART-LOVE: Hearts in the corners
  const renderHeartLove = () => {
    const W = VB_WIDTH;
    const H = VB_HEIGHT;
    const heartPath = (x, y, size = 2.5) => {
      const path = `M${x},${y + size * 0.8}
        C${x},${y + size * 0.3} ${x - size * 0.5},${y} ${x - size},${y}
        C${x - size * 1.5},${y} ${x - size * 2},${y + size * 0.5} ${x - size * 2},${y + size}
        C${x - size * 2},${y + size * 1.5} ${x - size},${y + size * 2} ${x},${y + size * 2.5}
        C${x + size},${y + size * 2} ${x + size * 2},${y + size * 1.5} ${x + size * 2},${y + size}
        C${x + size * 2},${y + size * 0.5} ${x + size * 1.5},${y} ${x + size},${y}
        C${x + size * 0.5},${y} ${x},${y + size * 0.3} ${x},${y + size * 0.8} Z`;
      return path;
    };

    return (
      <View style={[StyleSheet.absoluteFill, style]} pointerEvents="none">
        <Svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
          {/* Hearts in corners */}
          <Path d={heartPath(10, 6, 2.5)} fill={primary_color} opacity={0.8} stroke={primary_color} strokeWidth="0.3" />
          <Path d={heartPath(W - 10, 6, 2.5)} fill={primary_color} opacity={0.8} stroke={primary_color} strokeWidth="0.3" />
          <Path d={heartPath(10, H - 10, 2.5)} fill={primary_color} opacity={0.8} stroke={primary_color} strokeWidth="0.3" />
          <Path d={heartPath(W - 10, H - 10, 2.5)} fill={primary_color} opacity={0.8} stroke={primary_color} strokeWidth="0.3" />

          {/* Hearts on sides */}
          <Path d={heartPath(W / 2, 3, 2)} fill={primary_color} opacity={0.7} stroke={primary_color} strokeWidth="0.3" />
          <Path d={heartPath(W / 2, H - 7, 2)} fill={primary_color} opacity={0.7} stroke={primary_color} strokeWidth="0.3" />
          <Path d={heartPath(6, H / 2, 2)} fill={primary_color} opacity={0.7} stroke={primary_color} strokeWidth="0.3" />
          <Path d={heartPath(W - 6, H / 2, 2)} fill={primary_color} opacity={0.7} stroke={primary_color} strokeWidth="0.3" />

          {/* Main border */}
          <Rect
            x="1"
            y="1"
            width={W - 2}
            height={H - 2}
            rx={border_radius / 4}
            fill="none"
            stroke={primary_color}
            strokeWidth="1"
            opacity={0.6}
          />
        </Svg>
      </View>
    );
  };

  // WAVY-THICK: Wavy border using sine waves
  const renderWavyThick = () => {
    const W = VB_WIDTH;
    const H = VB_HEIGHT;
    const waveFreq = 8;
    const waveAmp = 1.5;
    let topWave = `M1,${4 + waveAmp}`;
    let bottomWave = `M1,${H - 4 - waveAmp}`;
    let leftWave = `M${4 + waveAmp},1`;
    let rightWave = `M${W - 4 - waveAmp},1`;

    for (let i = 0; i <= W; i += 2) {
      const wave = Math.sin((i / W) * Math.PI * waveFreq) * waveAmp;
      topWave += ` L${i},${4 + waveAmp + wave}`;
      bottomWave += ` L${i},${H - 4 - waveAmp + wave}`;
    }
    for (let i = 0; i <= H; i += 2) {
      const wave = Math.sin((i / H) * Math.PI * waveFreq) * waveAmp;
      leftWave += ` L${4 + waveAmp + wave},${i}`;
      rightWave += ` L${W - 4 - waveAmp + wave},${i}`;
    }

    return (
      <View style={[StyleSheet.absoluteFill, style]} pointerEvents="none">
        <Svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
          <Path d={topWave} stroke={primary_color} strokeWidth={border_width / 6} fill="none" />
          <Path d={bottomWave} stroke={primary_color} strokeWidth={border_width / 6} fill="none" />
          <Path d={leftWave} stroke={primary_color} strokeWidth={border_width / 6} fill="none" />
          <Path d={rightWave} stroke={primary_color} strokeWidth={border_width / 6} fill="none" />
        </Svg>
      </View>
    );
  };

  // SPIKEY-FUN: Sharp spikes pointing outward
  const renderSpikeyFun = () => {
    const W = VB_WIDTH;
    const H = VB_HEIGHT;
    const spikes = [];
    const numSpikesHoriz = 10;
    const numSpikesVert = 18;

    // Top edge spikes
    for (let i = 1; i <= numSpikesHoriz; i++) {
      const x = (W / (numSpikesHoriz + 1)) * i;
      spikes.push(
        <Path
          key={`spike-top-${i}`}
          d={`M${x},4 L${x - 1.5},0 L${x + 1.5},0 Z`}
          fill={primary_color}
          opacity={0.9}
          stroke={primary_color}
          strokeWidth="0.2"
        />
      );
    }

    // Bottom edge spikes
    for (let i = 1; i <= numSpikesHoriz; i++) {
      const x = (W / (numSpikesHoriz + 1)) * i;
      spikes.push(
        <Path
          key={`spike-bottom-${i}`}
          d={`M${x},${H - 4} L${x - 1.5},${H} L${x + 1.5},${H} Z`}
          fill={primary_color}
          opacity={0.9}
          stroke={primary_color}
          strokeWidth="0.2"
        />
      );
    }

    // Left edge spikes
    for (let i = 1; i <= numSpikesVert; i++) {
      const y = (H / (numSpikesVert + 1)) * i;
      spikes.push(
        <Path
          key={`spike-left-${i}`}
          d={`M4,${y} L0,${y - 1.5} L0,${y + 1.5} Z`}
          fill={primary_color}
          opacity={0.9}
          stroke={primary_color}
          strokeWidth="0.2"
        />
      );
    }

    // Right edge spikes
    for (let i = 1; i <= numSpikesVert; i++) {
      const y = (H / (numSpikesVert + 1)) * i;
      spikes.push(
        <Path
          key={`spike-right-${i}`}
          d={`M${W - 4},${y} L${W},${y - 1.5} L${W},${y + 1.5} Z`}
          fill={primary_color}
          opacity={0.9}
          stroke={primary_color}
          strokeWidth="0.2"
        />
      );
    }

    return (
      <View style={[StyleSheet.absoluteFill, style]} pointerEvents="none">
        <Svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
          <Rect
            x="1"
            y="1"
            width={W - 2}
            height={H - 2}
            rx={border_radius / 6}
            fill="none"
            stroke={primary_color}
            strokeWidth="1"
          />
          {spikes}
        </Svg>
      </View>
    );
  };

  // SCALLOPED-FANCY: Scalloped/scallop edges
  const renderScallopedFancy = () => {
    const W = VB_WIDTH;
    const H = VB_HEIGHT;
    const numScallopsHoriz = 8;
    const numScallopsVert = 14;
    const scallops = [];

    // Top scallops
    for (let i = 0; i <= numScallopsHoriz; i++) {
      const x = (W / numScallopsHoriz) * i;
      scallops.push(
        <Circle key={`scallop-top-${i}`} cx={x} cy="3" r="2.5" fill={primary_color} opacity={0.3} />
      );
      scallops.push(
        <Circle key={`scallop-top-outline-${i}`} cx={x} cy="3" r="2.5" fill="none" stroke={primary_color} strokeWidth="1" />
      );
    }

    // Bottom scallops
    for (let i = 0; i <= numScallopsHoriz; i++) {
      const x = (W / numScallopsHoriz) * i;
      scallops.push(
        <Circle key={`scallop-bottom-${i}`} cx={x} cy={H - 3} r="2.5" fill={primary_color} opacity={0.3} />
      );
      scallops.push(
        <Circle key={`scallop-bottom-outline-${i}`} cx={x} cy={H - 3} r="2.5" fill="none" stroke={primary_color} strokeWidth="1" />
      );
    }

    // Left scallops
    for (let i = 0; i <= numScallopsVert; i++) {
      const y = (H / numScallopsVert) * i;
      scallops.push(
        <Circle key={`scallop-left-${i}`} cx="3" cy={y} r="2.5" fill={primary_color} opacity={0.3} />
      );
      scallops.push(
        <Circle key={`scallop-left-outline-${i}`} cx="3" cy={y} r="2.5" fill="none" stroke={primary_color} strokeWidth="1" />
      );
    }

    // Right scallops
    for (let i = 0; i <= numScallopsVert; i++) {
      const y = (H / numScallopsVert) * i;
      scallops.push(
        <Circle key={`scallop-right-${i}`} cx={W - 3} cy={y} r="2.5" fill={primary_color} opacity={0.3} />
      );
      scallops.push(
        <Circle key={`scallop-right-outline-${i}`} cx={W - 3} cy={y} r="2.5" fill="none" stroke={primary_color} strokeWidth="1" />
      );
    }

    return (
      <View style={[StyleSheet.absoluteFill, style]} pointerEvents="none">
        <Svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
          {scallops}
          <Rect
            x="6"
            y="6"
            width={W - 12}
            height={H - 12}
            rx={border_radius / 5}
            fill="none"
            stroke={primary_color}
            strokeWidth="1"
            opacity={0.5}
          />
        </Svg>
      </View>
    );
  };

  // NEON-GLOW: Enhanced glow effect with SVG
  const renderNeonGlow = () => {
    const W = VB_WIDTH;
    const H = VB_HEIGHT;
    return (
      <View style={[StyleSheet.absoluteFill, style]} pointerEvents="none">
        <Svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
          <Defs>
            <RadialGradient id="neonGlow">
              <Stop offset="0%" stopColor={primary_color} stopOpacity="1" />
              <Stop offset="100%" stopColor={primary_color} stopOpacity="0.3" />
            </RadialGradient>
          </Defs>
          {/* Multiple glowing borders for neon effect */}
          <Rect
            x="2"
            y="2"
            width={W - 4}
            height={H - 4}
            rx={border_radius / 3}
            fill="none"
            stroke={primary_color}
            strokeWidth={border_width / 5}
            opacity={1}
          />
          <Rect
            x="1.5"
            y="1.5"
            width={W - 3}
            height={H - 3}
            rx={border_radius / 3}
            fill="none"
            stroke={primary_color}
            strokeWidth={border_width / 8}
            opacity={0.6}
          />
          <Rect
            x="1"
            y="1"
            width={W - 2}
            height={H - 2}
            rx={border_radius / 3}
            fill="none"
            stroke={primary_color}
            strokeWidth={border_width / 10}
            opacity={0.3}
          />
        </Svg>
        <View
          style={{
            position: 'absolute',
            top: 8,
            left: 8,
            right: 8,
            bottom: 8,
            borderRadius: border_radius,
            shadowColor: primary_color,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 1.0,
            shadowRadius: 20,
            elevation: 15,
          }}
        />
      </View>
    );
  };

  // Route to appropriate shape renderer
  const renderShape = () => {
    switch (frame_shape) {
      case 'star-burst':
        return renderStarBurst();
      case 'cloud-fluffy':
        return renderCloudFluffy();
      case 'heart-love':
        return renderHeartLove();
      case 'wavy-thick':
        return renderWavyThick();
      case 'spikey-fun':
        return renderSpikeyFun();
      case 'scalloped-fancy':
        return renderScallopedFancy();
      case 'neon-glow':
        return renderNeonGlow();
      default:
        return null; // Will fall through to standard border rendering
    }
  };

  // Check if this shape has custom SVG rendering
  const hasCustomShape = [
    'star-burst',
    'cloud-fluffy',
    'heart-love',
    'wavy-thick',
    'spikey-fun',
    'scalloped-fancy',
    'neon-glow',
  ].includes(frame_shape);

  // Render AI-generated frame preview
  // NOTE: DALL-E generates PNGs without transparency, so we can't overlay the full PNG
  // during preview. Instead, we show a decorative border to indicate an AI frame is applied.
  // The actual AI frame will be composited server-side with transparency processing.
  if (frame_shape === 'ai-generated') {
    // Show a preview border with AI frame indicator
    // The actual AI frame will be applied during server-side video compositing
    return (
      <View style={[StyleSheet.absoluteFill, style]} pointerEvents="none">
        {/* Preview thumbnail in corner to show AI frame is applied */}
        {aiFrameUrl && (
          <View style={{
            position: 'absolute',
            top: 16,
            right: 16,
            width: 60,
            height: 106,
            borderRadius: 8,
            overflow: 'hidden',
            borderWidth: 2,
            borderColor: 'rgba(255,255,255,0.8)',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.3,
            shadowRadius: 4,
            elevation: 5,
          }}>
            <Image
              source={{ uri: aiFrameUrl }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
          </View>
        )}
        {/* Decorative border to indicate AI frame is active */}
        <View
          style={{
            position: 'absolute',
            top: 8,
            left: 8,
            right: 8,
            bottom: 8,
            borderWidth: 3,
            borderColor: primary_color,
            borderRadius: border_radius,
            opacity: 0.8,
          }}
        />
        {/* Corner accents */}
        <View style={{ position: 'absolute', top: 4, left: 4, width: 20, height: 20, borderTopWidth: 4, borderLeftWidth: 4, borderColor: primary_color, borderTopLeftRadius: 8 }} />
        <View style={{ position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderTopWidth: 4, borderRightWidth: 4, borderColor: primary_color, borderTopRightRadius: 8 }} />
        <View style={{ position: 'absolute', bottom: 4, left: 4, width: 20, height: 20, borderBottomWidth: 4, borderLeftWidth: 4, borderColor: primary_color, borderBottomLeftRadius: 8 }} />
        <View style={{ position: 'absolute', bottom: 4, right: 4, width: 20, height: 20, borderBottomWidth: 4, borderRightWidth: 4, borderColor: primary_color, borderBottomRightRadius: 8 }} />
        {/* Loading indicator */}
        {aiFrameLoading && (
          <View style={{
            position: 'absolute',
            top: 16,
            right: 16,
            backgroundColor: 'rgba(0,0,0,0.6)',
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 4,
          }}>
            <View style={{ width: 40, height: 4, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 2 }}>
              <View style={{ width: 20, height: 4, backgroundColor: primary_color, borderRadius: 2 }} />
            </View>
          </View>
        )}
      </View>
    );
  }

  // If custom shape, render it
  if (hasCustomShape) {
    return renderShape();
  }

  // Special rendering for gradient frames - rainbow border using SVG
  if (frame_shape === 'gradient-frame') {
    const W = VB_WIDTH;
    const H = VB_HEIGHT;
    return (
      <View style={[StyleSheet.absoluteFill, style]} pointerEvents="none">
        <Svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
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
          {/* Rainbow gradient border */}
          <Rect
            x="2"
            y="2"
            width={W - 4}
            height={H - 4}
            rx={border_radius / 4}
            fill="none"
            stroke="url(#rainbowGradient)"
            strokeWidth={border_width / 2}
          />
          {/* Inner glow effect */}
          <Rect
            x="3"
            y="3"
            width={W - 6}
            height={H - 6}
            rx={border_radius / 4}
            fill="none"
            stroke="url(#rainbowGradient)"
            strokeWidth={border_width / 4}
            opacity={0.5}
          />
        </Svg>
      </View>
    );
  }

  // Special rendering for double-border frames (keep existing)
  if (frame_shape === 'double-border') {
    const outerBorderWidth = 4;
    return (
      <View style={[StyleSheet.absoluteFill, style]} pointerEvents="none">
        <View
          style={{
            position: 'absolute',
            top: 8,
            left: 8,
            right: 8,
            bottom: 8,
            borderRadius: border_radius,
            borderWidth: outerBorderWidth,
            borderColor: primary_color,
            opacity: 0.5,
          }}
        />
        <View
          style={{
            position: 'absolute',
            top: 8 + outerBorderWidth + 4,
            left: 8 + outerBorderWidth + 4,
            right: 8 + outerBorderWidth + 4,
            bottom: 8 + outerBorderWidth + 4,
            borderRadius: Math.max(0, border_radius - 4),
            borderWidth: border_width,
            borderColor: primary_color,
          }}
        />
      </View>
    );
  }

  // Standard thick borders for: bold-classic, rounded-thick, polaroid
  return (
    <View style={[StyleSheet.absoluteFill, style]} pointerEvents="none">
      <View
        style={{
          position: 'absolute',
          top: 8,
          left: 8,
          right: 8,
          bottom: 8,
          borderWidth: border_width,
          borderColor: primary_color,
          borderRadius: border_radius,
          shadowColor: primary_color,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.5,
          shadowRadius: 12,
          elevation: 8,
        }}
      />
    </View>
  );
};

export default CustomFrameOverlay;
