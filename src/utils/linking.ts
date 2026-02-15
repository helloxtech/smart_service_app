import { Alert, Linking } from 'react-native';

export const openExternalUrl = async (url: string) => {
  const canOpen = await Linking.canOpenURL(url);
  if (!canOpen) {
    Alert.alert('Cannot open link', 'This Dataverse record link is not available.');
    return;
  }

  await Linking.openURL(url);
};
