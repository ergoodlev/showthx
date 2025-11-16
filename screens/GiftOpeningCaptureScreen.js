/**
 * Gift Opening Capture Screen
 * Records child opening a gift with rear camera
 * Includes start/stop controls and "pure joy" moment capture
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Camera } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';

export default function GiftOpeningCaptureScreen({
  guestName,
  giftName,
  onVideoCaptured,
  onCancel,
}) {
  const [hasPermission, setHasPermission] = useState(null);
  const [permissionError, setPermissionError] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedDuration, setRecordedDuration] = useState(0);
  const [cameraReady, setCameraReady] = useState(false);
  const cameraRef = useRef(null);
  const durationRef = useRef(0);
  const intervalRef = useRef(null);

  // Request camera permissions on mount
  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
      if (status !== 'granted') {
        setPermissionError(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (isRecording) {
      intervalRef.current = setInterval(() => {
        durationRef.current += 1;
        setRecordedDuration(durationRef.current);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRecording]);

  const handleStartRecording = async () => {
    if (!cameraRef.current || !cameraReady) {
      Alert.alert('Camera Not Ready', 'Please wait for the camera to initialize');
      return;
    }

    try {
      setIsRecording(true);
      durationRef.current = 0;
      setRecordedDuration(0);

      const video = await cameraRef.current.recordAsync({
        maxDuration: 300, // 5 minute max
        quality: '1080p',
      });

      if (video && video.uri) {
        onVideoCaptured({
          uri: video.uri,
          type: 'gift_opening',
          duration: durationRef.current,
          guestName,
          giftName,
        });
      }
    } catch (error) {
      console.error('[GIFT_OPENING] Recording error:', error);
      Alert.alert('Recording Error', 'Failed to record video. Please try again.');
      setIsRecording(false);
    }
  };

  const handleStopRecording = async () => {
    if (cameraRef.current) {
      try {
        await cameraRef.current.stopRecording();
        setIsRecording(false);
      } catch (error) {
        console.error('[GIFT_OPENING] Stop recording error:', error);
      }
    }
  };

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#14B8A6" />
      </View>
    );
  }

  if (!hasPermission) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionContainer}>
          <Ionicons name="camera" size={60} color="#14B8A6" />
          <Text style={styles.permissionTitle}>Camera Access Required</Text>
          <Text style={styles.permissionText}>
            We need access to your rear camera to record the gift opening video.
          </Text>
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={async () => {
              const { status } = await Camera.requestCameraPermissionsAsync();
              setHasPermission(status === 'granted');
            }}
          >
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        ref={cameraRef}
        style={styles.camera}
        type={Camera.Constants.Type.back}
        onCameraReady={() => setCameraReady(true)}
      />

      {/* Overlay with instructions */}
      <View style={styles.overlay}>
        {/* Top Section */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onCancel}
            disabled={isRecording}
          >
            <Ionicons name="close" size={28} color="white" />
          </TouchableOpacity>
          <Text style={styles.title}>Record Gift Opening</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Instructions */}
        {!isRecording && (
          <View style={styles.instructionsContainer}>
            <View style={styles.instructionBox}>
              <Text style={styles.guestName}>{guestName}</Text>
              <Text style={styles.giftName}>Opening: {giftName}</Text>
              <Text style={styles.instruction}>
                Position the camera to capture the moment of joy when opening the gift.
              </Text>
            </View>
          </View>
        )}

        {/* Recording Status */}
        {isRecording && (
          <View style={styles.recordingStatus}>
            <View style={styles.recordingIndicator}>
              <View style={styles.recordingDot} />
              <Text style={styles.recordingText}>Recording</Text>
            </View>
            <Text style={styles.durationText}>
              {Math.floor(recordedDuration / 60)}:{String(recordedDuration % 60).padStart(2, '0')}
            </Text>
          </View>
        )}

        {/* Bottom Controls */}
        <View style={styles.controlsContainer}>
          {!isRecording ? (
            <TouchableOpacity
              style={[styles.recordButton, !cameraReady && styles.recordButtonDisabled]}
              onPress={handleStartRecording}
              disabled={!cameraReady}
            >
              <View style={styles.recordButtonInner} />
              <Text style={styles.recordButtonText}>Start Recording</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.stopButton]}
              onPress={handleStopRecording}
            >
              <View style={styles.stopButtonInner} />
              <Text style={styles.stopButtonText}>Stop Recording</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Tips */}
        {!isRecording && (
          <View style={styles.tipsContainer}>
            <View style={styles.tipItem}>
              <Ionicons name="checkmark-circle" size={16} color="#14B8A6" />
              <Text style={styles.tipText}>Capture the genuine reaction</Text>
            </View>
            <View style={styles.tipItem}>
              <Ionicons name="checkmark-circle" size={16} color="#14B8A6" />
              <Text style={styles.tipText}>Hold the camera steady</Text>
            </View>
            <View style={styles.tipItem}>
              <Ionicons name="checkmark-circle" size={16} color="#14B8A6" />
              <Text style={styles.tipText}>Good lighting is important</Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 40,
    paddingBottom: 20,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
  placeholder: {
    width: 44,
  },
  instructionsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  instructionBox: {
    backgroundColor: 'rgba(20, 184, 166, 0.9)',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  guestName: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
    marginBottom: 4,
  },
  giftName: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 12,
  },
  instruction: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 20,
  },
  recordingStatus: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#EF4444',
    marginRight: 8,
    opacity: 1,
  },
  recordingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EF4444',
  },
  durationText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    fontVariant: ['tabular-nums'],
  },
  controlsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    alignItems: 'center',
  },
  recordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#14B8A6',
    borderRadius: 50,
    paddingVertical: 14,
    paddingHorizontal: 28,
    gap: 12,
  },
  recordButtonDisabled: {
    opacity: 0.5,
  },
  recordButtonInner: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'white',
  },
  recordButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  stopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF4444',
    borderRadius: 50,
    paddingVertical: 14,
    paddingHorizontal: 28,
    gap: 12,
  },
  stopButtonInner: {
    width: 16,
    height: 16,
    borderRadius: 3,
    backgroundColor: 'white',
  },
  stopButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  tipsContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  tipText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginLeft: 8,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  permissionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 20,
    marginBottom: 12,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 24,
  },
  permissionButton: {
    backgroundColor: '#14B8A6',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  permissionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
