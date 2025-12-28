/**
 * EmailTemplateScreen
 * Dedicated screen for editing email templates for an event
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Text,
  Alert,
} from 'react-native';
import { useEdition } from '../context/EditionContext';
import { AppBar } from '../components/AppBar';
import { TextField } from '../components/TextField';
import { ThankCastButton } from '../components/ThankCastButton';
import { ErrorMessage } from '../components/ErrorMessage';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { supabase } from '../supabaseClient';

export const EmailTemplateScreen = ({ navigation, route }) => {
  const { edition, theme } = useEdition();
  const isKidsEdition = edition === 'kids';
  const eventId = route?.params?.eventId;
  const eventName = route?.params?.eventName || 'Event';

  // Form state
  const [emailSubject, setEmailSubject] = useState(
    route?.params?.subject || 'A Thank You Video from [child_name]!'
  );
  const [emailMessage, setEmailMessage] = useState(
    route?.params?.message || 'Hi [name]! [child_name] made a special thank you video just for you. Click below to watch it!'
  );

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSave = async () => {
    if (!eventId) {
      Alert.alert('Error', 'Event ID is missing');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { error: updateError } = await supabase
        .from('events')
        .update({
          email_template_subject: emailSubject,
          email_template_message: emailMessage,
        })
        .eq('id', eventId);

      if (updateError) throw updateError;

      Alert.alert('Success', 'Email template saved successfully', [
        { text: 'OK', onPress: () => navigation?.goBack() }
      ]);
    } catch (err) {
      console.error('Error saving email template:', err);
      setError(err.message || 'Failed to save email template');
    } finally {
      setLoading(false);
    }
  };

  const paddingHorizontal = isKidsEdition ? theme.spacing.lg : theme.spacing.md;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.neutralColors.white }}>
      <AppBar
        title="Email Template"
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

          <Text style={styles.eventName}>{eventName}</Text>
          <Text style={styles.description}>
            Customize the email that guests receive with the thank you video.
          </Text>

          {/* Mail merge hint */}
          <View style={styles.mailMergeHint}>
            <Text style={styles.mailMergeHintText}>
              Use placeholders to personalize:
            </Text>
            <View style={styles.placeholderRow}>
              <Text style={styles.placeholderChip}>[name]</Text>
              <Text style={styles.placeholderDesc}>Guest's name</Text>
            </View>
            <View style={styles.placeholderRow}>
              <Text style={styles.placeholderChip}>[child_name]</Text>
              <Text style={styles.placeholderDesc}>Your child's name</Text>
            </View>
            <View style={styles.placeholderRow}>
              <Text style={styles.placeholderChip}>[gift_name]</Text>
              <Text style={styles.placeholderDesc}>The gift name</Text>
            </View>
          </View>

          <TextField
            label="Email Subject"
            placeholder="A Thank You Video from [child_name]!"
            value={emailSubject}
            onChangeText={setEmailSubject}
            autoCorrect={true}
            spellCheck={true}
            autoCapitalize="sentences"
          />

          <TextField
            label="Email Message"
            placeholder="Hi [name]! [child_name] made a special video just for you..."
            value={emailMessage}
            onChangeText={setEmailMessage}
            multiline={true}
            numberOfLines={8}
            autoCorrect={true}
            spellCheck={true}
            autoCapitalize="sentences"
          />

          {/* Preview */}
          <View style={styles.preview}>
            <Text style={styles.previewLabel}>Preview</Text>
            <View style={styles.previewCard}>
              <Text style={styles.previewSubject}>
                Subject: {emailSubject.replace(/\[child_name\]/gi, 'Emma').replace(/\[name\]/gi, 'Sarah').replace(/\[gift_name\]/gi, 'LEGO Set')}
              </Text>
              <Text style={styles.previewMessage}>
                {emailMessage.replace(/\[child_name\]/gi, 'Emma').replace(/\[name\]/gi, 'Sarah').replace(/\[gift_name\]/gi, 'LEGO Set')}
              </Text>
            </View>
          </View>

          <ThankCastButton
            title="Save Email Template"
            onPress={handleSave}
            loading={loading}
            disabled={loading}
            style={{ marginTop: theme.spacing.lg, marginBottom: theme.spacing.lg }}
          />
        </ScrollView>
      </KeyboardAvoidingView>

      <LoadingSpinner visible={loading} message="Saving..." fullScreen />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
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
  mailMergeHint: {
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  mailMergeHintText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 12,
  },
  placeholderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  placeholderChip: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    backgroundColor: '#B45309',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 12,
    overflow: 'hidden',
  },
  placeholderDesc: {
    fontSize: 13,
    color: '#92400E',
  },
  preview: {
    marginTop: 16,
  },
  previewLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  previewCard: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  previewSubject: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 10,
  },
  previewMessage: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
});

export default EmailTemplateScreen;
