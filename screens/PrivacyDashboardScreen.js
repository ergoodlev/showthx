/**
 * PrivacyDashboardScreen
 * COPPA Compliance: Shows data retention schedule, usage stats, and privacy controls
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  TextInput,
  Linking,
  Share,
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useEdition } from '../context/EditionContext';
import { AppBar } from '../components/AppBar';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { supabase } from '../supabaseClient';
import { RETENTION_POLICIES } from '../services/dataRetentionService';

export const PrivacyDashboardScreen = ({ navigation }) => {
  const { edition, theme } = useEdition();
  const isKidsEdition = edition === 'kids';

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalVideos: 0,
    draftVideos: 0,
    approvedVideos: 0,
    sentVideos: 0,
    totalChildren: 0,
    totalEvents: 0,
    totalGuests: 0,
    oldestDraft: null,
    oldestApproved: null,
  });

  // COPPA Request Form State
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestType, setRequestType] = useState('access'); // access, delete, correct
  const [requestMessage, setRequestMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadPrivacyStats();
    }, [])
  );

  const loadPrivacyStats = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) return;

      // Get video stats
      const { data: videos } = await supabase
        .from('videos')
        .select('id, status, created_at')
        .eq('parent_id', user.id);

      const draftVideos = videos?.filter(v => v.status === 'draft') || [];
      const approvedVideos = videos?.filter(v => v.status === 'approved') || [];
      const sentVideos = videos?.filter(v => v.status === 'sent') || [];

      // Get oldest dates for retention display
      const oldestDraft = draftVideos.length > 0
        ? new Date(Math.min(...draftVideos.map(v => new Date(v.created_at))))
        : null;
      const oldestApproved = approvedVideos.length > 0
        ? new Date(Math.min(...approvedVideos.map(v => new Date(v.created_at))))
        : null;

      // Get other counts
      const { count: childCount } = await supabase
        .from('children')
        .select('id', { count: 'exact' })
        .eq('parent_id', user.id);

      const { count: eventCount } = await supabase
        .from('events')
        .select('id', { count: 'exact' })
        .eq('parent_id', user.id);

      const { data: events } = await supabase
        .from('events')
        .select('id')
        .eq('parent_id', user.id);

      let guestCount = 0;
      if (events && events.length > 0) {
        const eventIds = events.map(e => e.id);
        const { count } = await supabase
          .from('guests')
          .select('id', { count: 'exact' })
          .in('event_id', eventIds);
        guestCount = count || 0;
      }

      setStats({
        totalVideos: videos?.length || 0,
        draftVideos: draftVideos.length,
        approvedVideos: approvedVideos.length,
        sentVideos: sentVideos.length,
        totalChildren: childCount || 0,
        totalEvents: eventCount || 0,
        totalGuests: guestCount,
        oldestDraft,
        oldestApproved,
      });
    } catch (error) {
      console.error('Error loading privacy stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getExpiryDate = (date, days) => {
    if (!date) return null;
    const expiry = new Date(date);
    expiry.setDate(expiry.getDate() + days);
    return expiry;
  };

  const getDaysRemaining = (expiryDate) => {
    if (!expiryDate) return null;
    const now = new Date();
    const diff = expiryDate - now;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleSubmitRequest = async () => {
    if (!requestMessage.trim()) {
      Alert.alert('Required', 'Please describe your request');
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: parent } = await supabase
        .from('parents')
        .select('email, full_name')
        .eq('id', user.id)
        .single();

      // For now, open email client with pre-filled content
      const subject = encodeURIComponent(`COPPA ${requestType.toUpperCase()} Request - ${parent?.full_name || 'Parent'}`);
      const body = encodeURIComponent(
        `Request Type: ${requestType.toUpperCase()}\n\n` +
        `From: ${parent?.full_name || 'Parent'}\n` +
        `Email: ${parent?.email || user.email}\n` +
        `User ID: ${user.id}\n\n` +
        `Request Details:\n${requestMessage}\n\n` +
        `---\nSubmitted via ShowThx Privacy Dashboard`
      );

      const emailUrl = `mailto:COPPA@showthx.com?subject=${subject}&body=${body}`;

      const canOpen = await Linking.canOpenURL(emailUrl);
      if (canOpen) {
        await Linking.openURL(emailUrl);
        Alert.alert(
          'Email Opened',
          'Your email app has been opened with your request. Please send the email to complete your request.',
          [{ text: 'OK', onPress: () => {
            setShowRequestForm(false);
            setRequestMessage('');
          }}]
        );
      } else {
        Alert.alert(
          'Email Not Available',
          'Please send your request directly to COPPA@showthx.com',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error submitting request:', error);
      Alert.alert('Error', 'Failed to submit request. Please email COPPA@showthx.com directly.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleExportData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      // Gather all user data
      const { data: parentData } = await supabase
        .from('parents')
        .select('*')
        .eq('id', user.id)
        .single();

      const { data: children } = await supabase
        .from('children')
        .select('id, name, age, created_at')
        .eq('parent_id', user.id);

      const { data: events } = await supabase
        .from('events')
        .select('*')
        .eq('parent_id', user.id);

      const { data: videos } = await supabase
        .from('videos')
        .select('id, status, created_at, child_id')
        .eq('parent_id', user.id);

      let guests = [];
      let gifts = [];
      if (events && events.length > 0) {
        const eventIds = events.map(e => e.id);
        const { data: guestData } = await supabase
          .from('guests')
          .select('id, name, email, event_id, created_at')
          .in('event_id', eventIds);
        guests = guestData || [];

        const { data: giftData } = await supabase
          .from('gifts')
          .select('id, name, status, guest_id, event_id, created_at')
          .in('event_id', eventIds);
        gifts = giftData || [];
      }

      const exportData = {
        exportDate: new Date().toISOString(),
        exportedBy: 'ShowThx Privacy Dashboard',
        account: {
          email: parentData?.email,
          fullName: parentData?.full_name,
          createdAt: parentData?.created_at,
          consentGivenAt: parentData?.consent_given_at,
        },
        children: children?.map(c => ({
          name: c.name,
          age: c.age,
          createdAt: c.created_at,
        })) || [],
        events: events?.map(e => ({
          name: e.name,
          date: e.event_date,
          createdAt: e.created_at,
        })) || [],
        videos: videos?.map(v => ({
          status: v.status,
          createdAt: v.created_at,
        })) || [],
        guests: guests.map(g => ({
          name: g.name,
          email: g.email,
          createdAt: g.created_at,
        })),
        gifts: gifts.map(g => ({
          name: g.name,
          status: g.status,
          createdAt: g.created_at,
        })),
        dataRetentionPolicies: {
          draftVideos: `${RETENTION_POLICIES.DRAFT_VIDEO} days`,
          approvedVideos: `${RETENTION_POLICIES.APPROVED_VIDEO} days`,
          sharedLinks: `${RETENTION_POLICIES.EXPIRED_TOKEN} day`,
          auditLogs: `${RETENTION_POLICIES.AUDIT_LOG} days`,
        },
      };

      const jsonString = JSON.stringify(exportData, null, 2);
      const timestamp = new Date().toISOString().split('T')[0];
      const fileName = `showthx-data-export-${timestamp}.json`;
      const filePath = `${FileSystem.documentDirectory}${fileName}`;

      // Write the file
      await FileSystem.writeAsStringAsync(filePath, jsonString, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      console.log('📊 Data exported to:', filePath);

      // Check if sharing is available
      const isSharingAvailable = await Sharing.isAvailableAsync();

      if (isSharingAvailable) {
        // Share/download the file
        await Sharing.shareAsync(filePath, {
          mimeType: 'application/json',
          dialogTitle: 'Export Your ShowThx Data',
          UTI: 'public.json',
        });
      } else {
        // Fallback: Use Share API for the text content
        await Share.share({
          title: 'ShowThx Data Export',
          message: jsonString,
        });
      }

      Alert.alert(
        'Export Complete',
        `Your data has been exported.\n\n` +
        `Included:\n` +
        `• Account information\n` +
        `• ${children?.length || 0} child profiles\n` +
        `• ${events?.length || 0} events\n` +
        `• ${videos?.length || 0} videos\n` +
        `• ${guests.length} guests\n` +
        `• ${gifts.length} gifts`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error exporting data:', error);
      Alert.alert('Error', 'Failed to export data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const draftExpiry = getExpiryDate(stats.oldestDraft, RETENTION_POLICIES.DRAFT_VIDEO);
  const approvedExpiry = getExpiryDate(stats.oldestApproved, RETENTION_POLICIES.APPROVED_VIDEO);
  const draftDaysRemaining = getDaysRemaining(draftExpiry);
  const approvedDaysRemaining = getDaysRemaining(approvedExpiry);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.neutralColors.white }}>
      <AppBar
        title="Privacy Dashboard"
        onBackPress={() => navigation?.goBack()}
        showBack={true}
      />

      <ScrollView style={{ flex: 1, padding: theme.spacing.md }}>
        {/* Data Retention Section */}
        <Text
          style={{
            fontSize: isKidsEdition ? 16 : 14,
            fontFamily: isKidsEdition ? 'Nunito_Bold' : 'Montserrat_Bold',
            color: theme.neutralColors.dark,
            marginBottom: theme.spacing.sm,
          }}
        >
          Data Retention Schedule
        </Text>

        <View
          style={{
            backgroundColor: theme.neutralColors.lightGray,
            borderRadius: 12,
            padding: theme.spacing.md,
            marginBottom: theme.spacing.lg,
          }}
        >
          {/* Draft Videos */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.md }}>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: theme.brandColors.coral + '20',
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: theme.spacing.sm,
              }}
            >
              <Ionicons name="time-outline" size={20} color={theme.brandColors.coral} />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: isKidsEdition ? 14 : 12,
                  fontFamily: isKidsEdition ? 'Nunito_SemiBold' : 'Montserrat_SemiBold',
                  color: theme.neutralColors.dark,
                }}
              >
                Draft Videos ({stats.draftVideos})
              </Text>
              <Text
                style={{
                  fontSize: isKidsEdition ? 12 : 11,
                  fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
                  color: theme.neutralColors.mediumGray,
                }}
              >
                Auto-delete after {RETENTION_POLICIES.DRAFT_VIDEO} days
              </Text>
              {draftDaysRemaining !== null && draftDaysRemaining > 0 && (
                <Text
                  style={{
                    fontSize: isKidsEdition ? 11 : 10,
                    fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
                    color: draftDaysRemaining <= 2 ? theme.semanticColors.error : theme.brandColors.teal,
                  }}
                >
                  Oldest expires: {formatDate(draftExpiry)} ({draftDaysRemaining} days)
                </Text>
              )}
            </View>
          </View>

          {/* Approved Videos */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.md }}>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: theme.brandColors.teal + '20',
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: theme.spacing.sm,
              }}
            >
              <Ionicons name="checkmark-circle-outline" size={20} color={theme.brandColors.teal} />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: isKidsEdition ? 14 : 12,
                  fontFamily: isKidsEdition ? 'Nunito_SemiBold' : 'Montserrat_SemiBold',
                  color: theme.neutralColors.dark,
                }}
              >
                Approved Videos ({stats.approvedVideos})
              </Text>
              <Text
                style={{
                  fontSize: isKidsEdition ? 12 : 11,
                  fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
                  color: theme.neutralColors.mediumGray,
                }}
              >
                Auto-delete after {RETENTION_POLICIES.APPROVED_VIDEO} days
              </Text>
              {approvedDaysRemaining !== null && approvedDaysRemaining > 0 && (
                <Text
                  style={{
                    fontSize: isKidsEdition ? 11 : 10,
                    fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
                    color: theme.brandColors.teal,
                  }}
                >
                  Oldest expires: {formatDate(approvedExpiry)} ({approvedDaysRemaining} days)
                </Text>
              )}
            </View>
          </View>

          {/* Shared Links */}
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: '#8B5CF6' + '20',
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: theme.spacing.sm,
              }}
            >
              <Ionicons name="link-outline" size={20} color="#8B5CF6" />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: isKidsEdition ? 14 : 12,
                  fontFamily: isKidsEdition ? 'Nunito_SemiBold' : 'Montserrat_SemiBold',
                  color: theme.neutralColors.dark,
                }}
              >
                Shared Video Links
              </Text>
              <Text
                style={{
                  fontSize: isKidsEdition ? 12 : 11,
                  fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
                  color: theme.neutralColors.mediumGray,
                }}
              >
                Expire after 24 hours
              </Text>
            </View>
          </View>
        </View>

        {/* Your Data Section */}
        <Text
          style={{
            fontSize: isKidsEdition ? 16 : 14,
            fontFamily: isKidsEdition ? 'Nunito_Bold' : 'Montserrat_Bold',
            color: theme.neutralColors.dark,
            marginBottom: theme.spacing.sm,
          }}
        >
          Your Data
        </Text>

        <View
          style={{
            backgroundColor: theme.neutralColors.lightGray,
            borderRadius: 12,
            padding: theme.spacing.md,
            marginBottom: theme.spacing.lg,
          }}
        >
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            <View style={{ width: '50%', marginBottom: theme.spacing.md }}>
              <Text style={{ fontSize: 24, fontWeight: '700', color: theme.brandColors.teal }}>
                {stats.totalVideos}
              </Text>
              <Text style={{ fontSize: 12, color: theme.neutralColors.mediumGray }}>
                Total Videos
              </Text>
            </View>
            <View style={{ width: '50%', marginBottom: theme.spacing.md }}>
              <Text style={{ fontSize: 24, fontWeight: '700', color: theme.brandColors.coral }}>
                {stats.totalChildren}
              </Text>
              <Text style={{ fontSize: 12, color: theme.neutralColors.mediumGray }}>
                Child Profiles
              </Text>
            </View>
            <View style={{ width: '50%' }}>
              <Text style={{ fontSize: 24, fontWeight: '700', color: '#8B5CF6' }}>
                {stats.totalEvents}
              </Text>
              <Text style={{ fontSize: 12, color: theme.neutralColors.mediumGray }}>
                Events
              </Text>
            </View>
            <View style={{ width: '50%' }}>
              <Text style={{ fontSize: 24, fontWeight: '700', color: theme.neutralColors.dark }}>
                {stats.totalGuests}
              </Text>
              <Text style={{ fontSize: 12, color: theme.neutralColors.mediumGray }}>
                Guests
              </Text>
            </View>
          </View>
        </View>

        {/* COPPA Rights Section */}
        <Text
          style={{
            fontSize: isKidsEdition ? 16 : 14,
            fontFamily: isKidsEdition ? 'Nunito_Bold' : 'Montserrat_Bold',
            color: theme.neutralColors.dark,
            marginBottom: theme.spacing.sm,
          }}
        >
          Your COPPA Rights
        </Text>

        <View
          style={{
            backgroundColor: theme.neutralColors.lightGray,
            borderRadius: 12,
            padding: theme.spacing.md,
            marginBottom: theme.spacing.lg,
          }}
        >
          <TouchableOpacity
            onPress={handleExportData}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: theme.spacing.sm,
              borderBottomWidth: 1,
              borderBottomColor: theme.neutralColors.white,
            }}
          >
            <Ionicons name="download-outline" size={22} color={theme.brandColors.teal} />
            <View style={{ marginLeft: theme.spacing.sm, flex: 1 }}>
              <Text
                style={{
                  fontSize: isKidsEdition ? 14 : 12,
                  fontFamily: isKidsEdition ? 'Nunito_SemiBold' : 'Montserrat_SemiBold',
                  color: theme.neutralColors.dark,
                }}
              >
                Export My Data
              </Text>
              <Text
                style={{
                  fontSize: isKidsEdition ? 11 : 10,
                  color: theme.neutralColors.mediumGray,
                }}
              >
                Download a copy of all your data
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.neutralColors.gray} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              setRequestType('access');
              setShowRequestForm(true);
            }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: theme.spacing.sm,
              borderBottomWidth: 1,
              borderBottomColor: theme.neutralColors.white,
            }}
          >
            <Ionicons name="eye-outline" size={22} color={theme.brandColors.teal} />
            <View style={{ marginLeft: theme.spacing.sm, flex: 1 }}>
              <Text
                style={{
                  fontSize: isKidsEdition ? 14 : 12,
                  fontFamily: isKidsEdition ? 'Nunito_SemiBold' : 'Montserrat_SemiBold',
                  color: theme.neutralColors.dark,
                }}
              >
                Request Data Access
              </Text>
              <Text
                style={{
                  fontSize: isKidsEdition ? 11 : 10,
                  color: theme.neutralColors.mediumGray,
                }}
              >
                Request details about collected data
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.neutralColors.gray} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              setRequestType('correct');
              setShowRequestForm(true);
            }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: theme.spacing.sm,
              borderBottomWidth: 1,
              borderBottomColor: theme.neutralColors.white,
            }}
          >
            <Ionicons name="create-outline" size={22} color={theme.brandColors.coral} />
            <View style={{ marginLeft: theme.spacing.sm, flex: 1 }}>
              <Text
                style={{
                  fontSize: isKidsEdition ? 14 : 12,
                  fontFamily: isKidsEdition ? 'Nunito_SemiBold' : 'Montserrat_SemiBold',
                  color: theme.neutralColors.dark,
                }}
              >
                Request Data Correction
              </Text>
              <Text
                style={{
                  fontSize: isKidsEdition ? 11 : 10,
                  color: theme.neutralColors.mediumGray,
                }}
              >
                Correct inaccurate information
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.neutralColors.gray} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              setRequestType('delete');
              setShowRequestForm(true);
            }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: theme.spacing.sm,
            }}
          >
            <Ionicons name="trash-outline" size={22} color={theme.semanticColors.error} />
            <View style={{ marginLeft: theme.spacing.sm, flex: 1 }}>
              <Text
                style={{
                  fontSize: isKidsEdition ? 14 : 12,
                  fontFamily: isKidsEdition ? 'Nunito_SemiBold' : 'Montserrat_SemiBold',
                  color: theme.neutralColors.dark,
                }}
              >
                Request Data Deletion
              </Text>
              <Text
                style={{
                  fontSize: isKidsEdition ? 11 : 10,
                  color: theme.neutralColors.mediumGray,
                }}
              >
                Request removal of specific data
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.neutralColors.gray} />
          </TouchableOpacity>
        </View>

        {/* Request Form */}
        {showRequestForm && (
          <View
            style={{
              backgroundColor: theme.neutralColors.white,
              borderRadius: 12,
              padding: theme.spacing.md,
              marginBottom: theme.spacing.lg,
              borderWidth: 1,
              borderColor: theme.brandColors.teal,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.md }}>
              <Text
                style={{
                  fontSize: isKidsEdition ? 16 : 14,
                  fontFamily: isKidsEdition ? 'Nunito_Bold' : 'Montserrat_Bold',
                  color: theme.neutralColors.dark,
                }}
              >
                {requestType === 'access' && 'Data Access Request'}
                {requestType === 'correct' && 'Data Correction Request'}
                {requestType === 'delete' && 'Data Deletion Request'}
              </Text>
              <TouchableOpacity onPress={() => setShowRequestForm(false)}>
                <Ionicons name="close" size={24} color={theme.neutralColors.gray} />
              </TouchableOpacity>
            </View>

            <Text
              style={{
                fontSize: isKidsEdition ? 12 : 11,
                color: theme.neutralColors.mediumGray,
                marginBottom: theme.spacing.sm,
              }}
            >
              Please describe your request in detail:
            </Text>

            <TextInput
              value={requestMessage}
              onChangeText={setRequestMessage}
              placeholder={
                requestType === 'access'
                  ? 'What data would you like to know about?'
                  : requestType === 'correct'
                  ? 'What information needs to be corrected?'
                  : 'What data would you like deleted?'
              }
              placeholderTextColor={theme.neutralColors.gray}
              multiline
              numberOfLines={4}
              style={{
                backgroundColor: theme.neutralColors.lightGray,
                borderRadius: 8,
                padding: theme.spacing.sm,
                fontSize: isKidsEdition ? 14 : 12,
                color: theme.neutralColors.dark,
                minHeight: 100,
                textAlignVertical: 'top',
                marginBottom: theme.spacing.md,
              }}
            />

            <TouchableOpacity
              onPress={handleSubmitRequest}
              disabled={submitting}
              style={{
                backgroundColor: theme.brandColors.teal,
                borderRadius: 8,
                paddingVertical: theme.spacing.sm,
                alignItems: 'center',
              }}
            >
              <Text
                style={{
                  color: '#FFFFFF',
                  fontSize: isKidsEdition ? 14 : 12,
                  fontFamily: isKidsEdition ? 'Nunito_Bold' : 'Montserrat_SemiBold',
                }}
              >
                {submitting ? 'Opening Email...' : 'Submit Request'}
              </Text>
            </TouchableOpacity>

            <Text
              style={{
                fontSize: isKidsEdition ? 10 : 9,
                color: theme.neutralColors.mediumGray,
                textAlign: 'center',
                marginTop: theme.spacing.sm,
              }}
            >
              We respond to all COPPA requests within 48 hours
            </Text>
          </View>
        )}

        {/* Contact Info */}
        <View
          style={{
            backgroundColor: theme.brandColors.teal + '10',
            borderRadius: 12,
            padding: theme.spacing.md,
            marginBottom: theme.spacing.xl,
            borderLeftWidth: 4,
            borderLeftColor: theme.brandColors.teal,
          }}
        >
          <Text
            style={{
              fontSize: isKidsEdition ? 12 : 11,
              fontFamily: isKidsEdition ? 'Nunito_SemiBold' : 'Montserrat_SemiBold',
              color: theme.neutralColors.dark,
              marginBottom: theme.spacing.xs,
            }}
          >
            Questions about your privacy?
          </Text>
          <Text
            style={{
              fontSize: isKidsEdition ? 11 : 10,
              color: theme.neutralColors.mediumGray,
            }}
          >
            Contact us at COPPA@showthx.com
          </Text>
        </View>
      </ScrollView>

      <LoadingSpinner visible={loading} message="Loading..." fullScreen />
    </SafeAreaView>
  );
};

export default PrivacyDashboardScreen;
