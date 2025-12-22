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
import { Modal } from '../components/Modal';
import { supabase } from '../supabaseClient';

export const GuestManagementScreen = ({ navigation, route }) => {
  const { edition, theme } = useEdition();
  const isKidsEdition = edition === 'kids';
  const eventId = route?.params?.eventId;
  const eventName = route?.params?.eventName;

  // State
  const [guests, setGuests] = useState([]);
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [csvError, setCsvError] = useState(null);

  // CSV import child selection
  const [showChildSelectionModal, setShowChildSelectionModal] = useState(false);
  const [selectedChildIds, setSelectedChildIds] = useState([]);
  const [pendingCsvData, setPendingCsvData] = useState(null);

  // Load guests and children on mount
  useEffect(() => {
    loadGuests();
    loadChildren();
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

  const loadChildren = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('children')
        .select('id, name')
        .eq('parent_id', user.id)
        .order('name', { ascending: true });

      if (error) throw error;
      setChildren(data || []);
      console.log('✅ Loaded children:', data?.length || 0);
    } catch (error) {
      console.error('Error loading children:', error);
      // Don't show error - children are loaded for CSV assignment
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

      // Gift columns (optional) - match more variations
      const giftNameIndex = findColumnIndex(['gift', 'giftname', 'present', 'item', 'description', 'gifted', 'presents', 'giftfrom']);

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
        giftName: giftNameIndex !== -1 ? giftNameIndex : 'N/A',
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

          // Get gift name if available
          const giftName = giftNameIndex !== -1 ? (cols[giftNameIndex] || '').trim() : null;

          console.log(`📦 Row ${i + 1}:`, {
            name,
            email,
            giftNameIndex,
            giftName,
            rawGiftValue: cols[giftNameIndex],
            allColumns: cols
          });

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

          parsedGuests.push({ name, email, phone, giftName });
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

      // Check if parent has any children
      if (children.length === 0) {
        setLoading(false);
        Alert.alert(
          'No Children Found',
          'You need to add at least one child before importing gifts. Please add a child first.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Store parsed data and show child selection modal
      setPendingCsvData({ parsedGuests, warnings, user });
      setSelectedChildIds([]); // Reset selection
      setLoading(false);
      setShowChildSelectionModal(true);
    } catch (error) {
      console.error('Error importing CSV:', error);
      const errorMsg = error.message || 'Failed to import CSV';
      setCsvError(errorMsg);
      Alert.alert('Import Error', errorMsg);
      setLoading(false);
    }
  };

  const handleConfirmCsvImport = async () => {
    if (selectedChildIds.length === 0) {
      Alert.alert('Selection Required', 'Please select at least one child to assign these gifts to.');
      return;
    }

    try {
      setLoading(true);
      setShowChildSelectionModal(false);

      const { parsedGuests, warnings, user } = pendingCsvData;

      // Validate and insert gifts with assignments to selected children
      let insertedCount = 0;
      let skippedCount = 0;
      const createdGiftIds = [];

      for (const guest of parsedGuests) {
        try {
          // Check if guest with this email already exists for this parent
          const { data: existingGuest } = await supabase
            .from('guests')
            .select('id')
            .eq('parent_id', user.id)
            .eq('email', guest.email)
            .limit(1)
            .single();

          let guestId;

          if (existingGuest) {
            // Guest exists - check if they already have a gift for THIS event
            const { data: existingGift } = await supabase
              .from('gifts')
              .select('id')
              .eq('guest_id', existingGuest.id)
              .eq('event_id', eventId)
              .limit(1)
              .single();

            if (existingGift) {
              console.log(`⏭️  Skipping - ${guest.email} already has gift for this event`);
              skippedCount++;
              continue;
            }

            // Guest exists but no gift for this event - reuse guest record
            guestId = existingGuest.id;
            console.log(`♻️  Reusing existing guest ${guest.email} for new event`);
          } else {
            // Create new guest record
            const guestData = {
              parent_id: user.id,
              name: guest.name,
              email: guest.email,
              created_at: new Date().toISOString(),
            };

            const { data: guestRecord, error: guestError } = await supabase
              .from('guests')
              .insert(guestData)
              .select()
              .single();

            if (guestError) {
              console.error(`Error creating guest ${guest.email}:`, guestError);
              skippedCount++;
              continue;
            }

            guestId = guestRecord.id;
            console.log(`✅ Created new guest ${guest.email}`);
          }

          // Create gift record for this event
          // Use parsed gift name if available, otherwise fall back to "Gift from {name}"
          const giftName = guest.giftName && guest.giftName.trim()
            ? guest.giftName
            : `Gift from ${guest.name}`;

          console.log(`💾 Creating gift for ${guest.name}:`, {
            finalGiftName: giftName,
            parsedGiftName: guest.giftName,
            hasGiftName: !!guest.giftName
          });

          const { data: giftRecord, error: giftError } = await supabase
            .from('gifts')
            .insert({
              event_id: eventId,
              parent_id: user.id,
              guest_id: guestId,
              name: giftName,
              giver_name: guest.name,
              status: 'pending',
              created_at: new Date().toISOString(),
            })
            .select()
            .single();

          if (giftError) {
            console.error(`Error creating gift for ${guest.email}:`, giftError);
            skippedCount++;
            continue;
          }

          insertedCount++;
          createdGiftIds.push(giftRecord.id);
          console.log(`✅ Created gift ${giftRecord.id} for ${guest.name}`);
        } catch (err) {
          console.error(`Error processing guest ${guest.email}:`, err);
          skippedCount++;
        }
      }

      // Now assign all created gifts to the selected children
      console.log(`👶 Assigning ${createdGiftIds.length} gifts to ${selectedChildIds.length} children...`);

      const assignments = [];
      for (const giftId of createdGiftIds) {
        for (const childId of selectedChildIds) {
          assignments.push({
            gift_id: giftId,
            children_id: childId,
          });
        }
      }

      if (assignments.length > 0) {
        const { error: assignError } = await supabase
          .from('gift_assignments')
          .insert(assignments);

        if (assignError) {
          console.error('❌ Error creating gift assignments:', assignError);
          Alert.alert(
            'Partial Success',
            `Created ${insertedCount} gifts but failed to assign them to children. You can assign them manually from the Gift Management screen.`
          );
        } else {
          console.log(`✅ Created ${assignments.length} gift assignments`);
        }
      }

      console.log(`✅ CSV Import complete: ${insertedCount} gifts created, ${assignments.length} assignments made, ${skippedCount} skipped`);

      // Reload guests
      await loadGuests();

      // Build detailed message
      const selectedChildNames = children
        .filter(c => selectedChildIds.includes(c.id))
        .map(c => c.name)
        .join(', ');

      let message = `Added ${insertedCount} gift${insertedCount !== 1 ? 's' : ''} and assigned to: ${selectedChildNames}`;
      if (skippedCount > 0) {
        message += `\n${skippedCount} duplicate${skippedCount !== 1 ? 's' : ''} skipped`;
      }
      if (warnings.length > 0) {
        message += `\n${warnings.length} row${warnings.length !== 1 ? 's' : ''} had issues`;
      }

      Alert.alert('Import Complete', message);
      setPendingCsvData(null);
    } catch (error) {
      console.error('Error importing CSV:', error);
      const errorMsg = error.message || 'Failed to import CSV';
      setCsvError(errorMsg);
      Alert.alert('Import Error', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const toggleChildSelection = (childId) => {
    if (selectedChildIds.includes(childId)) {
      setSelectedChildIds(selectedChildIds.filter(id => id !== childId));
    } else {
      setSelectedChildIds([...selectedChildIds, childId]);
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

      {/* Child Selection Modal for CSV Import */}
      <Modal
        visible={showChildSelectionModal}
        onClose={() => {
          setShowChildSelectionModal(false);
          setPendingCsvData(null);
        }}
        title="Assign Gifts to Children"
        size="medium"
        actions={[
          {
            label: 'Cancel',
            onPress: () => {
              setShowChildSelectionModal(false);
              setPendingCsvData(null);
            },
            variant: 'outline',
          },
          {
            label: 'Import & Assign',
            onPress: handleConfirmCsvImport,
            variant: 'primary',
          },
        ]}
      >
        <View>
          <Text
            style={{
              fontSize: isKidsEdition ? 14 : 12,
              fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
              color: theme.neutralColors.dark,
              marginBottom: theme.spacing.md,
            }}
          >
            Select which child(ren) should receive these {pendingCsvData?.parsedGuests?.length || 0} gifts:
          </Text>

          {children.map((child) => (
            <TouchableOpacity
              key={child.id}
              onPress={() => toggleChildSelection(child.id)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: theme.spacing.sm,
                paddingHorizontal: theme.spacing.sm,
                borderRadius: 8,
                backgroundColor: selectedChildIds.includes(child.id)
                  ? theme.brandColors.coral + '20'
                  : 'transparent',
                marginBottom: theme.spacing.xs,
              }}
            >
              <Ionicons
                name={selectedChildIds.includes(child.id) ? 'checkbox' : 'square-outline'}
                size={24}
                color={
                  selectedChildIds.includes(child.id)
                    ? theme.brandColors.coral
                    : theme.neutralColors.mediumGray
                }
              />
              <Text
                style={{
                  marginLeft: theme.spacing.sm,
                  fontSize: isKidsEdition ? 16 : 14,
                  fontFamily: isKidsEdition ? 'Nunito_SemiBold' : 'Montserrat_SemiBold',
                  color: theme.neutralColors.dark,
                }}
              >
                {child.name}
              </Text>
            </TouchableOpacity>
          ))}

          {children.length === 0 && (
            <Text
              style={{
                fontSize: isKidsEdition ? 13 : 12,
                fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
                color: theme.neutralColors.mediumGray,
                fontStyle: 'italic',
                textAlign: 'center',
                paddingVertical: theme.spacing.lg,
              }}
            >
              No children found. Please add a child first.
            </Text>
          )}
        </View>
      </Modal>

      <LoadingSpinner visible={loading} message="Processing..." fullScreen />
    </SafeAreaView>
  );
};

export default GuestManagementScreen;
