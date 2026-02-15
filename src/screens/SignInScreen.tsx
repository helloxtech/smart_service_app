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
      <View style={styles.card}>
        <Text style={styles.badge}>SMART SERVICE</Text>
        <Text style={styles.heading}>Property Manager Workspace</Text>
        <Text style={styles.copy}>
          Manage live visitor chat handoff, maintenance updates, and site visit notes
          from one mobile workspace.
        </Text>

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

          <Pressable>
            <Text style={styles.helper}>Uses Entra ID + BFF token exchange in production.</Text>
          </Pressable>
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
