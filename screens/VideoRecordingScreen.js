/**
 * VideoRecordingScreen
 * Camera recording for kid thank you videos
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
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

  // UI state
  const [recordingTime, setRecordingTime] = useState(0);
  const [error, setError] = useState(null);
  const recordingIntervalRef = useRef(null);

  // Request camera permissions on mount
  useEffect(() => {
    if (!permission) {
      requestPermission();
    }
  }, [permission, requestPermission]);

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
  }, [isRecording, isKidsEdition]);

  const handleCameraReady = () => {
    console.log('📷 Camera onCameraReady callback fired - waiting for recording output to initialize...');
    // Wait 2 seconds to ensure recording output stream is fully initialized
    // onCameraReady fires early, before the recording encoder is ready
    setTimeout(() => {
      console.log('✅ Recording output should now be ready');
      setCameraReady(true);
    }, 2000);
  };

  const handleStartRecording = async () => {
    if (!cameraRef.current || !cameraReady) {
      setError('Camera not ready. Please wait a moment and try again.');
      console.log('❌ Camera not ready:', { cameraRef: !!cameraRef.current, cameraReady });
      return;
    }

    try {
      setError(null);
      setRecordingTime(0);

      console.log('🎥 Starting video recording...');
      setIsRecording(true);

      // Wait a moment before calling recordAsync to ensure the camera encoder is ready
      console.log('⏳ Waiting 500ms before starting recording...');
      await new Promise(resolve => setTimeout(resolve, 500));

      // NOTE: Do NOT pass options to recordAsync() - some versions of expo-camera
      // have issues with maxDuration parameter. We rely on manual stop via UI.
      console.log('📹 Calling recordAsync...');
      const video = await cameraRef.current.recordAsync();

      console.log('✅ Video recorded successfully:', video);
      setRecordedUri(video.uri);
      setIsRecording(false);
    } catch (err) {
      console.error('❌ Recording error:', err);
      setError('Error recording video: ' + err.message);
      setIsRecording(false);
    }
  };

  const handleStopRecording = async () => {
    if (cameraRef.current && isRecording) {
      try {
        await cameraRef.current.stopRecording();
        setIsRecording(false);
      } catch (err) {
        console.error('❌ Stop recording error:', err);
      }
    }
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

  // Permission not granted - loading
  if (!permission) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.neutralColors.white }}>
        <AppBar
          title="Record Thank You"
          onBackPress={() => navigation?.goBack()}
          showBack={true}
        />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Text style={{ color: theme.neutralColors.dark }}>Requesting camera access...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Permission denied
  if (!permission.granted) {
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
              style={{ flex: 1 }}
              facing="front"
              onCameraReady={handleCameraReady}
              video={true}
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
              disabled={true}
              onPress={() => {}}
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
              onPress={isRecording ? handleStopRecording : handleStartRecording}
              disabled={!cameraReady || isRecording}
              style={{
                width: isKidsEdition ? 80 : 72,
                height: isKidsEdition ? 80 : 72,
                borderRadius: isKidsEdition ? 40 : 36,
                backgroundColor: isRecording ? theme.semanticColors.error : theme.brandColors.coral,
                justifyContent: 'center',
                alignItems: 'center',
                opacity: !cameraReady && !isRecording ? 0.5 : 1,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 8,
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
              disabled={isRecording}
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
    </SafeAreaView>
  );
};

export default VideoRecordingScreen;
