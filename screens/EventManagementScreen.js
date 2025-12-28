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

  // Email template state (simplified)
  const [emailSubject, setEmailSubject] = useState(
    existingEvent?.email_template_subject || 'A Thank You Video from [child_name]!'
  );
  const [emailMessage, setEmailMessage] = useState(
    existingEvent?.email_template_message || 'Hi [name]! [child_name] made a special thank you video just for you. Click below to watch it!'
  );

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

      // Ensure parent profile exists before creating event (fixes foreign key constraint)
      const { data: parentProfile, error: parentCheckError } = await supabase
        .from('parents')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      if (!parentProfile && !parentCheckError) {
        console.log('📝 Parent profile missing, creating before event creation...');
        const consentTimestamp = new Date().toISOString();
        const { error: createParentError } = await supabase
          .from('parents')
          .insert({
            id: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name || 'Parent',
            parental_consent_given: true,
            consent_given_at: consentTimestamp,
            terms_accepted: true,
            terms_accepted_at: consentTimestamp,
          });

        if (createParentError) {
          console.error('❌ Failed to create parent profile:', createParentError);
          throw new Error('Failed to set up your profile. Please try logging out and back in.');
        }
        console.log('✅ Parent profile created successfully');
      }

      const eventData = {
        name,
        event_type: eventType,
        event_date: formatDateForDB(eventDate),
        location: location || null,
        description: description || null,
        // Email template fields (simplified)
        email_template_subject: emailSubject,
        email_template_message: emailMessage,
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

          {/* Email Template Section - Simplified to navigation button */}
          {mode === 'edit' && existingEvent?.id && (
            <View style={styles.emailSection}>
              <View style={styles.emailSectionHeader}>
                <Ionicons name="mail-outline" size={24} color="#06b6d4" />
                <View style={styles.emailSectionText}>
                  <Text style={styles.emailSectionTitle}>Email Template</Text>
                  <Text style={styles.emailSectionDesc}>
                    Customize the email guests receive
                  </Text>
                </View>
              </View>

              {/* Current subject preview */}
              <View style={styles.emailPreviewCompact}>
                <Text style={styles.emailPreviewLabel}>Subject:</Text>
                <Text style={styles.emailPreviewSubjectCompact} numberOfLines={1}>
                  {emailSubject || 'A Thank You Video from [child_name]!'}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.settingsButton}
                onPress={() => navigation?.navigate('EmailTemplate', {
                  eventId: existingEvent.id,
                  eventName: name || existingEvent.name,
                  subject: emailSubject,
                  message: emailMessage,
                })}
              >
                <Text style={styles.settingsButtonText}>Edit Email Template</Text>
                <Ionicons name="chevron-forward" size={20} color="#06b6d4" />
              </TouchableOpacity>
            </View>
          )}

          {/* Frame Creation Hint - Show in create mode */}
          {mode === 'create' && (
            <View style={styles.frameHint}>
              <Ionicons name="information-circle-outline" size={20} color="#0891b2" />
              <Text style={styles.frameHintText}>
                After saving this event, you'll be able to create a custom video frame.
              </Text>
            </View>
          )}

          {/* Frame Management Section - Only show when editing existing event */}
          {mode === 'edit' && existingEvent?.id && (
            <View style={styles.frameSection}>
              <View style={styles.frameSectionHeader}>
                <Ionicons name="image-outline" size={24} color="#06b6d4" />
                <View style={styles.frameSectionText}>
                  <Text style={styles.frameSectionTitle}>Video Frames</Text>
                  <Text style={styles.frameSectionDesc}>
                    Create and manage video frames for this event
                  </Text>
                </View>
              </View>
              <View style={styles.frameButtonRow}>
                <TouchableOpacity
                  style={[styles.createFrameButton, styles.frameButtonHalf]}
                  onPress={() => navigation?.navigate('FrameCreation', {
                    eventId: existingEvent.id,
                    eventName: name || existingEvent.name,
                  })}
                >
                  <Ionicons name="add-circle" size={20} color="#06b6d4" />
                  <Text style={styles.createFrameText}>New Frame</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.createFrameButton, styles.frameButtonHalf]}
                  onPress={() => navigation?.navigate('FrameGallery', {
                    eventId: existingEvent.id,
                    eventName: name || existingEvent.name,
                  })}
                >
                  <Ionicons name="albums" size={20} color="#06b6d4" />
                  <Text style={styles.createFrameText}>Manage</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

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
  frameHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ECFEFF',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#A5F3FC',
  },
  frameHintText: {
    flex: 1,
    fontSize: 13,
    color: '#0E7490',
    lineHeight: 18,
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
  frameButtonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  frameButtonHalf: {
    flex: 1,
  },
  settingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#06b6d4',
  },
  settingsButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#06b6d4',
  },
  emailPreviewCompact: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  emailPreviewSubjectCompact: {
    fontSize: 13,
    color: '#1F2937',
    marginTop: 2,
  },
  // Email template section styles
  emailSection: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  emailSectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  emailSectionText: {
    flex: 1,
  },
  emailSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E40AF',
    marginBottom: 2,
  },
  emailSectionDesc: {
    fontSize: 13,
    color: '#60A5FA',
  },
  mailMergeHint: {
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  mailMergeHintText: {
    fontSize: 12,
    color: '#92400E',
    lineHeight: 18,
  },
  placeholder: {
    fontWeight: '700',
    color: '#B45309',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  emailPreview: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  emailPreviewLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emailPreviewSubject: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 6,
  },
  emailPreviewMessage: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 18,
  },
});

export default EventManagementScreen;
