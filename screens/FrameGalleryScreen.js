/**
 * FrameGalleryScreen
 * View and manage all frames for an event
 * Kids can choose from these frames when recording
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Text,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useEdition } from '../context/EditionContext';
import { AppBar } from '../components/AppBar';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { CustomFrameOverlay } from '../components/CustomFrameOverlay';
import { supabase } from '../supabaseClient';

export const FrameGalleryScreen = ({ navigation, route }) => {
  const { edition, theme } = useEdition();
  const isKidsEdition = edition === 'kids';
  const eventId = route?.params?.eventId;
  const eventName = route?.params?.eventName || 'Event';

  const [frames, setFrames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Load frames when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadFrames();
    }, [eventId])
  );

  const loadFrames = async () => {
    if (!eventId) return;

    try {
      setLoading(true);
      console.log('Loading frames for event:', eventId);

      // Get all frame templates for this event
      const { data: templates, error: templatesError } = await supabase
        .from('frame_templates')
        .select('*')
        .eq('event_id', eventId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (templatesError) {
        console.error('Error loading frames:', templatesError);
        throw templatesError;
      }

      console.log('Loaded frames:', templates?.length || 0);
      setFrames(templates || []);
    } catch (error) {
      console.error('Error loading frames:', error);
      Alert.alert('Error', 'Failed to load frames');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadFrames();
  };

  const handleDeleteFrame = (frame) => {
    Alert.alert(
      'Delete Frame?',
      `Are you sure you want to delete "${frame.name || 'this frame'}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('frame_templates')
                .update({ is_active: false })
                .eq('id', frame.id);

              if (error) throw error;

              // Remove from local state
              setFrames(frames.filter(f => f.id !== frame.id));
              Alert.alert('Deleted', 'Frame has been removed');
            } catch (error) {
              console.error('Error deleting frame:', error);
              Alert.alert('Error', 'Failed to delete frame');
            }
          },
        },
      ]
    );
  };

  const handleEditFrame = (frame) => {
    navigation?.navigate('FrameCreation', {
      eventId,
      eventName,
      mode: 'edit',
      existingFrame: frame,
    });
  };

  const handleCreateNewFrame = () => {
    navigation?.navigate('FrameCreation', {
      eventId,
      eventName,
    });
  };

  const renderFrameCard = (frame) => {
    return (
      <View key={frame.id} style={styles.frameCard}>
        {/* Frame preview */}
        <View style={styles.framePreview}>
          <View style={styles.framePreviewInner}>
            <CustomFrameOverlay frameTemplate={frame} />
          </View>
        </View>

        {/* Frame info */}
        <View style={styles.frameInfo}>
          <Text style={styles.frameName} numberOfLines={1}>
            {frame.name || 'Untitled Frame'}
          </Text>
          {frame.custom_text && (
            <Text style={styles.frameText} numberOfLines={1}>
              "{frame.custom_text}"
            </Text>
          )}
          <View style={styles.frameDetails}>
            <View style={[styles.colorDot, { backgroundColor: frame.primary_color || '#06b6d4' }]} />
            <Text style={styles.frameShape}>{frame.frame_shape || 'classic'}</Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.frameActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleEditFrame(frame)}
          >
            <Ionicons name="pencil" size={20} color="#06b6d4" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleDeleteFrame(frame)}
          >
            <Ionicons name="trash-outline" size={20} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.neutralColors.white }}>
      <AppBar
        title="Video Frames"
        onBackPress={() => navigation?.goBack()}
        showBack={true}
      />

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <Text style={styles.eventName}>{eventName}</Text>
        <Text style={styles.description}>
          Frames you create here will be available for kids to choose from when recording thank you videos.
        </Text>

        {/* Create new frame button */}
        <TouchableOpacity
          style={styles.createButton}
          onPress={handleCreateNewFrame}
        >
          <Ionicons name="add-circle" size={24} color="#FFFFFF" />
          <Text style={styles.createButtonText}>Create New Frame</Text>
        </TouchableOpacity>

        {/* Frames list */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <LoadingSpinner visible={true} message="Loading frames..." />
          </View>
        ) : frames.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="image-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>No Frames Yet</Text>
            <Text style={styles.emptyText}>
              Create your first frame to add a decorative border to your thank you videos.
            </Text>
          </View>
        ) : (
          <View style={styles.framesList}>
            <Text style={styles.framesCount}>
              {frames.length} frame{frames.length !== 1 ? 's' : ''}
            </Text>
            {frames.map(renderFrameCard)}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  eventName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 20,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#06b6d4',
    borderRadius: 12,
    paddingVertical: 16,
    marginBottom: 24,
    gap: 10,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  loadingContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
  },
  framesCount: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 12,
  },
  framesList: {
    gap: 16,
  },
  frameCard: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12,
  },
  framePreview: {
    width: 70,
    height: 100,
    backgroundColor: '#1F2937',
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 12,
  },
  framePreviewInner: {
    flex: 1,
    position: 'relative',
  },
  frameInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  frameName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  frameText: {
    fontSize: 13,
    color: '#6B7280',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  frameDetails: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  frameShape: {
    fontSize: 12,
    color: '#9CA3AF',
    textTransform: 'capitalize',
  },
  frameActions: {
    justifyContent: 'center',
    gap: 8,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
});

export default FrameGalleryScreen;
