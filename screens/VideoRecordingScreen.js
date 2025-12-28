/**
 * VideoRecordingScreen - Using expo-camera
 * Records thank you videos with front or back camera
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useEdition } from '../context/EditionContext';
import { AppBar } from '../components/AppBar';
import { CustomFrameOverlay } from '../components/CustomFrameOverlay';

export const VideoRecordingScreen = ({ navigation, route }) => {
  const { edition, theme } = useEdition();
  const isKidsEdition = edition === 'kids';
  const giftId = route?.params?.giftId;
  const giftName = route?.params?.giftName;
  const frameTemplate = route?.params?.frameTemplate || null;
  const decorations = route?.params?.decorations || null;

  const cameraRef = useRef(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState('front');
  const [isRecording, setIsRecording] = useState(false);
  const [recordedUri, setRecordedUri] = useState(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [cameraReady, setCameraReady] = useState(false);
  const recordingIntervalRef = useRef(null);

  // Recording timer
  useEffect(() => {
    if (isRecording) {
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(t => t + 1);
      }, 1000);
    } else {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    };
  }, [isRecording]);

  const handleStartRecording = async () => {
    if (!cameraRef.current || !cameraReady) {
      Alert.alert('Please wait', 'Camera is still initializing...');
      return;
    }

    try {
      console.log('🎬 Starting recording with expo-camera...');
      setRecordingTime(0);
      setIsRecording(true);

      const video = await cameraRef.current.recordAsync({
        maxDuration: 60,
      });

      console.log('✅ Recording complete:', video.uri);
      setRecordedUri(video.uri);
      setIsRecording(false);
    } catch (err) {
      console.error('❌ Recording failed:', err);
      Alert.alert('Recording Error', 'Failed to record video. Please try again.');
      setIsRecording(false);
    }
  };

  const handleStopRecording = async () => {
    if (cameraRef.current && isRecording) {
      try {
        console.log('⏹️ Stopping recording...');
        await cameraRef.current.stopRecording();
      } catch (err) {
        console.error('Error stopping recording:', err);
      }
    }
  };

  const toggleCameraFacing = () => {
    setFacing(current => current === 'back' ? 'front' : 'back');
  };

  // Render frame overlay on camera
  // Parents create custom frame templates with shape, color, and text
  // Frames are loaded from frame_assignments table based on event/gift context
  const renderFrameOverlay = () => {
    const customText = frameTemplate?.custom_text || '';
    const textPosition = frameTemplate?.custom_text_position || 'bottom';
    const textColor = frameTemplate?.custom_text_color || '#FFFFFF';

    if (!frameTemplate) {
      console.log('⚠️  No frameTemplate available in renderFrameOverlay');
      return null;
    }

    console.log('🎨 Rendering frame overlay during recording:', {
      frame_shape: frameTemplate.frame_shape,
      primary_color: frameTemplate.primary_color,
      has_custom_text: !!customText,
    });

    return (
      <>
        {/* Custom Frame Border - Created by parent in FrameCreationScreen */}
        <CustomFrameOverlay frameTemplate={frameTemplate} />

        {/* Parent's Custom Text */}
        {customText && (
          <View
            style={{
              position: 'absolute',
              left: 16,
              right: 16,
              [textPosition === 'top' ? 'top' : 'bottom']: textPosition === 'top' ? '3%' : '8%',
              alignItems: 'center',
            }}
          >
            <View style={{
              backgroundColor: 'rgba(0,0,0,0.5)',
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 8,
              maxWidth: '90%',  // Prevent text from bleeding off edges
            }}>
              <Text
                style={{
                  color: textColor,
                  fontSize: 16,
                  fontWeight: '600',
                  textAlign: 'center',
                  textShadowColor: 'rgba(0,0,0,0.8)',
                  textShadowOffset: { width: 1, height: 1 },
                  textShadowRadius: 2,
                }}
                numberOfLines={3}
              >
                {customText}
              </Text>
            </View>
          </View>
        )}
      </>
    );
  };

  // Permission loading
  if (!permission) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#FF6B6B" />
          <Text style={{ marginTop: 10 }}>Loading camera...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Permission not granted
  if (!permission.granted) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
        <AppBar title="Record Thank You" onBackPress={() => navigation?.goBack()} showBack={true} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Ionicons name="camera-outline" size={64} color="#ccc" style={{ marginBottom: 20 }} />
          <Text style={{ fontSize: 18, marginBottom: 20, textAlign: 'center' }}>
            ShowThx needs camera access to record thank you videos
          </Text>
          <TouchableOpacity
            onPress={requestPermission}
            style={{
              padding: 15,
              backgroundColor: '#FF6B6B',
              borderRadius: 8
            }}
          >
            <Text style={{ color: '#fff', fontWeight: 'bold' }}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Main camera view
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
      <AppBar
        title={recordedUri ? "Review Video" : "Record Thank You"}
        onBackPress={() => {
          if (recordedUri) {
            setRecordedUri(null);
            setRecordingTime(0);
          } else {
            navigation?.goBack();
          }
        }}
        showBack={true}
      />

      {!recordedUri ? (
        <View style={{ flex: 1 }}>
          {/* Camera View */}
          <CameraView
            ref={cameraRef}
            style={[StyleSheet.absoluteFill, { zIndex: 0 }]}
            facing={facing}
            mode="video"
            onCameraReady={() => {
              console.log('📷 Camera is ready');
              setCameraReady(true);
            }}
          />

          {/* Frame overlay (from parent template + kid decorations) - zIndex 10 to be above camera */}
          <View style={[StyleSheet.absoluteFill, { zIndex: 10 }]} pointerEvents="none">
            {renderFrameOverlay()}
          </View>

          {/* Loading indicator while camera initializes */}
          {!cameraReady && (
            <View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 50 }]}>
              <ActivityIndicator size="large" color="#fff" />
              <Text style={{ color: '#fff', marginTop: 10 }}>Starting camera...</Text>
            </View>
          )}

          {/* Overlay UI - zIndex 20 to be above frame but below loading */}
          <View style={[StyleSheet.absoluteFillObject, { zIndex: 20 }]} pointerEvents="box-none">
            {/* Camera flip button */}
            <TouchableOpacity
              style={{
                position: 'absolute',
                top: 20,
                right: 20,
                padding: 10,
                backgroundColor: 'rgba(255,255,255,0.3)',
                borderRadius: 25
              }}
              onPress={toggleCameraFacing}
              disabled={isRecording}
            >
              <Ionicons name="camera-reverse" size={24} color="#fff" />
            </TouchableOpacity>

            {/* Recording indicator */}
            {isRecording && (
              <View style={{
                position: 'absolute',
                top: 20,
                left: 20,
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: 'rgba(255,0,0,0.8)',
                padding: 10,
                borderRadius: 20
              }}>
                <View style={{
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: '#fff',
                  marginRight: 8
                }} />
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>
                  {Math.floor(recordingTime / 60)}:{String(recordingTime % 60).padStart(2, '0')}
                </Text>
              </View>
            )}

            {/* Kid instructions - stays visible during recording */}
            {isKidsEdition && cameraReady && !isRecording && (
              <View style={{
                position: 'absolute',
                top: 80,
                left: 20,
                right: 20,
                backgroundColor: 'rgba(0,0,0,0.6)',
                padding: 12,
                borderRadius: 8
              }}>
                <Text style={{
                  color: '#fff',
                  fontSize: 16,
                  textAlign: 'center',
                }}>
                  Say "Thank You" for your {giftName || 'gift'}! 🎁
                </Text>
                <Text style={{
                  color: 'rgba(255,255,255,0.7)',
                  fontSize: 12,
                  textAlign: 'center',
                  marginTop: 4,
                }}>
                  You can decorate after recording ✨
                </Text>
              </View>
            )}

            {/* Recording instruction */}
            {isKidsEdition && cameraReady && isRecording && (
              <View style={{
                position: 'absolute',
                top: 80,
                left: 20,
                right: 20,
                backgroundColor: 'rgba(0,0,0,0.6)',
                padding: 12,
                borderRadius: 8
              }}>
                <Text style={{
                  color: '#fff',
                  fontSize: 16,
                  textAlign: 'center',
                }}>
                  Recording... Keep going! 🎬
                </Text>
              </View>
            )}

            {/* Record button */}
            <View style={{
              position: 'absolute',
              bottom: 50,
              alignSelf: 'center',
              alignItems: 'center'
            }}>
              <TouchableOpacity
                onPress={isRecording ? handleStopRecording : handleStartRecording}
                disabled={!cameraReady}
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 40,
                  backgroundColor: !cameraReady ? '#888' : (isRecording ? '#ff0000' : '#FF6B6B'),
                  justifyContent: 'center',
                  alignItems: 'center',
                  borderWidth: 4,
                  borderColor: '#fff'
                }}
              >
                <View style={{
                  width: isRecording ? 30 : 50,
                  height: isRecording ? 30 : 50,
                  borderRadius: isRecording ? 5 : 25,
                  backgroundColor: '#fff'
                }} />
              </TouchableOpacity>

              <Text style={{
                color: '#fff',
                marginTop: 12,
                fontSize: 14
              }}>
                {!cameraReady ? 'Loading...' : (isRecording ? 'Tap to Stop' : 'Tap to Record')}
              </Text>
            </View>
          </View>
        </View>
      ) : (
        // Video review screen
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Ionicons name="checkmark-circle" size={80} color="#10B981" />
          <Text style={{
            fontSize: 24,
            fontWeight: 'bold',
            color: '#fff',
            marginTop: 20,
            marginBottom: 10
          }}>
            Great Job! 🎉
          </Text>
          <Text style={{
            fontSize: 16,
            color: 'rgba(255,255,255,0.8)',
            marginBottom: 40,
            textAlign: 'center'
          }}>
            Your thank you video is {recordingTime} seconds long
          </Text>

          <View style={{ flexDirection: 'row', gap: 20 }}>
            <TouchableOpacity
              onPress={() => {
                setRecordedUri(null);
                setRecordingTime(0);
              }}
              style={{
                paddingVertical: 12,
                paddingHorizontal: 24,
                backgroundColor: '#EF4444',
                borderRadius: 8
              }}
            >
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>
                Re-record
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                navigation?.navigate('VideoPlayback', {
                  videoUri: recordedUri,
                  giftId,
                  giftName,
                  frameTemplate, // Pass frameTemplate forward
                });
              }}
              style={{
                paddingVertical: 12,
                paddingHorizontal: 24,
                backgroundColor: '#10B981',
                borderRadius: 8
              }}
            >
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>
                Continue →
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

export default VideoRecordingScreen;
