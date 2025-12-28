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
  const [activeFrameId, setActiveFrameId] = useState(null);
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

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Not authenticated');
      }

      // Get ALL frame templates for this event created by this user (not just active ones)
      const { data: assignments, error: assignmentsError } = await supabase
        .from('frame_assignments')
        .select('*, frame_templates(*)')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });

      // Filter to only show frames created by this user
      const userAssignments = assignments?.filter(
        a => a.frame_templates?.parent_id === user.id
      ) || [];

      if (assignmentsError) {
        console.error('Error loading frames:', assignmentsError);
        throw assignmentsError;
      }

      // Extract frame templates and track which is active
      const templatesWithStatus = userAssignments
        .map(assignment => ({
          ...assignment.frame_templates,
          assignmentId: assignment.id,
          isActive: assignment.is_active,
        }))
        .filter(template => template && template.id);

      // Find the active frame
      const activeAssignment = userAssignments.find(a => a.is_active);
      if (activeAssignment) {
        setActiveFrameId(activeAssignment.frame_templates?.id);
      } else {
        setActiveFrameId(null);
      }

      console.log('Loaded frames:', templatesWithStatus.length);
      setFrames(templatesWithStatus);
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

  const handleSetActive = async (frame) => {
    try {
      // Deactivate all other assignments for this event
      await supabase
        .from('frame_assignments')
        .update({ is_active: false })
        .eq('event_id', eventId);

      // Activate the selected frame's assignment
      await supabase
        .from('frame_assignments')
        .update({ is_active: true })
        .eq('id', frame.assignmentId);

      setActiveFrameId(frame.id);

      // Update local state
      setFrames(frames.map(f => ({
        ...f,
        isActive: f.id === frame.id,
      })));

      Alert.alert('Active Frame Set', `"${frame.name || 'Frame'}" is now the active frame for this event.`);
    } catch (error) {
      console.error('Error setting active frame:', error);
      Alert.alert('Error', 'Failed to set active frame');
    }
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
              console.log('Deleting frame assignment:', frame.assignmentId);

              // Delete the frame assignment (not the template itself)
              const { error: assignmentError } = await supabase
                .from('frame_assignments')
                .delete()
                .eq('id', frame.assignmentId);

              if (assignmentError) {
                console.error('Error deleting assignment:', assignmentError);
                throw assignmentError;
              }

              // Remove from local state
              setFrames(frames.filter(f => f.id !== frame.id));

              // If this was the active frame, clear activeFrameId
              if (frame.id === activeFrameId) {
                setActiveFrameId(null);
              }

              Alert.alert('Deleted', 'Frame has been removed from this event');
            } catch (error) {
              console.error('Error deleting frame:', error);
              Alert.alert('Error', `Failed to delete frame: ${error.message}`);
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
    const isActive = frame.id === activeFrameId;

    return (
      <View key={frame.id} style={[styles.frameCard, isActive && styles.frameCardActive]}>
        {/* Active badge */}
        {isActive && (
          <View style={styles.activeBadge}>
            <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
            <Text style={styles.activeBadgeText}>Active</Text>
          </View>
        )}

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

          {/* Set as Active button - larger, more prominent, only show if not active */}
          {!isActive && (
            <TouchableOpacity
              style={styles.setActiveButton}
              onPress={() => {
                console.log('Set as Active pressed for frame:', frame.name);
                handleSetActive(frame);
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
              <Text style={styles.setActiveText}>Set as Active</Text>
            </TouchableOpacity>
          )}

          {/* Show "Currently Active" label for active frame */}
          {isActive && (
            <View style={styles.currentlyActiveLabel}>
              <Text style={styles.currentlyActiveText}>Currently Active</Text>
            </View>
          )}
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
    position: 'relative',
  },
  frameCardActive: {
    borderColor: '#06b6d4',
    borderWidth: 2,
    backgroundColor: '#F0FDFA',
  },
  activeBadge: {
    position: 'absolute',
    top: -8,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#06b6d4',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 4,
    zIndex: 10,
  },
  activeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  setActiveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#06b6d4',
    borderRadius: 8,
    gap: 6,
  },
  setActiveText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  currentlyActiveLabel: {
    marginTop: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#ECFDF5',
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  currentlyActiveText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#059669',
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
