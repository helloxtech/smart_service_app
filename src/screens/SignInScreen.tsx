import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAppStore } from '../store/AppStore';
import { colors, radius, spacing, typography } from '../theme/theme';
import { PrimaryButton } from '../components/PrimaryButton';

export const SignInScreen = () => {
  const { signIn } = useAppStore();
  const [email, setEmail] = useState('alex.chen@rentalsmart.ca');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async () => {
    try {
      setIsSubmitting(true);
      await signIn(email, password);
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
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.badge}>SMART SERVICE</Text>
          <Text style={styles.heading}>Welcome Back</Text>
          <Text style={styles.copy}>
            Role-based workspace for Property Managers, Supervisors, Landlords, and Tenants.
            Your access is automatically identified from your contact profile.
          </Text>

          <View style={styles.infoStrip}>
            <Text style={styles.infoLabel}>Portal role detection</Text>
            <Text style={styles.infoValue}>Automatic</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>Email</Text>
              <TextInput
                style={styles.input}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder="name@example.com"
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
              Use the same credentials as your portal account.
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.lg,
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
    lineHeight: 22,
  },
  infoStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F5FAF8',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#D5EBE2',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  infoLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  infoValue: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  form: {
    gap: spacing.md,
    marginTop: spacing.sm,
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
