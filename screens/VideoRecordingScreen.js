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
import { Camera, CameraType } from 'expo-camera';
import { useEdition } from '../context/EditionContext';
import { AppBar } from '../components/AppBar';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';

export const VideoRecordingScreen = ({ navigation, route }) => {
  const { edition, theme } = useEdition();
  const isKidsEdition = edition === 'kids';
  const giftId = route?.params?.giftId;
  const giftName = route?.params?.giftName;

  // Camera state - using OLD API that works
  const cameraRef = useRef(null);
  const [hasPermission, setHasPermission] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedUri, setRecordedUri] = useState(null);

  // UI state
  const [recordingTime, setRecordingTime] = useState(0);
  const [error, setError] = useState(null);
  const recordingIntervalRef = useRef(null);

  // Request camera permissions on mount (OLD API)
  useEffect(() => {
    requestCameraPermissions();
  }, []);

  const requestCameraPermissions = async () => {
    try {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
      console.log('📷 Camera permission status:', status);
    } catch (err) {
      console.error('❌ Permission request error:', err);
    }
  };

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

  const handleStartRecording = async () => {
    if (!cameraRef.current) {
      setError('Camera not available');
      return;
    }

    try {
      setError(null);
      setRecordingTime(0);

      console.log('🎥 Starting video recording with OLD Camera API...');
      setIsRecording(true);

      const video = await cameraRef.current.recordAsync({
        maxDuration: isKidsEdition ? 60 : 120,
      });

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
      cameraRef.current.stopRecording();
      setIsRecording(false);
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

  // Permission not granted
  if (hasPermission === null) {
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

  if (!hasPermission) {
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
            <Camera
              ref={cameraRef}
              style={{ flex: 1 }}
              type={CameraType.front}
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
