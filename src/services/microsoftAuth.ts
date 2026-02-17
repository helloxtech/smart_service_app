import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

const DEFAULT_SCHEME = 'ca.rentalsmart.smartservice';
const MICROSOFT_SCOPE = ['openid', 'profile', 'email'];

const trimOrUndefined = (value?: string): string | undefined =>
{
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

const resolveTenantId = (): string =>
{
  const tenantId = trimOrUndefined(process.env.EXPO_PUBLIC_ENTRA_TENANT_ID);
  if (!tenantId)
  {
    throw new Error('Missing EXPO_PUBLIC_ENTRA_TENANT_ID.');
  }
  return tenantId;
};

const resolveClientId = (): string =>
{
  const clientId = trimOrUndefined(process.env.EXPO_PUBLIC_ENTRA_CLIENT_ID);
  if (!clientId)
  {
    throw new Error('Missing EXPO_PUBLIC_ENTRA_CLIENT_ID.');
  }
  return clientId;
};

const resolveIssuer = (): string =>
{
  const configured = trimOrUndefined(process.env.EXPO_PUBLIC_ENTRA_AUTHORITY_URL);
  if (configured)
  {
    return configured.replace(/\/$/, '');
  }
  return `https://login.microsoftonline.com/${resolveTenantId()}/v2.0`;
};

const resolveRedirectUri = (): string =>
{
  const explicitUri = trimOrUndefined(process.env.EXPO_PUBLIC_ENTRA_REDIRECT_URI);
  if (explicitUri)
  {
    return explicitUri;
  }

  const scheme = trimOrUndefined(process.env.EXPO_PUBLIC_ENTRA_REDIRECT_SCHEME) ?? DEFAULT_SCHEME;
  return `${scheme}://auth`;
};

const normalizeLoginHint = (value?: string): string | undefined =>
{
  const normalized = value?.trim().toLowerCase();
  if (!normalized || !normalized.includes('@'))
  {
    return undefined;
  }
  return normalized;
};

export type MicrosoftAuthResult = {
  idToken: string;
  accessToken?: string;
};

export const runMicrosoftSignIn = async (loginHint?: string): Promise<MicrosoftAuthResult> =>
{
  const clientId = resolveClientId();
  const issuer = resolveIssuer();
  const redirectUri = resolveRedirectUri();
  const normalizedLoginHint = normalizeLoginHint(loginHint);
  const discovery = await AuthSession.fetchDiscoveryAsync(issuer);

  const request = new AuthSession.AuthRequest({
    clientId,
    responseType: AuthSession.ResponseType.Code,
    scopes: MICROSOFT_SCOPE,
    redirectUri,
    usePKCE: true,
    prompt: AuthSession.Prompt.SelectAccount,
    extraParams: normalizedLoginHint ? { login_hint: normalizedLoginHint } : undefined,
  });

  await request.makeAuthUrlAsync(discovery);

  const result = await request.promptAsync(discovery);
  if (result.type === 'cancel' || result.type === 'dismiss')
  {
    throw new Error('Microsoft sign-in was cancelled.');
  }
  if (result.type !== 'success')
  {
    throw new Error(`Microsoft sign-in failed (${result.type}).`);
  }

  const code = result.params.code;
  if (!code)
  {
    throw new Error('Microsoft sign-in did not return an authorization code.');
  }
  if (!request.codeVerifier)
  {
    throw new Error('Microsoft sign-in missing PKCE verifier.');
  }

  const tokenResponse = await AuthSession.exchangeCodeAsync(
    {
      clientId,
      code,
      redirectUri,
      extraParams: {
        code_verifier: request.codeVerifier,
      },
    },
    discovery,
  );

  if (!tokenResponse.idToken)
  {
    throw new Error('Microsoft sign-in did not return an ID token.');
  }

  return {
    idToken: tokenResponse.idToken,
    accessToken: tokenResponse.accessToken,
  };
};
