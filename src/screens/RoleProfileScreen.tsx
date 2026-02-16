import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PrimaryButton } from '../components/PrimaryButton';
import { useAppStore } from '../store/AppStore';
import { colors, radius, spacing, typography } from '../theme/theme';

export const RoleProfileScreen = () => {
  const { currentUser, signOut, updateProfile } = useAppStore();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState(currentUser?.name ?? '');
  const [phone, setPhone] = useState(currentUser?.phone ?? '');
  const [address, setAddress] = useState(currentUser?.address ?? '');
  const [bio, setBio] = useState(currentUser?.bio ?? '');
  const [emailNotifs, setEmailNotifs] = useState(currentUser?.emailNotifs ?? true);
  const [smsNotifs, setSmsNotifs] = useState(currentUser?.smsNotifs ?? false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setName(currentUser?.name ?? '');
    setPhone(currentUser?.phone ?? '');
    setAddress(currentUser?.address ?? '');
    setBio(currentUser?.bio ?? '');
    setEmailNotifs(currentUser?.emailNotifs ?? true);
    setSmsNotifs(currentUser?.smsNotifs ?? false);
  }, [
    currentUser?.address,
    currentUser?.bio,
    currentUser?.emailNotifs,
    currentUser?.name,
    currentUser?.phone,
    currentUser?.smsNotifs,
  ]);

  const onSave = async () => {
    try {
      setIsSaving(true);
      await updateProfile({
        name,
        phone,
        address,
        bio,
        emailNotifs,
        smsNotifs,
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
        <Text style={styles.sectionTitle}>Personal Information</Text>

        <Text style={styles.label}>Full Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Your name"
          placeholderTextColor="#8D9AA5"
          autoCapitalize="words"
        />

        <Text style={styles.label}>Email Address</Text>
        <View style={styles.readOnlyWrap}>
          <Text style={styles.readOnlyText}>{currentUser?.email ?? 'Unknown'}</Text>
        </View>

        <Text style={styles.label}>Phone Number</Text>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          placeholder="+1 604-555-0000"
          placeholderTextColor="#8D9AA5"
          keyboardType="phone-pad"
        />

        <Text style={styles.label}>Mailing Address</Text>
        <TextInput
          style={styles.input}
          value={address}
          onChangeText={setAddress}
          placeholder="Street, City, Province"
          placeholderTextColor="#8D9AA5"
        />

        <Text style={styles.label}>Bio / Notes</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={bio}
          onChangeText={setBio}
          placeholder="Add profile notes"
          placeholderTextColor="#8D9AA5"
          multiline
          textAlignVertical="top"
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Notifications</Text>

        <View style={styles.toggleRow}>
          <View style={styles.toggleCopy}>
            <Text style={styles.toggleTitle}>Email Notifications</Text>
            <Text style={styles.toggleBody}>Receive account and request updates by email.</Text>
          </View>
          <Switch
            value={emailNotifs}
            onValueChange={setEmailNotifs}
            trackColor={{ false: '#CDD5DB', true: '#98C9B3' }}
            thumbColor={emailNotifs ? colors.accent : '#F4F4F5'}
          />
        </View>

        <View style={styles.toggleRow}>
          <View style={styles.toggleCopy}>
            <Text style={styles.toggleTitle}>SMS Alerts</Text>
            <Text style={styles.toggleBody}>Get urgent maintenance alerts by text message.</Text>
          </View>
          <Switch
            value={smsNotifs}
            onValueChange={setSmsNotifs}
            trackColor={{ false: '#CDD5DB', true: '#98C9B3' }}
            thumbColor={smsNotifs ? colors.accent : '#F4F4F5'}
          />
        </View>
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
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: typography.heading,
    fontWeight: '800',
    marginBottom: 2,
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
  textArea: {
    minHeight: 96,
    paddingTop: 10,
  },
  readOnlyWrap: {
    minHeight: 46,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#EDF1F4',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  readOnlyText: {
    color: '#67757F',
    fontSize: typography.body,
    fontWeight: '600',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: '#FAFCFD',
    padding: 12,
  },
  toggleCopy: {
    flex: 1,
    gap: 2,
  },
  toggleTitle: {
    color: colors.textPrimary,
    fontSize: typography.small,
    fontWeight: '700',
  },
  toggleBody: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },
});
