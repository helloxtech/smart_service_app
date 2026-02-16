import React, { useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PrimaryButton } from '../components/PrimaryButton';
import { useAppStore } from '../store/AppStore';
import { colors, radius, spacing, typography } from '../theme/theme';

export const RoleProfileScreen = () => {
  const { currentUser, signOut, updateProfile } = useAppStore();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState(currentUser?.name ?? '');
  const [email, setEmail] = useState(currentUser?.email ?? '');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setName(currentUser?.name ?? '');
    setEmail(currentUser?.email ?? '');
  }, [currentUser?.email, currentUser?.name]);

  const roleLabel = useMemo(() => {
    if (!currentUser?.role) return 'Unknown';
    return currentUser.role === 'Supervisor' ? 'Admin' : currentUser.role;
  }, [currentUser?.role]);

  const accessScope = useMemo(() => {
    if (currentUser?.role === 'Landlord') {
      return 'You can monitor portfolio requests, follow tenant conversations, and track request progress for your properties.';
    }

    if (currentUser?.role === 'Tenant') {
      return 'You can track your maintenance requests, view updates, and message the service team from one place.';
    }

    if (currentUser?.role === 'Supervisor') {
      return 'Admin scope includes PM operations, escalation handling, and workflow oversight across conversations and maintenance queues.';
    }

    return 'PM scope includes live chat response, maintenance status updates, and site visit note capture.';
  }, [currentUser?.role]);

  const onSave = async () => {
    try {
      setIsSaving(true);
      await updateProfile({
        name,
        email,
      });
      Alert.alert('Profile updated', 'Your profile changes were saved in this app session.');
    } catch (error) {
      Alert.alert('Unable to update profile', (error as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.sm }]}>
      <Text style={styles.title}>Account</Text>
      <Text style={styles.subtitle}>Update your contact profile and session settings.</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Your name"
          placeholderTextColor="#8D9AA5"
          autoCapitalize="words"
        />

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="name@example.com"
          placeholderTextColor="#8D9AA5"
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <Text style={styles.label}>Role</Text>
        <Text style={styles.value}>{roleLabel}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.helpTitle}>Access scope</Text>
        <Text style={styles.helpBody}>{accessScope}</Text>
      </View>

      <PrimaryButton
        label="Save profile"
        onPress={() => void onSave()}
        disabled={isSaving}
        loading={isSaving}
      />
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
  input: {
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: radius.md,
    minHeight: 46,
    paddingHorizontal: 12,
    color: colors.textPrimary,
    backgroundColor: '#FAFCFD',
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
