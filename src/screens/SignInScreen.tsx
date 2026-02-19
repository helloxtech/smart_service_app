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
import { runMicrosoftSignIn } from '../services/microsoftAuth';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const toBoolean = (value: string | undefined): boolean | null =>
{
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return null;
};

const emailPasswordSignInEnabled = (() =>
{
  const explicit = toBoolean(process.env.EXPO_PUBLIC_ENABLE_EMAIL_PASSWORD_SIGN_IN);
  if (explicit !== null) return explicit;
  return __DEV__;
})();

const openExternalUrl = async (url: string) => {
  const canOpen = await Linking.canOpenURL(url);
  if (!canOpen) {
    Alert.alert('Link unavailable', 'Unable to open this link right now.');
    return;
  }

  await Linking.openURL(url);
};

const toFriendlyAuthError = (error: unknown): string =>
{
  const message = (error as Error)?.message ?? 'Sign-in failed.';
  const normalized = message.toLowerCase();

  if (normalized.includes('no active portal contact found'))
  {
    return 'This email is not an active portal contact in Rental Smart. Internal manager users should use Continue with Microsoft. Tenant/Landlord/Admin users must exist as active contacts.';
  }

  if (normalized.includes('missing expo_public_entra_tenant_id') || normalized.includes('missing expo_public_entra_client_id'))
  {
    return 'Microsoft sign-in is not configured for this app build. Set EXPO_PUBLIC_ENTRA_TENANT_ID and EXPO_PUBLIC_ENTRA_CLIENT_ID, then rebuild.';
  }

  if (normalized.includes('microsoft token validation failed'))
  {
    return 'Microsoft sign-in token is invalid for this backend. Confirm mobile app client ID/tenant matches BFF PM_MOBILE_ENTRA_CLIENT_ID and PM_MOBILE_ENTRA_TENANT_ID.';
  }

  if (normalized.includes('email/password sign-in is disabled'))
  {
    return 'Email/password sign-in is disabled in this environment. Use Continue with Microsoft.';
  }

  if (normalized.includes('cannot reach local bff') || normalized.includes('network request failed'))
  {
    return `${message}\n\nTips:\n1) Start rental-smart-bff on your Mac.\n2) Keep phone and Mac on same Wi-Fi.\n3) Set EXPO_PUBLIC_BFF_BASE_URL to http://<your-mac-lan-ip>:7071/api.`;
  }

  return message;
};

export const SignInScreen = () => {
  const { signIn, signInWithMicrosoft } = useAppStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);

  const trimmedEmail = email.trim().toLowerCase();
  const emailValid = emailRegex.test(trimmedEmail);
  const passwordValid = password.trim().length > 0;

  const canSubmit = emailPasswordSignInEnabled && emailValid && passwordValid && !isSubmitting;

  const emailError =
    emailTouched && !emailValid ? 'Please enter a valid email address.' : null;
  const passwordError =
    passwordTouched && !passwordValid ? 'Password is required.' : null;

  const roleHint = useMemo(() => {
    if (!emailValid) {
      return null;
    }

    return 'Your access is applied automatically after sign in.';
  }, [emailValid]);

  const onSubmit = async () => {
    if (!emailPasswordSignInEnabled) {
      Alert.alert(
        'Email sign-in unavailable',
        'Email/password sign-in is disabled for this app build. Use Continue with Microsoft.',
      );
      return;
    }

    setEmailTouched(true);
    setPasswordTouched(true);

    if (!emailValid || !passwordValid) {
      return;
    }

    try {
      setIsSubmitting(true);
      await signIn(trimmedEmail, password);
    } catch (error) {
      Alert.alert('Sign-in failed', toFriendlyAuthError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const onPressMicrosoft = async () => {
    const loginHint = emailValid ? trimmedEmail : undefined;

    try {
      setIsSubmitting(true);
      const microsoftResult = await runMicrosoftSignIn(loginHint);
      await signInWithMicrosoft({
        idToken: microsoftResult.idToken,
        accessToken: microsoftResult.accessToken,
        emailHint: loginHint,
      });
    } catch (error) {
      const message = toFriendlyAuthError(error);
      if (message.toLowerCase().includes('cancelled')) {
        return;
      }
      Alert.alert('Microsoft sign-in failed', message);
    } finally {
      setIsSubmitting(false);
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

            {emailPasswordSignInEnabled
              ? (
                <>
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
                </>
              )
              : (
                <Text style={styles.helper}>
                  Email/password sign-in is disabled for this app build. Use Microsoft sign-in.
                </Text>
              )}

            <Text style={styles.helper}>
              Microsoft sign-in is for internal manager users.
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
