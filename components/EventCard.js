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
    <View
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
    >
      {/* Event Header */}
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
            {eventName}
          </Text>
          {eventType && (
            <Text
              style={[
                styles.type,
                {
                  fontSize: isKidsEdition ? 12 : 11,
                  color: theme.neutralColors.gray,
                  fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
                  marginTop: 4,
                },
              ]}
            >
              {eventType}
            </Text>
          )}
        </View>
      </View>

      {/* Event Details */}
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
              color={theme.brandColors.coral}
            />
            <Text
              style={[
                styles.detailText,
                {
                  fontSize: isKidsEdition ? 12 : 11,
                  color: theme.neutralColors.gray,
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
                color={theme.brandColors.coral}
              />
              <Text
                style={[
                  styles.detailText,
                  {
                    fontSize: isKidsEdition ? 12 : 11,
                    color: theme.neutralColors.gray,
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
                color={theme.brandColors.coral}
              />
              <Text
                style={[
                  styles.detailText,
                  {
                    fontSize: isKidsEdition ? 12 : 11,
                    color: theme.neutralColors.gray,
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

      {/* Action Buttons - Clear labels for each action */}
      <View
        style={{
          marginTop: theme.spacing.md,
          paddingTop: theme.spacing.sm,
          borderTopWidth: 1,
          borderTopColor: theme.neutralColors.lightGray,
          flexDirection: 'row',
          gap: 8,
        }}
      >
        {/* Main Action: Manage Guests */}
        <TouchableOpacity
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme.brandColors.coral,
            paddingVertical: theme.spacing.sm,
            paddingHorizontal: theme.spacing.sm,
            borderRadius: 6,
          }}
          onPress={onPress}
          activeOpacity={0.7}
        >
          <Ionicons name="people" size={16} color="#FFFFFF" />
          <Text
            style={{
              color: '#FFFFFF',
              fontSize: isKidsEdition ? 12 : 11,
              fontFamily: isKidsEdition ? 'Nunito_SemiBold' : 'Montserrat_SemiBold',
              marginLeft: 6,
            }}
          >
            Guests & Gifts
          </Text>
        </TouchableOpacity>

        {/* Edit Settings - Frames, Email Template, Event Details */}
        {onEdit && (
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: theme.brandColors.teal,
              paddingVertical: theme.spacing.sm,
              paddingHorizontal: theme.spacing.md,
              borderRadius: 6,
            }}
            onPress={onEdit}
          >
            <Ionicons name="color-palette-outline" size={16} color="#FFFFFF" />
            <Text
              style={{
                color: '#FFFFFF',
                fontSize: isKidsEdition ? 12 : 11,
                fontFamily: isKidsEdition ? 'Nunito_SemiBold' : 'Montserrat_SemiBold',
                marginLeft: 4,
              }}
            >
              Frames & Email
            </Text>
          </TouchableOpacity>
        )}

        {/* Delete */}
        {onDelete && (
          <TouchableOpacity
            style={{
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              paddingVertical: theme.spacing.sm,
              paddingHorizontal: theme.spacing.sm,
              borderRadius: 6,
              borderWidth: 1,
              borderColor: theme.semanticColors.error,
            }}
            onPress={onDelete}
          >
            <Ionicons name="trash-outline" size={16} color={theme.semanticColors.error} />
          </TouchableOpacity>
        )}
      </View>
    </View>
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
