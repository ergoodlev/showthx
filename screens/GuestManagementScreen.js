/**
 * GuestManagementScreen
 * Manage guests for an event - add manually or import via CSV
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useEdition } from '../context/EditionContext';
import { AppBar } from '../components/AppBar';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ThankCastButton } from '../components/ThankCastButton';
import { supabase } from '../supabaseClient';

export const GuestManagementScreen = ({ navigation, route }) => {
  const { edition, theme } = useEdition();
  const isKidsEdition = edition === 'kids';
  const eventId = route?.params?.eventId;
  const eventName = route?.params?.eventName;

  // State
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [csvError, setCsvError] = useState(null);

  // Load guests on mount
  useEffect(() => {
    loadGuests();
  }, [eventId]);

  const loadGuests = async () => {
    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('guests')
        .select('*')
        .eq('parent_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGuests(data || []);
      console.log('✅ Loaded guests:', data?.length || 0);
    } catch (error) {
      console.error('Error loading guests:', error);
      Alert.alert('Error', 'Failed to load guests');
    } finally {
      setLoading(false);
    }
  };

  const addGuest = async () => {
    if (!guestName.trim() || !guestEmail.trim()) {
      Alert.alert('Validation', 'Please enter both name and email');
      return;
    }

    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(guestEmail.trim())) {
      Alert.alert('Validation', 'Please enter a valid email address');
      return;
    }

    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('guests')
        .insert({
          parent_id: user.id,
          name: guestName.trim(),
          email: guestEmail.trim(),
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      // Add to local list
      setGuests([data, ...guests]);
      setGuestName('');
      setGuestEmail('');
      setShowAddForm(false);
      console.log('✅ Guest added:', data.name);
    } catch (error) {
      console.error('Error adding guest:', error);
      Alert.alert('Error', 'Failed to add guest');
    } finally {
      setLoading(false);
    }
  };

  const deleteGuest = async (guestId) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('guests')
        .delete()
        .eq('id', guestId);

      if (error) throw error;

      setGuests(guests.filter(g => g.id !== guestId));
      console.log('✅ Guest deleted');
    } catch (error) {
      console.error('Error deleting guest:', error);
      Alert.alert('Error', 'Failed to delete guest');
    } finally {
      setLoading(false);
    }
  };

  const parseCSV = (csvText) => {
    try {
      const lines = csvText.trim().split('\n');
      if (lines.length < 2) {
        throw new Error('CSV must have header row and at least one data row');
      }

      const headerLine = lines[0];
      const headers = headerLine.split(',').map(h => h.trim().toLowerCase());

      console.log('📋 CSV Headers found:', headers);

      // Find name and email columns (flexible matching)
      const nameIndex = headers.findIndex(h =>
        h.includes('name') || h.includes('guest') || h.includes('attendee')
      );
      const emailIndex = headers.findIndex(h =>
        h.includes('email') || h.includes('mail') || h.includes('address')
      );

      if (nameIndex === -1 || emailIndex === -1) {
        throw new Error('CSV must have columns with "name" and "email" in the header');
      }

      console.log(`📋 Name column index: ${nameIndex}, Email column index: ${emailIndex}`);

      // Parse data rows
      const parsedGuests = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue; // Skip empty lines

        const cols = line.split(',').map(c => c.trim());
        const name = cols[nameIndex];
        const email = cols[emailIndex];

        if (name && email) {
          parsedGuests.push({ name, email });
        }
      }

      if (parsedGuests.length === 0) {
        throw new Error('No valid guest records found in CSV');
      }

      return parsedGuests;
    } catch (error) {
      throw new Error(`CSV parsing error: ${error.message}`);
    }
  };

  const handleCSVImport = async () => {
    try {
      setCsvError(null);
      setLoading(true);

      // Get current user (parent)
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // Pick CSV file
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/plain', 'application/vnd.ms-excel'],
      });

      if (result.canceled) {
        setLoading(false);
        return;
      }

      console.log('📁 Selected file:', result.assets[0].name);

      // Read file content
      const fileUri = result.assets[0].uri;
      const response = await fetch(fileUri);
      const csvText = await response.text();

      // Parse CSV
      const parsedGuests = parseCSV(csvText);
      console.log(`📋 Parsed ${parsedGuests.length} guests from CSV`);

      // Validate and insert
      let insertedCount = 0;
      let skippedCount = 0;

      for (const guest of parsedGuests) {
        try {
          // Check if email already exists for this parent
          const { data: existing } = await supabase
            .from('guests')
            .select('id')
            .eq('parent_id', user.id)
            .eq('email', guest.email)
            .limit(1);

          if (existing && existing.length > 0) {
            console.log(`⏭️  Skipping duplicate email: ${guest.email}`);
            skippedCount++;
            continue;
          }

          // Insert guest
          const { data, error } = await supabase
            .from('guests')
            .insert({
              parent_id: user.id,
              name: guest.name,
              email: guest.email,
              created_at: new Date().toISOString(),
            })
            .select()
            .single();

          if (!error && data) {
            insertedCount++;
          }
        } catch (err) {
          console.error(`Error inserting guest ${guest.email}:`, err);
          skippedCount++;
        }
      }

      console.log(`✅ CSV Import complete: ${insertedCount} added, ${skippedCount} skipped`);

      // Reload guests
      await loadGuests();

      Alert.alert(
        'Import Complete',
        `Added ${insertedCount} guest${insertedCount !== 1 ? 's' : ''}\n${skippedCount} duplicate${skippedCount !== 1 ? 's' : ''} skipped`
      );
    } catch (error) {
      console.error('Error importing CSV:', error);
      const errorMsg = error.message || 'Failed to import CSV';
      setCsvError(errorMsg);
      Alert.alert('Import Error', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const renderGuestCard = ({ item }) => (
    <View
      style={{
        backgroundColor: theme.neutralColors.white,
        borderColor: theme.neutralColors.lightGray,
        borderWidth: 1,
        borderRadius: isKidsEdition ? theme.borderRadius.medium : theme.borderRadius.small,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.sm,
        marginHorizontal: theme.spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontSize: isKidsEdition ? 16 : 14,
            fontFamily: isKidsEdition ? 'Nunito_Bold' : 'Montserrat_SemiBold',
            color: theme.neutralColors.dark,
            marginBottom: 4,
          }}
        >
          {item.name}
        </Text>
        <Text
          style={{
            fontSize: isKidsEdition ? 13 : 12,
            fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
            color: theme.neutralColors.mediumGray,
          }}
        >
          {item.email}
        </Text>
      </View>

      <TouchableOpacity
        onPress={() => {
          Alert.alert('Delete Guest', `Remove ${item.name}?`, [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Delete',
              style: 'destructive',
              onPress: () => deleteGuest(item.id),
            },
          ]);
        }}
        style={{
          marginLeft: theme.spacing.md,
          padding: 8,
        }}
      >
        <Ionicons name="trash-outline" size={20} color={theme.semanticColors.error} />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.neutralColors.white }}>
      <AppBar
        title="Manage Guests"
        onBackPress={() => navigation?.goBack()}
        showBack={true}
      />

      <ScrollView style={{ flex: 1 }}>
        {/* Event Info */}
        <View style={{ marginHorizontal: theme.spacing.md, marginTop: theme.spacing.lg, marginBottom: theme.spacing.lg }}>
          <Text
            style={{
              fontSize: isKidsEdition ? 12 : 11,
              fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
              color: theme.neutralColors.mediumGray,
              marginBottom: theme.spacing.sm,
            }}
          >
            Event
          </Text>
          <Text
            style={{
              fontSize: isKidsEdition ? 20 : 18,
              fontFamily: isKidsEdition ? 'Nunito_Bold' : 'Montserrat_Bold',
              color: theme.neutralColors.dark,
            }}
          >
            {eventName}
          </Text>
        </View>

        {/* Add Guest Form */}
        {showAddForm && (
          <View
            style={{
              backgroundColor: theme.neutralColors.lightGray,
              marginHorizontal: theme.spacing.md,
              marginBottom: theme.spacing.lg,
              borderRadius: 8,
              padding: theme.spacing.md,
            }}
          >
            <Text
              style={{
                fontSize: isKidsEdition ? 14 : 12,
                fontFamily: isKidsEdition ? 'Nunito_Bold' : 'Montserrat_SemiBold',
                color: theme.neutralColors.dark,
                marginBottom: theme.spacing.md,
              }}
            >
              Add New Guest
            </Text>

            <TextInput
              placeholder="Guest Name"
              value={guestName}
              onChangeText={setGuestName}
              style={{
                borderWidth: 1,
                borderColor: theme.neutralColors.white,
                borderRadius: 8,
                paddingHorizontal: theme.spacing.sm,
                paddingVertical: theme.spacing.sm,
                fontSize: isKidsEdition ? 14 : 12,
                fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
                color: theme.neutralColors.dark,
                marginBottom: theme.spacing.sm,
                backgroundColor: theme.neutralColors.white,
              }}
              placeholderTextColor={theme.neutralColors.mediumGray}
            />

            <TextInput
              placeholder="Guest Email"
              value={guestEmail}
              onChangeText={setGuestEmail}
              keyboardType="email-address"
              style={{
                borderWidth: 1,
                borderColor: theme.neutralColors.white,
                borderRadius: 8,
                paddingHorizontal: theme.spacing.sm,
                paddingVertical: theme.spacing.sm,
                fontSize: isKidsEdition ? 14 : 12,
                fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
                color: theme.neutralColors.dark,
                marginBottom: theme.spacing.md,
                backgroundColor: theme.neutralColors.white,
              }}
              placeholderTextColor={theme.neutralColors.mediumGray}
            />

            <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
              <TouchableOpacity
                onPress={() => {
                  setShowAddForm(false);
                  setGuestName('');
                  setGuestEmail('');
                }}
                style={{
                  flex: 1,
                  backgroundColor: theme.neutralColors.white,
                  paddingVertical: theme.spacing.sm,
                  borderRadius: 8,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Text
                  style={{
                    fontSize: isKidsEdition ? 14 : 12,
                    fontFamily: isKidsEdition ? 'Nunito_SemiBold' : 'Montserrat_SemiBold',
                    color: theme.neutralColors.dark,
                  }}
                >
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={addGuest}
                disabled={loading}
                style={{
                  flex: 1,
                  backgroundColor: theme.brandColors.coral,
                  paddingVertical: theme.spacing.sm,
                  borderRadius: 8,
                  justifyContent: 'center',
                  alignItems: 'center',
                  opacity: loading ? 0.6 : 1,
                }}
              >
                <Text
                  style={{
                    fontSize: isKidsEdition ? 14 : 12,
                    fontFamily: isKidsEdition ? 'Nunito_SemiBold' : 'Montserrat_SemiBold',
                    color: '#FFFFFF',
                  }}
                >
                  Add Guest
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Action Buttons */}
        <View
          style={{
            flexDirection: 'row',
            gap: theme.spacing.sm,
            marginHorizontal: theme.spacing.md,
            marginBottom: theme.spacing.lg,
          }}
        >
          <TouchableOpacity
            onPress={() => setShowAddForm(!showAddForm)}
            disabled={loading}
            style={{
              flex: 1,
              backgroundColor: theme.brandColors.teal,
              paddingVertical: theme.spacing.md,
              borderRadius: 8,
              justifyContent: 'center',
              alignItems: 'center',
              opacity: loading ? 0.6 : 1,
            }}
          >
            <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" />
            <Text
              style={{
                fontSize: isKidsEdition ? 14 : 12,
                fontFamily: isKidsEdition ? 'Nunito_SemiBold' : 'Montserrat_SemiBold',
                color: '#FFFFFF',
                marginTop: 4,
              }}
            >
              {showAddForm ? 'Cancel' : 'Add Guest'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleCSVImport}
            disabled={loading}
            style={{
              flex: 1,
              backgroundColor: theme.brandColors.coral,
              paddingVertical: theme.spacing.md,
              borderRadius: 8,
              justifyContent: 'center',
              alignItems: 'center',
              opacity: loading ? 0.6 : 1,
            }}
          >
            <Ionicons name="document-outline" size={20} color="#FFFFFF" />
            <Text
              style={{
                fontSize: isKidsEdition ? 14 : 12,
                fontFamily: isKidsEdition ? 'Nunito_SemiBold' : 'Montserrat_SemiBold',
                color: '#FFFFFF',
                marginTop: 4,
              }}
            >
              Import CSV
            </Text>
          </TouchableOpacity>
        </View>

        {/* CSV Error */}
        {csvError && (
          <View
            style={{
              marginHorizontal: theme.spacing.md,
              marginBottom: theme.spacing.lg,
              backgroundColor: 'rgba(200, 0, 0, 0.1)',
              borderRadius: 8,
              padding: theme.spacing.md,
              borderLeftWidth: 4,
              borderLeftColor: theme.semanticColors.error,
            }}
          >
            <Text
              style={{
                fontSize: isKidsEdition ? 12 : 11,
                fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
                color: theme.semanticColors.error,
              }}
            >
              {csvError}
            </Text>
          </View>
        )}

        {/* Guests List */}
        <View style={{ marginBottom: theme.spacing.lg }}>
          <View style={{ marginHorizontal: theme.spacing.md, marginBottom: theme.spacing.md }}>
            <Text
              style={{
                fontSize: isKidsEdition ? 16 : 14,
                fontFamily: isKidsEdition ? 'Nunito_Bold' : 'Montserrat_Bold',
                color: theme.neutralColors.dark,
              }}
            >
              Guests ({guests.length})
            </Text>
          </View>

          {guests.length > 0 ? (
            <FlatList
              data={guests}
              renderItem={renderGuestCard}
              keyExtractor={item => item.id}
              scrollEnabled={false}
              contentContainerStyle={{ paddingBottom: theme.spacing.lg }}
            />
          ) : (
            <View
              style={{
                paddingVertical: theme.spacing.xl,
                alignItems: 'center',
                marginHorizontal: theme.spacing.md,
              }}
            >
              <Ionicons name="people-outline" size={48} color={theme.neutralColors.lightGray} />
              <Text
                style={{
                  fontSize: isKidsEdition ? 14 : 12,
                  fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
                  color: theme.neutralColors.mediumGray,
                  marginTop: theme.spacing.md,
                  textAlign: 'center',
                }}
              >
                No guests yet. Add guests manually or import from CSV to get started.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      <LoadingSpinner visible={loading} message="Processing..." fullScreen />
    </SafeAreaView>
  );
};

export default GuestManagementScreen;
