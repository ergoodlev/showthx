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
} from 'react-native';
import { useEdition } from '../context/EditionContext';
import { AppBar } from '../components/AppBar';
import { TextField } from '../components/TextField';
import { ThankCastButton } from '../components/ThankCastButton';
import { ErrorMessage } from '../components/ErrorMessage';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { supabase } from '../supabaseClient';

export const EventManagementScreen = ({ navigation, route }) => {
  const { edition, theme } = useEdition();
  const isKidsEdition = edition === 'kids';
  const mode = route?.params?.mode || 'create';
  const existingEvent = route?.params?.event;

  // Form state
  const [name, setName] = useState(existingEvent?.name || '');
  const [eventType, setEventType] = useState(existingEvent?.event_type || 'birthday');
  const [eventDate, setEventDate] = useState(existingEvent?.event_date || '');
  const [location, setLocation] = useState(existingEvent?.location || '');
  const [description, setDescription] = useState(existingEvent?.description || '');

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});

  // Validation
  const validateForm = () => {
    const errors = {};

    if (!name.trim()) {
      errors.name = 'Event name is required';
    }

    if (!eventDate.trim()) {
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

      if (!user) {
        navigation?.replace('ParentSignup');
        return;
      }

      const eventData = {
        name,
        event_type: eventType,
        event_date: eventDate,
        location: location || null,
        description: description || null,
      };

      if (mode === 'create') {
        const { error: createError } = await supabase
          .from('events')
          .insert({
            ...eventData,
            parent_id: user.id,
          });

        if (createError) throw createError;
      } else {
        const { error: updateError } = await supabase
          .from('events')
          .update(eventData)
          .eq('id', existingEvent.id);

        if (updateError) throw updateError;
      }

      navigation?.goBack();
    } catch (err) {
      console.error('Error saving event:', err);
      setError(err.message || 'Failed to save event');
    } finally {
      setLoading(false);
    }
  };

  const paddingHorizontal = isKidsEdition ? theme.spacing.lg : theme.spacing.md;
  const title = mode === 'create' ? 'Create Event' : 'Edit Event';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.neutral.white }}>
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

          <TextField
            label="Event Date"
            placeholder="YYYY-MM-DD"
            value={eventDate}
            onChangeText={setEventDate}
            error={validationErrors.eventDate}
            required
          />

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
});

export default EventManagementScreen;
