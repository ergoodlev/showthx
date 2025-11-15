/**
 * SendToGuestsScreen
 * Share approved thank you videos with guests via email
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useEdition } from '../context/EditionContext';
import { AppBar } from '../components/AppBar';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ThankCastButton } from '../components/ThankCastButton';
import { supabase } from '../supabaseClient';
import { sendVideoToGuests } from '../services/emailService';
import { updateGift } from '../services/databaseService';

export const SendToGuestsScreen = ({ navigation, route }) => {
  const { edition, theme } = useEdition();
  const isKidsEdition = edition === 'kids';
  const giftId = route?.params?.giftId;
  const giftName = route?.params?.giftName;
  const videoUri = route?.params?.videoUri;

  const [loading, setLoading] = useState(false);
  const [guests, setGuests] = useState([]);
  const [selectedGuests, setSelectedGuests] = useState(new Set());
  const [fetchingGuests, setFetchingGuests] = useState(true);

  // Fetch guests for this event on mount
  useEffect(() => {
    const fetchGuests = async () => {
      try {
        setFetchingGuests(true);

        // First, get the gift to find the parent_id
        const { data: giftData, error: giftError } = await supabase
          .from('gifts')
          .select('parent_id')
          .eq('id', giftId)
          .single();

        if (giftError) throw giftError;

        if (!giftData) {
          console.warn('Gift not found');
          setGuests([]);
          setFetchingGuests(false);
          return;
        }

        // Fetch guests for this parent
        const { data: guestData, error: guestError } = await supabase
          .from('guests')
          .select('*')
          .eq('parent_id', giftData.parent_id)
          .order('created_at', { ascending: false });

        if (guestError) throw guestError;

        console.log('✅ Loaded guests for parent:', guestData?.length || 0);
        setGuests(guestData || []);
      } catch (error) {
        console.error('Error fetching guests:', error);
        setGuests([]);
      } finally {
        setFetchingGuests(false);
      }
    };

    fetchGuests();
  }, [giftId]);

  const toggleGuestSelection = (guestId) => {
    const newSelected = new Set(selectedGuests);
    if (newSelected.has(guestId)) {
      newSelected.delete(guestId);
    } else {
      newSelected.add(guestId);
    }
    setSelectedGuests(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedGuests.size === guests.length) {
      setSelectedGuests(new Set());
    } else {
      setSelectedGuests(new Set(guests.map(g => g.id)));
    }
  };

  const handleSendToGuests = async () => {
    if (selectedGuests.size === 0) {
      alert('Please select at least one guest');
      return;
    }

    try {
      setLoading(true);

      const selectedGuestEmails = guests
        .filter(g => selectedGuests.has(g.id))
        .map(g => g.email);

      // Send emails via SendGrid
      const emailResult = await sendVideoToGuests(
        selectedGuestEmails,
        giftName,
        videoUri,
        '30 days'
      );

      if (!emailResult.success) {
        throw new Error(emailResult.error || 'Failed to send emails');
      }

      // Update gift status to 'sent'
      const { error } = await updateGift(giftId, {
        status: 'sent',
        sent_at: new Date().toISOString(),
        sent_to_count: selectedGuests.size,
      });

      if (error) {
        console.error('Error updating gift status:', error);
        throw new Error(error);
      }

      // Navigate to success
      navigation?.navigate('SendSuccess', {
        giftName,
        guestCount: selectedGuests.size,
      });
    } catch (error) {
      console.error('Error sending to guests:', error);
      alert('Failed to send videos. Please try again.');
      setLoading(false);
    }
  };

  const renderGuestCard = ({ item }) => {
    const isSelected = selectedGuests.has(item.id);

    return (
      <TouchableOpacity
        onPress={() => toggleGuestSelection(item.id)}
        style={{
          backgroundColor: isSelected ? theme.brandColors.coral : theme.neutralColors.white,
          borderColor: isSelected ? theme.brandColors.coral : theme.neutralColors.lightGray,
          borderWidth: 2,
          borderRadius: 8,
          padding: theme.spacing.md,
          marginBottom: theme.spacing.sm,
          marginHorizontal: theme.spacing.md,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
          <Ionicons
            name="person-circle"
            size={40}
            color={isSelected ? '#FFFFFF' : theme.brandColors.teal}
          />
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: isKidsEdition ? 14 : 12,
                fontFamily: isKidsEdition ? 'Nunito_Bold' : 'Montserrat_SemiBold',
                color: isSelected ? '#FFFFFF' : theme.neutralColors.dark,
              }}
            >
              {item.name}
            </Text>
            <Text
              style={{
                fontSize: isKidsEdition ? 12 : 10,
                fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
                color: isSelected ? 'rgba(255,255,255,0.8)' : theme.neutralColors.mediumGray,
                marginTop: 2,
              }}
            >
              {item.email}
            </Text>
          </View>
        </View>

        <View
          style={{
            width: 24,
            height: 24,
            borderRadius: 12,
            backgroundColor: isSelected ? '#FFFFFF' : theme.neutralColors.lightGray,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          {isSelected && (
            <Ionicons name="checkmark" size={16} color={theme.brandColors.coral} />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.neutralColors.white }}>
      <AppBar
        title="Share with Guests"
        onBackPress={() => navigation?.goBack()}
        showBack={true}
      />

      <ScrollView style={{ flex: 1 }}>
        {/* Gift Info */}
        <View style={{ marginHorizontal: theme.spacing.md, marginTop: theme.spacing.lg, marginBottom: theme.spacing.lg }}>
          <Text
            style={{
              fontSize: isKidsEdition ? 16 : 14,
              fontFamily: isKidsEdition ? 'Nunito_SemiBold' : 'Montserrat_SemiBold',
              color: theme.neutralColors.mediumGray,
              marginBottom: theme.spacing.sm,
            }}
          >
            Thank you video for
          </Text>
          <Text
            style={{
              fontSize: isKidsEdition ? 24 : 20,
              fontFamily: isKidsEdition ? 'Nunito_Bold' : 'Montserrat_Bold',
              color: theme.neutralColors.dark,
            }}
          >
            {giftName}
          </Text>
        </View>

        {/* Select All Option */}
        <View
          style={{
            backgroundColor: theme.neutralColors.lightGray,
            marginHorizontal: theme.spacing.md,
            marginBottom: theme.spacing.lg,
            borderRadius: 8,
            paddingHorizontal: theme.spacing.md,
            paddingVertical: theme.spacing.sm,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <View>
            <Text
              style={{
                fontSize: isKidsEdition ? 14 : 12,
                fontFamily: isKidsEdition ? 'Nunito_Bold' : 'Montserrat_SemiBold',
                color: theme.neutralColors.dark,
              }}
            >
              Select All Guests
            </Text>
            <Text
              style={{
                fontSize: isKidsEdition ? 12 : 10,
                fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
                color: theme.neutralColors.mediumGray,
              }}
            >
              {selectedGuests.size} of {guests.length} selected
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleSelectAll}
            style={{
              width: 24,
              height: 24,
              borderRadius: 12,
              backgroundColor: selectedGuests.size === guests.length ? theme.brandColors.coral : '#FFFFFF',
              borderWidth: 2,
              borderColor: theme.brandColors.coral,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            {selectedGuests.size === guests.length && (
              <Ionicons name="checkmark" size={16} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>

        {/* Guests List */}
        {fetchingGuests ? (
          <View style={{ paddingVertical: theme.spacing.xl, justifyContent: 'center', alignItems: 'center' }}>
            <LoadingSpinner visible={true} message="Loading guests..." />
          </View>
        ) : guests.length > 0 ? (
          <FlatList
            data={guests}
            renderItem={renderGuestCard}
            keyExtractor={item => item.id}
            scrollEnabled={false}
            contentContainerStyle={{ paddingBottom: theme.spacing.lg }}
          />
        ) : (
          <View style={{ paddingVertical: theme.spacing.xl, justifyContent: 'center', alignItems: 'center' }}>
            <Ionicons name="people" size={40} color={theme.neutralColors.lightGray} />
            <Text
              style={{
                fontSize: isKidsEdition ? 14 : 12,
                fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
                color: theme.neutralColors.mediumGray,
                marginTop: theme.spacing.md,
              }}
            >
              No guests added yet. Add guests from the event page.
            </Text>
          </View>
        )}

        {/* Info Box */}
        {guests.length > 0 && (
          <View
            style={{
              marginHorizontal: theme.spacing.md,
              marginBottom: theme.spacing.lg,
              backgroundColor: 'rgba(0, 166, 153, 0.1)',
              borderRadius: 8,
              padding: theme.spacing.md,
              flexDirection: 'row',
              gap: theme.spacing.sm,
            }}
          >
            <Ionicons name="mail" size={20} color={theme.brandColors.teal} />
            <Text
              style={{
                fontSize: isKidsEdition ? 12 : 11,
                fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
                color: theme.neutralColors.mediumGray,
                flex: 1,
              }}
            >
              Each guest will receive an email with a link to watch the thank you video.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Action Buttons */}
      {guests.length > 0 && (
        <View
          style={{
            backgroundColor: theme.neutralColors.white,
            paddingVertical: theme.spacing.lg,
            paddingHorizontal: theme.spacing.md,
            borderTopWidth: 1,
            borderTopColor: theme.neutralColors.lightGray,
          }}
        >
          <ThankCastButton
            title={`Send to ${selectedGuests.size} Guest${selectedGuests.size !== 1 ? 's' : ''}`}
            onPress={handleSendToGuests}
            loading={loading}
            disabled={loading || selectedGuests.size === 0}
            style={{ marginBottom: theme.spacing.md }}
          />
          <TouchableOpacity
            onPress={() => navigation?.goBack()}
            style={{
              paddingVertical: theme.spacing.md,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Text
              style={{
                fontSize: isKidsEdition ? 14 : 12,
                fontFamily: isKidsEdition ? 'Nunito_SemiBold' : 'Montserrat_SemiBold',
                color: theme.brandColors.teal,
              }}
            >
              Back
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <LoadingSpinner visible={loading} message="Sending videos..." fullScreen />
    </SafeAreaView>
  );
};

export default SendToGuestsScreen;
