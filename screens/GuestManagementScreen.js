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

      // Load guests linked to gifts for this specific event
      // This prevents showing old guests from deleted events
      const { data, error } = await supabase
        .from('guests')
        .select(`
          *,
          gifts!inner(event_id)
        `)
        .eq('parent_id', user.id)
        .eq('gifts.event_id', eventId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGuests(data || []);
      console.log('✅ Loaded guests for event:', data?.length || 0);
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

  // Enhanced CSV parser with flexible column matching and delimiter detection
  const parseCSV = (csvText) => {
    try {
      const lines = csvText.trim().split(/\r?\n/);
      if (lines.length < 2) {
        throw new Error('CSV must have header row and at least one data row');
      }

      // Detect delimiter (comma, tab, semicolon, or pipe)
      const headerLine = lines[0];
      let delimiter = ',';
      if (headerLine.includes('\t')) delimiter = '\t';
      else if (headerLine.includes(';') && !headerLine.includes(',')) delimiter = ';';
      else if (headerLine.includes('|') && !headerLine.includes(',')) delimiter = '|';

      console.log('📋 Detected delimiter:', delimiter === '\t' ? 'TAB' : delimiter);

      // Parse a line handling quoted fields
      const parseLine = (line) => {
        const result = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') {
            // Handle escaped quotes
            if (inQuotes && line[i + 1] === '"') {
              current += '"';
              i++;
            } else {
              inQuotes = !inQuotes;
            }
          } else if (char === delimiter && !inQuotes) {
            result.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        result.push(current.trim());
        return result;
      };

      const headers = parseLine(headerLine).map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
      console.log('📋 CSV Headers found:', headers);

      // Flexible column matching for various CSV formats
      const findColumnIndex = (possibleNames) => {
        return headers.findIndex(h => possibleNames.some(name => h.includes(name)));
      };

      // Name columns - support "name", "fullname", "guestname", "attendee", or separate first/last
      const fullNameIndex = findColumnIndex(['fullname', 'name', 'guest', 'attendee', 'recipient', 'person']);
      const firstNameIndex = findColumnIndex(['first', 'fname', 'given']);
      const lastNameIndex = findColumnIndex(['last', 'lname', 'surname', 'family']);

      // Email columns
      const emailIndex = findColumnIndex(['email', 'mail', 'emailaddress']);

      // Phone columns (optional)
      const phoneIndex = findColumnIndex(['phone', 'mobile', 'cell', 'tel', 'contact']);

      // Validate we can find email
      if (emailIndex === -1) {
        throw new Error('CSV must have an "email" column. Found columns: ' + headers.join(', '));
      }

      // Check if we have name info
      const hasFullName = fullNameIndex !== -1;
      const hasFirstLast = firstNameIndex !== -1 || lastNameIndex !== -1;
      if (!hasFullName && !hasFirstLast) {
        throw new Error('CSV must have a "name" column or "first name"/"last name" columns. Found: ' + headers.join(', '));
      }

      console.log('📋 Column mapping:', {
        fullName: hasFullName ? fullNameIndex : 'N/A',
        firstName: firstNameIndex !== -1 ? firstNameIndex : 'N/A',
        lastName: lastNameIndex !== -1 ? lastNameIndex : 'N/A',
        email: emailIndex,
        phone: phoneIndex !== -1 ? phoneIndex : 'N/A',
      });

      // Parse data rows
      const parsedGuests = [];
      const errors = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue; // Skip empty lines

        try {
          const cols = parseLine(line);

          // Build name from available columns
          let name = '';
          if (hasFullName && cols[fullNameIndex]) {
            name = cols[fullNameIndex].trim();
          } else if (hasFirstLast) {
            const firstName = firstNameIndex !== -1 ? (cols[firstNameIndex] || '').trim() : '';
            const lastName = lastNameIndex !== -1 ? (cols[lastNameIndex] || '').trim() : '';
            name = `${firstName} ${lastName}`.trim();
          }

          // Get email (clean it)
          const email = (cols[emailIndex] || '').trim().toLowerCase();

          // Get phone if available
          const phone = phoneIndex !== -1 ? (cols[phoneIndex] || '').trim() : null;

          // Validate
          if (!name) {
            errors.push(`Row ${i + 1}: Missing name`);
            continue;
          }
          if (!email) {
            errors.push(`Row ${i + 1}: Missing email`);
            continue;
          }

          // Basic email validation
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(email)) {
            errors.push(`Row ${i + 1}: Invalid email "${email}"`);
            continue;
          }

          parsedGuests.push({ name, email, phone });
        } catch (rowError) {
          errors.push(`Row ${i + 1}: ${rowError.message}`);
        }
      }

      if (parsedGuests.length === 0) {
        const errorSummary = errors.length > 0 ? `\nErrors:\n${errors.slice(0, 5).join('\n')}` : '';
        throw new Error(`No valid guest records found in CSV.${errorSummary}`);
      }

      if (errors.length > 0) {
        console.log(`⚠️ ${errors.length} rows had issues:`, errors.slice(0, 5));
      }

      return { guests: parsedGuests, warnings: errors };
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
      const { guests: parsedGuests, warnings } = parseCSV(csvText);
      console.log(`📋 Parsed ${parsedGuests.length} guests from CSV (${warnings.length} warnings)`);

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
          const guestData = {
            parent_id: user.id,
            name: guest.name,
            email: guest.email,
            created_at: new Date().toISOString(),
          };
          // Add phone if available
          if (guest.phone) {
            guestData.phone = guest.phone;
          }

          const { data, error } = await supabase
            .from('guests')
            .insert(guestData)
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

      // Build detailed message
      let message = `Added ${insertedCount} guest${insertedCount !== 1 ? 's' : ''}`;
      if (skippedCount > 0) {
        message += `\n${skippedCount} duplicate${skippedCount !== 1 ? 's' : ''} skipped`;
      }
      if (warnings.length > 0) {
        message += `\n${warnings.length} row${warnings.length !== 1 ? 's' : ''} had issues`;
      }

      Alert.alert('Import Complete', message);
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
        title={eventName ? `Guests - ${eventName}` : 'Manage Guests'}
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
