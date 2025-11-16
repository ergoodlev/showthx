/**
 * VideoRecordingScreen - FINAL WORKING VERSION
 *
 * Clean implementation with retry logic for expo-camera v17
 * No expo-av imports - only expo-camera
 */

import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
// IMPORTANT: Only import from expo-camera, NOT expo-av
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useEdition } from '../context/EditionContext';
import { AppBar } from '../components/AppBar';
import { ErrorMessage } from '../components/ErrorMessage';

export const VideoRecordingScreen = ({ navigation, route }) => {
  const { edition, theme } = useEdition();
  const isKidsEdition = edition === 'kids';
  const giftId = route?.params?.giftId;
  const giftName = route?.params?.giftName;

  // Camera state
  const cameraRef = useRef(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraReady, setCameraReady] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedUri, setRecordedUri] = useState(null);

  // Retry logic state
  const [isInitializing, setIsInitializing] = useState(true);
  const retryCountRef = useRef(0);
  const maxRetries = 10;

  // UI state
  const [recordingTime, setRecordingTime] = useState(0);
  const [error, setError] = useState(null);
  const recordingIntervalRef = useRef(null);

  // Request camera permissions on mount
  useEffect(() => {
    if (!permission) {
      console.log('📷 Camera permission status:', permission?.status);
      requestPermission();
    } else {
      console.log('📷 Camera permission status:', permission.status);
    }
  }, [permission, requestPermission]);

  // Initialize camera with delay when ready
  useEffect(() => {
    if (cameraReady && isInitializing) {
      console.log('⏳ Camera ready, waiting 2 seconds for encoder initialization...');
      const timer = setTimeout(() => {
        console.log('✅ Camera should be fully initialized now');
        setIsInitializing(false);
      }, 2000); // Give encoder time to initialize

      return () => clearTimeout(timer);
    }
  }, [cameraReady, isInitializing]);

  // Recording timer
  useEffect(() => {
    if (isRecording) {
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime((t) => {
          const newTime = t + 1;
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
  }, [isRecording, isKidsEdition]);

  const handleCameraReady = () => {
    console.log('📷 onCameraReady callback fired');
    setCameraReady(true);
  };

  // Retry logic for recording
  const attemptRecording = async () => {
    if (!cameraRef.current) {
      throw new Error('Camera ref not available');
    }

    try {
      console.log(`🎬 Recording attempt ${retryCountRef.current + 1}/${maxRetries}`);

      const video = await cameraRef.current.recordAsync({
        maxDuration: isKidsEdition ? 60 : 120,
        quality: '720p',
      });

      retryCountRef.current = 0; // Reset on success
      return video;

    } catch (err) {
      retryCountRef.current++;

      if (err.message.includes('not ready') && retryCountRef.current < maxRetries) {
        console.log(`⏳ Camera not ready, retrying in 500ms (attempt ${retryCountRef.current}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, 500));
        return attemptRecording(); // Recursive retry
      }

      throw err; // Max retries exceeded or different error
    }
  };

  const handleStartRecording = async () => {
    if (!cameraRef.current) {
      setError('Camera not initialized. Please wait...');
      return;
    }

    if (isInitializing) {
      setError('Camera is still initializing. Please wait a moment...');
      return;
    }

    try {
      setError(null);
      setRecordingTime(0);
      retryCountRef.current = 0;

      console.log('🎬 Starting recording with retry logic...');
      setIsRecording(true);

      // Use retry logic
      const video = await attemptRecording();

      console.log('✅ Recording successful!', video);
      setRecordedUri(video.uri);
      setIsRecording(false);

    } catch (err) {
      console.error('❌ Recording failed after all retries:', err);
      setError('Unable to start recording. Please try using the rear camera.');
      setIsRecording(false);

      // Suggest using rear camera as fallback
      setTimeout(() => {
        setError('Tip: Try switching to rear camera in settings if front camera fails.');
      }, 2000);
    }
  };

  const handleStopRecording = async () => {
    if (cameraRef.current && isRecording) {
      try {
        console.log('⏹️ Stopping recording...');
        await cameraRef.current.stopRecording();
        setIsRecording(false);
      } catch (err) {
        console.error('❌ Error stopping recording:', err);
      }
    }
  };

  const handleDeleteRecording = () => {
    setRecordedUri(null);
    setRecordingTime(0);
    setIsInitializing(true); // Re-initialize on re-record
    setCameraReady(false);
  };

  const handleProceed = () => {
    if (!recordedUri) {
      setError('Please record a video first');
      return;
    }
    navigation?.navigate('VideoPlayback', {
      videoUri: recordedUri,
      giftId,
      giftName,
    });
  };

  // Permission loading
  if (!permission) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.neutralColors.white }}>
        <AppBar title="Record Thank You" onBackPress={() => navigation?.goBack()} showBack={true} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <ActivityIndicator size="large" color={theme.brandColors.coral} />
          <Text style={{
            color: theme.neutralColors.dark,
            marginTop: 16,
            fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular'
          }}>
            Requesting camera access...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Permission denied
  if (!permission.granted) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.neutralColors.white }}>
        <AppBar title="Record Thank You" onBackPress={() => navigation?.goBack()} showBack={true} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Ionicons
            name="camera-outline"
            size={64}
            color={theme.neutralColors.lightGray}
            style={{ marginBottom: 20 }}
          />
          <Text style={{
            fontSize: isKidsEdition ? 18 : 16,
            fontFamily: isKidsEdition ? 'Nunito_Bold' : 'Montserrat_Bold',
            color: theme.neutralColors.dark,
            marginBottom: 12,
            textAlign: 'center'
          }}>
            Camera Access Needed
          </Text>
          <Text style={{
            fontSize: isKidsEdition ? 14 : 12,
            fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
            color: theme.neutralColors.mediumGray,
            textAlign: 'center',
            marginBottom: 24
          }}>
            GratituGram needs camera access to record thank you videos
          </Text>
          <TouchableOpacity
            onPress={requestPermission}
            style={{
              backgroundColor: theme.brandColors.coral,
              paddingHorizontal: 32,
              paddingVertical: 12,
              borderRadius: 8
            }}
          >
            <Text style={{
              color: '#FFFFFF',
              fontSize: isKidsEdition ? 16 : 14,
              fontFamily: isKidsEdition ? 'Nunito_SemiBold' : 'Montserrat_SemiBold'
            }}>
              Grant Access
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Main camera view
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

      <View style={{ flex: 1, backgroundColor: '#000000' }}>
        {!recordedUri ? (
          <>
            <CameraView
              ref={cameraRef}
              style={{ flex: 1 }}
              facing="front"
              onCameraReady={handleCameraReady}
              video={true}
            />

            {/* Initialization overlay */}
            {isInitializing && (
              <View style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.85)',
                justifyContent: 'center',
                alignItems: 'center',
              }}>
                <ActivityIndicator
                  size="large"
                  color="#FFFFFF"
                  style={{ marginBottom: 16 }}
                />
                <Text style={{
                  color: '#FFFFFF',
                  fontSize: isKidsEdition ? 18 : 16,
                  fontFamily: isKidsEdition ? 'Nunito_Bold' : 'Montserrat_Bold',
                  marginBottom: 8
                }}>
                  Preparing camera...
                </Text>
                <Text style={{
                  color: 'rgba(255,255,255,0.7)',
                  fontSize: isKidsEdition ? 14 : 12,
                  fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
                }}>
                  This takes a moment on first use
                </Text>
              </View>
            )}

            {/* Gift name overlay */}
            {!isInitializing && (
              <View style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                padding: 16,
                backgroundColor: 'rgba(0,0,0,0.3)'
              }}>
                <Text style={{
                  color: '#FFFFFF',
                  fontSize: isKidsEdition ? 18 : 16,
                  fontFamily: isKidsEdition ? 'Nunito_Bold' : 'Montserrat_Bold',
                  fontWeight: '700'
                }}>
                  {giftName}
                </Text>
                <Text style={{
                  color: 'rgba(255,255,255,0.8)',
                  fontSize: isKidsEdition ? 14 : 12,
                  fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
                  marginTop: 4
                }}>
                  Say thank you! {isRecording && `(${recordingTime}s)`}
                </Text>
              </View>
            )}
          </>
        ) : (
          <View style={{
            flex: 1,
            backgroundColor: '#000000',
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            <Ionicons
              name="checkmark-circle"
              size={64}
              color={theme.semanticColors.success}
              style={{ marginBottom: 16 }}
            />
            <Text style={{
              color: '#FFFFFF',
              fontSize: isKidsEdition ? 20 : 18,
              fontFamily: isKidsEdition ? 'Nunito_Bold' : 'Montserrat_Bold',
              fontWeight: '700'
            }}>
              Video Recorded!
            </Text>
            <Text style={{
              color: 'rgba(255,255,255,0.8)',
              fontSize: isKidsEdition ? 14 : 12,
              fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
              marginTop: 12
            }}>
              {`${recordingTime} seconds recorded`}
            </Text>
          </View>
        )}
      </View>

      {/* Control buttons */}
      <View style={{
        backgroundColor: theme.neutralColors.white,
        paddingVertical: theme.spacing.lg,
        paddingHorizontal: theme.spacing.md
      }}>
        {error && (
          <ErrorMessage
            message={error}
            onDismiss={() => setError(null)}
            style={{ marginBottom: theme.spacing.md }}
          />
        )}

        {!recordedUri ? (
          <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
            <TouchableOpacity
              onPress={isRecording ? handleStopRecording : handleStartRecording}
              disabled={isInitializing}
              style={{
                width: isKidsEdition ? 80 : 72,
                height: isKidsEdition ? 80 : 72,
                borderRadius: isKidsEdition ? 40 : 36,
                backgroundColor: isRecording
                  ? theme.semanticColors.error
                  : theme.brandColors.coral,
                justifyContent: 'center',
                alignItems: 'center',
                opacity: isInitializing ? 0.5 : 1,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 8,
              }}
            >
              {isRecording ? (
                <View style={{
                  width: isKidsEdition ? 32 : 28,
                  height: isKidsEdition ? 32 : 28,
                  borderRadius: isKidsEdition ? 4 : 3,
                  backgroundColor: '#FFFFFF'
                }} />
              ) : (
                <Ionicons
                  name="videocam"
                  size={isKidsEdition ? 36 : 32}
                  color="#FFFFFF"
                />
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <TouchableOpacity
              onPress={handleDeleteRecording}
              style={{
                backgroundColor: theme.brandColors.teal,
                paddingHorizontal: theme.spacing.md,
                paddingVertical: theme.spacing.sm,
                borderRadius: 8,
                flex: 1,
                marginRight: theme.spacing.sm
              }}
            >
              <Text style={{
                color: '#FFFFFF',
                textAlign: 'center',
                fontFamily: isKidsEdition ? 'Nunito_SemiBold' : 'Montserrat_SemiBold'
              }}>
                Re-Record
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleProceed}
              style={{
                backgroundColor: theme.brandColors.coral,
                paddingHorizontal: theme.spacing.md,
                paddingVertical: theme.spacing.sm,
                borderRadius: 8,
                flex: 1,
                marginLeft: theme.spacing.sm
              }}
            >
              <Text style={{
                color: '#FFFFFF',
                textAlign: 'center',
                fontFamily: isKidsEdition ? 'Nunito_SemiBold' : 'Montserrat_SemiBold'
              }}>
                Next
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

export default VideoRecordingScreen;
