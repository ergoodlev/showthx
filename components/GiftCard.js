/**
 * GiftCard Component
 * Displays gift information with status
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useEdition } from '../context/EditionContext';

export const GiftCard = ({
  giftName,
  giverName,
  status = 'pending', // 'pending', 'recorded', 'approved', 'sent'
  assignedKids,
  onPress,
  onEdit,
  onDelete,
  style,
}) => {
  const { edition, theme } = useEdition();
  const isKidsEdition = edition === 'kids';

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return { name: 'radio-button-off', color: theme.semanticColors.warning };
      case 'recorded':
        return { name: 'radio-button-off', color: theme.brandColors.teal };
      case 'approved':
        return { name: 'checkmark-circle', color: theme.semanticColors.success };
      case 'sent':
        return { name: 'checkmark-done-all', color: theme.semanticColors.success };
      default:
        return { name: 'radio-button-off', color: theme.neutralColors.gray };
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending':
        return 'Pending Thank You';
      case 'recorded':
        return 'Parent Reviewing';
      case 'approved':
        return 'Approved';
      case 'sent':
        return 'Sent to Guests';
      default:
        return 'Pending';
    }
  };

  const statusIcon = getStatusIcon(status);

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: theme.neutralColors.white,
          borderRadius: isKidsEdition
            ? theme.borderRadius.medium
            : theme.borderRadius.small,
          borderColor: theme.neutralColors.lightGray,
          padding: isKidsEdition ? theme.spacing.md : theme.spacing.sm,
          marginBottom: theme.spacing.md,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 4,
          elevation: 2,
        },
        style,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={styles.titleSection}>
          <Text
            style={[
              styles.title,
              {
                fontSize: isKidsEdition ? 16 : 14,
                color: theme.neutralColors.dark,
                fontFamily: isKidsEdition ? 'Nunito_Bold' : 'Montserrat_Bold',
              },
            ]}
            numberOfLines={1}
          >
            {giftName}
          </Text>
          {giverName && (
            <Text
              style={[
                styles.giver,
                {
                  fontSize: isKidsEdition ? 13 : 12,
                  color: theme.neutralColors.gray,
                  fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
                  marginTop: 4,
                },
              ]}
            >
              From: {giverName}
            </Text>
          )}
        </View>

        <View style={styles.actions}>
          {onEdit && (
            <TouchableOpacity
              style={styles.iconButton}
              onPress={onEdit}
            >
              <Ionicons
                name="pencil"
                size={18}
                color={theme.brandColors.teal}
              />
            </TouchableOpacity>
          )}
          {onDelete && (
            <TouchableOpacity
              style={styles.iconButton}
              onPress={onDelete}
            >
              <Ionicons
                name="trash"
                size={18}
                color={theme.semanticColors.error}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={[
        styles.details,
        {
          marginTop: theme.spacing.sm,
        },
      ]}>
        {/* Status */}
        <View style={styles.statusRow}>
          <Ionicons
            name={statusIcon.name}
            size={16}
            color={statusIcon.color}
          />
          <Text
            style={[
              styles.statusText,
              {
                color: statusIcon.color,
                marginLeft: 6,
                fontSize: isKidsEdition ? 13 : 12,
                fontFamily: isKidsEdition ? 'Nunito_SemiBold' : 'Montserrat_SemiBold',
              },
            ]}
          >
            {getStatusText(status)}
          </Text>
        </View>

        {/* Assigned Kids */}
        {assignedKids && assignedKids.length > 0 && (
          <View style={[
            styles.kidsRow,
            {
              marginTop: theme.spacing.xs,
            },
          ]}>
            <Ionicons
              name="people"
              size={14}
              color={theme.brandColors.coral}
            />
            <Text
              style={[
                styles.kidsText,
                {
                  color: theme.neutralColors.gray,
                  marginLeft: 6,
                  fontSize: isKidsEdition ? 12 : 11,
                  fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
                },
              ]}
              numberOfLines={1}
            >
              {assignedKids.join(', ')}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleSection: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    fontWeight: '700',
  },
  giver: {
    fontWeight: '400',
  },
  actions: {
    flexDirection: 'row',
  },
  iconButton: {
    padding: 8,
    marginLeft: 8,
  },
  details: {
    justifyContent: 'space-between',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontWeight: '600',
  },
  kidsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  kidsText: {
    fontWeight: '400',
    flex: 1,
  },
});

export default GiftCard;
