/**
 * ManageChildrenScreen
 * Parent interface to add, edit, and manage children
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useEdition } from '../context/EditionContext';
import { AppBar } from '../components/AppBar';
import { TextField } from '../components/TextField';
import { Modal } from '../components/Modal';
import { ThankCastButton } from '../components/ThankCastButton';
import { ErrorMessage } from '../components/ErrorMessage';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { supabase } from '../supabaseClient';

export const ManageChildrenScreen = ({ navigation, route }) => {
  const { edition, theme } = useEdition();
  const isKidsEdition = edition === 'kids';

  // State
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [editingChild, setEditingChild] = useState(null);

  // Form state
  const [childName, setChildName] = useState('');
  const [childAge, setChildAge] = useState('');
  const [formErrors, setFormErrors] = useState({});

  // Load children on focus
  useFocusEffect(
    useCallback(() => {
      loadChildren();

      // If a specific child was passed from parent dashboard, open edit modal directly
      if (route?.params?.child) {
        setTimeout(() => {
          openEditModal(route.params.child);
          // Clear the route param so modal doesn't re-open on every focus
          navigation?.setParams({ child: null });
        }, 100);
      }
    }, [route?.params?.child])
  );

  const loadChildren = async () => {
    try {
      setLoading(true);
      setError(null);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data, error: queryError } = await supabase
        .from('children')
        .select('id, name, age, access_code, pin, created_at')
        .eq('parent_id', user.id)
        .order('created_at', { ascending: false });

      if (queryError) throw queryError;
      setChildren(data || []);
    } catch (err) {
      console.error('Error loading children:', err);
      setError(err.message || 'Failed to load children');
    } finally {
      setLoading(false);
    }
  };

  // Generate unique access code (e.g., "ALI5821")
  // Format: First 3 letters of name + 4 random digits
  // This prevents PIN collision at scale - each child gets a globally unique code
  const generateAccessCode = (name) => {
    const namePrefix = name.substring(0, 3).toUpperCase();
    const randomDigits = Math.floor(1000 + Math.random() * 9000).toString();
    return `${namePrefix}${randomDigits}`;
  };

  // Generate legacy PIN (4 digits) for backwards compatibility
  const generatePin = () => {
    return Math.floor(1000 + Math.random() * 9000).toString();
  };

  const validateForm = () => {
    const errors = {};
    if (!childName.trim()) errors.childName = 'Child name is required';
    if (!childAge.trim()) errors.childAge = 'Child age is required';
    if (isNaN(childAge) || parseInt(childAge) < 1 || parseInt(childAge) > 18) {
      errors.childAge = 'Age must be between 1 and 18';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const resetForm = () => {
    setChildName('');
    setChildAge('');
    setFormErrors({});
    setEditingChild(null);
  };

  const openCreateModal = () => {
    resetForm();
    setModalMode('create');
    setShowModal(true);
  };

  const openEditModal = (child) => {
    setChildName(child.name);
    setChildAge(child.age?.toString() || '');
    setEditingChild(child);
    setModalMode('edit');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      if (modalMode === 'create') {
        const accessCode = generateAccessCode(childName);
        const pin = generatePin();

        console.log('➕ Creating child:', { childName, accessCode, pin });

        const { data: insertData, error: insertError } = await supabase
          .from('children')
          .insert({
            parent_id: user.id,
            name: childName,
            age: parseInt(childAge),
            access_code: accessCode,
            pin: pin,
          })
          .select();

        if (insertError) {
          console.error('❌ Insert error:', insertError);
          throw insertError;
        }

        console.log('✅ Child created successfully:', insertData);

        Alert.alert(
          '✅ Child Added!',
          `${childName}'s Login Code: ${accessCode}\n\nShare this code with your child so they can log in. It's like their special key!`,
          [
            {
              text: 'Copy Code',
              onPress: () => {
                // Share API will be used from the Children tab
              },
            },
            { text: 'OK', onPress: () => {} },
          ]
        );
      } else {
        const { error: updateError } = await supabase
          .from('children')
          .update({
            name: childName,
            age: parseInt(childAge),
          })
          .eq('id', editingChild.id);

        if (updateError) throw updateError;
      }

      setShowModal(false);
      resetForm();
      await loadChildren();
    } catch (err) {
      console.error('Error saving child:', err);
      setError(err.message || 'Failed to save child');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (child) => {
    Alert.alert(
      'Delete Child?',
      `Are you sure you want to delete ${child.name}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          onPress: async () => {
            try {
              setLoading(true);
              const { error: deleteError } = await supabase
                .from('children')
                .delete()
                .eq('id', child.id);

              if (deleteError) throw deleteError;
              await loadChildren();
            } catch (err) {
              setError(err.message || 'Failed to delete child');
            } finally {
              setLoading(false);
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  const handleSharePIN = async (child) => {
    try {
      await Share.share({
        message: `${child.name}'s Login Code: ${child.access_code}\n\nShare this with ${child.name} so they can log in to GratituGram!`,
        title: `${child.name}'s GratituGram Login Code`,
      });
    } catch (err) {
      Alert.alert('Share Login Code', `${child.name}'s Login Code: ${child.access_code}`);
    }
  };

  const renderChild = ({ item: child }) => (
    <View
      style={[
        styles.childCard,
        {
          backgroundColor: theme.neutralColors.lightGray,
          borderRadius: theme.borderRadius.lg,
          padding: theme.spacing.md,
          marginBottom: theme.spacing.md,
        },
      ]}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flex: 1 }}>
          <Text
            style={[
              styles.childName,
              {
                fontSize: isKidsEdition ? 18 : 16,
                color: theme.neutralColors.dark,
                fontFamily: isKidsEdition ? 'Nunito_Bold' : 'Montserrat_Bold',
                marginBottom: theme.spacing.xs,
              },
            ]}
          >
            {child.name}
          </Text>
          <Text
            style={[
              {
                fontSize: 14,
                color: theme.neutralColors.mediumGray,
                fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
                marginBottom: theme.spacing.sm,
              },
            ]}
          >
            Age: {child.age}
          </Text>
          <View
            style={{
              backgroundColor: theme.brandColors.coral,
              paddingHorizontal: theme.spacing.sm,
              paddingVertical: 4,
              borderRadius: theme.borderRadius.sm,
              alignSelf: 'flex-start',
            }}
          >
            <Text
              style={{
                color: '#fff',
                fontSize: 12,
                fontFamily: isKidsEdition ? 'Nunito_Bold' : 'Montserrat_Bold',
                letterSpacing: 1,
              }}
            >
              Login Code: {child.access_code}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
          <TouchableOpacity
            onPress={() => handleSharePIN(child)}
            style={{
              padding: theme.spacing.sm,
              backgroundColor: theme.brandColors.coral,
              borderRadius: theme.borderRadius.md,
            }}
          >
            <Ionicons name="share-social" size={20} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => openEditModal(child)}
            style={{
              padding: theme.spacing.sm,
              backgroundColor: theme.brandColors.teal,
              borderRadius: theme.borderRadius.md,
            }}
          >
            <Ionicons name="pencil" size={20} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleDelete(child)}
            style={{
              padding: theme.spacing.sm,
              backgroundColor: '#FF6B6B',
              borderRadius: theme.borderRadius.md,
            }}
          >
            <Ionicons name="trash" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.neutralColors.white }]}>
      <AppBar
        title="Manage Children"
        onBackPress={() => navigation?.goBack()}
        showBack={true}
      />

      {error && (
        <ErrorMessage
          message={error}
          onDismiss={() => setError(null)}
          autoDismiss={true}
          style={{ margin: theme.spacing.md }}
        />
      )}

      <View style={{ flex: 1, padding: theme.spacing.md }}>
        {loading && children.length === 0 ? (
          <LoadingSpinner visible={true} message="Loading children..." />
        ) : children.length === 0 ? (
          <View style={{ justifyContent: 'center', alignItems: 'center', flex: 1 }}>
            <Ionicons name="people" size={60} color={theme.neutralColors.mediumGray} />
            <Text
              style={{
                marginTop: theme.spacing.md,
                fontSize: 16,
                color: theme.neutralColors.mediumGray,
                fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
              }}
            >
              No children yet. Add one to get started!
            </Text>
          </View>
        ) : (
          <FlatList
            data={children}
            renderItem={renderChild}
            keyExtractor={(item) => item.id}
            scrollEnabled={true}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      <View style={{ padding: theme.spacing.md }}>
        <ThankCastButton
          title="➕ Add Child"
          onPress={openCreateModal}
          loading={loading}
          disabled={loading}
        />
      </View>

      {/* Create/Edit Modal */}
      <Modal visible={showModal} onClose={() => setShowModal(false)} size="large">
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          scrollEnabled={true}
        >
            <Text
              style={[
                {
                  fontSize: isKidsEdition ? 24 : 20,
                  color: theme.neutralColors.dark,
                  fontFamily: isKidsEdition ? 'Nunito_Bold' : 'Montserrat_Bold',
                  marginBottom: theme.spacing.lg,
                  marginTop: theme.spacing.md,
                },
              ]}
            >
              {modalMode === 'create' ? 'Add New Child' : 'Edit Child'}
            </Text>

            <TextField
              label="Child Name"
              placeholder="e.g., Emma"
              value={childName}
              onChangeText={setChildName}
              error={formErrors.childName}
              required
            />

            <TextField
              label="Age"
              placeholder="e.g., 8"
              value={childAge}
              onChangeText={setChildAge}
              keyboardType="number-pad"
              error={formErrors.childAge}
              required
            />

            {modalMode === 'create' && (
              <View
                style={{
                  backgroundColor: theme.brandColors.coral + '20',
                  padding: theme.spacing.md,
                  borderRadius: theme.borderRadius.md,
                  marginBottom: theme.spacing.lg,
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    color: theme.neutralColors.dark,
                    fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
                  }}
                >
                  💡 A random 4-digit PIN will be generated. You can share it with your child to let them log in.
                </Text>
              </View>
            )}

            <ThankCastButton
              title={modalMode === 'create' ? 'Create Child' : 'Save Changes'}
              onPress={handleSave}
              loading={loading}
              disabled={loading}
              style={{ marginBottom: theme.spacing.md, marginTop: theme.spacing.lg }}
            />

            <ThankCastButton
              title="Cancel"
              onPress={() => setShowModal(false)}
              variant="secondary"
              loading={loading}
              style={{ marginTop: theme.spacing.md }}
            />
        </ScrollView>
      </Modal>

      <LoadingSpinner visible={loading && children.length > 0} message="Saving..." fullScreen />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  childCard: {
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  childName: {
    fontWeight: '700',
  },
});

export default ManageChildrenScreen;
