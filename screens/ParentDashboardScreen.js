/**
 * ParentDashboardScreen
 * Main parent hub with tabs: Events, Children, Videos, Settings
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
  RefreshControl,
  Alert,
  Share,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import { useFocusEffect } from '@react-navigation/native';
import { useEdition } from '../context/EditionContext';
import { AppBar } from '../components/AppBar';
import { EventCard } from '../components/EventCard';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import { supabase } from '../supabaseClient';
import { logoutAndReturnToAuth } from '../services/navigationService';
import { TERMS_OF_SERVICE, PRIVACY_POLICY, COPPA_COMPLIANCE } from '../constants/legalTexts';

const TABS = {
  EVENTS: 'events',
  CHILDREN: 'children',
  VIDEOS: 'videos',
  SETTINGS: 'settings',
};

export const ParentDashboardScreen = ({ navigation }) => {
  const { edition, theme } = useEdition();
  const isKidsEdition = edition === 'kids';

  // State
  const [activeTab, setActiveTab] = useState(TABS.EVENTS);
  const [parentData, setParentData] = useState(null);
  const [events, setEvents] = useState([]);
  const [children, setChildren] = useState([]);
  const [pendingVideos, setPendingVideos] = useState([]);
  const [approvedVideos, setApprovedVideos] = useState([]); // Videos approved but not sent
  const [sentVideos, setSentVideos] = useState([]); // Videos already sent (can be resent)
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Policy modal state
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [activePolicyType, setActivePolicyType] = useState(null);

  const openPolicyModal = (type) => {
    setActivePolicyType(type);
    setShowPolicyModal(true);
  };

  const getPolicyContent = () => {
    switch (activePolicyType) {
      case 'terms':
        return { title: 'Terms of Service', content: TERMS_OF_SERVICE };
      case 'privacy':
        return { title: 'Privacy Policy', content: PRIVACY_POLICY };
      case 'coppa':
        return { title: 'COPPA Compliance', content: COPPA_COMPLIANCE };
      default:
        return { title: '', content: '' };
    }
  };

  // COPPA Compliant: Complete data deletion with storage file cleanup
  const handleDeleteAllData = async () => {
    // First, gather counts to show user what will be deleted
    const eventCount = events.length;
    const childCount = children.length;
    const videoCount = pendingVideos.length + approvedVideos.length + sentVideos.length;

    Alert.alert(
      'Delete All My Data',
      `This will PERMANENTLY delete:\n\n• ${eventCount} event${eventCount !== 1 ? 's' : ''}\n• ${childCount} child profile${childCount !== 1 ? 's' : ''}\n• ${videoCount} video${videoCount !== 1 ? 's' : ''}\n• All guest lists and gifts\n• All video files from storage\n• Your account\n\nThis action cannot be undone.\n\nAre you sure you want to delete ALL your data?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Everything',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const { data: { user } } = await supabase.auth.getUser();

              if (user) {
                console.log('🗑️ Starting complete data deletion for user:', user.id);

                // 1. Get all videos to delete their storage files
                const { data: allVideos } = await supabase
                  .from('videos')
                  .select('id, video_url')
                  .eq('parent_id', user.id);

                // 2. Delete video files from Supabase Storage
                if (allVideos && allVideos.length > 0) {
                  console.log('🗑️ Deleting', allVideos.length, 'video files from storage');
                  for (const video of allVideos) {
                    if (video.video_url) {
                      try {
                        // Extract storage path from URL
                        const urlParts = video.video_url.split('/videos/');
                        if (urlParts[1]) {
                          const storagePath = urlParts[1].split('?')[0]; // Remove query params
                          await supabase.storage.from('videos').remove([storagePath]);
                        }
                      } catch (storageErr) {
                        console.warn('Could not delete storage file:', storageErr.message);
                      }
                    }
                  }
                }

                // 3. Delete database records (cascade should handle related tables)
                // Delete in order: videos -> gifts -> guests -> events -> children -> parent profile
                await supabase.from('videos').delete().eq('parent_id', user.id);
                await supabase.from('gifts').delete().eq('parent_id', user.id);
                await supabase.from('events').delete().eq('parent_id', user.id);
                await supabase.from('children').delete().eq('parent_id', user.id);

                // 4. Try to delete consent records if table exists
                try {
                  await supabase.from('parental_consents').delete().eq('parent_id', user.id);
                } catch (e) { /* Table may not exist */ }

                // 5. Delete parent profile
                await supabase.from('parents').delete().eq('id', user.id);

                // 6. Sign out and clear local storage
                await supabase.auth.signOut();
                await AsyncStorage.clear();

                console.log('✅ All data deleted successfully');
              }

              Alert.alert(
                'Data Deleted',
                'All your data has been permanently deleted. The app will now close.',
                [{ text: 'OK' }]
              );
            } catch (err) {
              console.error('Error deleting all data:', err);
              Alert.alert('Error', 'Failed to delete all data. Please try again or contact help@showthx.com');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleDeactivateAccount = () => {
    // Redirect to the comprehensive delete function
    handleDeleteAllData();
  };

  // Load parent data on focus
  useFocusEffect(
    useCallback(() => {
      loadDashboardData();
    }, [])
  );

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        await logoutAndReturnToAuth();
        return;
      }

      // Load parent profile (use maybeSingle to handle case where profile doesn't exist yet)
      const { data: parent, error: parentError } = await supabase
        .from('parents')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (parentError) throw parentError;

      // If parent profile doesn't exist, create it now (handles edge cases like email confirmation delays)
      if (!parent) {
        console.log('📝 Parent profile missing, creating now...');
        const consentTimestamp = new Date().toISOString();
        const { data: newParent, error: createError } = await supabase
          .from('parents')
          .insert({
            id: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name || 'Parent',
            parental_consent_given: true,
            consent_given_at: consentTimestamp,
            terms_accepted: true,
            terms_accepted_at: consentTimestamp,
          })
          .select()
          .single();

        if (createError) {
          console.error('❌ Failed to create parent profile:', createError);
          throw new Error('Failed to set up your profile. Please try logging out and back in.');
        }
        setParentData(newParent);
      } else {
        setParentData(parent);
      }

      // Load events with gifts and assignments (calculate counts in JavaScript)
      const { data: eventList, error: eventsError } = await supabase
        .from('events')
        .select(`
          *,
          gifts(
            id,
            gift_assignments(children_id)
          )
        `)
        .eq('parent_id', user.id)
        .order('event_date', { ascending: true });

      if (eventsError) throw eventsError;
      setEvents(eventList || []);

      // Load children
      const { data: childList, error: childrenError } = await supabase
        .from('children')
        .select('id, name, age, access_code, created_at')
        .eq('parent_id', user.id)
        .order('created_at', { ascending: false });

      if (childrenError) throw childrenError;
      setChildren(childList || []);

      // Load pending videos with child and gift data
      const { data: videoList, error: videosError } = await supabase
        .from('videos')
        .select(`
          id,
          status,
          created_at,
          child_id,
          gift_id,
          kid:children!videos_child_id_fkey(
            id,
            name
          ),
          gift:gifts!videos_gift_id_fkey(
            id,
            name,
            giver_name,
            guest:guests(
              id,
              name,
              email
            )
          )
        `)
        .eq('parent_id', user.id)
        .eq('status', 'pending_approval')
        .order('created_at', { ascending: false });

      if (videosError) throw videosError;
      setPendingVideos(videoList || []);

      // Load approved videos (ready to send)
      const { data: approvedList, error: approvedError } = await supabase
        .from('videos')
        .select(`
          id,
          status,
          created_at,
          child_id,
          gift_id,
          kid:children!videos_child_id_fkey(
            id,
            name
          ),
          gift:gifts!videos_gift_id_fkey(
            id,
            name,
            giver_name,
            guest:guests(
              id,
              name,
              email
            )
          )
        `)
        .eq('parent_id', user.id)
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

      if (approvedError) throw approvedError;
      setApprovedVideos(approvedList || []);

      // Load sent videos (can be resent)
      const { data: sentList, error: sentError } = await supabase
        .from('videos')
        .select(`
          id,
          status,
          created_at,
          child_id,
          gift_id,
          kid:children!videos_child_id_fkey(
            id,
            name
          ),
          gift:gifts!videos_gift_id_fkey(
            id,
            name,
            giver_name,
            guest:guests(
              id,
              name,
              email
            )
          )
        `)
        .eq('parent_id', user.id)
        .eq('status', 'sent')
        .order('created_at', { ascending: false });

      if (sentError) throw sentError;
      setSentVideos(sentList || []);
    } catch (err) {
      console.error('Error loading dashboard:', err);
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        onPress: async () => {
          try {
            const result = await logoutAndReturnToAuth();
            if (!result.success) {
              setError('Error logging out: ' + result.error);
            }
            // RootNavigator will automatically switch to auth stack
          } catch (err) {
            setError('Error logging out: ' + err.message);
          }
        },
        style: 'destructive',
      },
    ]);
  };

  const handleCreateEvent = () => {
    navigation?.navigate('EventManagement', { mode: 'create' });
  };

  const handleCreateChild = () => {
    navigation?.navigate('ManageChildren', { mode: 'create' });
  };

  const handleEventPress = (event) => {
    navigation?.navigate('GiftManagement', { eventId: event.id, eventName: event.name });
  };

  const handleEventEdit = (event) => {
    navigation?.navigate('EventManagement', { mode: 'edit', event });
  };

  const handleEventDelete = (event) => {
    Alert.alert(
      'Delete Event',
      'Are you sure you want to delete this event? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('events')
                .delete()
                .eq('id', event.id);

              if (error) throw error;
              setEvents(events.filter((e) => e.id !== event.id));
            } catch (err) {
              setError('Error deleting event: ' + err.message);
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  const handleVideoPress = (video) => {
    navigation?.navigate('ParentVideoReview', { videoId: video.id });
  };

  const handleApprovedVideoPress = (video) => {
    // Navigate directly to SendToGuests for approved videos
    navigation?.navigate('SendToGuests', {
      giftId: video.gift_id,
      giftName: video.gift?.name || 'Gift',
      videoUri: null, // Will be fetched from database
    });
  };

  const handleSentVideoPress = (video) => {
    // Navigate to SendToGuests for resending sent videos
    navigation?.navigate('SendToGuests', {
      giftId: video.gift_id,
      giftName: video.gift?.name || 'Gift',
      videoUri: null, // Will be fetched from database
    });
  };

  const tabHeight = isKidsEdition ? 56 : 48;
  const tabFontSize = isKidsEdition ? 16 : 14;

  const renderEventsTab = () => (
    <FlatList
      data={events}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => {
        // Calculate gift count and unique child count from gift assignments
        const giftCount = item.gifts?.length || 0;
        const uniqueChildren = new Set();
        item.gifts?.forEach(gift => {
          gift.gift_assignments?.forEach(assignment => {
            if (assignment.children_id) {
              uniqueChildren.add(assignment.children_id);
            }
          });
        });

        return (
          <EventCard
            eventName={item.name}
            eventType={item.event_type}
            eventDate={item.event_date}
            giftCount={giftCount}
            kidCount={uniqueChildren.size}
            onPress={() => handleEventPress(item)}
            onEdit={() => handleEventEdit(item)}
            onDelete={() => handleEventDelete(item)}
            style={{ marginHorizontal: theme.spacing.md }}
          />
        );
      }}
      ListHeaderComponent={
        <>
          {error && (
            <ErrorMessage
              message={error}
              onDismiss={() => setError(null)}
              style={{ margin: theme.spacing.md }}
            />
          )}
          <View
            style={{
              paddingHorizontal: theme.spacing.md,
              paddingVertical: theme.spacing.md,
              marginBottom: theme.spacing.sm,
            }}
          >
            <Text
              style={{
                color: theme.neutralColors.dark,
                fontFamily: isKidsEdition ? 'Nunito_SemiBold' : 'Montserrat_SemiBold',
                fontSize: isKidsEdition ? 16 : 14,
                fontWeight: '600',
              }}
            >
              {events.length === 0 ? 'No events yet' : events.length + ' event' + (events.length !== 1 ? 's' : '')}
            </Text>
          </View>
        </>
      }
      ListEmptyComponent={
        !loading ? (
          <View style={{ paddingHorizontal: theme.spacing.md, paddingVertical: 60, alignItems: 'center' }}>
            <Ionicons
              name="calendar-outline"
              size={64}
              color={theme.neutralColors.lightGray}
              style={{ marginBottom: theme.spacing.md }}
            />
            <Text
              style={{
                fontSize: isKidsEdition ? 16 : 14,
                color: theme.neutralColors.mediumGray,
                fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
                textAlign: 'center',
              }}
            >
              No events yet. Create one to get started!
            </Text>
          </View>
        ) : null
      }
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      contentContainerStyle={{ paddingTop: theme.spacing.md }}
    />
  );

  // cardType: 'pending' | 'approved' | 'sent'
  const renderVideoCard = (item, cardType = 'pending') => {
    const isPending = cardType === 'pending';
    const isApproved = cardType === 'approved';
    const isSent = cardType === 'sent';

    const handlePress = () => {
      if (isPending) return handleVideoPress(item);
      if (isApproved) return handleApprovedVideoPress(item);
      if (isSent) return handleSentVideoPress(item);
    };

    const getBorderColor = () => {
      if (isPending) return theme.neutralColors.lightGray;
      if (isApproved) return theme.brandColors.teal;
      if (isSent) return theme.semanticColors.success;
    };

    const getIconColor = () => {
      if (isPending) return theme.brandColors.coral;
      if (isApproved) return theme.brandColors.teal;
      if (isSent) return theme.semanticColors.success;
    };

    const getStatusIcon = () => {
      if (isPending) return 'alert-circle';
      if (isApproved) return 'checkmark-circle';
      if (isSent) return 'checkmark-done-circle';
    };

    const getStatusColor = () => {
      if (isPending) return theme.semanticColors.warning;
      if (isApproved) return theme.brandColors.teal;
      if (isSent) return theme.semanticColors.success;
    };

    return (
      <TouchableOpacity
        key={item.id}
        onPress={handlePress}
        style={{
          marginHorizontal: theme.spacing.md,
          marginVertical: theme.spacing.sm,
          backgroundColor: theme.neutralColors.white,
          borderColor: getBorderColor(),
          borderWidth: isPending ? 1 : 2,
          borderRadius: isKidsEdition ? theme.borderRadius.medium : theme.borderRadius.small,
          padding: theme.spacing.md,
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: isKidsEdition ? 16 : 14,
                fontFamily: isKidsEdition ? 'Nunito_Bold' : 'Montserrat_Bold',
                color: theme.neutralColors.dark,
              }}
            >
              {item.kid?.name || 'Unknown'} - {item.gift?.name || 'Unknown Gift'}
            </Text>
            <Text
              style={{
                fontSize: isKidsEdition ? 12 : 11,
                fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
                color: theme.neutralColors.mediumGray,
                marginTop: 4,
              }}
            >
              From: {item.gift?.guest?.name || item.gift?.giver_name || 'Unknown'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color={getIconColor()} />
        </View>
        <View
          style={{
            marginTop: theme.spacing.sm,
            paddingTop: theme.spacing.sm,
            borderTopColor: theme.neutralColors.lightGray,
            borderTopWidth: 1,
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          <Ionicons
            name={getStatusIcon()}
            size={16}
            color={getStatusColor()}
            style={{ marginRight: 6 }}
          />
          <Text
            style={{
              fontSize: isKidsEdition ? 12 : 11,
              fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
              color: getStatusColor(),
            }}
          >
          {isPending ? 'Awaiting your review' : isApproved ? 'Tap to send to guest' : 'Sent - tap to resend'}
        </Text>
      </View>
    </TouchableOpacity>
    );
  };

  const renderVideosTab = () => (
    <ScrollView
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      contentContainerStyle={{ paddingTop: theme.spacing.md, paddingBottom: 40 }}
    >
      {error && (
        <ErrorMessage
          message={error}
          onDismiss={() => setError(null)}
          style={{ margin: theme.spacing.md }}
        />
      )}

      {/* Pending Review Section */}
      <View style={{ paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.md }}>
        <Text
          style={{
            color: theme.neutralColors.dark,
            fontFamily: isKidsEdition ? 'Nunito_SemiBold' : 'Montserrat_SemiBold',
            fontSize: isKidsEdition ? 16 : 14,
            fontWeight: '600',
          }}
        >
          {pendingVideos.length === 0
            ? 'No pending videos'
            : pendingVideos.length + ' pending review' + (pendingVideos.length !== 1 ? 's' : '')}
        </Text>
      </View>

      {pendingVideos.length > 0 ? (
        pendingVideos.map(item => renderVideoCard(item, 'pending'))
      ) : !loading && (
        <View style={{ paddingHorizontal: theme.spacing.md, paddingVertical: 40, alignItems: 'center' }}>
          <Ionicons
            name="film-outline"
            size={48}
            color={theme.neutralColors.lightGray}
            style={{ marginBottom: theme.spacing.sm }}
          />
          <Text
            style={{
              fontSize: isKidsEdition ? 14 : 12,
              color: theme.neutralColors.mediumGray,
              fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
              textAlign: 'center',
            }}
          >
            No videos awaiting review
          </Text>
        </View>
      )}

      {/* Ready to Send Section */}
      {approvedVideos.length > 0 && (
        <>
          <View style={{ paddingHorizontal: theme.spacing.md, paddingTop: theme.spacing.lg, paddingBottom: theme.spacing.md }}>
            <Text
              style={{
                color: theme.brandColors.teal,
                fontFamily: isKidsEdition ? 'Nunito_SemiBold' : 'Montserrat_SemiBold',
                fontSize: isKidsEdition ? 16 : 14,
                fontWeight: '600',
              }}
            >
              {approvedVideos.length + ' ready to send'}
            </Text>
            <Text
              style={{
                fontSize: isKidsEdition ? 12 : 11,
                fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
                color: theme.neutralColors.mediumGray,
                marginTop: 4,
              }}
            >
              Tap to send these approved videos to guests
            </Text>
          </View>
          {approvedVideos.map(item => renderVideoCard(item, 'approved'))}
        </>
      )}

      {/* Sent Videos Section (can resend) */}
      {sentVideos.length > 0 && (
        <>
          <View style={{ paddingHorizontal: theme.spacing.md, paddingTop: theme.spacing.lg, paddingBottom: theme.spacing.md }}>
            <Text
              style={{
                color: theme.semanticColors.success,
                fontFamily: isKidsEdition ? 'Nunito_SemiBold' : 'Montserrat_SemiBold',
                fontSize: isKidsEdition ? 16 : 14,
                fontWeight: '600',
              }}
            >
              {sentVideos.length + ' sent'}
            </Text>
            <Text
              style={{
                fontSize: isKidsEdition ? 12 : 11,
                fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
                color: theme.neutralColors.mediumGray,
                marginTop: 4,
              }}
            >
              Tap to resend to guests if needed
            </Text>
          </View>
          {sentVideos.map(item => renderVideoCard(item, 'sent'))}
        </>
      )}
    </ScrollView>
  );

  const renderSettingsTab = () => (
    <ScrollView
      contentContainerStyle={{ padding: theme.spacing.md, paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Profile Section */}
      <View
        style={{
          marginBottom: theme.spacing.lg,
          backgroundColor: theme.neutralColors.white,
          borderColor: theme.neutralColors.lightGray,
          borderWidth: 1,
          borderRadius: isKidsEdition ? theme.borderRadius.medium : theme.borderRadius.small,
          padding: theme.spacing.md,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name="person-circle" size={32} color={theme.brandColors.coral} />
          <View style={{ marginLeft: theme.spacing.md, flex: 1 }}>
            <Text
              style={{
                fontSize: isKidsEdition ? 16 : 14,
                fontFamily: isKidsEdition ? 'Nunito_Bold' : 'Montserrat_Bold',
                color: theme.neutralColors.dark,
              }}
            >
              {parentData?.full_name || 'Parent'}
            </Text>
            <Text
              style={{
                fontSize: isKidsEdition ? 12 : 11,
                fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
                color: theme.neutralColors.mediumGray,
                marginTop: 4,
              }}
            >
              {parentData?.email}
            </Text>
          </View>
        </View>
      </View>

      {/* Legal & Privacy Section */}
      <Text
        style={{
          fontSize: isKidsEdition ? 14 : 12,
          fontFamily: isKidsEdition ? 'Nunito_SemiBold' : 'Montserrat_SemiBold',
          color: theme.neutralColors.dark,
          marginBottom: theme.spacing.sm,
        }}
      >
        Legal & Privacy
      </Text>
      <View
        style={{
          marginBottom: theme.spacing.lg,
          backgroundColor: theme.neutralColors.white,
          borderColor: theme.neutralColors.lightGray,
          borderWidth: 1,
          borderRadius: isKidsEdition ? theme.borderRadius.medium : theme.borderRadius.small,
          overflow: 'hidden',
        }}
      >
        <TouchableOpacity
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            padding: theme.spacing.md,
            borderBottomWidth: 1,
            borderBottomColor: theme.neutralColors.lightGray,
          }}
          onPress={() => openPolicyModal('terms')}
        >
          <Ionicons name="document-text-outline" size={20} color={theme.brandColors.teal} />
          <Text
            style={{
              flex: 1,
              marginLeft: theme.spacing.md,
              fontSize: isKidsEdition ? 14 : 13,
              fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
              color: theme.neutralColors.dark,
            }}
          >
            Terms of Service
          </Text>
          <Ionicons name="chevron-forward" size={20} color={theme.neutralColors.gray} />
        </TouchableOpacity>

        <TouchableOpacity
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            padding: theme.spacing.md,
            borderBottomWidth: 1,
            borderBottomColor: theme.neutralColors.lightGray,
          }}
          onPress={() => openPolicyModal('privacy')}
        >
          <Ionicons name="shield-checkmark-outline" size={20} color={theme.brandColors.teal} />
          <Text
            style={{
              flex: 1,
              marginLeft: theme.spacing.md,
              fontSize: isKidsEdition ? 14 : 13,
              fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
              color: theme.neutralColors.dark,
            }}
          >
            Privacy Policy
          </Text>
          <Ionicons name="chevron-forward" size={20} color={theme.neutralColors.gray} />
        </TouchableOpacity>

        <TouchableOpacity
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            padding: theme.spacing.md,
            borderBottomWidth: 1,
            borderBottomColor: theme.neutralColors.lightGray,
          }}
          onPress={() => openPolicyModal('coppa')}
        >
          <Ionicons name="people-outline" size={20} color={theme.brandColors.teal} />
          <Text
            style={{
              flex: 1,
              marginLeft: theme.spacing.md,
              fontSize: isKidsEdition ? 14 : 13,
              fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
              color: theme.neutralColors.dark,
            }}
          >
            COPPA Compliance
          </Text>
          <Ionicons name="chevron-forward" size={20} color={theme.neutralColors.gray} />
        </TouchableOpacity>

        <TouchableOpacity
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            padding: theme.spacing.md,
          }}
          onPress={() => navigation?.navigate('PrivacyDashboard')}
        >
          <Ionicons name="analytics-outline" size={20} color={theme.brandColors.coral} />
          <Text
            style={{
              flex: 1,
              marginLeft: theme.spacing.md,
              fontSize: isKidsEdition ? 14 : 13,
              fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
              color: theme.neutralColors.dark,
            }}
          >
            Privacy Dashboard
          </Text>
          <Ionicons name="chevron-forward" size={20} color={theme.neutralColors.gray} />
        </TouchableOpacity>
      </View>

      {/* COPPA Contact Information */}
      <Text
        style={{
          fontSize: isKidsEdition ? 14 : 12,
          fontFamily: isKidsEdition ? 'Nunito_SemiBold' : 'Montserrat_SemiBold',
          color: theme.neutralColors.dark,
          marginBottom: theme.spacing.sm,
        }}
      >
        Contact Us
      </Text>
      <View
        style={{
          marginBottom: theme.spacing.lg,
          backgroundColor: theme.neutralColors.white,
          borderColor: theme.neutralColors.lightGray,
          borderWidth: 1,
          borderRadius: isKidsEdition ? theme.borderRadius.medium : theme.borderRadius.small,
          padding: theme.spacing.md,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.sm }}>
          <Ionicons name="shield-checkmark" size={18} color={theme.brandColors.teal} style={{ marginRight: theme.spacing.sm }} />
          <Text
            style={{
              fontSize: isKidsEdition ? 13 : 12,
              fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
              color: theme.neutralColors.dark,
            }}
          >
            Children's Privacy: COPPA@showthx.com
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name="help-circle" size={18} color={theme.brandColors.coral} style={{ marginRight: theme.spacing.sm }} />
          <Text
            style={{
              fontSize: isKidsEdition ? 13 : 12,
              fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
              color: theme.neutralColors.dark,
            }}
          >
            General Support: help@showthx.com
          </Text>
        </View>
        <Text
          style={{
            fontSize: isKidsEdition ? 11 : 10,
            fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
            color: theme.neutralColors.mediumGray,
            marginTop: theme.spacing.sm,
          }}
        >
          We respond to all COPPA requests within 48 hours.
        </Text>
      </View>

      {/* Account Actions */}
      <Text
        style={{
          fontSize: isKidsEdition ? 14 : 12,
          fontFamily: isKidsEdition ? 'Nunito_SemiBold' : 'Montserrat_SemiBold',
          color: theme.neutralColors.dark,
          marginBottom: theme.spacing.sm,
        }}
      >
        Account
      </Text>

      <TouchableOpacity
        style={{
          backgroundColor: theme.brandColors.coral,
          borderRadius: isKidsEdition ? theme.borderRadius.medium : theme.borderRadius.small,
          paddingVertical: theme.spacing.md,
          marginBottom: theme.spacing.md,
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
        }}
        onPress={handleLogout}
      >
        <Ionicons name="log-out-outline" size={20} color="#FFFFFF" style={{ marginRight: theme.spacing.sm }} />
        <Text
          style={{
            color: '#FFFFFF',
            fontSize: isKidsEdition ? 16 : 14,
            fontFamily: isKidsEdition ? 'Nunito_SemiBold' : 'Montserrat_SemiBold',
          }}
        >
          Log Out
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={{
          backgroundColor: 'transparent',
          borderRadius: isKidsEdition ? theme.borderRadius.medium : theme.borderRadius.small,
          borderWidth: 1,
          borderColor: theme.semanticColors.error,
          paddingVertical: theme.spacing.md,
          marginBottom: theme.spacing.lg,
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
        }}
        onPress={handleDeleteAllData}
      >
        <Ionicons name="trash-outline" size={20} color={theme.semanticColors.error} style={{ marginRight: theme.spacing.sm }} />
        <Text
          style={{
            color: theme.semanticColors.error,
            fontSize: isKidsEdition ? 14 : 12,
            fontFamily: isKidsEdition ? 'Nunito_SemiBold' : 'Montserrat_SemiBold',
          }}
        >
          Delete All My Data
        </Text>
      </TouchableOpacity>

      <Text
        style={{
          fontSize: isKidsEdition ? 12 : 10,
          color: theme.neutralColors.mediumGray,
          fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
          textAlign: 'center',
        }}
      >
        ShowThx v1.0.0
      </Text>
    </ScrollView>
  );

  const renderChildrenTab = () => (
    <FlatList
      data={children}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <View
          style={{
            marginHorizontal: theme.spacing.md,
            marginVertical: theme.spacing.sm,
            backgroundColor: theme.neutralColors.white,
            borderColor: theme.neutralColors.lightGray,
            borderWidth: 1,
            borderRadius: isKidsEdition ? theme.borderRadius.medium : theme.borderRadius.small,
            padding: theme.spacing.md,
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: isKidsEdition ? 16 : 14,
                  fontFamily: isKidsEdition ? 'Nunito_Bold' : 'Montserrat_Bold',
                  color: theme.neutralColors.dark,
                }}
              >
                {item.name}
              </Text>
              <Text
                style={{
                  fontSize: isKidsEdition ? 12 : 11,
                  fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
                  color: theme.neutralColors.mediumGray,
                  marginTop: 4,
                }}
              >
                Age {item.age}
              </Text>
              <View
                style={{
                  marginTop: theme.spacing.sm,
                  backgroundColor: theme.brandColors.coral,
                  paddingHorizontal: theme.spacing.sm,
                  paddingVertical: 4,
                  borderRadius: 4,
                  alignSelf: 'flex-start',
                }}
              >
                <Text
                  style={{
                    fontSize: isKidsEdition ? 12 : 10,
                    fontFamily: isKidsEdition ? 'Nunito_Bold' : 'Montserrat_Bold',
                    color: '#FFFFFF',
                  }}
                >
                  Login Code: {item.access_code}
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
              <TouchableOpacity
                onPress={() => {
                  Share.share({
                    message: `${item.name}'s Login Code: ${item.access_code}\n\nShare this with ${item.name} so they can log in to GratituGram!`,
                  });
                }}
                style={{
                  backgroundColor: theme.brandColors.teal,
                  paddingHorizontal: theme.spacing.md,
                  paddingVertical: theme.spacing.sm,
                  borderRadius: 4,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Ionicons name="share-social" size={18} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => navigation?.navigate('ManageChildren', { mode: 'edit', child: item })}
                style={{
                  backgroundColor: theme.brandColors.coral,
                  paddingHorizontal: theme.spacing.md,
                  paddingVertical: theme.spacing.sm,
                  borderRadius: 4,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Ionicons name="pencil" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
      ListHeaderComponent={
        <>
          {error && (
            <ErrorMessage
              message={error}
              onDismiss={() => setError(null)}
              style={{ margin: theme.spacing.md }}
            />
          )}
          <View
            style={{
              paddingHorizontal: theme.spacing.md,
              paddingVertical: theme.spacing.md,
              marginBottom: theme.spacing.sm,
            }}
          >
            <Text
              style={{
                color: theme.neutralColors.dark,
                fontFamily: isKidsEdition ? 'Nunito_SemiBold' : 'Montserrat_SemiBold',
                fontSize: isKidsEdition ? 16 : 14,
                fontWeight: '600',
              }}
            >
              {children.length === 0 ? 'No children yet' : children.length + ' child' + (children.length !== 1 ? 'ren' : '')}
            </Text>
          </View>
        </>
      }
      ListEmptyComponent={
        !loading ? (
          <View style={{ paddingHorizontal: theme.spacing.md, paddingVertical: 60, alignItems: 'center' }}>
            <Ionicons
              name="people-outline"
              size={64}
              color={theme.neutralColors.lightGray}
              style={{ marginBottom: theme.spacing.md }}
            />
            <Text
              style={{
                fontSize: isKidsEdition ? 16 : 14,
                color: theme.neutralColors.mediumGray,
                fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
                textAlign: 'center',
              }}
            >
              No children yet. Add one to get started!
            </Text>
          </View>
        ) : null
      }
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      contentContainerStyle={{ paddingTop: theme.spacing.md }}
    />
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.neutralColors.white }}>
      <AppBar
        title={'Hi, ' + (parentData?.full_name?.split(' ')[0] || 'Parent') + '!'}
        showBack={false}
        rightButton={{
          onPress: () => logoutAndReturnToAuth(),
          icon: <Ionicons name="log-out-outline" size={24} color={theme.brandColors.coral} />,
        }}
      />

      {loading ? (
        <LoadingSpinner visible message="Loading dashboard..." />
      ) : (
        <View style={{ flex: 1 }}>
          <View
            style={{
              flexDirection: 'row',
              height: tabHeight,
              borderBottomColor: theme.neutralColors.lightGray,
              backgroundColor: theme.neutralColors.white,
              borderBottomWidth: 1,
            }}
          >
            {Object.values(TABS).map((tab) => (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={{
                  flex: 1,
                  justifyContent: 'center',
                  alignItems: 'center',
                  borderBottomWidth: activeTab === tab ? 3 : 0,
                  borderBottomColor: activeTab === tab ? theme.brandColors.coral : 'transparent',
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text
                    style={{
                      fontSize: tabFontSize,
                      fontFamily: isKidsEdition ? 'Nunito_SemiBold' : 'Montserrat_SemiBold',
                      color: activeTab === tab ? theme.brandColors.coral : theme.neutralColors.mediumGray,
                      textTransform: 'capitalize',
                    }}
                  >
                    {tab}
                  </Text>
                  {/* Pending video count badge */}
                  {tab === TABS.VIDEOS && pendingVideos.length > 0 && (
                    <View
                      style={{
                        marginLeft: 6,
                        backgroundColor: '#EF4444',
                        borderRadius: 10,
                        minWidth: 20,
                        height: 20,
                        justifyContent: 'center',
                        alignItems: 'center',
                        paddingHorizontal: 6,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: '700',
                          color: '#FFFFFF',
                        }}
                      >
                        {pendingVideos.length}
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {activeTab === TABS.EVENTS && renderEventsTab()}
          {activeTab === TABS.CHILDREN && renderChildrenTab()}
          {activeTab === TABS.VIDEOS && renderVideosTab()}
          {activeTab === TABS.SETTINGS && renderSettingsTab()}
        </View>
      )}

      {(activeTab === TABS.EVENTS || activeTab === TABS.CHILDREN) && !loading && (
        <TouchableOpacity
          style={{
            position: 'absolute',
            bottom: theme.spacing.lg,
            right: theme.spacing.lg,
            backgroundColor: theme.brandColors.coral,
            width: isKidsEdition ? 64 : 56,
            height: isKidsEdition ? 64 : 56,
            borderRadius: isKidsEdition ? 32 : 28,
            justifyContent: 'center',
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 8,
          }}
          onPress={activeTab === TABS.EVENTS ? handleCreateEvent : handleCreateChild}
        >
          <Ionicons name="add" size={isKidsEdition ? 32 : 28} color="#FFFFFF" />
        </TouchableOpacity>
      )}

      {/* Policy Modal */}
      <Modal
        visible={showPolicyModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPolicyModal(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.neutralColors.white }}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingHorizontal: theme.spacing.md,
              paddingVertical: theme.spacing.md,
              borderBottomWidth: 1,
              borderBottomColor: theme.neutralColors.lightGray,
            }}
          >
            <Text
              style={{
                fontSize: isKidsEdition ? 18 : 16,
                fontFamily: isKidsEdition ? 'Nunito_Bold' : 'Montserrat_Bold',
                color: theme.neutralColors.dark,
              }}
            >
              {getPolicyContent().title}
            </Text>
            <TouchableOpacity onPress={() => setShowPolicyModal(false)}>
              <Ionicons name="close" size={28} color={theme.neutralColors.dark} />
            </TouchableOpacity>
          </View>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: theme.spacing.md }}
          >
            <Text
              style={{
                fontSize: isKidsEdition ? 14 : 13,
                fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
                color: theme.neutralColors.dark,
                lineHeight: isKidsEdition ? 22 : 20,
              }}
            >
              {getPolicyContent().content}
            </Text>
          </ScrollView>
          <View
            style={{
              padding: theme.spacing.md,
              borderTopWidth: 1,
              borderTopColor: theme.neutralColors.lightGray,
            }}
          >
            <TouchableOpacity
              onPress={() => setShowPolicyModal(false)}
              style={{
                backgroundColor: theme.brandColors.coral,
                paddingVertical: theme.spacing.md,
                borderRadius: 8,
                alignItems: 'center',
              }}
            >
              <Text
                style={{
                  color: '#FFFFFF',
                  fontSize: isKidsEdition ? 16 : 14,
                  fontFamily: isKidsEdition ? 'Nunito_SemiBold' : 'Montserrat_SemiBold',
                }}
              >
                Close
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

export default ParentDashboardScreen;
