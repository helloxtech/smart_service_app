import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EmptyState } from '../components/EmptyState';
import { PrimaryButton } from '../components/PrimaryButton';
import { useAppStore } from '../store/AppStore';
import { colors, radius, spacing, typography } from '../theme/theme';
import { formatRelativeTime } from '../utils/format';

interface UnitOption {
  propertyId: string;
  unitId: string;
  label: string;
}

interface SelectedMedia {
  uri: string;
  kind: 'image' | 'video';
  durationMs?: number;
  fileSizeBytes?: number;
}

const MAX_MEDIA_ATTACHMENTS = 8;
const MAX_VIDEO_DURATION_MS = 30_000;
const MAX_VIDEO_SIZE_BYTES = 25 * 1024 * 1024;

const VIDEO_FILE_EXTENSIONS = ['.mp4', '.mov', '.m4v', '.webm', '.avi', '.mkv'];

const getNoteMediaUris = (photoUris?: string[], fallbackPhotoUri?: string): string[] => {
  const values = [...(photoUris ?? []), fallbackPhotoUri ?? '']
    .map((item) => item.trim())
    .filter(Boolean);
  return Array.from(new Set(values));
};

const looksLikeVideoUri = (uri: string): boolean => {
  const normalized = uri.trim().toLowerCase().split('?')[0] ?? '';
  if (!normalized) {
    return false;
  }

  return VIDEO_FILE_EXTENSIONS.some((extension) => normalized.endsWith(extension));
};

