/**
 * VideoRecordingScreen - USING REACT-NATIVE-VISION-CAMERA
 * Most reliable camera library for React Native
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

// React Native Vision Camera
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';

import { useEdition } from '../context/EditionContext';
import { AppBar } from '../components/AppBar';

export const VideoRecordingScreen = ({ navigation, route }) => {
  const { edition, theme } = useEdition();
  const isKidsEdition = edition === 'kids';
  const giftId = route?.params?.giftId;
  const giftName = route?.params?.giftName;

  const cameraRef = useRef(null);
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('front');
  
  const [isRecording, setIsRecording] = useState(false);
  const [recordedUri, setRecordedUri] = useState(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [cameraActive, setCameraActive] = useState(true);
  const [facing, setFacing] = useState('front');
  const recordingIntervalRef = useRef(null);

  const currentDevice = useCameraDevice(facing);

  // Request permissions on mount
  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, []);

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
    if (!cameraRef.current) {
      Alert.alert('Please wait', 'Camera is initializing...');
      return;
    }

    try {
      console.log('🎬 Starting recording with Vision Camera...');
      setRecordingTime(0);
      setIsRecording(true);

      cameraRef.current.startRecording({
        onRecordingFinished: (video) => {
          console.log('✅ Recording finished!', video.path);
          setRecordedUri(video.path);
          setIsRecording(false);
        },
        onRecordingError: (error) => {
          console.error('❌ Recording error:', error);
          Alert.alert('Recording Error', 'Failed to record video. Please try again.');
          setIsRecording(false);
        },
      });
      
    } catch (err) {
      console.error('❌ Failed to start recording:', err);
      Alert.alert('Recording Error', 'Failed to start recording. Please try again.');
      setIsRecording(false);
    }
  };

  const handleStopRecording = async () => {
    if (cameraRef.current && isRecording) {
      try {
        await cameraRef.current.stopRecording();
        console.log('⏹️ Stopped recording');
      } catch (err) {
        console.error('Error stopping recording:', err);
      }
    }
  };

  const toggleCameraType = () => {
    setFacing(current => current === 'back' ? 'front' : 'back');
  };

  // Permission screens
  if (hasPermission === null) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" />
          <Text style={{ marginTop: 10 }}>Checking camera permission...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!hasPermission) {
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

  if (!currentDevice) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
        <AppBar title="Record Thank You" onBackPress={() => navigation?.goBack()} showBack={true} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <ActivityIndicator size="large" />
          <Text style={{ marginTop: 10 }}>Loading camera...</Text>
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
            setCameraActive(true);
          } else {
            navigation?.goBack();
          }
        }}
        showBack={true}
      />

      {!recordedUri ? (
        <View style={{ flex: 1 }}>
          {/* Vision Camera component */}
          <Camera
            ref={cameraRef}
            style={StyleSheet.absoluteFill}
            device={currentDevice}
            isActive={cameraActive}
            video={true}
            audio={true}
          />

          {/* Overlay UI */}
          <View style={StyleSheet.absoluteFillObject}>
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
              onPress={toggleCameraType}
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

            {/* Kid instructions */}
            {isKidsEdition && !isRecording && (
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
                  fontFamily: 'Nunito_Bold'
                }}>
                  Say "Thank You" for your {giftName || 'gift'}! 🎁
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
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 40,
                  backgroundColor: isRecording ? '#ff0000' : '#FF6B6B',
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
                {isRecording ? 'Tap to Stop' : 'Tap to Record'}
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
                setCameraActive(true);
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
                  giftName
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