/**
 * KidPendingGiftsScreen
 * Shows kid their gifts and video recording status
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  Text,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useCameraPermissions } from 'expo-camera';
import { useEdition } from '../context/EditionContext';
import { GiftCard } from '../components/GiftCard';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import { supabase } from '../supabaseClient';
import { logoutAndReturnToAuth } from '../services/navigationService';
import { getFrameForGift } from '../services/frameTemplateService';

export const KidPendingGiftsScreen = ({ navigation }) => {
  const { edition, theme } = useEdition();
  const isKidsEdition = edition === 'kids';

  // Camera permission
  const [permission, requestPermission] = useCameraPermissions();

  // State
  const [kidName, setKidName] = useState('');
  const [kidId, setKidId] = useState('');
  const [gifts, setGifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Log permission state changes
  useEffect(() => {
    console.log('🔐 PERMISSION STATE CHANGED:', {
      granted: permission?.granted,
      canAskAgain: permission?.canAskAgain,
      status: permission?.status,
      expires: permission?.expires,
      fullObject: JSON.stringify(permission)
    });
  }, [permission]);

  // Load gifts on focus
  useFocusEffect(
    useCallback(() => {
      loadKidData();
    }, [])
  );

  const loadKidData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get kid session from storage
      const storedKidId = await AsyncStorage.getItem('kidSessionId');
      const storedKidName = await AsyncStorage.getItem('kidName');

      if (!storedKidId) {
        await logoutAndReturnToAuth();
        return;
      }

      setKidId(storedKidId);
      setKidName(storedKidName || 'Friend');

      // Load assigned gifts (with gift details)
      console.log('🎁 Loading gifts for child:', storedKidId);

      const { data: giftsData, error: giftsError } = await supabase
        .from('gift_assignments')
        .select(
          `
          gift_id,
          gift:gifts(
            id,
            name,
            giver_name,
            event_id,
            event:events(name)
          )
        `
        )
        .eq('children_id', storedKidId);

      console.log('📦 Gift assignments query result:', { giftsData, giftsError });

      if (giftsError) throw giftsError;

      // Load videos for this kid (to match with gifts) - include metadata for feedback
      console.log('🎬 Loading videos for child:', storedKidId);

      const { data: videosData, error: videosError } = await supabase
        .from('videos')
        .select('gift_id, id, status, recorded_at, metadata')
        .eq('child_id', storedKidId);

      console.log('📹 Videos query result:', { videosData, videosError });

      if (videosError) throw videosError;

      // Create a map of gift_id -> video for quick lookup (prefer most recent)
      const videosByGiftId = {};
      videosData?.forEach((video) => {
        // Always use the most recent video for each gift
        if (!videosByGiftId[video.gift_id] ||
            new Date(video.recorded_at) > new Date(videosByGiftId[video.gift_id].recorded_at)) {
          videosByGiftId[video.gift_id] = video;
        }
      });

      // Transform data
      const transformedGifts = giftsData
        ?.map((assignment) => {
          const video = videosByGiftId[assignment.gift.id];
          return {
            id: assignment.gift.id,
            name: assignment.gift.name,
            giver_name: assignment.gift.giver_name,
            event_name: assignment.gift.event?.name,
            event_id: assignment.gift.event_id, // CRITICAL: Include event_id for frame lookup
            status: video?.status || 'pending',
            has_video: !!video,
            video_id: video?.id,
            // Include parent feedback for needs_rerecord status
            parent_feedback: video?.metadata?.parent_feedback || null,
          };
        })
        // Filter out placeholder gifts but show ALL video statuses (including approved/sent)
        .filter((gift) => {
          // Filter out placeholder gifts for guests who didn't bring anything
          // These have the pattern "Gift from {guest name}" or are empty/null
          const isPlaceholderGift =
            !gift.name ||
            gift.name.trim() === '' ||
            gift.name.toLowerCase().startsWith('gift from') ||
            gift.name.toLowerCase().includes('(no gift)') ||
            gift.name.toLowerCase() === 'no gift';

          if (isPlaceholderGift) {
            console.log('🚫 Filtering out placeholder gift:', gift.name, 'from', gift.giver_name);
            return false;
          }

          return true;
        })
        .sort((a, b) => {
          // Priority: needs_rerecord (urgent) > pending > pending_approval > approved > sent
          const statusPriority = {
            needs_rerecord: 0, // Highest priority - parent requested changes
            pending: 1,
            pending_approval: 2,
            approved: 3,
            sent: 4,
          };
          const aPriority = statusPriority[a.status] ?? 5;
          const bPriority = statusPriority[b.status] ?? 5;
          return aPriority - bPriority;
        });

      const totalBeforeFilter = giftsData?.length || 0;
      const totalAfterFilter = transformedGifts?.length || 0;
      console.log(`📊 Kid gifts: ${totalBeforeFilter} total assignments, ${totalAfterFilter} after filtering`);

      setGifts(transformedGifts || []);
    } catch (err) {
      console.error('Error loading gifts:', err);
      setError(err.message || 'Failed to load gifts');
    } finally {
      setLoading(false);
    }
  };

  const getGiftStatus = (gift) => {
    if (!gift.has_video) return 'pending';
    if (gift.status === 'needs_rerecord') return 'needs_rerecord';
    if (gift.status === 'pending_approval') return 'recorded';
    if (gift.status === 'approved') return 'approved';
    if (gift.status === 'sent') return 'sent';
    return 'pending';
  };

  const getStatusMessage = (status) => {
    switch (status) {
      case 'pending':
        return 'Record Thank You';
      case 'needs_rerecord':
        return 'Re-record Needed';
      case 'recorded':
        return 'Parent Reviewing';
      case 'approved':
        return 'Approved';
      case 'sent':
        return 'Sent to Guests';
      default:
        return 'Pending';
    }
  };

  const handleRecordGift = async (gift) => {
    console.log('🎬 handleRecordGift called for:', gift.name);
    console.log('🔐 Current permission state:', {
      granted: permission?.granted,
      canAskAgain: permission?.canAskAgain,
      status: permission?.status,
      expires: permission?.expires
    });

    // Request permission BEFORE navigating to camera view
    // This is the ShowThx pattern: permission first, then camera view
    if (!permission?.granted) {
      console.log('📋 Permission NOT granted, requesting now...');
      console.log('   canAskAgain:', permission?.canAskAgain);

      const result = await requestPermission();

      console.log('📋 Permission request result:', {
        granted: result?.granted,
        canAskAgain: result?.canAskAgain,
        status: result?.status,
        expires: result?.expires,
        fullObject: JSON.stringify(result)
      });

      if (!result?.granted) {
        console.error('❌ Permission denied');
        if (!result?.canAskAgain) {
          console.error('   iOS will not ask again - user must enable in Settings');
        }
        Alert.alert(
          'Camera Permission Required',
          'Please allow camera access to record videos.'
        );
        return;
      }
      console.log('✅ Permission granted after request');
    } else {
      console.log('✅ Permission already granted');
      console.log('   granted:', permission.granted);
      console.log('   canAskAgain:', permission.canAskAgain);
      console.log('   status:', permission.status);
    }

    // Load frame template for this gift (event-level assignment)
    console.log('🖼️  Loading frame template for gift:', gift.id);
    const frameResult = await getFrameForGift(
      gift.id,        // giftId
      kidId,          // childId
      gift.event_id,  // eventId
      null            // guestId (not applicable for kid flow)
    );

    const frameTemplate = frameResult.success ? frameResult.data : null;
    if (frameTemplate) {
      console.log('✅ Frame template loaded:', frameTemplate.name);
    } else {
      console.log('ℹ️  No frame template assigned for this gift');
    }

    // CRITICAL: Wait a bit after permission is granted before navigating
    // This gives the system time to fully set up camera access
    console.log('⏳ Waiting 500ms before navigating to camera view...');
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log('✅ Done waiting, navigating now...');

    // Now navigate to camera view with frame template
    // Camera view will have full permission and hardware access ready
    navigation?.navigate('VideoRecording', {
      giftId: gift.id,
      giftName: gift.name,
      giverName: gift.giver_name,
      frameTemplate,  // Pass frame template with custom_text for this event
    });
  };

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes',
        onPress: async () => {
          await logoutAndReturnToAuth();
        },
        style: 'destructive',
      },
    ]);
  };

  const paddingHorizontal = isKidsEdition ? theme.spacing.lg : theme.spacing.md;
  const headerFontSize = isKidsEdition ? 28 : 24;
  const subtitleFontSize = isKidsEdition ? 18 : 14;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.neutralColors.white }}>
      {/* Header */}
      <View
        style={{
          paddingHorizontal,
          paddingVertical: theme.spacing.md,
          borderBottomWidth: 1,
          borderBottomColor: theme.neutralColors.lightGray,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <View>
          <Text
            style={{
              fontSize: headerFontSize,
              fontFamily: isKidsEdition ? 'Nunito_Bold' : 'Montserrat_Bold',
              color: theme.neutralColors.dark,
              fontWeight: '700',
            }}
          >
            Hi, {kidName}!
          </Text>
          <Text
            style={{
              fontSize: subtitleFontSize,
              fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
              color: theme.neutralColors.mediumGray,
              marginTop: 4,
              fontWeight: '400',
            }}
          >
            Thanks to Give
          </Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={{ padding: 8 }}>
          <Ionicons name="log-out-outline" size={isKidsEdition ? 28 : 24} color={theme.semanticColors.error} />
        </TouchableOpacity>
      </View>

      {/* Content */}
      {loading ? (
        <LoadingSpinner visible message="Loading gifts..." />
      ) : (
        <FlatList
          data={gifts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const giftStatus = getGiftStatus(item);
            return (
              <TouchableOpacity
                style={{
                  marginHorizontal: paddingHorizontal,
                  marginVertical: theme.spacing.sm,
                }}
                onPress={() => {
                  if (giftStatus === 'pending' || giftStatus === 'needs_rerecord') {
                    handleRecordGift(item);
                  } else {
                    // For recorded/approved/sent - tapping card does nothing (use re-record button)
                  }
                }}
              >
                <View
                  style={{
                    backgroundColor: theme.neutralColors.white,
                    borderColor: theme.neutralColors.lightGray,
                    borderWidth: 1,
                    borderRadius: isKidsEdition ? theme.borderRadius.medium : theme.borderRadius.small,
                    padding: theme.spacing.md,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.08,
                    shadowRadius: 4,
                    elevation: 2,
                  }}
                >
                  {/* Gift Name - Large and Bold */}
                  <Text
                    style={{
                      fontSize: isKidsEdition ? 22 : 18,
                      fontFamily: isKidsEdition ? 'Nunito_Bold' : 'Montserrat_Bold',
                      color: theme.neutralColors.dark,
                      fontWeight: '700',
                      marginBottom: 4,
                    }}
                  >
                    {item.name.toUpperCase()}
                  </Text>

                  {/* From */}
                  <Text
                    style={{
                      fontSize: isKidsEdition ? 16 : 13,
                      fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
                      color: theme.neutralColors.mediumGray,
                      marginBottom: theme.spacing.sm,
                      fontWeight: '400',
                    }}
                  >
                    From: {item.giver_name}
                  </Text>

                  {/* Event */}
                  <Text
                    style={{
                      fontSize: isKidsEdition ? 13 : 11,
                      fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
                      color: theme.neutralColors.mediumGray,
                      marginBottom: theme.spacing.md,
                      fontWeight: '400',
                    }}
                  >
                    at {item.event_name}
                  </Text>

                  {/* Parent Feedback - shown when parent requests changes */}
                  {giftStatus === 'needs_rerecord' && item.parent_feedback && (
                    <View
                      style={{
                        backgroundColor: '#FEF3C7',
                        borderWidth: 1,
                        borderColor: '#F59E0B',
                        borderRadius: 8,
                        padding: theme.spacing.sm,
                        marginBottom: theme.spacing.md,
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                        <Ionicons name="chatbubble-outline" size={14} color="#B45309" />
                        <Text
                          style={{
                            fontSize: isKidsEdition ? 12 : 10,
                            fontFamily: isKidsEdition ? 'Nunito_SemiBold' : 'Montserrat_SemiBold',
                            color: '#B45309',
                            marginLeft: 4,
                            fontWeight: '600',
                          }}
                        >
                          Message from Parent:
                        </Text>
                      </View>
                      <Text
                        style={{
                          fontSize: isKidsEdition ? 14 : 12,
                          fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
                          color: '#78350F',
                          fontWeight: '400',
                        }}
                      >
                        {item.parent_feedback}
                      </Text>
                    </View>
                  )}

                  {/* Status Button Row */}
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      paddingTop: theme.spacing.sm,
                      borderTopWidth: 1,
                      borderTopColor: theme.neutralColors.lightGray,
                    }}
                  >
                    {/* Status Indicator */}
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      {giftStatus === 'needs_rerecord' && (
                        <>
                          <Ionicons name="refresh-circle" size={18} color={theme.semanticColors.error} />
                          <Text
                            style={{
                              fontSize: isKidsEdition ? 14 : 12,
                              fontFamily: isKidsEdition ? 'Nunito_SemiBold' : 'Montserrat_SemiBold',
                              color: theme.semanticColors.error,
                              marginLeft: 6,
                              fontWeight: '600',
                            }}
                          >
                            Re-record
                          </Text>
                        </>
                      )}
                      {giftStatus === 'recorded' && (
                        <>
                          <Ionicons name="hourglass" size={18} color={theme.semanticColors.warning} />
                          <Text
                            style={{
                              fontSize: isKidsEdition ? 14 : 12,
                              fontFamily: isKidsEdition ? 'Nunito_SemiBold' : 'Montserrat_SemiBold',
                              color: theme.semanticColors.warning,
                              marginLeft: 6,
                              fontWeight: '600',
                            }}
                          >
                            Reviewing
                          </Text>
                        </>
                      )}
                      {giftStatus === 'approved' && (
                        <>
                          <Ionicons name="checkmark-circle" size={18} color={theme.semanticColors.success} />
                          <Text
                            style={{
                              fontSize: isKidsEdition ? 14 : 12,
                              fontFamily: isKidsEdition ? 'Nunito_SemiBold' : 'Montserrat_SemiBold',
                              color: theme.semanticColors.success,
                              marginLeft: 6,
                              fontWeight: '600',
                            }}
                          >
                            Approved
                          </Text>
                        </>
                      )}
                      {giftStatus === 'sent' && (
                        <>
                          <Ionicons name="checkmark-done" size={18} color={theme.semanticColors.success} />
                          <Text
                            style={{
                              fontSize: isKidsEdition ? 14 : 12,
                              fontFamily: isKidsEdition ? 'Nunito_SemiBold' : 'Montserrat_SemiBold',
                              color: theme.semanticColors.success,
                              marginLeft: 6,
                              fontWeight: '600',
                            }}
                          >
                            Sent
                          </Text>
                        </>
                      )}
                    </View>

                    {/* Rewatch Button - for sent gifts */}
                    {giftStatus === 'sent' && (
                      <TouchableOpacity
                        onPress={() => {
                          // Navigate to video playback to rewatch sent video
                          navigation?.navigate('VideoPlayback', {
                            giftId: item.id,
                            giftName: item.name,
                            videoId: item.video_id,
                            viewOnly: true,
                          });
                        }}
                        style={{
                          backgroundColor: theme.brandColors.teal,
                          paddingHorizontal: theme.spacing.md,
                          paddingVertical: theme.spacing.sm,
                          borderRadius: 6,
                          flexDirection: 'row',
                          alignItems: 'center',
                        }}
                      >
                        <Ionicons name="play-circle" size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
                        <Text
                          style={{
                            color: '#FFFFFF',
                            fontSize: isKidsEdition ? 14 : 12,
                            fontFamily: isKidsEdition ? 'Nunito_SemiBold' : 'Montserrat_SemiBold',
                            fontWeight: '600',
                          }}
                        >
                          Rewatch
                        </Text>
                      </TouchableOpacity>
                    )}

                    {/* Record Button - for pending gifts */}
                    {giftStatus === 'pending' && (
                      <TouchableOpacity
                        onPress={() => handleRecordGift(item)}
                        style={{
                          backgroundColor: theme.brandColors.coral,
                          paddingHorizontal: theme.spacing.md,
                          paddingVertical: theme.spacing.sm,
                          borderRadius: 6,
                        }}
                      >
                        <Text
                          style={{
                            color: '#FFFFFF',
                            fontSize: isKidsEdition ? 14 : 12,
                            fontFamily: isKidsEdition ? 'Nunito_SemiBold' : 'Montserrat_SemiBold',
                            fontWeight: '600',
                          }}
                        >
                          Record
                        </Text>
                      </TouchableOpacity>
                    )}

                    {/* Re-record Button - for needs_rerecord (parent requested changes) */}
                    {giftStatus === 'needs_rerecord' && (
                      <TouchableOpacity
                        onPress={() => handleRecordGift(item)}
                        style={{
                          backgroundColor: theme.semanticColors.error,
                          paddingHorizontal: theme.spacing.md,
                          paddingVertical: theme.spacing.sm,
                          borderRadius: 6,
                        }}
                      >
                        <Text
                          style={{
                            color: '#FFFFFF',
                            fontSize: isKidsEdition ? 14 : 12,
                            fontFamily: isKidsEdition ? 'Nunito_SemiBold' : 'Montserrat_SemiBold',
                            fontWeight: '600',
                          }}
                        >
                          Re-record
                        </Text>
                      </TouchableOpacity>
                    )}

                    {/* Re-record Button - for recorded (pending review) and approved */}
                    {(giftStatus === 'recorded' || giftStatus === 'approved') && (
                      <TouchableOpacity
                        onPress={() => {
                          Alert.alert(
                            'Re-record Video?',
                            'Your current video will be replaced with a new one. This cannot be undone.',
                            [
                              { text: 'Cancel', style: 'cancel' },
                              {
                                text: 'Re-record',
                                style: 'destructive',
                                onPress: () => handleRecordGift(item),
                              },
                            ]
                          );
                        }}
                        style={{
                          backgroundColor: 'transparent',
                          paddingHorizontal: theme.spacing.md,
                          paddingVertical: theme.spacing.sm,
                          borderRadius: 6,
                          borderWidth: 1,
                          borderColor: theme.neutralColors.mediumGray,
                        }}
                      >
                        <Text
                          style={{
                            color: theme.neutralColors.mediumGray,
                            fontSize: isKidsEdition ? 14 : 12,
                            fontFamily: isKidsEdition ? 'Nunito_SemiBold' : 'Montserrat_SemiBold',
                            fontWeight: '600',
                          }}
                        >
                          Re-record
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
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
            </>
          }
          ListEmptyComponent={
            !loading ? (
              <View
                style={{
                  paddingHorizontal,
                  paddingVertical: 60,
                  alignItems: 'center',
                }}
              >
                <Ionicons
                  name="gift-outline"
                  size={64}
                  color={theme.neutralColors.lightGray}
                  style={{ marginBottom: theme.spacing.md }}
                />
                <Text
                  style={{
                    fontSize: isKidsEdition ? 18 : 14,
                    color: theme.neutralColors.mediumGray,
                    fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
                    textAlign: 'center',
                    fontWeight: '400',
                  }}
                >
                  All done! No gifts to record yet.
                </Text>
              </View>
            ) : null
          }
          contentContainerStyle={{ paddingTop: theme.spacing.md, paddingBottom: theme.spacing.lg }}
        />
      )}
    </SafeAreaView>
  );
};

export default KidPendingGiftsScreen;