const formatVideoDuration = (durationMs?: number): string => {
  if (!durationMs || durationMs <= 0) {
    return 'Video';
  }

  const totalSeconds = Math.round(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
};

export const VisitsScreen = () => {
  const { conversations, visitNotes, maintenanceRequests, addVisitNote } = useAppStore();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  const unitOptions = useMemo<UnitOption[]>(() => {
    const dedup = new Map<string, UnitOption>();

    conversations.forEach((conversation) => {
      const key = `${conversation.property.id}-${conversation.unit.id}`;
      if (!dedup.has(key)) {
        dedup.set(key, {
          propertyId: conversation.property.id,
          unitId: conversation.unit.id,
          label: `${conversation.property.name} · ${conversation.unit.label}`,
        });
      }
    });

    return Array.from(dedup.values());
  }, [conversations]);

  const [selectedUnitKey, setSelectedUnitKey] = useState<string | undefined>();
  const [selectedMaintenanceId, setSelectedMaintenanceId] = useState<string | undefined>();
  const [unitSearch, setUnitSearch] = useState('');
  const [note, setNote] = useState('');
  const [selectedMedia, setSelectedMedia] = useState<SelectedMedia[]>([]);
  const [knownMediaKinds, setKnownMediaKinds] = useState<Record<string, 'image' | 'video'>>({});
  const [selectedRecentNoteId, setSelectedRecentNoteId] = useState<string | undefined>();
  const [recentUnitKeys, setRecentUnitKeys] = useState<string[]>([]);
  const [savedMaintenanceRequestId, setSavedMaintenanceRequestId] = useState<string | undefined>();

  const selectedUnit = unitOptions.find(
    (option) => `${option.propertyId}-${option.unitId}` === selectedUnitKey,
  );

  const maintenanceForUnit = useMemo(() => {
    if (!selectedUnit) {
      return [];
    }

    return maintenanceRequests.filter(
      (item) =>
        item.propertyId === selectedUnit.propertyId
        && item.unitId === selectedUnit.unitId
        && item.status !== 'done',
    );
  }, [maintenanceRequests, selectedUnit]);

  const selectedMaintenance = useMemo(
    () => maintenanceForUnit.find((item) => item.id === selectedMaintenanceId),
    [maintenanceForUnit, selectedMaintenanceId],
  );

  const unitLabelByKey = useMemo(() => {
    const map = new Map<string, string>();
    unitOptions.forEach((option) => {
      map.set(`${option.propertyId}-${option.unitId}`, option.label);
    });
    return map;
  }, [unitOptions]);

  const unitOptionByKey = useMemo(() => {
    const map = new Map<string, UnitOption>();
    unitOptions.forEach((option) => {
      map.set(`${option.propertyId}-${option.unitId}`, option);
    });
    return map;
  }, [unitOptions]);

  const recentUnitOptions = useMemo(() => {
    const seen = new Set<string>();
    const recent: UnitOption[] = [];

    recentUnitKeys.forEach((key) => {
      const option = unitOptionByKey.get(key);
      if (!option || seen.has(key)) {
        return;
      }
      seen.add(key);
      recent.push(option);
    });

    visitNotes
      .slice()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .forEach((item) => {
        const key = `${item.propertyId}-${item.unitId}`;
        if (seen.has(key)) {
          return;
        }

        const label = unitLabelByKey.get(key);
        if (!label) {
          return;
        }

        seen.add(key);
        recent.push({
          propertyId: item.propertyId,
          unitId: item.unitId,
          label,
        });
      });

    return recent.slice(0, 5);
  }, [recentUnitKeys, unitLabelByKey, unitOptionByKey, visitNotes]);

  const maintenanceTitleById = useMemo(() => {
    const map = new Map<string, string>();
    maintenanceRequests.forEach((item) => {
      map.set(item.id, item.title);
    });
    return map;
  }, [maintenanceRequests]);

  const selectedRecentNote = useMemo(
    () => visitNotes.find((item) => item.id === selectedRecentNoteId),
    [selectedRecentNoteId, visitNotes],
  );

  useEffect(() => {
    if (!selectedUnitKey) {
      return;
    }

    const selectedStillExists = unitOptions.some(
      (option) => `${option.propertyId}-${option.unitId}` === selectedUnitKey,
    );

    if (!selectedStillExists) {
      setSelectedUnitKey(undefined);
    }
  }, [selectedUnitKey, unitOptions]);

  useEffect(() => {
    setRecentUnitKeys((prev) => {
      const next = prev.filter((key) => unitOptionByKey.has(key));
      return next.length === prev.length ? prev : next;
    });
  }, [unitOptionByKey]);

  useEffect(() => {
    if (!selectedMaintenanceId) return;
    const stillExists = maintenanceForUnit.some((item) => item.id === selectedMaintenanceId);
    if (!stillExists) {
      setSelectedMaintenanceId(undefined);
    }
  }, [maintenanceForUnit, selectedMaintenanceId]);

  const filteredUnitOptions = useMemo(() => {
    const query = unitSearch.trim().toLowerCase();
    if (query.length < 2) {
      return [];
    }

    return unitOptions
      .filter((option) => option.label.toLowerCase().includes(query))
      .slice(0, 8);
  }, [unitOptions, unitSearch]);

  const unitSearchMatchCount = useMemo(() => {
    const query = unitSearch.trim().toLowerCase();
    if (query.length < 2) {
      return 0;
    }

    return unitOptions.filter((option) => option.label.toLowerCase().includes(query)).length;
  }, [unitOptions, unitSearch]);

  const upsertSelectedMedia = (incoming: SelectedMedia[]) => {
    setKnownMediaKinds((prev) => {
      const next = { ...prev };
      incoming.forEach((item) => {
        next[item.uri] = item.kind;
      });
      return next;
    });

    setSelectedMedia((prev) => {
      const byUri = new Map<string, SelectedMedia>();
      prev.forEach((item) => byUri.set(item.uri, item));
      incoming.forEach((item) => byUri.set(item.uri, item));
      return Array.from(byUri.values()).slice(0, MAX_MEDIA_ATTACHMENTS);
    });
  };

  const normalizePickedMedia = (
    assets: ImagePicker.ImagePickerAsset[],
  ): { accepted: SelectedMedia[]; rejectedMessages: string[] } => {
    const accepted: SelectedMedia[] = [];
    const rejectedMessages: string[] = [];

    assets.forEach((asset) => {
      const kind = asset.type === 'video' ? 'video' : 'image';

      if (kind === 'video') {
        if ((asset.duration ?? 0) > MAX_VIDEO_DURATION_MS) {
          rejectedMessages.push(
            `${asset.fileName ?? 'Video'} exceeds 30 seconds and was skipped.`,
          );
          return;
        }

        if ((asset.fileSize ?? 0) > MAX_VIDEO_SIZE_BYTES) {
          rejectedMessages.push(
            `${asset.fileName ?? 'Video'} is larger than 25MB and was skipped.`,
          );
          return;
        }
      }

      if (!asset.uri?.trim()) {
        return;
      }

      accepted.push({
        uri: asset.uri.trim(),
        kind,
        durationMs: asset.duration ?? undefined,
        fileSizeBytes: asset.fileSize ?? undefined,
      });
    });

    return { accepted, rejectedMessages };
  };

  const showRejectedMediaAlert = (messages: string[]) => {
    if (messages.length === 0) {
      return;
    }
    Alert.alert('Some media skipped', messages.slice(0, 3).join('\n'));
  };

  const addMediaFromAssets = (assets: ImagePicker.ImagePickerAsset[]) => {
    const remaining = MAX_MEDIA_ATTACHMENTS - selectedMedia.length;
    if (remaining <= 0) {
      Alert.alert('Attachment limit reached', `You can attach up to ${MAX_MEDIA_ATTACHMENTS} items.`);
      return;
    }

    const { accepted, rejectedMessages } = normalizePickedMedia(assets);
    const acceptedLimited = accepted.slice(0, remaining);
    upsertSelectedMedia(acceptedLimited);

    if (accepted.length > acceptedLimited.length) {
      rejectedMessages.push(`Only ${MAX_MEDIA_ATTACHMENTS} total media attachments are allowed.`);
    }
    showRejectedMediaAlert(rejectedMessages);
  };

  const pickMediaFromLibrary = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please enable media library access.');
      return;
    }

    const remaining = MAX_MEDIA_ATTACHMENTS - selectedMedia.length;
    if (remaining <= 0) {
      Alert.alert('Attachment limit reached', `You can attach up to ${MAX_MEDIA_ATTACHMENTS} items.`);
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length > 0) {
      addMediaFromAssets(result.assets);
    }
  };

  const capturePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please enable camera access.');
      return;
    }

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.8,
      });

      if (!result.canceled && result.assets.length > 0) {
        addMediaFromAssets(result.assets);
      }
    } catch {
      Alert.alert(
        'Camera unavailable',
        'Camera capture is not available in this simulator. Use a physical device or media library.',
      );
    }
  };

  const captureVideo = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please enable camera access.');
      return;
    }

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['videos'],
        videoMaxDuration: Math.floor(MAX_VIDEO_DURATION_MS / 1000),
        quality: 0.8,
      });

      if (!result.canceled && result.assets.length > 0) {
        addMediaFromAssets(result.assets);
      }
    } catch {
      Alert.alert(
        'Camera unavailable',
        'Video capture is not available in this simulator. Use a physical device or media library.',
      );
    }
  };

  const chooseMedia = () => {
    Alert.alert('Add media', 'Attach photo or short video (max 30s / 25MB each).', [
      { text: 'Take photo', onPress: () => void capturePhoto() },
      { text: 'Record video', onPress: () => void captureVideo() },
      { text: 'Media library', onPress: () => void pickMediaFromLibrary() },
      ...(selectedMedia.length > 0
        ? [{ text: 'Clear all media', style: 'destructive' as const, onPress: () => setSelectedMedia([]) }]
        : []),
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const isVideoAttachment = (uri: string): boolean =>
    knownMediaKinds[uri] === 'video' || looksLikeVideoUri(uri);

  const rememberRecentUnit = (unitKey: string) => {
    setRecentUnitKeys((prev) => [unitKey, ...prev.filter((item) => item !== unitKey)].slice(0, 5));
  };

  const selectUnit = (unitKey: string) => {
    setSelectedUnitKey(unitKey);
    rememberRecentUnit(unitKey);
  };

  const saveNote = async () => {
    if (!selectedUnit) {
      Alert.alert('Select unit', 'Please select a property/unit first.');
      return;
    }

    if (!note.trim()) {
      Alert.alert('Add details', 'Please enter the site visit note before saving.');
      return;
    }

    try {
      const saved = await addVisitNote({
        propertyId: selectedUnit.propertyId,
        unitId: selectedUnit.unitId,
        maintenanceRequestId: selectedMaintenanceId,
        note,
        photoUris: selectedMedia.map((item) => item.uri),
      });

      setNote('');
      setSelectedMedia([]);
      setSelectedMaintenanceId(undefined);
      rememberRecentUnit(`${selectedUnit.propertyId}-${selectedUnit.unitId}`);
      if (saved.maintenanceRequestId) {
        setSavedMaintenanceRequestId(saved.maintenanceRequestId);
      } else {
        Alert.alert('Saved', 'Site visit note saved successfully.');
      }
    } catch (error) {
      Alert.alert('Unable to save note', (error as Error).message);
    }
  };

  const openMaintenanceDetail = (requestId: string) => {
    navigation.navigate('MaintenanceTab', {
      screen: 'MaintenanceDetail',
      params: { requestId },
    });
  };

  const selectedRecentNoteUnitLabel = selectedRecentNote
    ? unitLabelByKey.get(`${selectedRecentNote.propertyId}-${selectedRecentNote.unitId}`)
      ?? `${selectedRecentNote.propertyId} · ${selectedRecentNote.unitId}`
    : undefined;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.sm }]}
    >
      <Text style={styles.title}>Site Visits</Text>
      <Text style={styles.subtitle}>Capture onsite findings with media and notes.</Text>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>New site note</Text>

        <Text style={styles.fieldLabel}>Property / Unit</Text>
        <TextInput
          style={styles.searchInput}
          value={unitSearch}
          onChangeText={setUnitSearch}
          placeholder="Search property or unit"
          placeholderTextColor="#8D9AA5"
        />
        <Text style={styles.fieldHint}>
          For large portfolios, start typing to find a unit quickly.
        </Text>

        <Text style={styles.secondaryLabel}>Search results</Text>
        <View style={styles.searchResultPanel}>
          {unitSearch.trim().length < 2 ? (
            <Text style={styles.emptyHint}>Type at least 2 characters to search units.</Text>
          ) : (
            <>
              <View style={styles.pillWrap}>
                {filteredUnitOptions.map((option) => {
                  const key = `${option.propertyId}-${option.unitId}`;
                  const selected = selectedUnitKey === key;
                  return (
                    <Pressable
                      key={key}
                      onPress={() => selectUnit(key)}
                      style={[
                        styles.pill,
                        styles.searchResultPill,
                        selected && styles.pillSelected,
                        selected && styles.searchResultPillSelected,
                      ]}
                    >
                      <Text style={[styles.pillText, selected && styles.pillTextSelected]}>
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              {filteredUnitOptions.length === 0 && (
                <Text style={styles.emptyHint}>No property/unit matched your search.</Text>
              )}
              {unitSearchMatchCount > filteredUnitOptions.length && (
                <Text style={styles.emptyHint}>
                  Showing first {filteredUnitOptions.length} of {unitSearchMatchCount} matches.
                </Text>
              )}
            </>
          )}
        </View>

        {recentUnitOptions.length > 0 && (
          <>
            <Text style={styles.secondaryLabel}>Recent units</Text>
            <View style={styles.pillWrap}>
              {recentUnitOptions.map((option) => {
                const key = `${option.propertyId}-${option.unitId}`;
                return (
                  <Pressable
                    key={key}
                    onPress={() => selectUnit(key)}
                    style={[styles.pill, styles.recentUnitPill]}
                  >
                    <Text style={styles.pillText}>
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}

        {selectedUnit && (
          <View style={styles.linkedRequestRow}>
            <Text style={styles.linkedRequestText}>Selected unit: {selectedUnit.label}</Text>
            <Pressable onPress={() => setSelectedUnitKey(undefined)}>
              <Text style={styles.clearLink}>Clear</Text>
            </Pressable>
          </View>
        )}

        {selectedUnit && (
          <>
            <Text style={styles.fieldLabel}>Related maintenance request (optional)</Text>
            <Text style={styles.fieldHint}>
              Showing active requests only. Tap one request to link it. If none is selected, saving this site note will create a new request automatically.
            </Text>

            <View style={styles.requestOptions}>
              {maintenanceForUnit.map((item) => {
                const selected = selectedMaintenanceId === item.id;
                return (
                  <Pressable
                    key={item.id}
                    onPress={() =>
                      setSelectedMaintenanceId((prev) =>
                        prev === item.id ? undefined : item.id,
                      )
                    }
                    style={[styles.requestOption, selected && styles.requestOptionSelected]}
                  >
                    <View style={styles.requestOptionMain}>
                      <Ionicons
                        name={selected ? 'radio-button-on' : 'radio-button-off'}
                        size={16}
                        color={selected ? colors.accent : colors.textSecondary}
                      />
                      <View style={styles.requestCopy}>
                        <Text style={[styles.requestTitle, selected && styles.requestTitleSelected]}>
                          {item.title}
                        </Text>
                        <Text style={styles.requestMeta}>
                          Status: {item.status.replace('_', ' ')} · Priority: {item.priority}
                        </Text>
                      </View>
                    </View>
                    {selected && (
                      <View style={styles.requestSelectedBadge}>
                        <Text style={styles.requestSelectedBadgeText}>Selected</Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>

            {selectedMaintenance && (
              <View style={styles.linkedRequestRow}>
                <Text style={styles.linkedRequestText}>Linked request: {selectedMaintenance.title}</Text>
                <Pressable onPress={() => setSelectedMaintenanceId(undefined)}>
                  <Text style={styles.clearLink}>Clear</Text>
                </Pressable>
              </View>
            )}

            {maintenanceForUnit.length === 0 && (
              <Text style={styles.emptyHint}>No active maintenance request for the selected unit.</Text>
            )}
          </>
        )}

        <TextInput
          style={styles.textArea}
          value={note}
          onChangeText={setNote}
          multiline
          placeholder="Add what you saw onsite, what action was taken, and next step."
          placeholderTextColor="#8D9AA5"
        />

        <Pressable style={styles.photoButton} onPress={chooseMedia}>
          <Ionicons name="camera-outline" size={18} color={colors.textPrimary} />
          <Text style={styles.photoButtonLabel}>
            {selectedMedia.length > 0 ? `Add media (${selectedMedia.length})` : 'Attach media'}
          </Text>
        </Pressable>

        <Text style={styles.mediaLimitHint}>Short videos only: up to 30s and 25MB each.</Text>

        {selectedMedia.length > 0 && (
          <View style={styles.previewGrid}>
            {selectedMedia.map((item) => (
              <View key={item.uri} style={styles.previewTileWrap}>
                {item.kind === 'video' ? (
                  <View style={[styles.previewTile, styles.previewVideoTile]}>
                    <Ionicons name="videocam-outline" size={20} color={colors.accent} />
                    <Text style={styles.previewVideoText}>{formatVideoDuration(item.durationMs)}</Text>
                  </View>
                ) : (
                  <Image source={{ uri: item.uri }} style={styles.previewTile} />
                )}
                <Pressable
                  style={styles.previewRemove}
                  onPress={() =>
                    setSelectedMedia((prev) => prev.filter((current) => current.uri !== item.uri))
                  }
                >
                  <Ionicons name="close" size={12} color="#FFFFFF" />
                </Pressable>
              </View>
            ))}
          </View>
        )}

        <PrimaryButton label="Save note" onPress={() => void saveNote()} />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Recent notes</Text>

        {visitNotes.length === 0 ? (
          <EmptyState
            title="No site notes"
            subtitle="Notes you capture onsite will appear here."
          />
        ) : (
          visitNotes.map((item) => (
            <Pressable
              key={item.id}
              style={styles.noteCard}
              onPress={() => setSelectedRecentNoteId(item.id)}
            >
              <Text style={styles.noteMeta}>
                {unitLabelByKey.get(`${item.propertyId}-${item.unitId}`)
                  ?? `${item.propertyId} · ${item.unitId}`} · {formatRelativeTime(item.createdAt)}
              </Text>
              <Text style={styles.noteBody}>{item.note}</Text>
              {item.maintenanceRequestId && (
                <Text style={styles.noteContext}>
                  Related request: {maintenanceTitleById.get(item.maintenanceRequestId) ?? item.maintenanceRequestId}
                </Text>
              )}
              {getNoteMediaUris(item.photoUris, item.photoUri).length > 0 && (
                <View style={styles.notePhotoRow}>
                  {getNoteMediaUris(item.photoUris, item.photoUri).map((uri) =>
                    isVideoAttachment(uri) ? (
                      <View key={uri} style={[styles.notePhotoThumb, styles.noteVideoThumb]}>
                        <Ionicons name="videocam-outline" size={16} color={colors.accent} />
                        <Text style={styles.noteVideoLabel}>Video</Text>
                      </View>
                    ) : (
                      <Image key={uri} source={{ uri }} style={styles.notePhotoThumb} />
                    ),
                  )}
                </View>
              )}
              <Text style={styles.openNoteHint}>Tap to open</Text>
            </Pressable>
          ))
        )}
      </View>

      <Modal visible={Boolean(selectedRecentNote)} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Site note details</Text>
              <Pressable onPress={() => setSelectedRecentNoteId(undefined)}>
                <Ionicons name="close" size={20} color={colors.textPrimary} />
              </Pressable>
            </View>

            {selectedRecentNote && (
              <>
                <Text style={styles.modalMeta}>
                  {selectedRecentNoteUnitLabel} · {formatRelativeTime(selectedRecentNote.createdAt)}
                </Text>
                {selectedRecentNote.maintenanceRequestId && (
                  <Text style={styles.modalMeta}>
                    Related request: {maintenanceTitleById.get(selectedRecentNote.maintenanceRequestId) ?? selectedRecentNote.maintenanceRequestId}
                  </Text>
                )}
                <Text style={styles.modalBody}>{selectedRecentNote.note}</Text>
                {getNoteMediaUris(
                  selectedRecentNote.photoUris,
                  selectedRecentNote.photoUri,
                ).length > 0 && (
                  <View style={styles.modalImageWrap}>
                    {getNoteMediaUris(
                      selectedRecentNote.photoUris,
                      selectedRecentNote.photoUri,
                    ).map((uri) =>
                      isVideoAttachment(uri) ? (
                        <View key={uri} style={[styles.modalImage, styles.modalVideoCard]}>
                          <Ionicons name="videocam-outline" size={20} color={colors.accent} />
                          <Text style={styles.modalVideoLabel}>Video attached</Text>
                        </View>
                      ) : (
                        <Image key={uri} source={{ uri }} style={styles.modalImage} />
                      ),
                    )}
                  </View>
                )}

                {selectedRecentNote.maintenanceRequestId && (
                  <PrimaryButton
                    label="Open related maintenance request"
                    onPress={() => {
                      openMaintenanceDetail(selectedRecentNote.maintenanceRequestId!);
                      setSelectedRecentNoteId(undefined);
                    }}
                    variant="outline"
                  />
                )}
                <PrimaryButton
                  label="Close"
                  onPress={() => setSelectedRecentNoteId(undefined)}
                />
              </>
            )}
          </View>
        </View>
      </Modal>

      <Modal visible={Boolean(savedMaintenanceRequestId)} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Site note saved</Text>
              <Pressable
                onPress={() => {
                  if (savedMaintenanceRequestId) {
                    openMaintenanceDetail(savedMaintenanceRequestId);
                  }
                  setSavedMaintenanceRequestId(undefined);
                }}
              >
                <Ionicons name="close" size={20} color={colors.textPrimary} />
              </Pressable>
            </View>
            <Text style={styles.modalMeta}>
              A maintenance request has been linked. Continue in request details.
            </Text>
            <PrimaryButton
              label="Open maintenance request"
              onPress={() => {
                if (savedMaintenanceRequestId) {
                  openMaintenanceDetail(savedMaintenanceRequestId);
                }
                setSavedMaintenanceRequestId(undefined);
              }}
            />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  title: {
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
    gap: spacing.sm,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: typography.heading,
    fontWeight: '800',
  },
  fieldLabel: {
    color: colors.textPrimary,
    fontSize: typography.small,
    fontWeight: '700',
    marginTop: 4,
  },
  fieldHint: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },
  secondaryLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  searchResultPanel: {
    borderWidth: 1,
    borderColor: '#B8E3CF',
    borderRadius: radius.md,
    backgroundColor: '#F2FBF7',
    padding: 8,
    gap: 8,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: radius.md,
    minHeight: 42,
    paddingHorizontal: 12,
    color: colors.textPrimary,
    backgroundColor: '#FAFCFD',
  },
  pillWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: radius.md,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: '#FAFCFD',
  },
  searchResultPill: {
    borderColor: '#9ED5B9',
    backgroundColor: '#FFFFFF',
  },
  searchResultPillSelected: {
    borderColor: colors.accent,
  },
  recentUnitPill: {
    backgroundColor: '#F7FAFC',
  },
  pillSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accentMuted,
  },
  pillText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  pillTextSelected: {
    color: colors.accent,
  },
  requestOptions: {
    gap: 8,
  },
  requestOption: {
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: radius.md,
    backgroundColor: '#FAFCFD',
    paddingHorizontal: 10,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  requestOptionSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accentMuted,
  },
  requestOptionMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  requestCopy: {
    flex: 1,
    gap: 2,
  },
  requestTitle: {
    color: colors.textPrimary,
    fontSize: typography.small,
    fontWeight: '700',
  },
  requestTitleSelected: {
    color: colors.accent,
  },
  requestMeta: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  requestSelectedBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: '#E7F6EE',
  },
  requestSelectedBadgeText: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  linkedRequestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.accentMuted,
    borderRadius: radius.md,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  linkedRequestText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
  clearLink: {
    color: '#2457A5',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyHint: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  textArea: {
    minHeight: 120,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: radius.md,
    backgroundColor: '#FAFCFD',
    color: colors.textPrimary,
    textAlignVertical: 'top',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  photoButton: {
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: radius.md,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#FAFCFD',
  },
  photoButtonLabel: {
    color: colors.textPrimary,
    fontWeight: '700',
    fontSize: typography.small,
  },
  mediaLimitHint: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: -2,
  },
  previewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  previewTileWrap: {
    position: 'relative',
  },
  previewTile: {
    width: 92,
    height: 92,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#E8EEF1',
  },
  previewVideoTile: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#ECF6F1',
  },
  previewVideoText: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '700',
  },
  previewRemove: {
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
  noteCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.sm,
    gap: 6,
    backgroundColor: '#FAFCFD',
  },
  noteMeta: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  noteBody: {
    color: colors.textPrimary,
    fontSize: typography.small,
    lineHeight: 20,
  },
  noteContext: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  notePhotoThumb: {
    width: 86,
    height: 86,
    borderRadius: radius.sm,
  },
  noteVideoThumb: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#ECF6F1',
    borderWidth: 1,
    borderColor: '#CBE6D8',
  },
  noteVideoLabel: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '700',
  },
  notePhotoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  openNoteHint: {
    color: '#2457A5',
    fontSize: 12,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    color: colors.textPrimary,
    fontSize: typography.heading,
    fontWeight: '800',
  },
  modalMeta: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  modalBody: {
    color: colors.textPrimary,
    fontSize: typography.small,
    lineHeight: 20,
  },
  modalImageWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  modalImage: {
    width: 132,
    height: 132,
    borderRadius: radius.md,
  },
  modalVideoCard: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#ECF6F1',
    borderWidth: 1,
    borderColor: '#CBE6D8',
  },
  modalVideoLabel: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '700',
  },
});
