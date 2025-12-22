/**
 * TextField Component
 * Edition-aware text input with validation support
 * Used for parent signup/login and other form inputs
 */

import React from 'react';
import {
  TextInput,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useEdition } from '../context/EditionContext';

export const TextField = ({
  label,
  placeholder,
  value,
  onChangeText,
  secureTextEntry = false,
  keyboardType = 'default',
  editable = true,
  error = null,
  required = false,
  disabled = false,
  showPasswordToggle = false,
  autoCapitalize = 'sentences',
  textContentType = undefined,
  multiline = false,
  numberOfLines = 1,
  style,
  ...props
}) => {
  const { edition, theme } = useEdition();
  const [showPassword, setShowPassword] = React.useState(!secureTextEntry);
  const isKidsEdition = edition === 'kids';

  // Edition-specific sizing
  const inputHeight = isKidsEdition ? 56 : 48;
  const fontSize = isKidsEdition ? 16 : 14;
  const paddingHorizontal = isKidsEdition ? theme.spacing.md : theme.spacing.sm;
  const borderRadius = isKidsEdition ? theme.borderRadius.medium : theme.borderRadius.small;
  const marginBottom = error ? 16 : 12;

  const borderColor = error
    ? theme.semanticColors.error
    : disabled
    ? theme.neutralColors.lightGray
    : theme.neutralColors.gray;

  return (
    <View style={[styles.container, { marginBottom }, style]}>
      {label && (
        <View style={styles.labelContainer}>
          <Text style={[
            styles.label,
            {
              fontSize: isKidsEdition ? 16 : 14,
              fontFamily: isKidsEdition ? 'Nunito_SemiBold' : 'Montserrat_SemiBold',
              color: theme.neutralColors.dark,
            },
          ]}>
            {label}
          </Text>
          {required && <Text style={styles.required}>*</Text>}
        </View>
      )}

      <View style={[
        styles.inputContainer,
        {
          height: multiline ? undefined : inputHeight,
          minHeight: multiline ? inputHeight * numberOfLines * 0.7 : inputHeight,
          borderRadius: borderRadius,
          borderColor: borderColor,
          backgroundColor: disabled ? theme.neutralColors.lightGray : theme.neutralColors.white,
          paddingHorizontal,
          paddingVertical: multiline ? theme.spacing.sm : 0,
          alignItems: multiline ? 'flex-start' : 'center',
        },
      ]}>
        <TextInput
          style={[
            styles.input,
            {
              fontSize,
              fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
              color: disabled ? theme.neutralColors.gray : theme.neutralColors.dark,
              flex: 1,
              textAlignVertical: multiline ? 'top' : 'center',
              paddingTop: multiline ? 4 : 0,
            },
          ]}
          placeholder={placeholder}
          placeholderTextColor={theme.neutralColors.gray}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry && !showPassword}
          keyboardType={keyboardType}
          editable={editable && !disabled}
          autoCapitalize={autoCapitalize}
          textContentType={textContentType}
          multiline={multiline}
          numberOfLines={numberOfLines}
          {...props}
        />

        {showPasswordToggle && secureTextEntry && (
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            style={styles.passwordToggle}
          >
            <Ionicons
              name={showPassword ? 'eye' : 'eye-off'}
              size={20}
              color={theme.brandColors.coral}
            />
          </TouchableOpacity>
        )}
      </View>

      {error && (
        <Text style={[
          styles.error,
          {
            color: theme.semanticColors.error,
            fontSize: isKidsEdition ? 14 : 12,
            fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
          },
        ]}>
          {error}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontWeight: '600',
  },
  required: {
    color: '#FF6B6B',
    marginLeft: 4,
    fontSize: 14,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
  },
  input: {
    flex: 1,
    paddingVertical: 0,
  },
  passwordToggle: {
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  error: {
    marginTop: 6,
    fontWeight: '500',
  },
});

export default TextField;
