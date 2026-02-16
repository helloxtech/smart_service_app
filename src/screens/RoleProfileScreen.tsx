import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PrimaryButton } from '../components/PrimaryButton';
import { useAppStore } from '../store/AppStore';
import { colors, radius, spacing, typography } from '../theme/theme';

export const RoleProfileScreen = () => {
  const { currentUser, signOut } = useAppStore();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.sm }]}>
      <Text style={styles.title}>Account</Text>
      <Text style={styles.subtitle}>Role-aware access and quick session controls.</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Name</Text>
        <Text style={styles.value}>{currentUser?.name ?? 'Unknown'}</Text>

        <Text style={styles.label}>Email</Text>
        <Text style={styles.value}>{currentUser?.email ?? 'Unknown'}</Text>

        <Text style={styles.label}>Role</Text>
        <Text style={styles.value}>{currentUser?.role ?? 'Unknown'}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.helpTitle}>Access scope</Text>
        <Text style={styles.helpBody}>
          PM/Supervisor can perform operational updates. Tenant/Landlord views are optimized for
          tracking, communication, and role-specific read access.
        </Text>
      </View>

      <PrimaryButton label="Sign out" onPress={signOut} variant="outline" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: typography.small,
    marginTop: 2,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: 8,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  value: {
    color: colors.textPrimary,
    fontSize: typography.body,
    fontWeight: '700',
  },
  helpTitle: {
    color: colors.textPrimary,
    fontSize: typography.heading,
    fontWeight: '800',
  },
  helpBody: {
    color: colors.textSecondary,
    fontSize: typography.small,
    lineHeight: 20,
  },
});
