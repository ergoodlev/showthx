/**
 * FrameAssignmentScreen
 * Assign frame templates to events, children, or guests
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useEdition } from '../context/EditionContext';
import { AppBar } from '../components/AppBar';
import { Modal } from '../components/Modal';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { supabase } from '../supabaseClient';
import {
  assignFrame,
  bulkAssignFrame,
  getFrameAssignments,
  removeFrameAssignment,
  ASSIGNMENT_PRIORITY,
} from '../services/frameTemplateService';

export const FrameAssignmentScreen = ({ navigation, route }) => {
  const { edition, theme } = useEdition();
  const isKidsEdition = edition === 'kids';
  const template = route?.params?.template;

  // State
  const [assignments, setAssignments] = useState([]);
  const [events, setEvents] = useState([]);
  const [children, setChildren] = useState([]);
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Assignment form state
  const [assignmentType, setAssignmentType] = useState('event'); // event, child, guest
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [selectedChildIds, setSelectedChildIds] = useState([]);
  const [selectedGuestIds, setSelectedGuestIds] = useState([]);

  // Load data
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [template?.id])
  );

  const loadData = async () => {
    try {
      setLoading(true);

      // Load current assignments
      const assignResult = await getFrameAssignments(template.id);
      if (assignResult.success) {
        setAssignments(assignResult.data);
      }

      // Load events, children, guests for selection
      const { data: { user } } = await supabase.auth.getUser();

      const [eventsRes, childrenRes, guestsRes] = await Promise.all([
        supabase.from('events').select('id, name, event_date').eq('parent_id', user.id).order('event_date', { ascending: false }),
        supabase.from('children').select('id, name').eq('parent_id', user.id).order('name'),
        supabase.from('guests').select('id, name, email').eq('parent_id', user.id).order('name'),
      ]);

      setEvents(eventsRes.data || []);
      setChildren(childrenRes.data || []);
      setGuests(guestsRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setAssignmentType('event');
    setSelectedEventId(null);
    setSelectedChildIds([]);
    setSelectedGuestIds([]);
  };

  const handleAssign = async () => {
    try {
      setLoading(true);

      if (assignmentType === 'event' && selectedEventId) {
        // Assign to event only
        const result = await assignFrame(template.id, { eventId: selectedEventId });
        if (!result.success) throw new Error(result.error);
      } else if (assignmentType === 'child' && selectedChildIds.length > 0) {
        // Assign to specific children (optionally within an event)
        const result = await bulkAssignFrame(template.id, {
          eventId: selectedEventId,
          childIds: selectedChildIds,
        });
        if (!result.success) throw new Error(result.error);
      } else if (assignmentType === 'guest' && selectedGuestIds.length > 0) {
        // Assign to specific guests (optionally within an event)
        const result = await bulkAssignFrame(template.id, {
          eventId: selectedEventId,
          guestIds: selectedGuestIds,
        });
        if (!result.success) throw new Error(result.error);
      } else {
        Alert.alert('Validation', 'Please select at least one item to assign');
        setLoading(false);
        return;
      }

      setShowModal(false);
      loadData();
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to create assignment');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveAssignment = (assignment) => {
    Alert.alert(
      'Remove Assignment',
      'Are you sure you want to remove this frame assignment?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const result = await removeFrameAssignment(assignment.id);
            if (result.success) {
              loadData();
            } else {
              Alert.alert('Error', result.error);
            }
          },
        },
      ]
    );
  };

  const toggleChildSelection = (childId) => {
    if (selectedChildIds.includes(childId)) {
      setSelectedChildIds(selectedChildIds.filter(id => id !== childId));
    } else {
      setSelectedChildIds([...selectedChildIds, childId]);
    }
  };

  const toggleGuestSelection = (guestId) => {
    if (selectedGuestIds.includes(guestId)) {
      setSelectedGuestIds(selectedGuestIds.filter(id => id !== guestId));
    } else {
      setSelectedGuestIds([...selectedGuestIds, guestId]);
    }
  };

  const getAssignmentLabel = (assignment) => {
    if (assignment.gifts) return `Gift: ${assignment.gifts.name}`;
    if (assignment.guests) return `Guest: ${assignment.guests.name}`;
    if (assignment.children) return `Child: ${assignment.children.name}`;
    if (assignment.events) return `Event: ${assignment.events.name}`;
    return 'Unknown';
  };

  const getAssignmentIcon = (assignment) => {
    if (assignment.gift_id) return 'gift';
    if (assignment.guest_id) return 'person';
    if (assignment.child_id) return 'happy';
    if (assignment.event_id) return 'calendar';
    return 'help';
  };

  const getPriorityLabel = (priority) => {
    if (priority >= ASSIGNMENT_PRIORITY.GIFT) return 'Gift-specific';
    if (priority >= ASSIGNMENT_PRIORITY.GUEST) return 'Guest-specific';
    if (priority >= ASSIGNMENT_PRIORITY.CHILD) return 'Child-specific';
    return 'Event-wide';
  };

  const renderAssignmentCard = ({ item }) => (
    <View
      style={{
        backgroundColor: theme.neutralColors.white,
        borderWidth: 1,
        borderColor: theme.neutralColors.lightGray,
        borderRadius: 12,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.sm,
        flexDirection: 'row',
        alignItems: 'center',
      }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: theme.brandColors.teal + '20',
          justifyContent: 'center',
          alignItems: 'center',
          marginRight: theme.spacing.md,
        }}
      >
        <Ionicons name={getAssignmentIcon(item)} size={20} color={theme.brandColors.teal} />
      </View>

      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontSize: isKidsEdition ? 14 : 13,
            fontFamily: isKidsEdition ? 'Nunito_Bold' : 'Montserrat_SemiBold',
            color: theme.neutralColors.dark,
          }}
        >
          {getAssignmentLabel(item)}
        </Text>
        <Text
          style={{
            fontSize: 11,
            color: theme.neutralColors.mediumGray,
            marginTop: 2,
          }}
        >
          {getPriorityLabel(item.priority)}
        </Text>
      </View>

      <TouchableOpacity
        onPress={() => handleRemoveAssignment(item)}
        style={{ padding: 8 }}
      >
        <Ionicons name="close-circle" size={24} color={theme.semanticColors.error} />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.neutralColors.white }}>
      <AppBar
        title="Assign Frame"
        onBackPress={() => navigation?.goBack()}
        showBack={true}
      />

      <ScrollView style={{ flex: 1 }}>
        {/* Template Info */}
        <View
          style={{
            backgroundColor: theme.brandColors.coral + '10',
            margin: theme.spacing.md,
            padding: theme.spacing.md,
            borderRadius: 12,
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          {/* Mini preview */}
          <View
            style={{
              width: 50,
              height: 70,
              backgroundColor: '#000',
              borderRadius: 6,
              marginRight: theme.spacing.md,
              overflow: 'hidden',
            }}
          >
            {template?.frame_type === 'neon-border' && (
              <View style={{ flex: 1, borderWidth: 2, borderColor: template.primary_color, borderRadius: 4 }} />
            )}
            {template?.frame_type === 'minimal' && (
              <View style={{ flex: 1, margin: 2, borderWidth: 1, borderColor: '#FFF8', borderRadius: 2 }} />
            )}
          </View>

          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: isKidsEdition ? 16 : 14,
                fontFamily: isKidsEdition ? 'Nunito_Bold' : 'Montserrat_Bold',
                color: theme.neutralColors.dark,
              }}
            >
              {template?.name}
            </Text>
            <Text
              style={{
                fontSize: 12,
                color: theme.neutralColors.mediumGray,
                marginTop: 2,
              }}
            >
              Assign this frame to events, children, or guests
            </Text>
          </View>
        </View>

        {/* Current Assignments */}
        <View style={{ marginHorizontal: theme.spacing.md, marginBottom: theme.spacing.md }}>
          <Text
            style={{
              fontSize: isKidsEdition ? 16 : 14,
              fontFamily: isKidsEdition ? 'Nunito_Bold' : 'Montserrat_SemiBold',
              color: theme.neutralColors.dark,
              marginBottom: theme.spacing.md,
            }}
          >
            Current Assignments ({assignments.length})
          </Text>

          {assignments.length > 0 ? (
            <FlatList
              data={assignments}
              renderItem={renderAssignmentCard}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
            />
          ) : (
            <View
              style={{
                paddingVertical: theme.spacing.xl,
                alignItems: 'center',
                backgroundColor: theme.neutralColors.lightGray,
                borderRadius: 12,
              }}
            >
              <Ionicons name="link-outline" size={40} color={theme.neutralColors.mediumGray} />
              <Text
                style={{
                  fontSize: 13,
                  color: theme.neutralColors.mediumGray,
                  marginTop: theme.spacing.sm,
                }}
              >
                No assignments yet
              </Text>
            </View>
          )}
        </View>

        {/* Info Box */}
        <View
          style={{
            marginHorizontal: theme.spacing.md,
            marginBottom: theme.spacing.lg,
            backgroundColor: theme.brandColors.teal + '10',
            borderRadius: 8,
            padding: theme.spacing.md,
          }}
        >
          <Text style={{ fontSize: 12, color: theme.neutralColors.dark, lineHeight: 18 }}>
            <Text style={{ fontWeight: 'bold' }}>Priority:</Text> More specific assignments take precedence.
            {'\n'}Gift-specific > Guest-specific > Child-specific > Event-wide
          </Text>
        </View>
      </ScrollView>

      {/* Add Assignment FAB */}
      <TouchableOpacity
        onPress={() => {
          resetForm();
          setShowModal(true);
        }}
        style={{
          position: 'absolute',
          bottom: theme.spacing.lg,
          right: theme.spacing.lg,
          backgroundColor: theme.brandColors.coral,
          width: 56,
          height: 56,
          borderRadius: 28,
          justifyContent: 'center',
          alignItems: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 8,
        }}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Assignment Modal */}
      <Modal
        visible={showModal}
        onClose={() => setShowModal(false)}
        title="Add Assignment"
        size="large"
        actions={[
          { label: 'Cancel', onPress: () => setShowModal(false), variant: 'outline' },
          { label: 'Assign', onPress: handleAssign, variant: 'primary' },
        ]}
      >
        <ScrollView style={{ maxHeight: 450 }} showsVerticalScrollIndicator={false}>
          {/* Assignment Type */}
          <Text style={{ fontSize: 12, fontWeight: '600', marginBottom: 8 }}>Assignment Type</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: theme.spacing.md }}>
            {[
              { id: 'event', label: 'Event', icon: 'calendar' },
              { id: 'child', label: 'Children', icon: 'happy' },
              { id: 'guest', label: 'Guests', icon: 'person' },
            ].map((type) => (
              <TouchableOpacity
                key={type.id}
                onPress={() => setAssignmentType(type.id)}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 8,
                  backgroundColor: assignmentType === type.id ? theme.brandColors.coral : theme.neutralColors.lightGray,
                  alignItems: 'center',
                }}
              >
                <Ionicons
                  name={type.icon}
                  size={20}
                  color={assignmentType === type.id ? '#FFF' : theme.neutralColors.mediumGray}
                />
                <Text
                  style={{
                    marginTop: 4,
                    fontSize: 11,
                    color: assignmentType === type.id ? '#FFF' : theme.neutralColors.dark,
                  }}
                >
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Event Selection (always shown for context) */}
          <Text style={{ fontSize: 12, fontWeight: '600', marginBottom: 8 }}>
            {assignmentType === 'event' ? 'Select Event' : 'Event (Optional)'}
          </Text>
          <View style={{ marginBottom: theme.spacing.md }}>
            {events.map((event) => (
              <TouchableOpacity
                key={event.id}
                onPress={() => setSelectedEventId(selectedEventId === event.id ? null : event.id)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: theme.spacing.sm,
                  borderRadius: 8,
                  backgroundColor: selectedEventId === event.id ? theme.brandColors.teal + '20' : 'transparent',
                  marginBottom: 4,
                }}
              >
                <Ionicons
                  name={selectedEventId === event.id ? 'checkbox' : 'square-outline'}
                  size={20}
                  color={selectedEventId === event.id ? theme.brandColors.teal : theme.neutralColors.mediumGray}
                />
                <Text style={{ marginLeft: 8, fontSize: 13 }}>{event.name}</Text>
              </TouchableOpacity>
            ))}
            {events.length === 0 && (
              <Text style={{ fontSize: 12, color: theme.neutralColors.mediumGray, fontStyle: 'italic' }}>
                No events created yet
              </Text>
            )}
          </View>

          {/* Children Selection (if type is child) */}
          {assignmentType === 'child' && (
            <>
              <Text style={{ fontSize: 12, fontWeight: '600', marginBottom: 8 }}>Select Children</Text>
              <View style={{ marginBottom: theme.spacing.md }}>
                {children.map((child) => (
                  <TouchableOpacity
                    key={child.id}
                    onPress={() => toggleChildSelection(child.id)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      padding: theme.spacing.sm,
                      borderRadius: 8,
                      backgroundColor: selectedChildIds.includes(child.id) ? theme.brandColors.teal + '20' : 'transparent',
                      marginBottom: 4,
                    }}
                  >
                    <Ionicons
                      name={selectedChildIds.includes(child.id) ? 'checkbox' : 'square-outline'}
                      size={20}
                      color={selectedChildIds.includes(child.id) ? theme.brandColors.teal : theme.neutralColors.mediumGray}
                    />
                    <Text style={{ marginLeft: 8, fontSize: 13 }}>{child.name}</Text>
                  </TouchableOpacity>
                ))}
                {children.length === 0 && (
                  <Text style={{ fontSize: 12, color: theme.neutralColors.mediumGray, fontStyle: 'italic' }}>
                    No children added yet
                  </Text>
                )}
              </View>
            </>
          )}

          {/* Guests Selection (if type is guest) */}
          {assignmentType === 'guest' && (
            <>
              <Text style={{ fontSize: 12, fontWeight: '600', marginBottom: 8 }}>Select Guests</Text>
              <View style={{ marginBottom: theme.spacing.md, maxHeight: 200 }}>
                <ScrollView nestedScrollEnabled>
                  {guests.map((guest) => (
                    <TouchableOpacity
                      key={guest.id}
                      onPress={() => toggleGuestSelection(guest.id)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        padding: theme.spacing.sm,
                        borderRadius: 8,
                        backgroundColor: selectedGuestIds.includes(guest.id) ? theme.brandColors.teal + '20' : 'transparent',
                        marginBottom: 4,
                      }}
                    >
                      <Ionicons
                        name={selectedGuestIds.includes(guest.id) ? 'checkbox' : 'square-outline'}
                        size={20}
                        color={selectedGuestIds.includes(guest.id) ? theme.brandColors.teal : theme.neutralColors.mediumGray}
                      />
                      <View style={{ marginLeft: 8, flex: 1 }}>
                        <Text style={{ fontSize: 13 }}>{guest.name}</Text>
                        {guest.email && (
                          <Text style={{ fontSize: 10, color: theme.neutralColors.mediumGray }}>{guest.email}</Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                {guests.length === 0 && (
                  <Text style={{ fontSize: 12, color: theme.neutralColors.mediumGray, fontStyle: 'italic' }}>
                    No guests added yet
                  </Text>
                )}
              </View>
            </>
          )}
        </ScrollView>
      </Modal>

      <LoadingSpinner visible={loading} message="Loading..." fullScreen />
    </SafeAreaView>
  );
};

export default FrameAssignmentScreen;
