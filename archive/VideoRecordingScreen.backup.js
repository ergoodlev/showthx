/**
 * VideoRecordingScreen - AGGRESSIVE FRONT CAMERA FIX
 * Multiple strategies to force front camera encoder to initialize
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

export const VideoRecordingScreen = ({ navigation, route }) => {
  const { edition, theme } = useEdition();
  const isKidsEdition = edition === 'kids';
  const giftId = route?.params?.giftId;
  const giftName = route?.params?.giftName;

  const cameraRef = useRef(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraReady, setCameraReady] = useState(false);
  const [encoderReady, setEncoderReady] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedUri, setRecordedUri] = useState(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [error, setError] = useState(null);
  const [initPhase, setInitPhase] = useState('waiting'); // waiting, testing, ready, failed
  const [currentFacing, setCurrentFacing] = useState('back'); // START WITH BACK
  const recordingIntervalRef = useRef(null);
  const initAttempts = useRef(0);

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

  // AGGRESSIVE INITIALIZATION SEQUENCE
  useEffect(() => {
    if (cameraReady && !encoderReady && initPhase === 'waiting') {
      initializeEncoder();
    }
  }, [cameraReady, encoderReady, initPhase]);

  const initializeEncoder = async () => {
    console.log('🚀 Starting aggressive encoder initialization...');
    setInitPhase('testing');
    
    // STRATEGY 1: Start with back camera, then switch to front
    if (currentFacing === 'back') {
      console.log('📸 Starting with back camera...');
      setTimeout(() => {
        console.log('📸 Switching to front camera...');
        setCurrentFacing('front');
        // Wait for camera to reinitialize
        setTimeout(() => {
          testRecording();
        }, 2000);
      }, 1000);
    } else {
      // Already on front, try test recording
      testRecording();
    }
  };

  const testRecording = async () => {
    console.log('🧪 Testing encoder with mini recording...');
    initAttempts.current++;
    
    try {
      // Try a super short test recording
      const testPromise = cameraRef.current?.recordAsync({
        maxDuration: 0.1, // 100ms test
        quality: '480p'   // Lower quality for test
      });
      
      // Give it 100ms then stop
      setTimeout(() => {
        cameraRef.current?.stopRecording().catch(() => {});
      }, 100);
      
      await testPromise;
      
      console.log('✅ Test recording successful! Encoder is ready.');
      setInitPhase('ready');
      setEncoderReady(true);
      
    } catch (err) {
      console.log('⚠️ Test recording failed:', err.message);
      
      if (initAttempts.current < 3) {
        // Try again with longer delay
        console.log(`🔄 Retry attempt ${initAttempts.current}/3...`);
        setTimeout(() => {
          testRecording();
        }, 2000 * initAttempts.current); // Exponential backoff
      } else {
        console.error('❌ Encoder initialization failed after 3 attempts');
        setInitPhase('failed');
        Alert.alert(
          'Camera Issue',
          'Front camera not working. Would you like to use the back camera instead?',
          [
            { text: 'Use Back Camera', onPress: () => setCurrentFacing('back') },
            { text: 'Keep Trying', onPress: () => { 
              initAttempts.current = 0;
              setInitPhase('waiting');
            }}
          ]
        );
      }
    }
  };

  const handleCameraReady = () => {
    console.log(`✅ Camera ready (${currentFacing})`);
    setCameraReady(true);
    setEncoderReady(false); // Reset encoder ready
    setInitPhase('waiting'); // Start init process
  };

  const handleStartRecording = async () => {
    if (!cameraRef.current || !encoderReady) {
      setError('Camera still initializing, please wait...');
      return;
    }

    try {
      console.log('🎬 Starting actual recording...');
      setError(null);
      setRecordingTime(0);
      setIsRecording(true);

      const video = await cameraRef.current.recordAsync({
        maxDuration: 60,
        quality: '720p'
      });

      console.log('✅ Recording complete:', video);
      setRecordedUri(video.uri);
      setIsRecording(false);
    } catch (err) {
      console.error('❌ Recording failed:', err);
      setError('Recording failed. Try switching cameras.');
      setIsRecording(false);
    }
  };

  const handleStopRecording = async () => {
    if (cameraRef.current && isRecording) {
      try {
        await cameraRef.current.stopRecording();
      } catch (err) {
        console.error('Stop error:', err);
      }
    }
  };

  const toggleCamera = () => {
    console.log('🔄 Toggling camera...');
    setCurrentFacing(prev => prev === 'front' ? 'back' : 'front');
    setCameraReady(false);
    setEncoderReady(false);
    setInitPhase('waiting');
    initAttempts.current = 0;
  };

  // Permission loading
  if (!permission) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" />
          <Text style={{ marginTop: 10 }}>Loading camera...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // No permission
  if (!permission.granted) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
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

  // Camera view
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
      <AppBar 
        title={recordedUri ? "Review Video" : "Record Thank You"} 
        onBackPress={() => navigation?.goBack()} 
        showBack={true} 
      />
      
      {!recordedUri ? (
        <View style={{ flex: 1 }}>
          <CameraView
            key={currentFacing} // Force re-mount on camera change
            ref={cameraRef}
            style={{ flex: 1 }}
            facing={currentFacing}
            onCameraReady={handleCameraReady}
            video={true}
          />
          
          {/* Initialization overlay */}
          {(initPhase === 'testing' || (cameraReady && !encoderReady)) && (
            <View style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.8)',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 2000
            }}>
              <ActivityIndicator size="large" color="#fff" />
              <Text style={{ color: '#fff', marginTop: 10, fontSize: 16 }}>
                {initPhase === 'testing' ? 
                  `Initializing camera... (Attempt ${initAttempts.current}/3)` : 
                  'Preparing camera...'}
              </Text>
              {currentFacing === 'back' && (
                <Text style={{ color: '#ffa500', marginTop: 10, fontSize: 14 }}>
                  Will switch to front camera automatically...
                </Text>
              )}
            </View>
          )}
          
          {/* Recording overlay */}
          <View style={StyleSheet.absoluteFillObject}>
            {/* Error message */}
            {error && (
              <View style={{
                position: 'absolute',
                top: 50,
                left: 20,
                right: 20,
                padding: 10,
                backgroundColor: 'rgba(255,0,0,0.8)',
                borderRadius: 5,
                zIndex: 1000
              }}>
                <Text style={{ color: '#fff', textAlign: 'center' }}>{error}</Text>
              </View>
            )}

            {/* Camera info */}
            <View style={{
              position: 'absolute',
              top: 50,
              left: 20,
              padding: 8,
              backgroundColor: 'rgba(0,0,0,0.5)',
              borderRadius: 5
            }}>
              <Text style={{ color: '#fff', fontSize: 12 }}>
                {currentFacing === 'front' ? '📱 Front Camera' : '📷 Back Camera'}
              </Text>
            </View>

            {/* Camera switch button */}
            <TouchableOpacity
              style={{
                position: 'absolute',
                top: 50,
                right: 20,
                padding: 10,
                backgroundColor: 'rgba(255,255,255,0.3)',
                borderRadius: 25
              }}
              onPress={toggleCamera}
            >
              <Ionicons name="camera-reverse" size={24} color="#fff" />
            </TouchableOpacity>

            {/* Recording indicator */}
            {isRecording && (
              <View style={{
                position: 'absolute',
                top: 100,
                alignSelf: 'center',
                padding: 10,
                backgroundColor: 'rgba(255,0,0,0.8)',
                borderRadius: 20,
                flexDirection: 'row',
                alignItems: 'center'
              }}>
                <View style={{
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: '#fff',
                  marginRight: 8
                }} />
                <Text style={{ color: '#fff' }}>
                  {Math.floor(recordingTime / 60)}:{String(recordingTime % 60).padStart(2, '0')}
                </Text>
              </View>
            )}

            {/* Record button */}
            <View style={{
              position: 'absolute',
              bottom: 50,
              alignSelf: 'center'
            }}>
              <TouchableOpacity
                onPress={isRecording ? handleStopRecording : handleStartRecording}
                disabled={!encoderReady}
                style={{
                  width: 70,
                  height: 70,
                  borderRadius: 35,
                  backgroundColor: isRecording ? '#ff0000' : (encoderReady ? '#ff6b6b' : '#666'),
                  justifyContent: 'center',
                  alignItems: 'center',
                  borderWidth: 3,
                  borderColor: '#fff'
                }}
              >
                <View style={{
                  width: isRecording ? 25 : 40,
                  height: isRecording ? 25 : 40,
                  borderRadius: isRecording ? 3 : 20,
                  backgroundColor: '#fff'
                }} />
              </TouchableOpacity>
              
              <Text style={{
                color: '#fff',
                marginTop: 10,
                textAlign: 'center'
              }}>
                {!encoderReady ? 
                  (initPhase === 'failed' ? 'Switch cameras' : 'Initializing...') : 
                  (isRecording ? 'Tap to Stop' : 'Tap to Record')}
              </Text>
            </View>
          </View>
        </View>
      ) : (
        // Review screen
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: '#fff', fontSize: 20, marginBottom: 20 }}>
            Video Recorded!
          </Text>
          <Text style={{ color: '#fff', marginBottom: 30 }}>
            Duration: {recordingTime} seconds
          </Text>
          <View style={{ flexDirection: 'row', gap: 20 }}>
            <TouchableOpacity
              onPress={() => {
                setRecordedUri(null);
                setRecordingTime(0);
                setEncoderReady(false);
                setCameraReady(false);
                setInitPhase('waiting');
                initAttempts.current = 0;
              }}
              style={{ padding: 10, backgroundColor: '#ff0000', borderRadius: 5 }}
            >
              <Text style={{ color: '#fff' }}>Re-record</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                navigation?.navigate('VideoPlayback', {
                  videoUri: recordedUri,
                  giftId,
                  giftName
                });
              }}
              style={{ padding: 10, backgroundColor: '#00ff00', borderRadius: 5 }}
            >
              <Text style={{ color: '#fff' }}>Continue</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};