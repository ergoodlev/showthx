/**
 * AppBar Component
 * Edition-aware header component for screens
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useEdition } from '../context/EditionContext';

export const AppBar = ({
  title,
  subtitle,
  onBackPress,
  onMenuPress,
  rightButton,
  showBack = true,
  showMenu = false,
  backgroundColor,
  style,
}) => {
  const { edition, theme } = useEdition();
  const isKidsEdition = edition === 'kids';

  const height = isKidsEdition ? 64 : 56;
  const titleSize = isKidsEdition ? 20 : 18;
  const subtitleSize = isKidsEdition ? 14 : 12;
  const padding = isKidsEdition ? theme.spacing.md : theme.spacing.sm;

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        {
          backgroundColor: backgroundColor || theme.colors.neutral.white,
        },
      ]}
    >
      <View
        style={[
          styles.appBar,
          {
            height,
            paddingHorizontal: padding,
            backgroundColor: backgroundColor || theme.colors.neutral.white,
            borderBottomColor: theme.colors.neutral.lightGray,
          },
          style,
        ]}
      >
        {/* Left Action */}
        <View style={styles.leftAction}>
          {showBack && (
            <TouchableOpacity
              onPress={onBackPress}
              style={styles.iconButton}
              disabled={!onBackPress}
            >
              <Ionicons
                name="chevron-back"
                size={isKidsEdition ? 28 : 24}
                color={theme.colors.brand.coral}
              />
            </TouchableOpacity>
          )}
        </View>

        {/* Center Title */}
        <View style={styles.centerContent}>
          {title && (
            <Text
              style={[
                styles.title,
                {
                  fontSize: titleSize,
                  color: theme.colors.neutral.dark,
                  fontFamily: isKidsEdition ? 'Nunito_Bold' : 'Montserrat_Bold',
                },
              ]}
              numberOfLines={1}
            >
              {title}
            </Text>
          )}
          {subtitle && (
            <Text
              style={[
                styles.subtitle,
                {
                  fontSize: subtitleSize,
                  color: theme.colors.neutral.mediumGray,
                  fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
                },
              ]}
              numberOfLines={1}
            >
              {subtitle}
            </Text>
          )}
        </View>

        {/* Right Action */}
        <View style={styles.rightAction}>
          {rightButton ? (
            <TouchableOpacity
              onPress={rightButton.onPress}
              style={styles.iconButton}
            >
              {rightButton.icon}
            </TouchableOpacity>
          ) : showMenu ? (
            <TouchableOpacity
              onPress={onMenuPress}
              style={styles.iconButton}
            >
              <Ionicons
                name="menu"
                size={isKidsEdition ? 28 : 24}
                color={theme.colors.brand.coral}
              />
            </TouchableOpacity>
          ) : (
            <View style={styles.iconButton} />
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    borderBottomWidth: 1,
  },
  appBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  leftAction: {
    justifyContent: 'center',
    alignItems: 'flex-start',
    width: 50,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  rightAction: {
    justifyContent: 'center',
    alignItems: 'flex-end',
    width: 50,
  },
  iconButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 44,
    minWidth: 44,
  },
  title: {
    fontWeight: '700',
  },
  subtitle: {
    fontWeight: '400',
    marginTop: 2,
  },
});

export default AppBar;
