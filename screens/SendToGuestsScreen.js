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
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useEdition } from '../context/EditionContext';
import { AppBar } from '../components/AppBar';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ThankCastButton } from '../components/ThankCastButton';
import { supabase } from '../supabaseClient';
import { sendVideoToGuests, getDefaultVideoEmailTemplate } from '../services/emailService';
import { updateGift } from '../services/databaseService';
import { sendVideoViaSMS, checkSMSAvailable } from '../services/smsService';

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
  const [sendMethod, setSendMethod] = useState('email'); // 'email' or 'sms'
  const [smsAvailable, setSmsAvailable] = useState(false);

  // Email customization state
  const [showEmailCustomizer, setShowEmailCustomizer] = useState(false);
  const [emailTemplate, setEmailTemplate] = useState(() => getDefaultVideoEmailTemplate(giftName));
  const [childName, setChildName] = useState('');

  // Check SMS availability on mount
  useEffect(() => {
    const checkSms = async () => {
      const available = await checkSMSAvailable();
      setSmsAvailable(available);
    };
    checkSms();
  }, []);

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

      const selectedGuestData = guests.filter(g => selectedGuests.has(g.id));

      if (sendMethod === 'email') {
        // Send via email with custom template
        const selectedGuestEmails = selectedGuestData.map(g => g.email);

        const emailResult = await sendVideoToGuests(
          selectedGuestEmails,
          giftName,
          videoUri,
          '30 days',
          emailTemplate // Pass custom template
        );

        if (!emailResult.success) {
          throw new Error(emailResult.error || 'Failed to send emails');
        }
      } else if (sendMethod === 'sms') {
        // Send via SMS - opens native SMS composer
        const phoneNumbers = selectedGuestData
          .filter(g => g.phone)
          .map(g => g.phone);

        if (phoneNumbers.length === 0) {
          alert('Selected guests do not have phone numbers. Please use email instead.');
          setLoading(false);
          return;
        }

        const smsResult = await sendVideoViaSMS(
          phoneNumbers,
          giftName,
          videoUri
        );

        if (!smsResult.success && smsResult.error !== 'Message was cancelled') {
          throw new Error(smsResult.error || 'Failed to open SMS');
        }

        // If cancelled, don't proceed
        if (smsResult.error === 'Message was cancelled') {
          setLoading(false);
          return;
        }
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
        sendMethod,
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

        {/* Send Method Selector */}
        <View
          style={{
            marginHorizontal: theme.spacing.md,
            marginBottom: theme.spacing.lg,
          }}
        >
          <Text
            style={{
              fontSize: isKidsEdition ? 14 : 12,
              fontFamily: isKidsEdition ? 'Nunito_SemiBold' : 'Montserrat_SemiBold',
              color: theme.neutralColors.dark,
              marginBottom: theme.spacing.sm,
            }}
          >
            Send via
          </Text>
          <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
            <TouchableOpacity
              onPress={() => setSendMethod('email')}
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                paddingVertical: theme.spacing.md,
                borderRadius: 8,
                backgroundColor: sendMethod === 'email' ? theme.brandColors.coral : theme.neutralColors.lightGray,
                borderWidth: 2,
                borderColor: sendMethod === 'email' ? theme.brandColors.coral : 'transparent',
              }}
            >
              <Ionicons
                name="mail"
                size={20}
                color={sendMethod === 'email' ? '#FFFFFF' : theme.neutralColors.mediumGray}
              />
              <Text
                style={{
                  fontSize: isKidsEdition ? 14 : 12,
                  fontFamily: isKidsEdition ? 'Nunito_Bold' : 'Montserrat_SemiBold',
                  color: sendMethod === 'email' ? '#FFFFFF' : theme.neutralColors.dark,
                }}
              >
                Email
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => smsAvailable && setSendMethod('sms')}
              disabled={!smsAvailable}
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                paddingVertical: theme.spacing.md,
                borderRadius: 8,
                backgroundColor: sendMethod === 'sms' ? theme.brandColors.teal : theme.neutralColors.lightGray,
                borderWidth: 2,
                borderColor: sendMethod === 'sms' ? theme.brandColors.teal : 'transparent',
                opacity: smsAvailable ? 1 : 0.5,
              }}
            >
              <Ionicons
                name="chatbubble"
                size={20}
                color={sendMethod === 'sms' ? '#FFFFFF' : theme.neutralColors.mediumGray}
              />
              <Text
                style={{
                  fontSize: isKidsEdition ? 14 : 12,
                  fontFamily: isKidsEdition ? 'Nunito_Bold' : 'Montserrat_SemiBold',
                  color: sendMethod === 'sms' ? '#FFFFFF' : theme.neutralColors.dark,
                }}
              >
                SMS
              </Text>
            </TouchableOpacity>
          </View>
          {!smsAvailable && (
            <Text
              style={{
                fontSize: 10,
                color: theme.neutralColors.mediumGray,
                marginTop: 4,
                fontStyle: 'italic',
              }}
            >
              SMS not available on this device
            </Text>
          )}

          {/* Customize Email Button */}
          {sendMethod === 'email' && (
            <TouchableOpacity
              onPress={() => setShowEmailCustomizer(true)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: theme.spacing.md,
                paddingVertical: theme.spacing.sm,
                borderWidth: 1,
                borderColor: theme.brandColors.teal,
                borderRadius: 8,
                backgroundColor: 'rgba(0, 166, 153, 0.05)',
              }}
            >
              <Ionicons name="create-outline" size={18} color={theme.brandColors.teal} />
              <Text
                style={{
                  fontSize: isKidsEdition ? 13 : 12,
                  fontFamily: isKidsEdition ? 'Nunito_SemiBold' : 'Montserrat_SemiBold',
                  color: theme.brandColors.teal,
                  marginLeft: 6,
                }}
              >
                Customize Email Message
              </Text>
            </TouchableOpacity>
          )}
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

      {/* Email Customization Modal */}
      <Modal
        visible={showEmailCustomizer}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowEmailCustomizer(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.neutralColors.white }}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
          >
            {/* Header */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: theme.spacing.md,
                paddingVertical: theme.spacing.md,
                borderBottomWidth: 1,
                borderBottomColor: theme.neutralColors.lightGray,
              }}
            >
              <TouchableOpacity onPress={() => setShowEmailCustomizer(false)}>
                <Text style={{ fontSize: 16, color: theme.neutralColors.mediumGray }}>Cancel</Text>
              </TouchableOpacity>
              <Text
                style={{
                  fontSize: isKidsEdition ? 18 : 16,
                  fontFamily: isKidsEdition ? 'Nunito_Bold' : 'Montserrat_SemiBold',
                  color: theme.neutralColors.dark,
                }}
              >
                Customize Email
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowEmailCustomizer(false);
                }}
              >
                <Text style={{ fontSize: 16, color: theme.brandColors.teal, fontWeight: '600' }}>Done</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1, padding: theme.spacing.md }}>
              {/* Subject */}
              <View style={{ marginBottom: theme.spacing.lg }}>
                <Text
                  style={{
                    fontSize: isKidsEdition ? 14 : 12,
                    fontFamily: isKidsEdition ? 'Nunito_SemiBold' : 'Montserrat_SemiBold',
                    color: theme.neutralColors.dark,
                    marginBottom: theme.spacing.sm,
                  }}
                >
                  Email Subject
                </Text>
                <TextInput
                  value={emailTemplate.subject}
                  onChangeText={(text) => setEmailTemplate({ ...emailTemplate, subject: text })}
                  style={{
                    borderWidth: 1,
                    borderColor: theme.neutralColors.lightGray,
                    borderRadius: 8,
                    padding: theme.spacing.md,
                    fontSize: 14,
                    color: theme.neutralColors.dark,
                  }}
                  placeholder="Email subject line"
                />
              </View>

              {/* Greeting */}
              <View style={{ marginBottom: theme.spacing.lg }}>
                <Text
                  style={{
                    fontSize: isKidsEdition ? 14 : 12,
                    fontFamily: isKidsEdition ? 'Nunito_SemiBold' : 'Montserrat_SemiBold',
                    color: theme.neutralColors.dark,
                    marginBottom: theme.spacing.sm,
                  }}
                >
                  Greeting/Headline
                </Text>
                <TextInput
                  value={emailTemplate.greeting}
                  onChangeText={(text) => setEmailTemplate({ ...emailTemplate, greeting: text })}
                  style={{
                    borderWidth: 1,
                    borderColor: theme.neutralColors.lightGray,
                    borderRadius: 8,
                    padding: theme.spacing.md,
                    fontSize: 14,
                    color: theme.neutralColors.dark,
                  }}
                  placeholder="Email headline"
                />
              </View>

              {/* Message */}
              <View style={{ marginBottom: theme.spacing.lg }}>
                <Text
                  style={{
                    fontSize: isKidsEdition ? 14 : 12,
                    fontFamily: isKidsEdition ? 'Nunito_SemiBold' : 'Montserrat_SemiBold',
                    color: theme.neutralColors.dark,
                    marginBottom: theme.spacing.sm,
                  }}
                >
                  Message
                </Text>
                <TextInput
                  value={emailTemplate.message}
                  onChangeText={(text) => setEmailTemplate({ ...emailTemplate, message: text })}
                  multiline
                  numberOfLines={3}
                  style={{
                    borderWidth: 1,
                    borderColor: theme.neutralColors.lightGray,
                    borderRadius: 8,
                    padding: theme.spacing.md,
                    fontSize: 14,
                    color: theme.neutralColors.dark,
                    minHeight: 80,
                    textAlignVertical: 'top',
                  }}
                  placeholder="Your message to guests"
                />
              </View>

              {/* Gift Label */}
              <View style={{ marginBottom: theme.spacing.lg }}>
                <Text
                  style={{
                    fontSize: isKidsEdition ? 14 : 12,
                    fontFamily: isKidsEdition ? 'Nunito_SemiBold' : 'Montserrat_SemiBold',
                    color: theme.neutralColors.dark,
                    marginBottom: theme.spacing.sm,
                  }}
                >
                  Gift Label
                </Text>
                <TextInput
                  value={emailTemplate.giftLabel}
                  onChangeText={(text) => setEmailTemplate({ ...emailTemplate, giftLabel: text })}
                  style={{
                    borderWidth: 1,
                    borderColor: theme.neutralColors.lightGray,
                    borderRadius: 8,
                    padding: theme.spacing.md,
                    fontSize: 14,
                    color: theme.neutralColors.dark,
                  }}
                  placeholder="e.g., Thank you for: [Gift Name]"
                />
              </View>

              {/* Button Text */}
              <View style={{ marginBottom: theme.spacing.lg }}>
                <Text
                  style={{
                    fontSize: isKidsEdition ? 14 : 12,
                    fontFamily: isKidsEdition ? 'Nunito_SemiBold' : 'Montserrat_SemiBold',
                    color: theme.neutralColors.dark,
                    marginBottom: theme.spacing.sm,
                  }}
                >
                  Button Text
                </Text>
                <TextInput
                  value={emailTemplate.buttonText}
                  onChangeText={(text) => setEmailTemplate({ ...emailTemplate, buttonText: text })}
                  style={{
                    borderWidth: 1,
                    borderColor: theme.neutralColors.lightGray,
                    borderRadius: 8,
                    padding: theme.spacing.md,
                    fontSize: 14,
                    color: theme.neutralColors.dark,
                  }}
                  placeholder="e.g., Watch the Video"
                />
              </View>

              {/* Sign Off */}
              <View style={{ marginBottom: theme.spacing.lg }}>
                <Text
                  style={{
                    fontSize: isKidsEdition ? 14 : 12,
                    fontFamily: isKidsEdition ? 'Nunito_SemiBold' : 'Montserrat_SemiBold',
                    color: theme.neutralColors.dark,
                    marginBottom: theme.spacing.sm,
                  }}
                >
                  Sign Off
                </Text>
                <TextInput
                  value={emailTemplate.signOff}
                  onChangeText={(text) => setEmailTemplate({ ...emailTemplate, signOff: text })}
                  style={{
                    borderWidth: 1,
                    borderColor: theme.neutralColors.lightGray,
                    borderRadius: 8,
                    padding: theme.spacing.md,
                    fontSize: 14,
                    color: theme.neutralColors.dark,
                  }}
                  placeholder="e.g., With gratitude,"
                />
              </View>

              {/* Reset to Default */}
              <TouchableOpacity
                onPress={() => setEmailTemplate(getDefaultVideoEmailTemplate(giftName))}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingVertical: theme.spacing.md,
                  marginBottom: theme.spacing.xl,
                }}
              >
                <Ionicons name="refresh-outline" size={18} color={theme.neutralColors.mediumGray} />
                <Text
                  style={{
                    fontSize: 14,
                    color: theme.neutralColors.mediumGray,
                    marginLeft: 6,
                  }}
                >
                  Reset to Default
                </Text>
              </TouchableOpacity>

              {/* Email Preview */}
              <View style={{ marginBottom: theme.spacing.xl }}>
                <Text
                  style={{
                    fontSize: isKidsEdition ? 14 : 12,
                    fontFamily: isKidsEdition ? 'Nunito_SemiBold' : 'Montserrat_SemiBold',
                    color: theme.neutralColors.dark,
                    marginBottom: theme.spacing.sm,
                  }}
                >
                  Preview
                </Text>
                <View
                  style={{
                    backgroundColor: '#f8f9fa',
                    borderRadius: 8,
                    padding: theme.spacing.md,
                    borderWidth: 1,
                    borderColor: theme.neutralColors.lightGray,
                  }}
                >
                  <Text style={{ fontSize: 16, fontWeight: 'bold', color: theme.brandColors.teal, marginBottom: 8 }}>
                    {emailTemplate.greeting}
                  </Text>
                  <Text style={{ fontSize: 12, color: theme.brandColors.teal, fontWeight: '600', marginBottom: 8 }}>
                    #REELYTHANKFUL
                  </Text>
                  <Text style={{ fontSize: 14, color: theme.neutralColors.dark, marginBottom: 12 }}>
                    {emailTemplate.message}
                  </Text>
                  <View
                    style={{
                      backgroundColor: '#e0f2fe',
                      padding: 12,
                      borderRadius: 8,
                      borderLeftWidth: 4,
                      borderLeftColor: theme.brandColors.teal,
                      marginBottom: 12,
                    }}
                  >
                    <Text style={{ fontSize: 14, fontWeight: '600', color: theme.neutralColors.dark }}>
                      {emailTemplate.giftLabel}
                    </Text>
                  </View>
                  <View
                    style={{
                      backgroundColor: theme.brandColors.teal,
                      paddingVertical: 12,
                      paddingHorizontal: 24,
                      borderRadius: 12,
                      alignSelf: 'center',
                      marginBottom: 12,
                    }}
                  >
                    <Text style={{ color: '#fff', fontWeight: 'bold' }}>{emailTemplate.buttonText}</Text>
                  </View>
                  <Text style={{ fontSize: 12, color: theme.neutralColors.mediumGray }}>
                    {emailTemplate.signOff}
                  </Text>
                  <Text style={{ fontSize: 12, color: theme.neutralColors.mediumGray }}>
                    The ShowThx Team
                  </Text>
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

export default SendToGuestsScreen;
