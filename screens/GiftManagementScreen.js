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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [editingGift, setEditingGift] = useState(null);

  // Form state
  const [giftName, setGiftName] = useState('');
  const [giverName, setGiverName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedKids, setSelectedKids] = useState([]);
  const [formErrors, setFormErrors] = useState({});

  // Load data on focus
  useFocusEffect(
    useCallback(() => {
      loadGifts();
      loadKids();
    }, [])
  );

  const loadGifts = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: queryError } = await supabase
        .from('gifts')
        .select('*, gift_assignments(children(name))')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });

      if (queryError) throw queryError;
      setGifts(data || []);
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

      const { data, error: queryError } = await supabase
        .from('children')
        .select('id, name')
        .eq('parent_id', user.id);

      if (queryError) throw queryError;
      setKids(data || []);
    } catch (err) {
      console.error('Error loading kids:', err);
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!giftName.trim()) errors.giftName = 'Gift name required';
    if (!giverName.trim()) errors.giverName = 'Giver name required';
    if (selectedKids.length === 0) errors.kids = 'Select at least one kid';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const resetForm = () => {
    setGiftName('');
    setGiverName('');
    setDescription('');
    setSelectedKids([]);
    setFormErrors({});
    setEditingGift(null);
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
    setDescription(gift.description || '');
    setSelectedKids(gift.gift_assignments?.map((a) => a.children.id) || []);
    setModalMode('edit');
    setShowModal(true);
  };

  const handleSaveGift = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);

      const giftData = {
        name: giftName,
        giver_name: giverName,
        description: description || null,
        event_id: eventId,
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
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.neutral.white }}>
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
              <View style={{ paddingHorizontal, paddingVertical: theme.spacing.md }}>
                <Text
                  style={{
                    fontSize: isKidsEdition ? 16 : 14,
                    fontFamily: isKidsEdition ? 'Nunito_SemiBold' : 'Montserrat_SemiBold',
                    color: theme.colors.neutral.dark,
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
                <Ionicons name="gift-outline" size={64} color={theme.colors.neutral.lightGray} style={{ marginBottom: theme.spacing.md }} />
                <Text
                  style={{
                    fontSize: isKidsEdition ? 16 : 14,
                    color: theme.colors.neutral.mediumGray,
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
            backgroundColor: theme.colors.brand.coral,
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
        <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
          <TextField
            label="Gift Name"
            placeholder="e.g., LEGO Set"
            value={giftName}
            onChangeText={setGiftName}
            error={formErrors.giftName}
            required
          />

          <TextField
            label="From (Giver Name)"
            placeholder="e.g., Uncle Bob"
            value={giverName}
            onChangeText={setGiverName}
            error={formErrors.giverName}
            required
          />

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
                color: theme.colors.neutral.dark,
                marginBottom: theme.spacing.sm,
              }}
            >
              Assign to Kids
            </Text>

            {formErrors.kids && (
              <Text style={{ color: theme.colors.semantic.error, fontSize: 12, marginBottom: theme.spacing.xs }}>
                {formErrors.kids}
              </Text>
            )}

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
                    color={selectedKids.includes(kid.id) ? theme.colors.brand.coral : theme.colors.neutral.mediumGray}
                  />
                  <Text
                    style={{
                      marginLeft: theme.spacing.sm,
                      fontSize: isKidsEdition ? 14 : 12,
                      fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
                      color: theme.colors.neutral.dark,
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
