import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, radius, spacing, typography } from '../theme/theme';

interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'solid' | 'outline';
}

export const PrimaryButton = ({
  label,
  onPress,
  disabled = false,
  variant = 'solid',
}: PrimaryButtonProps) => {
  const solid = variant === 'solid';

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={[styles.base, solid ? styles.solid : styles.outline, disabled && styles.disabled]}
    >
      <Text style={[styles.label, solid ? styles.labelSolid : styles.labelOutline]}>
        {label}
      </Text>
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
});
