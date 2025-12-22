/**
 * GiftManagementScreen
 * Create and assign gifts to kids in an event
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  TouchableOpacity,
  Text,
  Alert,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useEdition } from '../context/EditionContext';
import { AppBar } from '../components/AppBar';
import { GiftCard } from '../components/GiftCard';
import { TextField } from '../components/TextField';
import { Modal } from '../components/Modal';
import { ThankCastButton } from '../components/ThankCastButton';
import { ErrorMessage } from '../components/ErrorMessage';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { supabase } from '../supabaseClient';

export const GiftManagementScreen = ({ navigation, route }) => {
  const { edition, theme } = useEdition();
  const isKidsEdition = edition === 'kids';
  const eventId = route?.params?.eventId;
  const eventName = route?.params?.eventName;

  // State
  const [gifts, setGifts] = useState([]);
  const [kids, setKids] = useState([]);
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [editingGift, setEditingGift] = useState(null);

  // Form state
  const [giftName, setGiftName] = useState('');
  const [giverName, setGiverName] = useState('');
  const [selectedGuestId, setSelectedGuestId] = useState(null);
  const [description, setDescription] = useState('');
  const [selectedKids, setSelectedKids] = useState([]);
  const [formErrors, setFormErrors] = useState({});

  // Guest autocomplete state
  const [guestSearchText, setGuestSearchText] = useState('');
  const [showGuestDropdown, setShowGuestDropdown] = useState(false);
  const [filteredGuests, setFilteredGuests] = useState([]);
  const [showAddGuestForm, setShowAddGuestForm] = useState(false);
  const [newGuestName, setNewGuestName] = useState('');
  const [newGuestEmail, setNewGuestEmail] = useState('');

  // Load data on focus
  useFocusEffect(
    useCallback(() => {
      loadGifts();
      loadKids();
      loadGuests();
    }, [eventId])
  );

  // Handle guest search text change
  useEffect(() => {
    if (guestSearchText.trim()) {
      const filtered = guests.filter(guest =>
        guest.name.toLowerCase().includes(guestSearchText.toLowerCase())
      );
      setFilteredGuests(filtered);
      setShowGuestDropdown(true);
    } else {
      setFilteredGuests([]);
      setShowGuestDropdown(false);
    }
  }, [guestSearchText, guests]);

  const loadGifts = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: queryError } = await supabase
        .from('gifts')
        .select(`
          id,
          name,
          description,
          giver_name,
          guest_id,
          status,
          child_id,
          event_id,
          created_at,
          gift_assignments (
            children_id,
            children (id, name)
          )
        `)
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });

      if (queryError) throw queryError;

      // Filter out placeholder gifts (gifts for guests who didn't bring anything)
      // These have the pattern "Gift from {guest name}" or are empty/null
      const filteredGifts = (data || []).filter((gift) => {
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
      });

      console.log(`📊 Loaded ${data?.length || 0} total gifts, ${filteredGifts.length} after filtering placeholders`);
      setGifts(filteredGifts);
    } catch (err) {
      console.error('Error loading gifts:', err);
      setError(err.message || 'Failed to load gifts');
    } finally {
      setLoading(false);
    }
  };

  const loadKids = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      console.log('📋 Loading kids for parent:', user.id);

      const { data, error: queryError } = await supabase
        .from('children')
        .select('id, name')
        .eq('parent_id', user.id);

      console.log('👶 Loaded kids:', data, 'Error:', queryError);

      if (queryError) throw queryError;
      setKids(data || []);
    } catch (err) {
      console.error('❌ Error loading kids:', err);
      setError('Failed to load children: ' + err.message);
    }
  };

  const loadGuests = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      console.log('👥 Loading guests for parent:', user?.id);

      const { data, error: queryError } = await supabase
        .from('guests')
        .select('id, name, email')
        .eq('parent_id', user.id)
        .order('name', { ascending: true });

      if (queryError) throw queryError;
      setGuests(data || []);
      console.log('✅ Loaded', data?.length || 0, 'guests');
    } catch (err) {
      console.error('❌ Error loading guests:', err);
      // Don't show error - guests are optional at this point
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!giftName.trim()) errors.giftName = 'Gift name required';
    if (!giverName.trim()) errors.giverName = 'Guest/Giver name required';
    if (selectedKids.length === 0) errors.kids = 'Select at least one kid';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const resetForm = () => {
    setGiftName('');
    setGiverName('');
    setSelectedGuestId(null);
    setGuestSearchText('');
    setShowGuestDropdown(false);
    setShowAddGuestForm(false);
    setNewGuestName('');
    setNewGuestEmail('');
    setDescription('');
    setSelectedKids([]);
    setFormErrors({});
    setEditingGift(null);
  };

  const handleSelectGuest = (guest) => {
    setGiverName(guest.name);
    setSelectedGuestId(guest.id);
    setGuestSearchText('');
    setShowGuestDropdown(false);
    console.log('✅ Selected guest:', guest.name);
  };

  const handleAddNewGuest = async () => {
    if (!newGuestName.trim()) {
      Alert.alert('Validation', 'Please enter guest name');
      return;
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('guests')
        .insert({
          parent_id: user.id,
          name: newGuestName.trim(),
          email: newGuestEmail.trim() || null,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      // Add to guests list
      setGuests([...guests, data]);

      // Select the new guest
      setGiverName(data.name);
      setSelectedGuestId(data.id);
      setGuestSearchText('');
      setShowAddGuestForm(false);
      setNewGuestName('');
      setNewGuestEmail('');

      console.log('✅ New guest added:', data.name);
    } catch (err) {
      console.error('Error adding guest:', err);
      Alert.alert('Error', 'Failed to add guest');
    }
  };

  const openCreateModal = () => {
    resetForm();
    setModalMode('create');
    setShowModal(true);
  };

  const openEditModal = (gift) => {
    setEditingGift(gift);
    setGiftName(gift.name);
    setGiverName(gift.giver_name);
    setSelectedGuestId(gift.guest_id || null); // Preserve guest_id when editing
    setDescription(gift.description || '');
    setSelectedKids(gift.gift_assignments?.map((a) => a.children.id) || []);
    setModalMode('edit');
    setShowModal(true);
  };

  const handleSaveGift = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);

      // Get current user for parent_id
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('Not authenticated');
      }

      const giftData = {
        name: giftName,
        giver_name: giverName,
        description: description || null,
        event_id: eventId,
        parent_id: user.id,
        guest_id: selectedGuestId || null, // CRITICAL: Link gift to guest for SendToGuests to work
      };

      let giftId;

      if (modalMode === 'create') {
        const { data, error: createError } = await supabase
          .from('gifts')
          .insert(giftData)
          .select()
          .single();

        if (createError) throw createError;
        giftId = data.id;
      } else {
        const { error: updateError } = await supabase
          .from('gifts')
          .update(giftData)
          .eq('id', editingGift.id);

        if (updateError) throw updateError;
        giftId = editingGift.id;
      }

      // Save kid assignments
      const { error: deleteError } = await supabase
        .from('gift_assignments')
        .delete()
        .eq('gift_id', giftId);

      if (deleteError) throw deleteError;

      if (selectedKids.length > 0) {
        const assignments = selectedKids.map((kidId) => ({
          gift_id: giftId,
          children_id: kidId,
        }));

        const { error: insertError } = await supabase
          .from('gift_assignments')
          .insert(assignments);

        if (insertError) throw insertError;
      }

      setShowModal(false);
      loadGifts();
    } catch (err) {
      setError(err.message || 'Failed to save gift');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteGift = (gift) => {
    Alert.alert('Delete Gift', 'Are you sure? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        onPress: async () => {
          try {
            const { error: deleteError } = await supabase
              .from('gifts')
              .delete()
              .eq('id', gift.id);

            if (deleteError) throw deleteError;
            setGifts(gifts.filter((g) => g.id !== gift.id));
          } catch (err) {
            setError(err.message || 'Failed to delete gift');
          }
        },
        style: 'destructive',
      },
    ]);
  };

  const toggleKidSelection = (kidId) => {
    if (selectedKids.includes(kidId)) {
      setSelectedKids(selectedKids.filter((id) => id !== kidId));
    } else {
      setSelectedKids([...selectedKids, kidId]);
    }
  };

  const paddingHorizontal = isKidsEdition ? theme.spacing.lg : theme.spacing.md;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.neutralColors.white }}>
      <AppBar
        title={'Gifts - ' + eventName}
        onBackPress={() => navigation?.goBack()}
        showBack={true}
      />

      {loading ? (
        <LoadingSpinner visible message="Loading gifts..." />
      ) : (
        <FlatList
          data={gifts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <GiftCard
              giftName={item.name}
              giverName={item.giver_name}
              status="pending"
              assignedKids={item.gift_assignments?.map((a) => a.children.name) || []}
              onPress={() => {}}
              onEdit={() => openEditModal(item)}
              onDelete={() => handleDeleteGift(item)}
              style={{ marginHorizontal: theme.spacing.md }}
            />
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

              {/* Event Management Buttons */}
              <View style={{ paddingHorizontal, paddingTop: theme.spacing.md, gap: theme.spacing.sm }}>
                <TouchableOpacity
                  onPress={() => navigation?.navigate('GuestManagement', { eventId, eventName })}
                  style={{
                    backgroundColor: theme.brandColors.teal,
                    borderRadius: isKidsEdition ? theme.borderRadius.medium : theme.borderRadius.small,
                    paddingVertical: theme.spacing.sm,
                    paddingHorizontal: theme.spacing.md,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: theme.spacing.sm,
                  }}
                >
                  <Ionicons name="people" size={20} color="#FFFFFF" />
                  <Text
                    style={{
                      color: '#FFFFFF',
                      fontSize: isKidsEdition ? 14 : 12,
                      fontFamily: isKidsEdition ? 'Nunito_SemiBold' : 'Montserrat_SemiBold',
                      fontWeight: '600',
                    }}
                  >
                    Manage Guests & Import CSV
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={{ paddingHorizontal, paddingVertical: theme.spacing.md }}>
                <Text
                  style={{
                    fontSize: isKidsEdition ? 16 : 14,
                    fontFamily: isKidsEdition ? 'Nunito_SemiBold' : 'Montserrat_SemiBold',
                    color: theme.neutralColors.dark,
                    fontWeight: '600',
                  }}
                >
                  {gifts.length === 0 ? 'No gifts yet' : gifts.length + ' gift' + (gifts.length !== 1 ? 's' : '')}
                </Text>
              </View>
            </>
          }
          ListEmptyComponent={
            !loading ? (
              <View style={{ paddingHorizontal, paddingVertical: 60, alignItems: 'center' }}>
                <Ionicons name="gift-outline" size={64} color={theme.neutralColors.lightGray} style={{ marginBottom: theme.spacing.md }} />
                <Text
                  style={{
                    fontSize: isKidsEdition ? 16 : 14,
                    color: theme.neutralColors.mediumGray,
                    fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
                    textAlign: 'center',
                  }}
                >
                  No gifts yet. Create one to get started!
                </Text>
              </View>
            ) : null
          }
          contentContainerStyle={{ paddingTop: theme.spacing.md, paddingBottom: theme.spacing.lg }}
        />
      )}

      {/* Create Gift Button (FAB) */}
      {!loading && (
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
          onPress={openCreateModal}
        >
          <Ionicons name="add" size={isKidsEdition ? 32 : 28} color="#FFFFFF" />
        </TouchableOpacity>
      )}

      {/* Gift Modal */}
      <Modal
        visible={showModal}
        onClose={() => setShowModal(false)}
        title={modalMode === 'create' ? 'Create Gift' : 'Edit Gift'}
        size="large"
        actions={[
          { label: 'Cancel', onPress: () => setShowModal(false), variant: 'outline' },
          {
            label: modalMode === 'create' ? 'Create' : 'Save',
            onPress: handleSaveGift,
            variant: 'primary',
          },
        ]}
      >
        <ScrollView style={{ maxHeight: 600 }} showsVerticalScrollIndicator={true}>
          <TextField
            label="Gift Name"
            placeholder="e.g., LEGO Set"
            value={giftName}
            onChangeText={setGiftName}
            error={formErrors.giftName}
            required
          />

          {/* Guest Autocomplete Selector */}
          <View style={{ marginBottom: theme.spacing.md }}>
            <Text
              style={{
                fontSize: isKidsEdition ? 14 : 12,
                fontFamily: isKidsEdition ? 'Nunito_SemiBold' : 'Montserrat_SemiBold',
                color: theme.neutralColors.dark,
                marginBottom: theme.spacing.sm,
              }}
            >
              From (Select Guest){' '}
              <Text style={{ color: theme.semanticColors.error }}>*</Text>
            </Text>

            {/* Input Field */}
            <View
              style={{
                borderWidth: 1,
                borderColor: formErrors.giverName ? theme.semanticColors.error : theme.neutralColors.lightGray,
                borderRadius: 8,
                paddingHorizontal: theme.spacing.sm,
                paddingVertical: theme.spacing.sm,
                backgroundColor: theme.neutralColors.white,
                marginBottom: theme.spacing.sm,
              }}
            >
              <TextInput
                placeholder="Type guest name or search..."
                value={giverName}
                onChangeText={(text) => {
                  setGiverName(text);
                  setGuestSearchText(text);
                }}
                style={{
                  fontSize: isKidsEdition ? 14 : 12,
                  fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
                  color: theme.neutralColors.dark,
                  padding: 0,
                }}
                placeholderTextColor={theme.neutralColors.mediumGray}
                autoCorrect={true}
                spellCheck={true}
              />
            </View>

            {/* Guest Dropdown List */}
            {showGuestDropdown && guestSearchText.trim() && (
              <View
                style={{
                  borderWidth: 1,
                  borderColor: theme.neutralColors.lightGray,
                  borderRadius: 8,
                  backgroundColor: theme.neutralColors.white,
                  marginBottom: theme.spacing.md,
                  maxHeight: 200,
                }}
              >
                {filteredGuests.length > 0 ? (
                  <FlatList
                    data={filteredGuests}
                    scrollEnabled
                    nestedScrollEnabled={true}
                    keyExtractor={item => item.id}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        onPress={() => handleSelectGuest(item)}
                        style={{
                          paddingHorizontal: theme.spacing.md,
                          paddingVertical: theme.spacing.sm,
                          borderBottomWidth: 1,
                          borderBottomColor: theme.neutralColors.lightGray,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: isKidsEdition ? 14 : 12,
                            fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
                            color: theme.neutralColors.dark,
                          }}
                        >
                          {item.name}
                        </Text>
                        {item.email && (
                          <Text
                            style={{
                              fontSize: isKidsEdition ? 11 : 10,
                              fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
                              color: theme.neutralColors.mediumGray,
                              marginTop: 2,
                            }}
                          >
                            {item.email}
                          </Text>
                        )}
                      </TouchableOpacity>
                    )}
                  />
                ) : null}

                {/* Other Option - Add New Guest */}
                <TouchableOpacity
                  onPress={() => setShowAddGuestForm(!showAddGuestForm)}
                  style={{
                    paddingHorizontal: theme.spacing.md,
                    paddingVertical: theme.spacing.sm,
                    backgroundColor: theme.neutralColors.lightGray,
                    borderBottomLeftRadius: 8,
                    borderBottomRightRadius: 8,
                    flexDirection: 'row',
                    alignItems: 'center',
                  }}
                >
                  <Ionicons name="add-circle-outline" size={18} color={theme.brandColors.coral} />
                  <Text
                    style={{
                      fontSize: isKidsEdition ? 14 : 12,
                      fontFamily: isKidsEdition ? 'Nunito_SemiBold' : 'Montserrat_SemiBold',
                      color: theme.brandColors.coral,
                      marginLeft: theme.spacing.sm,
                    }}
                  >
                    Add New Guest
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Add New Guest Inline Form */}
            {showAddGuestForm && (
              <View
                style={{
                  backgroundColor: theme.neutralColors.lightGray,
                  borderRadius: 8,
                  padding: theme.spacing.md,
                  marginBottom: theme.spacing.md,
                }}
              >
                <Text
                  style={{
                    fontSize: isKidsEdition ? 12 : 11,
                    fontFamily: isKidsEdition ? 'Nunito_SemiBold' : 'Montserrat_SemiBold',
                    color: theme.neutralColors.dark,
                    marginBottom: theme.spacing.sm,
                  }}
                >
                  Quick Add Guest
                </Text>

                <TextInput
                  placeholder="Guest Name"
                  value={newGuestName}
                  onChangeText={setNewGuestName}
                  style={{
                    borderWidth: 1,
                    borderColor: theme.neutralColors.white,
                    borderRadius: 6,
                    paddingHorizontal: theme.spacing.sm,
                    paddingVertical: theme.spacing.xs,
                    backgroundColor: theme.neutralColors.white,
                    fontSize: isKidsEdition ? 13 : 12,
                    fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
                    color: theme.neutralColors.dark,
                    marginBottom: theme.spacing.sm,
                  }}
                  placeholderTextColor={theme.neutralColors.mediumGray}
                  autoCorrect={true}
                  spellCheck={true}
                />

                <TextInput
                  placeholder="Email (Optional)"
                  value={newGuestEmail}
                  onChangeText={setNewGuestEmail}
                  keyboardType="email-address"
                  style={{
                    borderWidth: 1,
                    borderColor: theme.neutralColors.white,
                    borderRadius: 6,
                    paddingHorizontal: theme.spacing.sm,
                    paddingVertical: theme.spacing.xs,
                    backgroundColor: theme.neutralColors.white,
                    fontSize: isKidsEdition ? 13 : 12,
                    fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
                    color: theme.neutralColors.dark,
                    marginBottom: theme.spacing.sm,
                  }}
                  placeholderTextColor={theme.neutralColors.mediumGray}
                />

                <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
                  <TouchableOpacity
                    onPress={() => setShowAddGuestForm(false)}
                    style={{
                      flex: 1,
                      backgroundColor: theme.neutralColors.white,
                      paddingVertical: theme.spacing.xs,
                      borderRadius: 6,
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: isKidsEdition ? 12 : 11,
                        fontFamily: isKidsEdition ? 'Nunito_SemiBold' : 'Montserrat_SemiBold',
                        color: theme.neutralColors.dark,
                      }}
                    >
                      Cancel
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleAddNewGuest}
                    style={{
                      flex: 1,
                      backgroundColor: theme.brandColors.coral,
                      paddingVertical: theme.spacing.xs,
                      borderRadius: 6,
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: isKidsEdition ? 12 : 11,
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

            {formErrors.giverName && (
              <Text style={{ color: theme.semanticColors.error, fontSize: 12 }}>
                {formErrors.giverName}
              </Text>
            )}
          </View>

          <TextField
            label="Description (Optional)"
            placeholder="e.g., Blue bicycle with training wheels"
            value={description}
            onChangeText={setDescription}
            multiline={true}
            numberOfLines={3}
          />

          {/* Kid Selection */}
          <View style={{ marginTop: theme.spacing.md }}>
            <Text
              style={{
                fontSize: isKidsEdition ? 14 : 12,
                fontFamily: isKidsEdition ? 'Nunito_SemiBold' : 'Montserrat_SemiBold',
                color: theme.neutralColors.dark,
                marginBottom: theme.spacing.sm,
              }}
            >
              Assign to Kids
            </Text>

            {formErrors.kids && (
              <Text style={{ color: theme.semanticColors.error, fontSize: 12, marginBottom: theme.spacing.xs }}>
                {formErrors.kids}
              </Text>
            )}

            <Text style={{ fontSize: 12, color: theme.neutralColors.mediumGray, marginBottom: theme.spacing.sm }}>
              Showing {kids.length} child{kids.length !== 1 ? 'ren' : ''}:
            </Text>
            {kids.map((kid) => (
              <TouchableOpacity
                key={kid.id}
                onPress={() => toggleKidSelection(kid.id)}
                style={{ marginBottom: theme.spacing.sm }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: theme.spacing.sm,
                    paddingVertical: theme.spacing.xs,
                  }}
                >
                  <Ionicons
                    name={selectedKids.includes(kid.id) ? 'checkbox' : 'square-outline'}
                    size={22}
                    color={selectedKids.includes(kid.id) ? theme.brandColors.coral : theme.neutralColors.mediumGray}
                  />
                  <Text
                    style={{
                      marginLeft: theme.spacing.sm,
                      fontSize: isKidsEdition ? 14 : 12,
                      fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
                      color: theme.neutralColors.dark,
                    }}
                  >
                    {kid.name}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </Modal>
    </SafeAreaView>
  );
};

export default GiftManagementScreen;
