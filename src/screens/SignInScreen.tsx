import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAppStore } from '../store/AppStore';
import { colors, radius, spacing, typography } from '../theme/theme';
import { PrimaryButton } from '../components/PrimaryButton';
import { UserRole } from '../types/domain';

const roleOptions: UserRole[] = ['PM', 'Supervisor', 'Tenant', 'Landlord'];

export const SignInScreen = () => {
  const { signIn } = useAppStore();
  const [email, setEmail] = useState('alex.chen@rentalsmart.ca');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('PM');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async () => {
    try {
      setIsSubmitting(true);
      await signIn(email, password, selectedRole);
    } catch (error) {
      Alert.alert('Sign-in failed', (error as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.card}>
        <Text style={styles.badge}>SMART SERVICE</Text>
        <Text style={styles.heading}>Property Manager Workspace</Text>
        <Text style={styles.copy}>
          Role-based workspace for PM, Supervisor, Tenant, and Landlord.
        </Text>

        <View style={styles.roleWrap}>
          <Text style={styles.fieldLabel}>Sign in as</Text>
          <View style={styles.roleGrid}>
            {roleOptions.map((role) => {
              const selected = selectedRole === role;
              return (
                <Pressable
                  key={role}
                  onPress={() => setSelectedRole(role)}
                  style={[styles.roleChip, selected && styles.roleChipActive]}
                >
                  <Text style={[styles.roleChipText, selected && styles.roleChipTextActive]}>
                    {role}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.form}>
          <View style={styles.fieldWrap}>
            <Text style={styles.fieldLabel}>Work email</Text>
            <TextInput
              style={styles.input}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="name@company.com"
              placeholderTextColor="#8D9AA5"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View style={styles.fieldWrap}>
            <Text style={styles.fieldLabel}>Password</Text>
            <TextInput
              style={styles.input}
              secureTextEntry
              placeholder="Enter your password"
              placeholderTextColor="#8D9AA5"
              value={password}
              onChangeText={setPassword}
            />
          </View>

          <PrimaryButton
            label={isSubmitting ? 'Signing in...' : 'Sign in'}
            onPress={onSubmit}
            disabled={isSubmitting || !email || !password}
          />

          <Text style={styles.helper}>
            Production remote mode currently supports PM/Supervisor endpoints. Tenant/Landlord
            is enabled in mock mode.
          </Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.md,
  },
  badge: {
    alignSelf: 'flex-start',
    color: colors.accent,
    backgroundColor: colors.accentMuted,
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 0.6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.lg,
  },
  heading: {
    color: colors.textPrimary,
    fontSize: 26,
    fontWeight: '800',
    lineHeight: 32,
  },
  copy: {
    color: colors.textSecondary,
    fontSize: typography.body,
    lineHeight: 24,
  },
  form: {
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  roleWrap: {
    gap: 8,
  },
  roleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  roleChip: {
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FAFCFD',
  },
  roleChipActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentMuted,
  },
  roleChipText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  roleChipTextActive: {
    color: colors.accent,
  },
  fieldWrap: {
    gap: 6,
  },
  fieldLabel: {
    color: colors.textPrimary,
    fontWeight: '700',
    fontSize: typography.small,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: radius.md,
    minHeight: 44,
    paddingHorizontal: 12,
    color: colors.textPrimary,
    backgroundColor: '#FAFCFD',
  },
  helper: {
    color: colors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
  },
});
