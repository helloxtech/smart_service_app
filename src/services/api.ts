import { NativeModules } from 'react-native';

const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost', '0.0.0.0']);

const trimTrailingSlash = (value: string): string => value.replace(/\/$/, '');

const resolveDevHostFromBundle = (): string | null =>
{
  const scriptURL = NativeModules?.SourceCode?.scriptURL;
  if (typeof scriptURL !== 'string' || scriptURL.length === 0)
  {
    return null;
  }

  try
  {
    const parsed = new URL(scriptURL);
    return parsed.hostname || null;
  }
  catch
  {
    return null;
  }
};

const resolveApiBaseUrl = (): string | null =>
{
  const configured = process.env.EXPO_PUBLIC_BFF_BASE_URL?.trim();
  if (!configured)
  {
    return null;
  }

  try
  {
    const parsed = new URL(configured);
    if (!LOCAL_HOSTS.has(parsed.hostname))
    {
      return trimTrailingSlash(parsed.toString());
    }

    if (!__DEV__)
    {
      return null;
    }

    const devHost = resolveDevHostFromBundle();
    if (devHost && !LOCAL_HOSTS.has(devHost))
    {
      parsed.hostname = devHost;
      return trimTrailingSlash(parsed.toString());
    }
  }
  catch
  {
    return trimTrailingSlash(configured);
  }

  return trimTrailingSlash(configured);
};

const API_BASE_URL = resolveApiBaseUrl();
let authToken: string | null = null;

const jsonHeaders = {
  'Content-Type': 'application/json',
};

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  if (!API_BASE_URL) {
    throw new Error(
      __DEV__
        ? 'EXPO_PUBLIC_BFF_BASE_URL is not set'
        : 'Production API base URL is not configured. Set EXPO_PUBLIC_BFF_BASE_URL to your public HTTPS BFF endpoint.',
    );
  }

  let response: Response;
  try
  {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        ...jsonHeaders,
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        ...(init?.headers ?? {}),
      },
    });
  }
  catch (error)
  {
    const reason = error instanceof Error ? error.message : 'Network request failed';
    const guidance =
      API_BASE_URL.includes('127.0.0.1') || API_BASE_URL.includes('localhost')
        ? 'Cannot reach local BFF from this device. Start rental-smart-bff and set EXPO_PUBLIC_BFF_BASE_URL to your Mac LAN IP (for example http://192.168.x.x:7071/api).'
        : `Cannot reach BFF at ${API_BASE_URL}. Confirm the backend is running and reachable from this device.`;

    throw new Error(`${reason}. ${guidance}`);
  }

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`API request failed (${response.status}): ${body}`);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json() as Promise<T>;
};

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
};

export const setApiAuthToken = (token: string | null) => {
  authToken = token;
};
