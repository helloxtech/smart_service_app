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

const getNotePhotoUris = (photoUris?: string[], fallbackPhotoUri?: string): string[] => {
  const values = [...(photoUris ?? []), fallbackPhotoUri ?? '']
    .map((item) => item.trim())
    .filter(Boolean);
  return Array.from(new Set(values));
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
  const [updatePhotoUris, setUpdatePhotoUris] = useState<string[]>([]);
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
      allowsMultipleSelection: true,
      selectionLimit: 8,
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length > 0) {
      setUpdatePhotoUris((prev) => {
        const next = [...prev, ...result.assets.map((asset) => asset.uri)]
          .map((item) => item.trim())
          .filter(Boolean);
        return Array.from(new Set(next)).slice(0, 8);
      });
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
        setUpdatePhotoUris((prev) => {
          const next = [...prev, result.assets[0].uri]
            .map((item) => item.trim())
            .filter(Boolean);
          return Array.from(new Set(next)).slice(0, 8);
        });
      }
    } catch {
      Alert.alert(
        'Camera unavailable',
        'Camera capture is not available in this simulator. Use a physical device or photo library.',
      );
    }
  };

  const choosePhoto = () => {
    Alert.alert('Attach photos', 'Choose photo source', [
      { text: 'Take photo', onPress: () => void capturePhoto() },
      { text: 'Photo library', onPress: () => void pickPhotoFromLibrary() },
      ...(updatePhotoUris.length > 0
        ? [{ text: 'Clear all photos', style: 'destructive' as const, onPress: () => setUpdatePhotoUris([]) }]
        : []),
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
        photoUris: updatePhotoUris,
        source: 'maintenance',
      });
      setUpdateNote('');
      setUpdatePhotoUris([]);
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
            {getNotePhotoUris(latestUpdate.photoUris, latestUpdate.photoUri).length > 0 && (
              <View style={styles.updateImageRow}>
                {getNotePhotoUris(latestUpdate.photoUris, latestUpdate.photoUri).map((uri) => (
                  <Image key={uri} source={{ uri }} style={styles.updateImage} />
                ))}
              </View>
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
                {getNotePhotoUris(item.photoUris, item.photoUri).length > 0 && (
                  <View style={styles.updateImageRow}>
                    {getNotePhotoUris(item.photoUris, item.photoUri).map((uri) => (
                      <Image key={uri} source={{ uri }} style={styles.updateImage} />
                    ))}
                  </View>
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
          <Text style={styles.cardTitle}>Add update + photos</Text>
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

          {updatePhotoUris.length > 0 ? (
            <View style={styles.photoPreviewGrid}>
              {updatePhotoUris.map((uri) => (
                <View key={uri} style={styles.photoPreviewWrap}>
                  <Image source={{ uri }} style={styles.photoPreview} />
                  <Pressable
                    style={styles.photoThumbRemove}
                    onPress={() =>
                      setUpdatePhotoUris((prev) => prev.filter((item) => item !== uri))
                    }
                  >
                    <Ionicons name="close" size={12} color="#FFFFFF" />
                  </Pressable>
                </View>
              ))}
              <View style={styles.photoPreviewMeta}>
                <Text style={styles.photoPreviewText}>
                  {updatePhotoUris.length} photo{updatePhotoUris.length > 1 ? 's' : ''} attached
                </Text>
                <Pressable onPress={() => setUpdatePhotoUris([])}>
                  <Text style={styles.photoPreviewRemove}>Clear all</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          <Pressable style={styles.attachButton} onPress={choosePhoto}>
            <Ionicons name="image-outline" size={18} color={colors.textPrimary} />
            <Text style={styles.attachButtonText}>
              {updatePhotoUris.length > 0
                ? `Add more photos (${updatePhotoUris.length})`
                : 'Attach photos'}
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
  photoPreviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  photoPreviewWrap: {
    position: 'relative',
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
    minWidth: 120,
    gap: 4,
    alignSelf: 'center',
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
  photoThumbRemove: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(27,42,56,0.86)',
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
    width: 124,
    height: 124,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#E8EEF1',
  },
  updateImageRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
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
