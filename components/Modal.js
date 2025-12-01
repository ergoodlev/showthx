/**
 * Modal Component
 * Edition-aware modal/dialog for confirmations, forms, and alerts
 */

import React from 'react';
import {
  Modal as RNModal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useEdition } from '../context/EditionContext';

const { height: screenHeight } = Dimensions.get('window');

export const Modal = ({
  visible,
  onClose,
  title,
  subtitle,
  children,
  actions = [],
  dismissible = true,
  size = 'medium', // 'small', 'medium', 'large'
  style,
}) => {
  const { edition, theme } = useEdition();
  const isKidsEdition = edition === 'kids';

  // Modal size based on edition
  let modalWidth = '90%';
  let maxHeight = screenHeight * 0.85;

  if (size === 'large') {
    modalWidth = '95%';
    maxHeight = screenHeight * 0.9;
  } else if (size === 'small') {
    modalWidth = '80%';
    maxHeight = screenHeight * 0.6;
  }

  // Padding based on edition
  const padding = isKidsEdition ? theme.spacing.lg : theme.spacing.md;
  const titleSize = isKidsEdition ? 20 : 18;
  const subtitleSize = isKidsEdition ? 16 : 14;

  return (
    <RNModal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      {/* Backdrop */}
      <TouchableWithoutFeedback onPress={dismissible ? onClose : null}>
        <View style={styles.backdrop}>
          {/* Modal Container */}
          <TouchableWithoutFeedback>
            <View
              style={[
                styles.centeredView,
                {
                  maxHeight,
                },
              ]}
            >
              <View
                style={[
                  styles.modalView,
                  {
                    width: modalWidth,
                    backgroundColor: theme.neutralColors.white,
                    borderRadius: isKidsEdition
                      ? theme.borderRadius.large
                      : theme.borderRadius.medium,
                    padding,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.15,
                    shadowRadius: 12,
                    elevation: 10,
                  },
                  style,
                ]}
              >
                {/* Header */}
                <View style={styles.header}>
                  {title && (
                    <Text
                      style={[
                        styles.title,
                        {
                          fontSize: titleSize,
                          color: theme.neutralColors.dark,
                          fontFamily: isKidsEdition
                            ? 'Nunito_Bold'
                            : 'Montserrat_Bold',
                        },
                      ]}
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
                          color: theme.neutralColors.gray,
                          fontFamily: isKidsEdition
                            ? 'Nunito_Regular'
                            : 'Montserrat_Regular',
                          marginTop: 8,
                        },
                      ]}
                    >
                      {subtitle}
                    </Text>
                  )}

                  {dismissible && (
                    <TouchableOpacity
                      onPress={onClose}
                      style={styles.closeButton}
                    >
                      <Ionicons
                        name="close"
                        size={24}
                        color={theme.neutralColors.gray}
                      />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Content */}
                <View style={[
                  styles.content,
                  {
                    marginTop: title || subtitle ? theme.spacing.md : 0,
                  },
                ]}>
                  {children}
                </View>

                {/* Actions */}
                {actions.length > 0 && (
                  <View
                    style={[
                      styles.actions,
                      {
                        flexDirection: actions.length > 2 ? 'column' : 'row',
                        marginTop: theme.spacing.lg,
                      },
                    ]}
                  >
                    {actions.map((action, index) => (
                      <TouchableOpacity
                        key={index}
                        onPress={action.onPress}
                        disabled={action.disabled}
                        style={[
                          styles.actionButton,
                          {
                            backgroundColor: action.variant === 'secondary'
                              ? theme.brandColors.teal
                              : action.variant === 'outline'
                              ? 'transparent'
                              : theme.brandColors.coral,
                            borderColor: action.variant === 'outline'
                              ? theme.brandColors.coral
                              : 'transparent',
                            borderWidth: action.variant === 'outline' ? 1.5 : 0,
                            marginBottom: actions.length > 2 && index < actions.length - 1
                              ? theme.spacing.sm
                              : 0,
                            marginRight: actions.length <= 2 && index < actions.length - 1
                              ? theme.spacing.sm
                              : 0,
                            opacity: action.disabled ? 0.6 : 1,
                            flex: actions.length <= 2 ? 1 : undefined,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.actionText,
                            {
                              color: action.variant === 'outline'
                                ? theme.brandColors.coral
                                : '#FFFFFF',
                              fontFamily: isKidsEdition
                                ? 'Nunito_SemiBold'
                                : 'Montserrat_SemiBold',
                              fontSize: isKidsEdition ? 16 : 14,
                            },
                          ]}
                        >
                          {action.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </RNModal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  modalView: {
    alignItems: 'flex-start',
  },
  header: {
    width: '100%',
  },
  title: {
    fontWeight: '700',
  },
  subtitle: {
    fontWeight: '400',
  },
  closeButton: {
    position: 'absolute',
    top: -30,
    right: -30,
    padding: 12,
  },
  content: {
    width: '100%',
  },
  actions: {
    width: '100%',
    justifyContent: 'flex-end',
  },
  actionButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 44,
  },
  actionText: {
    fontWeight: '600',
  },
});

export default Modal;
