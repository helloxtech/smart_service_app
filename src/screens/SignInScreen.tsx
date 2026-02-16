import React, { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../store/AppStore';
import { colors, radius, spacing, typography } from '../theme/theme';
import { PrimaryButton } from '../components/PrimaryButton';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const openExternalUrl = async (url: string) => {
  const canOpen = await Linking.canOpenURL(url);
  if (!canOpen) {
    Alert.alert('Link unavailable', 'Unable to open this link right now.');
    return;
  }

  await Linking.openURL(url);
};

export const SignInScreen = () => {
  const { signIn } = useAppStore();

  const [email, setEmail] = useState('alex.chen@rentalsmart.ca');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);

  const trimmedEmail = email.trim().toLowerCase();
  const emailValid = emailRegex.test(trimmedEmail);
  const passwordValid = password.trim().length > 0;

  const canSubmit = emailValid && passwordValid && !isSubmitting;

  const emailError =
    emailTouched && !emailValid ? 'Please enter a valid email address.' : null;
  const passwordError =
    passwordTouched && !passwordValid ? 'Password is required.' : null;

  const roleHint = useMemo(() => {
    if (!emailValid) {
      return null;
    }

    return 'Your role will be identified from Contact Portal Roles after sign-in.';
  }, [emailValid]);

  const onSubmit = async () => {
    setEmailTouched(true);
    setPasswordTouched(true);

    if (!emailValid || !passwordValid) {
      return;
    }

    try {
      setIsSubmitting(true);
      await signIn(trimmedEmail, password);
    } catch (error) {
      Alert.alert('Sign-in failed', (error as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const onPressMicrosoft = async () => {
    const ssoUrl = process.env.EXPO_PUBLIC_MS_LOGIN_URL;
    if (!ssoUrl) {
      Alert.alert(
        'Microsoft sign-in',
        'Microsoft SSO is not configured yet. Please sign in with email and password.',
      );
      return;
    }

    try {
      await openExternalUrl(ssoUrl);
    } catch (error) {
      Alert.alert('Unable to open sign-in', (error as Error).message);
    }
  };

  const onForgotPassword = async () => {
    const forgotUrl = process.env.EXPO_PUBLIC_FORGOT_PASSWORD_URL;
    if (!forgotUrl) {
      Alert.alert(
        'Reset password',
        'Please contact support to reset your password.',
      );
      return;
    }

    try {
      await openExternalUrl(forgotUrl);
    } catch (error) {
      Alert.alert('Unable to open reset link', (error as Error).message);
    }
  };

  const onOpenPrivacy = async () => {
    const url = process.env.EXPO_PUBLIC_PRIVACY_URL ?? 'https://rentalsmart.ca/privacy';
    await openExternalUrl(url);
  };

  const onOpenSupport = async () => {
    const url = process.env.EXPO_PUBLIC_SUPPORT_URL ?? 'https://rentalsmart.ca/contact';
    await openExternalUrl(url);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <Text style={styles.badge}>SMART SERVICE</Text>
          <Text style={styles.heading}>Sign In to Smart Service</Text>
          <Text style={styles.copy}>
            Use your portal account to access your personalized workspace.
          </Text>

          <View style={styles.form}>
            <PrimaryButton
              label="Continue with Microsoft"
              onPress={() => void onPressMicrosoft()}
              variant="outline"
              disabled={isSubmitting}
            />

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or sign in with email</Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>Email</Text>
              <TextInput
                style={[styles.input, emailError && styles.inputError]}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder="name@example.com"
                placeholderTextColor="#8D9AA5"
                value={email}
                onChangeText={setEmail}
                onBlur={() => setEmailTouched(true)}
              />
              {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
              {roleHint ? <Text style={styles.roleHint}>{roleHint}</Text> : null}
            </View>

            <View style={styles.fieldWrap}>
              <View style={styles.passwordHeaderRow}>
                <Text style={styles.fieldLabel}>Password</Text>
                <Pressable onPress={() => void onForgotPassword()}>
                  <Text style={styles.linkText}>Forgot password?</Text>
                </Pressable>
              </View>
              <View style={[styles.passwordWrap, passwordError && styles.inputError]}>
                <TextInput
                  style={styles.passwordInput}
                  secureTextEntry={!showPassword}
                  placeholder="Enter your password"
                  placeholderTextColor="#8D9AA5"
                  value={password}
                  onChangeText={setPassword}
                  onBlur={() => setPasswordTouched(true)}
                />
                <Pressable
                  onPress={() => setShowPassword((prev) => !prev)}
                  style={styles.eyeButton}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={18}
                    color={colors.textSecondary}
                  />
                </Pressable>
              </View>
              {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
            </View>

            <PrimaryButton
              label="Sign in"
              onPress={onSubmit}
              disabled={!canSubmit}
              loading={isSubmitting}
            />

            <Text style={styles.helper}>
              Role is assigned automatically from your contact profile.
            </Text>
          </View>

          <View style={styles.footerLinks}>
            <Pressable onPress={() => void onOpenPrivacy()}>
              <Text style={styles.footerLink}>Privacy</Text>
            </Pressable>
            <Text style={styles.footerDot}>•</Text>
            <Pressable onPress={() => void onOpenSupport()}>
              <Text style={styles.footerLink}>Support</Text>
            </Pressable>
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
    fontSize: 29,
    fontWeight: '800',
    lineHeight: 34,
  },
  copy: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
  },
  form: {
    gap: 14,
    marginTop: 4,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
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
    minHeight: 46,
    paddingHorizontal: 12,
    color: colors.textPrimary,
    backgroundColor: '#FAFCFD',
  },
  inputError: {
    borderColor: colors.danger,
  },
  errorText: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  roleHint: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  passwordHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  linkText: {
    color: '#2457A5',
    fontSize: 12,
    fontWeight: '700',
  },
  passwordWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: radius.md,
    backgroundColor: '#FAFCFD',
    minHeight: 46,
    paddingHorizontal: 2,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 10,
    color: colors.textPrimary,
  },
  eyeButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helper: {
    color: colors.textSecondary,
    fontSize: 11,
    textAlign: 'center',
  },
  footerLinks: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  footerLink: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  footerDot: {
    color: colors.textSecondary,
    fontSize: 12,
  },
});
