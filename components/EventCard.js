/**
 * EventCard Component
 * Displays event information in a card format
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

export const EventCard = ({
  eventName,
  eventType,
  eventDate,
  giftCount,
  kidCount,
  onPress,
  onEdit,
  onDelete,
  style,
}) => {
  const { edition, theme } = useEdition();
  const isKidsEdition = edition === 'kids';

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.neutral.white,
          borderRadius: isKidsEdition
            ? theme.borderRadius.medium
            : theme.borderRadius.small,
          borderColor: theme.colors.neutral.lightGray,
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
                color: theme.colors.neutral.dark,
                fontFamily: isKidsEdition ? 'Nunito_Bold' : 'Montserrat_Bold',
              },
            ]}
            numberOfLines={1}
          >
            {eventName}
          </Text>
          {eventType && (
            <Text
              style={[
                styles.type,
                {
                  fontSize: isKidsEdition ? 12 : 11,
                  color: theme.colors.neutral.mediumGray,
                  fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
                  marginTop: 4,
                },
              ]}
            >
              {eventType}
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
                color={theme.colors.brand.teal}
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
                color={theme.colors.semantic.error}
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
        {eventDate && (
          <View style={styles.detail}>
            <Ionicons
              name="calendar"
              size={14}
              color={theme.colors.brand.coral}
            />
            <Text
              style={[
                styles.detailText,
                {
                  fontSize: isKidsEdition ? 12 : 11,
                  color: theme.colors.neutral.mediumGray,
                  fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
                  marginLeft: 6,
                },
              ]}
            >
              {formatDate(eventDate)}
            </Text>
          </View>
        )}

        <View style={styles.detailsRow}>
          {giftCount !== undefined && (
            <View style={[
              styles.detail,
              {
                flex: 1,
              },
            ]}>
              <Ionicons
                name="gift"
                size={14}
                color={theme.colors.brand.coral}
              />
              <Text
                style={[
                  styles.detailText,
                  {
                    fontSize: isKidsEdition ? 12 : 11,
                    color: theme.colors.neutral.mediumGray,
                    fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
                    marginLeft: 6,
                  },
                ]}
              >
                {giftCount} {giftCount === 1 ? 'gift' : 'gifts'}
              </Text>
            </View>
          )}

          {kidCount !== undefined && (
            <View style={[
              styles.detail,
              {
                flex: 1,
              },
            ]}>
              <Ionicons
                name="people"
                size={14}
                color={theme.colors.brand.coral}
              />
              <Text
                style={[
                  styles.detailText,
                  {
                    fontSize: isKidsEdition ? 12 : 11,
                    color: theme.colors.neutral.mediumGray,
                    fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
                    marginLeft: 6,
                  },
                ]}
              >
                {kidCount} {kidCount === 1 ? 'kid' : 'kids'}
              </Text>
            </View>
          )}
        </View>
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
  type: {
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
  detailsRow: {
    flexDirection: 'row',
    marginTop: 8,
  },
  detail: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    fontWeight: '400',
  },
});

export default EventCard;
