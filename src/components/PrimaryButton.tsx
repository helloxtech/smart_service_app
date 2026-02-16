import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '../theme/theme';

interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'solid' | 'outline';
  loading?: boolean;
}

export const PrimaryButton = ({
  label,
  onPress,
  disabled = false,
  variant = 'solid',
  loading = false,
}: PrimaryButtonProps) => {
  const solid = variant === 'solid';
  const isDisabled = disabled || loading;
  const textColor = solid ? '#FFFFFF' : colors.textPrimary;

  return (
    <Pressable
      disabled={isDisabled}
      onPress={onPress}
      style={[styles.base, solid ? styles.solid : styles.outline, isDisabled && styles.disabled]}
    >
      <View style={styles.contentRow}>
        {loading && (
          <ActivityIndicator
            size="small"
            color={textColor}
            style={styles.spinner}
          />
        )}
        <Text style={[styles.label, solid ? styles.labelSolid : styles.labelOutline]}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    minHeight: 44,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  solid: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  outline: {
    borderColor: colors.inputBorder,
    backgroundColor: colors.surface,
  },
  disabled: {
    opacity: 0.55,
  },
  label: {
    fontSize: typography.body,
    fontWeight: '700',
  },
  labelSolid: {
    color: '#FFFFFF',
  },
  labelOutline: {
    color: colors.textPrimary,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinner: {
    marginRight: 8,
  },
});
