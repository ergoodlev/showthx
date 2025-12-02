/**
 * EventManagementScreen
 * Create and edit events
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Text,
  Modal,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useEdition } from '../context/EditionContext';
import { AppBar } from '../components/AppBar';
import { TextField } from '../components/TextField';
import { ThankCastButton } from '../components/ThankCastButton';
import { ErrorMessage } from '../components/ErrorMessage';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { supabase } from '../supabaseClient';
import { handleUnauthorized } from '../services/navigationService';

export const EventManagementScreen = ({ navigation, route }) => {
  const { edition, theme } = useEdition();
  const isKidsEdition = edition === 'kids';
  const mode = route?.params?.mode || 'create';
  const existingEvent = route?.params?.event;

  // Form state
  const [name, setName] = useState(existingEvent?.name || '');
  const [eventType, setEventType] = useState(existingEvent?.event_type || 'birthday');
  const [eventDate, setEventDate] = useState(
    existingEvent?.event_date ? new Date(existingEvent.event_date) : new Date()
  );
  const [location, setLocation] = useState(existingEvent?.location || '');
  const [description, setDescription] = useState(existingEvent?.description || '');

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Format date for display
  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Format date for database (YYYY-MM-DD)
  const formatDateForDB = (date) => {
    return date.toISOString().split('T')[0];
  };

  // Handle date change
  const handleDateChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      setEventDate(selectedDate);
    }
  };

  // Validation
  const validateForm = () => {
    const errors = {};

    if (!name.trim()) {
      errors.name = 'Event name is required';
    }

    // eventDate is always a Date object now, so just check if it's valid
    if (!eventDate || isNaN(eventDate.getTime())) {
      errors.eventDate = 'Event date is required';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle save
  const handleSave = async () => {
    setError(null);

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      console.log('🔍 DEBUG: Current user:', user);

      if (!user) {
        console.error('❌ No authenticated user found');
        handleUnauthorized(navigation);
        return;
      }

      const eventData = {
        name,
        event_type: eventType,
        event_date: formatDateForDB(eventDate),
        location: location || null,
        description: description || null,
      };

      console.log('📝 DEBUG: Event data:', eventData);
      console.log('👤 DEBUG: Parent ID:', user.id);

      if (mode === 'create') {
        console.log('➕ DEBUG: Creating new event...');
        const { data: insertData, error: createError } = await supabase
          .from('events')
          .insert({
            ...eventData,
            parent_id: user.id,
          });

        console.log('📊 DEBUG: Insert response:', { data: insertData, error: createError });

        if (createError) {
          console.error('❌ Insert error:', createError);
          throw createError;
        }

        console.log('✅ Event created successfully');
      } else {
        const { error: updateError } = await supabase
          .from('events')
          .update(eventData)
          .eq('id', existingEvent.id);

        if (updateError) throw updateError;
      }

      navigation?.goBack();
    } catch (err) {
      console.error('❌ Error saving event:', err);
      setError(err.message || 'Failed to save event');
    } finally {
      setLoading(false);
    }
  };

  const paddingHorizontal = isKidsEdition ? theme.spacing.lg : theme.spacing.md;
  const title = mode === 'create' ? 'Create Event' : 'Edit Event';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.neutralColors.white }}>
      <AppBar
        title={title}
        onBackPress={() => navigation?.goBack()}
        showBack={true}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal,
            paddingVertical: theme.spacing.lg,
          }}
          showsVerticalScrollIndicator={false}
        >
          {error && (
            <ErrorMessage
              message={error}
              onDismiss={() => setError(null)}
              autoDismiss={false}
              style={{ marginBottom: theme.spacing.md }}
            />
          )}

          <TextField
            label="Event Name"
            placeholder="Birthday Party, Wedding, etc."
            value={name}
            onChangeText={setName}
            error={validationErrors.name}
            required
          />

          <TextField
            label="Event Type"
            placeholder="Select type (Birthday, Wedding, etc.)"
            value={eventType}
            onChangeText={setEventType}
          />

          {/* Date Picker Field */}
          <View style={styles.dateFieldContainer}>
            <Text style={styles.dateLabel}>Event Date <Text style={styles.required}>*</Text></Text>
            <TouchableOpacity
              style={[
                styles.dateButton,
                validationErrors.eventDate && styles.dateButtonError,
              ]}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.dateButtonText}>{formatDate(eventDate)}</Text>
            </TouchableOpacity>
            {validationErrors.eventDate && (
              <Text style={styles.errorText}>{validationErrors.eventDate}</Text>
            )}
          </View>

          {/* Date Picker Modal for iOS */}
          {Platform.OS === 'ios' && showDatePicker && (
            <Modal
              transparent
              animationType="slide"
              visible={showDatePicker}
              onRequestClose={() => setShowDatePicker(false)}
            >
              <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                    <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                      <Text style={styles.modalCancel}>Cancel</Text>
                    </TouchableOpacity>
                    <Text style={styles.modalTitle}>Select Date</Text>
                    <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                      <Text style={styles.modalDone}>Done</Text>
                    </TouchableOpacity>
                  </View>
                  <DateTimePicker
                    value={eventDate}
                    mode="date"
                    display="spinner"
                    onChange={handleDateChange}
                    style={styles.datePicker}
                  />
                </View>
              </View>
            </Modal>
          )}

          {/* Date Picker for Android (inline) */}
          {Platform.OS === 'android' && showDatePicker && (
            <DateTimePicker
              value={eventDate}
              mode="date"
              display="default"
              onChange={handleDateChange}
            />
          )}

          <TextField
            label="Location"
            placeholder="Optional"
            value={location}
            onChangeText={setLocation}
          />

          <TextField
            label="Description"
            placeholder="Optional notes about the event"
            value={description}
            onChangeText={setDescription}
            multiline={true}
            numberOfLines={4}
          />

          {/* Frame Creation Section */}
          <View style={styles.frameSection}>
            <View style={styles.frameSectionHeader}>
              <Ionicons name="image-outline" size={24} color="#06b6d4" />
              <View style={styles.frameSectionText}>
                <Text style={styles.frameSectionTitle}>Event Frame</Text>
                <Text style={styles.frameSectionDesc}>
                  Create a custom video frame for this event
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.createFrameButton}
              onPress={() => navigation?.navigate('FrameCreation', {
                eventId: existingEvent?.id || null, // Pass eventId for frame assignment
                eventName: name || 'New Event',
              })}
            >
              <Ionicons name="add-circle" size={20} color="#06b6d4" />
              <Text style={styles.createFrameText}>Create Frame</Text>
            </TouchableOpacity>
          </View>

          <ThankCastButton
            title={mode === 'create' ? 'Create Event' : 'Save Changes'}
            onPress={handleSave}
            loading={loading}
            disabled={loading}
            style={{ marginTop: theme.spacing.lg, marginBottom: theme.spacing.lg }}
          />
        </ScrollView>
      </KeyboardAvoidingView>

      <LoadingSpinner visible={loading} message={mode === 'create' ? 'Creating event...' : 'Saving changes...'} fullScreen />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  dateFieldContainer: {
    marginBottom: 16,
  },
  dateLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  required: {
    color: '#EF4444',
  },
  dateButton: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  dateButtonError: {
    borderColor: '#EF4444',
  },
  dateButtonText: {
    fontSize: 16,
    color: '#1F2937',
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1F2937',
  },
  modalCancel: {
    fontSize: 17,
    color: '#6B7280',
  },
  modalDone: {
    fontSize: 17,
    fontWeight: '600',
    color: '#06b6d4',
  },
  datePicker: {
    height: 216,
  },
  frameSection: {
    backgroundColor: '#F0FDFA',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#99F6E4',
  },
  frameSectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  frameSectionText: {
    flex: 1,
  },
  frameSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F766E',
    marginBottom: 2,
  },
  frameSectionDesc: {
    fontSize: 13,
    color: '#5EEAD4',
  },
  createFrameButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#06b6d4',
  },
  createFrameText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#06b6d4',
  },
});

export default EventManagementScreen;
