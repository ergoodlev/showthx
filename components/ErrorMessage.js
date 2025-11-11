/**
 * ErrorMessage Component
 * Edition-aware error alert/banner
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useEdition } from '../context/EditionContext';

export const ErrorMessage = ({
  message,
  visible = true,
  onDismiss,
  autoDismiss = true,
  autoDismissDelay = 4000,
  style,
}) => {
  const { edition, theme } = useEdition();
  const [isVisible, setIsVisible] = useState(visible);
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const isKidsEdition = edition === 'kids';

  useEffect(() => {
    if (!message) {
      setIsVisible(false);
      return;
    }

    setIsVisible(true);

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    if (autoDismiss) {
      const timer = setTimeout(() => {
        handleDismiss();
      }, autoDismissDelay);

      return () => clearTimeout(timer);
    }
  }, [message, autoDismiss, autoDismissDelay]);

  const handleDismiss = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setIsVisible(false);
      onDismiss?.();
    });
  };

  if (!isVisible || !message) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          backgroundColor: theme.colors.semantic.error,
          borderRadius: isKidsEdition
            ? theme.borderRadius.medium
            : theme.borderRadius.small,
          marginHorizontal: isKidsEdition
            ? theme.spacing.sm
            : theme.spacing.xs,
          marginVertical: theme.spacing.sm,
          paddingHorizontal: theme.spacing.md,
          paddingVertical: isKidsEdition ? theme.spacing.md : theme.spacing.sm,
        },
        style,
      ]}
    >
      <View style={styles.content}>
        <Ionicons
          name="alert-circle"
          size={isKidsEdition ? 22 : 20}
          color="#FFFFFF"
          style={styles.icon}
        />
        <Text
          style={[
            styles.message,
            {
              fontSize: isKidsEdition ? 14 : 12,
              color: '#FFFFFF',
              fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
            },
          ]}
        >
          {message}
        </Text>
      </View>

      <TouchableOpacity
        onPress={handleDismiss}
        style={styles.closeButton}
      >
        <Ionicons
          name="close"
          size={isKidsEdition ? 22 : 20}
          color="#FFFFFF"
        />
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 12,
  },
  message: {
    flex: 1,
    fontWeight: '500',
  },
  closeButton: {
    padding: 8,
    marginLeft: 12,
  },
});

export default ErrorMessage;
