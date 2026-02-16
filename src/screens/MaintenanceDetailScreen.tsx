import React, { useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { MaintenanceCard } from '../components/MaintenanceCard';
import { PrimaryButton } from '../components/PrimaryButton';
import { MaintenanceStackParamList } from '../navigation/types';
import { useAppStore } from '../store/AppStore';
import { colors, radius, spacing, typography } from '../theme/theme';
import { MaintenanceStatus, SiteVisitNote } from '../types/domain';
import { formatRelativeTime } from '../utils/format';
import { openExternalUrl } from '../utils/linking';

type Props = NativeStackScreenProps<MaintenanceStackParamList, 'MaintenanceDetail'>;

const getTimelineSourceLabel = (item: SiteVisitNote): string => {
  if (item.source === 'chat') return 'Chat update';
  if (item.source === 'visit') return 'Site visit';
  return 'Maintenance update';
};

export const MaintenanceDetailScreen = ({ route }: Props) => {
  const { requestId } = route.params;
  const {
    maintenanceRequests,
    conversations,
    visitNotes,
    updateMaintenanceStatus,
    addMaintenanceUpdate,
    currentUser,
  } = useAppStore();
  const insets = useSafeAreaInsets();

  const [updateNote, setUpdateNote] = useState('');
  const [updatePhotoUri, setUpdatePhotoUri] = useState<string | undefined>();
  const [isTimelineExpanded, setIsTimelineExpanded] = useState(false);

  const canEditStatus = currentUser?.role === 'PM' || currentUser?.role === 'Supervisor';
  const canAddUpdates = Boolean(currentUser);

  const request = useMemo(
    () => maintenanceRequests.find((item) => item.id === requestId),
    [maintenanceRequests, requestId],
  );

  const propertyName = useMemo(() => {
    if (!request) return undefined;
    const match = conversations.find((item) => item.property.id === request.propertyId);
    return match?.property.name;
  }, [conversations, request]);

  const unitLabel = useMemo(() => {
    if (!request) return undefined;
    const match = conversations.find((item) => item.unit.id === request.unitId);
    return match?.unit.label;
  }, [conversations, request]);

  const relatedConversation = useMemo(() => {
    if (!request) return undefined;
    return conversations.find(
      (item) =>
        item.id === request.conversationId
        || (
          item.property.id === request.propertyId
          && item.unit.id === request.unitId
        ),
    );
  }, [conversations, request]);

  const requestUpdates = useMemo(
    () =>
      visitNotes
        .filter((item) => item.maintenanceRequestId === requestId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [requestId, visitNotes],
  );

  const latestUpdate = requestUpdates[0];
  const olderUpdates = requestUpdates.slice(1);

  const onStatusChange = async (status: MaintenanceStatus) => {
    if (!request) return;

    try {
      await updateMaintenanceStatus(request.id, status);
    } catch (error) {
      Alert.alert('Status update failed', (error as Error).message);
    }
  };

  const pickPhotoFromLibrary = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Photo permission required', 'Please allow photo access to attach an image.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length > 0) {
      setUpdatePhotoUri(result.assets[0].uri);
    }
  };

  const capturePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Camera permission required', 'Please allow camera access to capture a photo.');
      return;
    }

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.8,
      });

      if (!result.canceled && result.assets.length > 0) {
        setUpdatePhotoUri(result.assets[0].uri);
      }
    } catch {
      Alert.alert(
        'Camera unavailable',
        'Camera capture is not available in this simulator. Use a physical device or photo library.',
      );
    }
  };

  const choosePhoto = () => {
    Alert.alert('Attach photo', 'Choose photo source', [
      { text: 'Take photo', onPress: () => void capturePhoto() },
      { text: 'Photo library', onPress: () => void pickPhotoFromLibrary() },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const onAddUpdate = async () => {
    if (!request || !canAddUpdates) {
      return;
    }

    try {
      await addMaintenanceUpdate({
        maintenanceRequestId: request.id,
        note: updateNote,
        photoUri: updatePhotoUri,
        source: 'maintenance',
      });
      setUpdateNote('');
      setUpdatePhotoUri(undefined);
      Alert.alert('Saved', 'Maintenance update added.');
    } catch (error) {
      Alert.alert('Unable to save update', (error as Error).message);
    }
  };

  if (!request) {
    return (
      <View style={styles.missingWrap}>
        <Text style={styles.missingTitle}>Maintenance request not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.sm }]}
    >
      <Text style={styles.heading}>{request.title}</Text>
      <Text style={styles.subtitle}>Detailed request context and latest status.</Text>

      <MaintenanceCard
        item={request}
        readOnly={!canEditStatus}
        propertyName={propertyName}
        unitLabel={unitLabel}
        showDataverseLink={canEditStatus}
        onOpenDataverse={canEditStatus ? () => openExternalUrl(request.dataverseUrl) : undefined}
        onStatusChange={(status) => void onStatusChange(status)}
      />

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Request timeline</Text>
        <Text style={styles.metaLine}>Last updated: {formatRelativeTime(request.updatedAt)}</Text>
        <Text style={styles.metaLine}>Priority: {request.priority.toUpperCase()}</Text>
        <Text style={styles.metaLine}>Current status: {request.status.replace('_', ' ')}</Text>

        {latestUpdate ? (
          <View style={styles.latestUpdateCard}>
            <Text style={styles.updateMeta}>
              {getTimelineSourceLabel(latestUpdate)}
              {latestUpdate.authorName ? ` · ${latestUpdate.authorName}` : ''} ·{' '}
              {formatRelativeTime(latestUpdate.createdAt)}
            </Text>
            <Text style={styles.updateText}>{latestUpdate.note}</Text>
            {latestUpdate.photoUri && (
              <Image source={{ uri: latestUpdate.photoUri }} style={styles.updateImage} />
            )}
          </View>
        ) : (
          <Text style={styles.metaLine}>No timeline entries yet.</Text>
        )}

        {olderUpdates.length > 0 && (
          <Pressable
            style={styles.timelineToggle}
            onPress={() => setIsTimelineExpanded((prev) => !prev)}
          >
            <Text style={styles.timelineToggleText}>
              {isTimelineExpanded
                ? 'Hide details'
                : `View details (${olderUpdates.length} earlier update${olderUpdates.length > 1 ? 's' : ''})`}
            </Text>
          </Pressable>
        )}

        {isTimelineExpanded && olderUpdates.length > 0 && (
          <View style={styles.updatesList}>
            {olderUpdates.map((item) => (
              <View key={item.id} style={styles.updateItem}>
                <Text style={styles.updateMeta}>
                  {getTimelineSourceLabel(item)}
                  {item.authorName ? ` · ${item.authorName}` : ''} · {formatRelativeTime(item.createdAt)}
                </Text>
                <Text style={styles.updateText}>{item.note}</Text>
                {item.photoUri && (
                  <Image source={{ uri: item.photoUri }} style={styles.updateImage} />
                )}
              </View>
            ))}
          </View>
        )}
      </View>

      {relatedConversation ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Conversation context</Text>
          <Text style={styles.metaLine}>Visitor: {relatedConversation.visitorAlias}</Text>
          <Text style={styles.metaLine}>Property: {relatedConversation.property.name}</Text>
          <Text style={styles.metaLine}>Unit: {relatedConversation.unit.label}</Text>
          <Text style={styles.metaLine}>Chat status: {relatedConversation.status}</Text>
        </View>
      ) : null}

      {canAddUpdates && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Add update + photo</Text>
          <Text style={styles.metaLine}>
            Share progress details and extra photos for this maintenance request.
          </Text>

          <TextInput
            style={styles.noteInput}
            value={updateNote}
            onChangeText={setUpdateNote}
            placeholder="Add update details (optional if photo attached)"
            placeholderTextColor="#8D9AA5"
            multiline
          />

          {updatePhotoUri ? (
            <View style={styles.photoPreviewRow}>
              <Image source={{ uri: updatePhotoUri }} style={styles.photoPreview} />
              <View style={styles.photoPreviewMeta}>
                <Text style={styles.photoPreviewText}>Photo attached</Text>
                <Pressable onPress={() => setUpdatePhotoUri(undefined)}>
                  <Text style={styles.photoPreviewRemove}>Remove</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          <Pressable style={styles.attachButton} onPress={choosePhoto}>
            <Ionicons name="image-outline" size={18} color={colors.textPrimary} />
            <Text style={styles.attachButtonText}>
              {updatePhotoUri ? 'Replace photo' : 'Attach photo'}
            </Text>
          </Pressable>

          <PrimaryButton label="Save update" onPress={() => void onAddUpdate()} />
        </View>
      )}

      {canEditStatus && (
        <PrimaryButton
          label="Open full work order in Rental Smart"
          onPress={() => void openExternalUrl(request.dataverseUrl)}
          variant="outline"
        />
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  heading: {
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
    gap: 10,
  },
  cardTitle: {
    color: colors.textPrimary,
    fontSize: typography.heading,
    fontWeight: '800',
    marginBottom: 2,
  },
  metaLine: {
    color: colors.textSecondary,
    fontSize: typography.small,
    fontWeight: '600',
    lineHeight: 20,
  },
  latestUpdateCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: '#FAFCFD',
    padding: spacing.sm,
    gap: 8,
  },
  timelineToggle: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: radius.md,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#FAFCFD',
  },
  timelineToggleText: {
    color: colors.accent,
    fontSize: typography.small,
    fontWeight: '700',
  },
  noteInput: {
    minHeight: 96,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: radius.md,
    backgroundColor: '#FAFCFD',
    color: colors.textPrimary,
    paddingHorizontal: 12,
    paddingVertical: 10,
    textAlignVertical: 'top',
  },
  attachButton: {
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: radius.md,
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FAFCFD',
  },
  attachButtonText: {
    color: colors.textPrimary,
    fontWeight: '700',
    fontSize: typography.small,
  },
  photoPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: radius.md,
    backgroundColor: '#FAFCFD',
    padding: 8,
  },
  photoPreview: {
    width: 64,
    height: 64,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#E8EEF1',
  },
  photoPreviewMeta: {
    flex: 1,
    gap: 4,
  },
  photoPreviewText: {
    color: colors.textPrimary,
    fontWeight: '600',
    fontSize: typography.small,
  },
  photoPreviewRemove: {
    color: colors.danger,
    fontWeight: '700',
    fontSize: 12,
  },
  updatesList: {
    gap: spacing.sm,
  },
  updateItem: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: '#FAFCFD',
    padding: spacing.sm,
    gap: 8,
  },
  updateMeta: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  updateText: {
    color: colors.textPrimary,
    fontSize: typography.small,
    lineHeight: 20,
  },
  updateImage: {
    width: '100%',
    height: 200,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#E8EEF1',
  },
  missingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  missingTitle: {
    color: colors.textPrimary,
    fontSize: typography.body,
    fontWeight: '700',
  },
});
