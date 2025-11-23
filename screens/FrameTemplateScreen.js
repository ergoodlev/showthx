/**
 * FrameTemplateScreen
 * Create and manage custom frame templates for events
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  FlatList,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useEdition } from '../context/EditionContext';
import { AppBar } from '../components/AppBar';
import { Modal } from '../components/Modal';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ThankCastButton } from '../components/ThankCastButton';
import {
  createFrameTemplate,
  getFrameTemplates,
  updateFrameTemplate,
  deleteFrameTemplate,
  FRAME_TYPES,
  PATTERNS,
  PRESET_COLORS,
} from '../services/frameTemplateService';

export const FrameTemplateScreen = ({ navigation, route }) => {
  const { edition, theme } = useEdition();
  const isKidsEdition = edition === 'kids';

  // State
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [editingTemplate, setEditingTemplate] = useState(null);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [frameType, setFrameType] = useState('minimal');
  const [primaryColor, setPrimaryColor] = useState('#FF6B6B');
  const [secondaryColor, setSecondaryColor] = useState('#FFD93D');
  const [pattern, setPattern] = useState('none');
  const [textPosition, setTextPosition] = useState('bottom');
  const [textColor, setTextColor] = useState('#FFFFFF');

  // Load templates on focus
  useFocusEffect(
    useCallback(() => {
      loadTemplates();
    }, [])
  );

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const result = await getFrameTemplates();
      if (result.success) {
        setTemplates(result.data);
      } else {
        Alert.alert('Error', result.error);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setFrameType('minimal');
    setPrimaryColor('#FF6B6B');
    setSecondaryColor('#FFD93D');
    setPattern('none');
    setTextPosition('bottom');
    setTextColor('#FFFFFF');
    setEditingTemplate(null);
  };

  const openCreateModal = () => {
    resetForm();
    setModalMode('create');
    setShowModal(true);
  };

  const openEditModal = (template) => {
    setEditingTemplate(template);
    setName(template.name);
    setDescription(template.description || '');
    setFrameType(template.frame_type);
    setPrimaryColor(template.primary_color);
    setSecondaryColor(template.secondary_color);
    setPattern(template.pattern);
    setTextPosition(template.default_text_position);
    setTextColor(template.default_text_color);
    setModalMode('edit');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Validation', 'Please enter a template name');
      return;
    }

    try {
      setLoading(true);
      const templateData = {
        name: name.trim(),
        description: description.trim() || null,
        frameType,
        primaryColor,
        secondaryColor,
        pattern,
        textPosition,
        textColor,
      };

      let result;
      if (modalMode === 'create') {
        result = await createFrameTemplate(templateData);
      } else {
        result = await updateFrameTemplate(editingTemplate.id, templateData);
      }

      if (result.success) {
        setShowModal(false);
        loadTemplates();
      } else {
        Alert.alert('Error', result.error);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to save template');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (template) => {
    Alert.alert(
      'Delete Template',
      `Are you sure you want to delete "${template.name}"? This will remove all assignments.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const result = await deleteFrameTemplate(template.id);
            if (result.success) {
              loadTemplates();
            } else {
              Alert.alert('Error', result.error);
            }
          },
        },
      ]
    );
  };

  const renderFramePreview = () => {
    const color1 = primaryColor;
    const color2 = secondaryColor;

    return (
      <View
        style={{
          width: 120,
          height: 160,
          backgroundColor: '#000',
          borderRadius: 8,
          overflow: 'hidden',
          alignSelf: 'center',
          marginVertical: theme.spacing.md,
        }}
      >
        {/* Frame overlay based on type */}
        {frameType === 'gradient-glow' && (
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 20, backgroundColor: `${color1}66` }} />
            <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 20, backgroundColor: `${color2}66` }} />
            <View style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 4, backgroundColor: `${color1}99` }} />
            <View style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 4, backgroundColor: `${color2}99` }} />
          </View>
        )}
        {frameType === 'neon-border' && (
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderWidth: 3, borderColor: color1, borderRadius: 8 }} />
        )}
        {frameType === 'minimal' && (
          <View style={{ position: 'absolute', top: 4, left: 4, right: 4, bottom: 4, borderWidth: 2, borderColor: '#FFFFFF88', borderRadius: 4 }} />
        )}
        {frameType === 'celebration' && (
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
            <View style={{ position: 'absolute', top: 4, left: 4, width: 10, height: 10, borderRadius: 5, backgroundColor: color1 }} />
            <View style={{ position: 'absolute', top: 4, right: 4, width: 8, height: 8, borderRadius: 4, backgroundColor: color2 }} />
            <View style={{ position: 'absolute', bottom: 4, left: 10, width: 7, height: 7, borderRadius: 4, backgroundColor: color2 }} />
            <View style={{ position: 'absolute', bottom: 6, right: 8, width: 9, height: 9, borderRadius: 5, backgroundColor: color1 }} />
          </View>
        )}

        {/* Text position indicator */}
        <View
          style={{
            position: 'absolute',
            left: 8,
            right: 8,
            top: textPosition === 'top' ? 8 : textPosition === 'middle' ? '40%' : undefined,
            bottom: textPosition === 'bottom' ? 8 : undefined,
            backgroundColor: 'rgba(0,0,0,0.5)',
            borderRadius: 4,
            padding: 4,
          }}
        >
          <Text style={{ color: textColor, fontSize: 8, textAlign: 'center' }}>Text Here</Text>
        </View>
      </View>
    );
  };

  const renderTemplateCard = ({ item }) => (
    <TouchableOpacity
      onPress={() => navigation?.navigate('FrameAssignment', { template: item })}
      style={{
        backgroundColor: theme.neutralColors.white,
        borderWidth: 1,
        borderColor: theme.neutralColors.lightGray,
        borderRadius: 12,
        padding: theme.spacing.md,
        marginHorizontal: theme.spacing.md,
        marginBottom: theme.spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
      }}
    >
      {/* Mini frame preview */}
      <View
        style={{
          width: 60,
          height: 80,
          backgroundColor: '#000',
          borderRadius: 6,
          overflow: 'hidden',
          marginRight: theme.spacing.md,
        }}
      >
        {item.frame_type === 'neon-border' && (
          <View style={{ flex: 1, borderWidth: 2, borderColor: item.primary_color, borderRadius: 4 }} />
        )}
        {item.frame_type === 'minimal' && (
          <View style={{ flex: 1, margin: 2, borderWidth: 1, borderColor: '#FFF8', borderRadius: 2 }} />
        )}
        {item.frame_type === 'gradient-glow' && (
          <View style={{ flex: 1 }}>
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 10, backgroundColor: `${item.primary_color}66` }} />
            <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 10, backgroundColor: `${item.secondary_color}66` }} />
          </View>
        )}
        {item.frame_type === 'celebration' && (
          <View style={{ flex: 1 }}>
            <View style={{ position: 'absolute', top: 2, left: 2, width: 6, height: 6, borderRadius: 3, backgroundColor: item.primary_color }} />
            <View style={{ position: 'absolute', bottom: 2, right: 2, width: 5, height: 5, borderRadius: 3, backgroundColor: item.secondary_color }} />
          </View>
        )}
      </View>

      {/* Template info */}
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
        {item.description && (
          <Text
            style={{
              fontSize: isKidsEdition ? 12 : 11,
              fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
              color: theme.neutralColors.mediumGray,
              marginBottom: 4,
            }}
            numberOfLines={1}
          >
            {item.description}
          </Text>
        )}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: item.primary_color }} />
          <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: item.secondary_color }} />
          <Text
            style={{
              fontSize: 10,
              color: theme.neutralColors.mediumGray,
              textTransform: 'capitalize',
            }}
          >
            {item.frame_type.replace('-', ' ')}
          </Text>
        </View>
      </View>

      {/* Actions */}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TouchableOpacity onPress={() => openEditModal(item)} style={{ padding: 8 }}>
          <Ionicons name="pencil" size={20} color={theme.brandColors.teal} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleDelete(item)} style={{ padding: 8 }}>
          <Ionicons name="trash-outline" size={20} color={theme.semanticColors.error} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.neutralColors.white }}>
      <AppBar
        title="Frame Templates"
        onBackPress={() => navigation?.goBack()}
        showBack={true}
      />

      {loading && templates.length === 0 ? (
        <LoadingSpinner visible message="Loading templates..." />
      ) : (
        <FlatList
          data={templates}
          renderItem={renderTemplateCard}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={
            <View style={{ padding: theme.spacing.md }}>
              <Text
                style={{
                  fontSize: isKidsEdition ? 14 : 12,
                  fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
                  color: theme.neutralColors.mediumGray,
                  marginBottom: theme.spacing.md,
                }}
              >
                Create custom frames for your events. Kids can choose colors and patterns within your template design.
              </Text>
            </View>
          }
          ListEmptyComponent={
            <View style={{ paddingVertical: 60, alignItems: 'center', paddingHorizontal: theme.spacing.lg }}>
              <Ionicons name="color-palette-outline" size={64} color={theme.neutralColors.lightGray} />
              <Text
                style={{
                  fontSize: isKidsEdition ? 16 : 14,
                  fontFamily: isKidsEdition ? 'Nunito_SemiBold' : 'Montserrat_SemiBold',
                  color: theme.neutralColors.mediumGray,
                  marginTop: theme.spacing.md,
                  textAlign: 'center',
                }}
              >
                No frame templates yet
              </Text>
              <Text
                style={{
                  fontSize: isKidsEdition ? 14 : 12,
                  fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
                  color: theme.neutralColors.mediumGray,
                  marginTop: theme.spacing.sm,
                  textAlign: 'center',
                }}
              >
                Create your first template to customize how thank you videos look!
              </Text>
            </View>
          }
          contentContainerStyle={{ paddingBottom: 100 }}
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        onPress={openCreateModal}
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

      {/* Create/Edit Modal */}
      <Modal
        visible={showModal}
        onClose={() => setShowModal(false)}
        title={modalMode === 'create' ? 'Create Frame Template' : 'Edit Template'}
        size="large"
        actions={[
          { label: 'Cancel', onPress: () => setShowModal(false), variant: 'outline' },
          { label: modalMode === 'create' ? 'Create' : 'Save', onPress: handleSave, variant: 'primary' },
        ]}
      >
        <ScrollView style={{ maxHeight: 500 }} showsVerticalScrollIndicator={false}>
          {/* Preview */}
          {renderFramePreview()}

          {/* Name */}
          <Text style={{ fontSize: 12, fontWeight: '600', color: theme.neutralColors.dark, marginBottom: 4 }}>
            Template Name *
          </Text>
          <TextInput
            placeholder="e.g., Emma's Birthday Frame"
            value={name}
            onChangeText={setName}
            style={{
              borderWidth: 1,
              borderColor: theme.neutralColors.lightGray,
              borderRadius: 8,
              padding: theme.spacing.sm,
              marginBottom: theme.spacing.md,
            }}
          />

          {/* Description */}
          <Text style={{ fontSize: 12, fontWeight: '600', color: theme.neutralColors.dark, marginBottom: 4 }}>
            Description (Optional)
          </Text>
          <TextInput
            placeholder="Notes about this template"
            value={description}
            onChangeText={setDescription}
            multiline
            style={{
              borderWidth: 1,
              borderColor: theme.neutralColors.lightGray,
              borderRadius: 8,
              padding: theme.spacing.sm,
              marginBottom: theme.spacing.md,
              minHeight: 60,
            }}
          />

          {/* Frame Type */}
          <Text style={{ fontSize: 12, fontWeight: '600', color: theme.neutralColors.dark, marginBottom: 8 }}>
            Frame Style
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: theme.spacing.md }}>
            {FRAME_TYPES.filter(f => f.id !== 'none').map((type) => (
              <TouchableOpacity
                key={type.id}
                onPress={() => setFrameType(type.id)}
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  borderRadius: 8,
                  backgroundColor: frameType === type.id ? theme.brandColors.coral : theme.neutralColors.lightGray,
                }}
              >
                <Text style={{ color: frameType === type.id ? '#FFF' : theme.neutralColors.dark, fontSize: 12 }}>
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Colors */}
          <Text style={{ fontSize: 12, fontWeight: '600', color: theme.neutralColors.dark, marginBottom: 8 }}>
            Primary Color
          </Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: theme.spacing.md }}>
            {PRESET_COLORS.map((color) => (
              <TouchableOpacity
                key={color.id}
                onPress={() => setPrimaryColor(color.hex)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: color.hex,
                  borderWidth: primaryColor === color.hex ? 3 : 0,
                  borderColor: theme.neutralColors.dark,
                }}
              />
            ))}
          </View>

          <Text style={{ fontSize: 12, fontWeight: '600', color: theme.neutralColors.dark, marginBottom: 8 }}>
            Secondary Color
          </Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: theme.spacing.md }}>
            {PRESET_COLORS.map((color) => (
              <TouchableOpacity
                key={color.id}
                onPress={() => setSecondaryColor(color.hex)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: color.hex,
                  borderWidth: secondaryColor === color.hex ? 3 : 0,
                  borderColor: theme.neutralColors.dark,
                }}
              />
            ))}
          </View>

          {/* Pattern */}
          <Text style={{ fontSize: 12, fontWeight: '600', color: theme.neutralColors.dark, marginBottom: 8 }}>
            Pattern Overlay
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: theme.spacing.md }}>
            {PATTERNS.map((p) => (
              <TouchableOpacity
                key={p.id}
                onPress={() => setPattern(p.id)}
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  borderRadius: 8,
                  backgroundColor: pattern === p.id ? theme.brandColors.teal : theme.neutralColors.lightGray,
                }}
              >
                <Text style={{ color: pattern === p.id ? '#FFF' : theme.neutralColors.dark, fontSize: 12 }}>
                  {p.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Text Position */}
          <Text style={{ fontSize: 12, fontWeight: '600', color: theme.neutralColors.dark, marginBottom: 8 }}>
            Default Text Position
          </Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: theme.spacing.lg }}>
            {['top', 'middle', 'bottom'].map((pos) => (
              <TouchableOpacity
                key={pos}
                onPress={() => setTextPosition(pos)}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 8,
                  backgroundColor: textPosition === pos ? theme.brandColors.coral : theme.neutralColors.lightGray,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: textPosition === pos ? '#FFF' : theme.neutralColors.dark, fontSize: 12, textTransform: 'capitalize' }}>
                  {pos}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </Modal>

      <LoadingSpinner visible={loading && templates.length > 0} message="Saving..." fullScreen />
    </SafeAreaView>
  );
};

export default FrameTemplateScreen;
