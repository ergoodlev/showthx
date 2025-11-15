/**
 * VideoRecordingScreen
 * Camera recording for kid thank you videos
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useEdition } from '../context/EditionContext';
import { AppBar } from '../components/AppBar';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';

export const VideoRecordingScreen = ({ navigation, route }) => {
  const { edition, theme } = useEdition();
  const isKidsEdition = edition === 'kids';
  const giftId = route?.params?.giftId;
  const giftName = route?.params?.giftName;

  // Camera state
  const cameraRef = useRef(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [facing, setFacing] = useState('front');
  const [isRecording, setIsRecording] = useState(false);
  const [recordedUri, setRecordedUri] = useState(null);

  // UI state
  const [recordingTime, setRecordingTime] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const recordingIntervalRef = useRef(null);

  // Request camera permission on mount
  useEffect(() => {
    if (!permission) {
      requestPermission();
    }
  }, [permission]);

  // Recording timer
  useEffect(() => {
    if (isRecording) {
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime((t) => {
          const newTime = t + 1;
          // Max 60 seconds for kids edition, 120 for adult
          const maxTime = isKidsEdition ? 60 : 120;
          if (newTime >= maxTime) {
            handleStopRecording();
          }
          return newTime;
        });
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

  const handleCameraReady = () => {
    setIsCameraReady(true);
  };

  const handleStartRecording = async () => {
    if (!cameraRef.current) {
      setError('Camera not available');
      return;
    }

    if (!isCameraReady) {
      setError('Camera is initializing... please wait a moment and try again');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setIsRecording(true);
      setRecordingTime(0);

      console.log('🎥 Starting video recording...');

      // Wait longer for camera to be fully ready (expo-camera timing issue)
      // Increased from 300ms to 1000ms for better reliability
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Start recording with retry logic (increased retries from 3 to 5)
      let video = null;
      let retries = 5;
      let lastError = null;

      while (retries > 0 && !video) {
        try {
          video = await cameraRef.current.recordAsync({
            maxDuration: isKidsEdition ? 60 : 120,
            maxFileSize: 100 * 1024 * 1024, // 100MB
            quality: '720p',
          });
          console.log('✅ Video recorded successfully:', video);
        } catch (err) {
          lastError = err;
          retries--;
          if (retries > 0) {
            console.warn(`⚠️  Recording attempt failed, retrying... (${retries} attempts left)`);
            // Wait before retrying (increased from 200ms to 300ms)
            await new Promise(resolve => setTimeout(resolve, 300));
          }
        }
      }

      if (!video && lastError) {
        throw lastError;
      }

      if (video) {
        setRecordedUri(video.uri);
        setIsRecording(false);
      }
    } catch (err) {
      console.error('❌ Recording error:', err);
      setError('Error recording video: ' + err.message);
      setIsRecording(false);
    } finally {
      setLoading(false);
    }
  };

  const handleStopRecording = async () => {
    if (!cameraRef.current) return;

    try {
      setIsRecording(false);
      await cameraRef.current.stopRecording();
    } catch (err) {
      console.error('Stop recording error:', err);
    }
  };

  const handleFlipCamera = () => {
    setFacing((f) => (f === 'front' ? 'back' : 'front'));
  };

  const handleDeleteRecording = () => {
    setRecordedUri(null);
    setRecordingTime(0);
  };

  const handleProceed = () => {
    if (!recordedUri) {
      setError('Please record a video first');
      return;
    }

    // Navigate to playback screen
    navigation?.navigate('VideoPlayback', {
      videoUri: recordedUri,
      giftId,
      giftName,
    });
  };

  // Permission not granted
  if (!permission?.granted) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.neutralColors.white }}>
        <AppBar
          title="Record Thank You"
          onBackPress={() => navigation?.goBack()}
          showBack={true}
        />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Ionicons
            name="camera-outline"
            size={64}
            color={theme.neutralColors.lightGray}
            style={{ marginBottom: 20 }}
          />
          <Text
            style={{
              fontSize: isKidsEdition ? 18 : 16,
              fontFamily: isKidsEdition ? 'Nunito_Bold' : 'Montserrat_Bold',
              color: theme.neutralColors.dark,
              marginBottom: 12,
              textAlign: 'center',
            }}
          >
            Camera Access Needed
          </Text>
          <Text
            style={{
              fontSize: isKidsEdition ? 14 : 12,
              fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
              color: theme.neutralColors.mediumGray,
              textAlign: 'center',
              marginBottom: 24,
            }}
          >
            ThankCast needs camera access to record videos
          </Text>
          <TouchableOpacity
            onPress={requestPermission}
            style={{
              backgroundColor: theme.brandColors.coral,
              paddingHorizontal: 32,
              paddingVertical: 12,
              borderRadius: 8,
            }}
          >
            <Text
              style={{
                color: '#FFFFFF',
                fontSize: isKidsEdition ? 16 : 14,
                fontFamily: isKidsEdition ? 'Nunito_SemiBold' : 'Montserrat_SemiBold',
              }}
            >
              Grant Access
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.neutralColors.white }}>
      <AppBar
        title={recordedUri ? 'Review Video' : 'Record Thank You'}
        onBackPress={() => {
          if (recordedUri) {
            handleDeleteRecording();
          } else {
            navigation?.goBack();
          }
        }}
        showBack={true}
      />

      {/* Camera or Recorded Video Display */}
      <View style={{ flex: 1, backgroundColor: '#000000' }}>
        {!recordedUri ? (
          <>
            <CameraView
              ref={cameraRef}
              facing={facing}
              onCameraReady={handleCameraReady}
              style={{ flex: 1 }}
            />

            {/* Recording Info Overlay */}
            <View
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                padding: 16,
                backgroundColor: 'rgba(0,0,0,0.3)',
              }}
            >
              <Text
                style={{
                  color: '#FFFFFF',
                  fontSize: isKidsEdition ? 18 : 16,
                  fontFamily: isKidsEdition ? 'Nunito_Bold' : 'Montserrat_Bold',
                  fontWeight: '700',
                }}
              >
                {giftName}
              </Text>
              <Text
                style={{
                  color: 'rgba(255,255,255,0.8)',
                  fontSize: isKidsEdition ? 14 : 12,
                  fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
                  marginTop: 4,
                }}
              >
                Say thank you! {isRecording && `(${recordingTime}s)`}
              </Text>

              {/* Camera Status Indicator */}
              {!isCameraReady && (
                <View style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center' }}>
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: '#FFD93D',
                      marginRight: 8,
                    }}
                  />
                  <Text
                    style={{
                      color: '#FFD93D',
                      fontSize: isKidsEdition ? 12 : 11,
                      fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
                    }}
                  >
                    Preparing camera...
                  </Text>
                </View>
              )}
            </View>
          </>
        ) : (
          <View style={{ flex: 1, backgroundColor: '#000000' }}>
            {/* Video recorded message */}
            <View
              style={{
                flex: 1,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Ionicons
                name="checkmark-circle"
                size={64}
                color={theme.semanticColors.success}
                style={{ marginBottom: 16 }}
              />
              <Text
                style={{
                  color: '#FFFFFF',
                  fontSize: isKidsEdition ? 20 : 18,
                  fontFamily: isKidsEdition ? 'Nunito_Bold' : 'Montserrat_Bold',
                  fontWeight: '700',
                }}
              >
                Video Recorded!
              </Text>
              <Text
                style={{
                  color: 'rgba(255,255,255,0.8)',
                  fontSize: isKidsEdition ? 14 : 12,
                  fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
                  marginTop: 12,
                }}
              >
                Ready to review and customize
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Controls - Bottom */}
      <View
        style={{
          backgroundColor: theme.neutralColors.white,
          paddingVertical: theme.spacing.lg,
          paddingHorizontal: theme.spacing.md,
        }}
      >
        {error && (
          <ErrorMessage
            message={error}
            onDismiss={() => setError(null)}
            style={{ marginBottom: theme.spacing.md }}
          />
        )}

        {!recordedUri ? (
          // Recording Controls
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            {/* Flip Camera Button */}
            <TouchableOpacity
              disabled={isRecording || !isCameraReady}
              onPress={handleFlipCamera}
              style={{
                width: isKidsEdition ? 56 : 48,
                height: isKidsEdition ? 56 : 48,
                borderRadius: isKidsEdition ? 28 : 24,
                backgroundColor: isRecording ? theme.neutralColors.lightGray : theme.brandColors.teal,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Ionicons
                name="camera-reverse"
                size={isKidsEdition ? 24 : 20}
                color="#FFFFFF"
              />
            </TouchableOpacity>

            {/* Record Button - Large Circle */}
            <TouchableOpacity
              disabled={!isCameraReady || loading}
              onPress={isRecording ? handleStopRecording : handleStartRecording}
              style={{
                width: isKidsEdition ? 80 : 72,
                height: isKidsEdition ? 80 : 72,
                borderRadius: isKidsEdition ? 40 : 36,
                backgroundColor: isRecording ? theme.semanticColors.error : theme.brandColors.coral,
                justifyContent: 'center',
                alignItems: 'center',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 8,
                opacity: !isCameraReady || loading ? 0.5 : 1,
              }}
            >
              {isRecording ? (
                <View
                  style={{
                    width: isKidsEdition ? 32 : 28,
                    height: isKidsEdition ? 32 : 28,
                    borderRadius: isKidsEdition ? 4 : 3,
                    backgroundColor: '#FFFFFF',
                  }}
                />
              ) : (
                <Ionicons
                  name="videocam"
                  size={isKidsEdition ? 36 : 32}
                  color="#FFFFFF"
                />
              )}
            </TouchableOpacity>

            {/* Delete Button */}
            <TouchableOpacity
              disabled={isRecording || !isCameraReady}
              onPress={() => {
                // Placeholder for future use
              }}
              style={{
                width: isKidsEdition ? 56 : 48,
                height: isKidsEdition ? 56 : 48,
                borderRadius: isKidsEdition ? 28 : 24,
                backgroundColor: theme.neutralColors.lightGray,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Ionicons
                name="settings"
                size={isKidsEdition ? 24 : 20}
                color={theme.neutralColors.mediumGray}
              />
            </TouchableOpacity>
          </View>
        ) : (
          // Review Controls
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            {/* Re-record Button */}
            <TouchableOpacity
              onPress={handleDeleteRecording}
              style={{
                backgroundColor: theme.brandColors.teal,
                paddingHorizontal: theme.spacing.md,
                paddingVertical: theme.spacing.sm,
                borderRadius: 8,
                minHeight: 44,
                justifyContent: 'center',
                flex: 1,
                marginRight: theme.spacing.sm,
              }}
            >
              <Text
                style={{
                  color: '#FFFFFF',
                  fontSize: isKidsEdition ? 16 : 14,
                  fontFamily: isKidsEdition ? 'Nunito_SemiBold' : 'Montserrat_SemiBold',
                  textAlign: 'center',
                  fontWeight: '600',
                }}
              >
                Re-Record
              </Text>
            </TouchableOpacity>

            {/* Proceed Button */}
            <TouchableOpacity
              onPress={handleProceed}
              style={{
                backgroundColor: theme.brandColors.coral,
                paddingHorizontal: theme.spacing.md,
                paddingVertical: theme.spacing.sm,
                borderRadius: 8,
                minHeight: 44,
                justifyContent: 'center',
                flex: 1,
                marginLeft: theme.spacing.sm,
              }}
            >
              <Text
                style={{
                  color: '#FFFFFF',
                  fontSize: isKidsEdition ? 16 : 14,
                  fontFamily: isKidsEdition ? 'Nunito_SemiBold' : 'Montserrat_SemiBold',
                  textAlign: 'center',
                  fontWeight: '600',
                }}
              >
                Next
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <LoadingSpinner visible={loading} message="Processing video..." fullScreen />
    </SafeAreaView>
  );
};

export default VideoRecordingScreen;
