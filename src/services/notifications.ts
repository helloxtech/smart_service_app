import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

let configured = false;
let permissionChecked = false;
let permissionGranted = false;

const getProjectId = (): string | undefined =>
  Constants.expoConfig?.extra?.eas?.projectId
  ?? Constants.easConfig?.projectId
  ?? undefined;

export const configureNotifications = (): void =>
{
  if (configured)
  {
    return;
  }

  configured = true;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
};

export const ensureNotificationPermission = async (): Promise<boolean> =>
{
  if (permissionChecked)
  {
    return permissionGranted;
  }

  configureNotifications();

  const current = await Notifications.getPermissionsAsync();
  const hasCurrentPermission = current.granted
    || current.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;

  if (hasCurrentPermission)
  {
    permissionChecked = true;
    permissionGranted = true;
    return true;
  }

  const requested = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: true,
      allowSound: true,
    },
  });

  permissionChecked = true;
  permissionGranted =
    requested.granted
    || requested.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
  return permissionGranted;
};

export const registerForExpoPushToken = async (): Promise<string | null> =>
{
  const granted = await ensureNotificationPermission();
  if (!granted)
  {
    return null;
  }

  if (Platform.OS === 'android')
  {
    await Notifications.setNotificationChannelAsync('chat', {
      name: 'Chat Alerts',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#1F9D67',
    });
  }

  try
  {
    const projectId = getProjectId();
    const token = projectId
      ? await Notifications.getExpoPushTokenAsync({ projectId })
      : await Notifications.getExpoPushTokenAsync();
    return token.data ?? null;
  }
  catch
  {
    return null;
  }
};

export const notifyIncomingChat = async (title: string, body: string): Promise<void> =>
{
  const granted = await ensureNotificationPermission();
  if (!granted)
  {
    return;
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: true,
    },
    trigger: null,
  });
};

export const setAppBadgeCount = async (count: number): Promise<void> =>
{
  configureNotifications();
  const current = await Notifications.getPermissionsAsync();
  const hasPermission = current.granted
    || current.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
  if (!hasPermission)
  {
    return;
  }

  const safeCount = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
  try
  {
    await Notifications.setBadgeCountAsync(safeCount);
  }
  catch
  {
    // Badge update is best effort only.
  }
};
