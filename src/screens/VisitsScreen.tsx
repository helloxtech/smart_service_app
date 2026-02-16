import React, { useEffect, useMemo, useState } from 'react';
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
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
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

export const VisitsScreen = () => {
  const { conversations, visitNotes, maintenanceRequests, addVisitNote } = useAppStore();
  const insets = useSafeAreaInsets();

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

  const [selectedUnitKey, setSelectedUnitKey] = useState(
    unitOptions.length > 0
      ? `${unitOptions[0].propertyId}-${unitOptions[0].unitId}`
      : undefined,
  );
  const [selectedMaintenanceId, setSelectedMaintenanceId] = useState<string | undefined>();
  const [unitSearch, setUnitSearch] = useState('');
  const [note, setNote] = useState('');
  const [photoUri, setPhotoUri] = useState<string | undefined>();

  const selectedUnit = unitOptions.find(
    (option) => `${option.propertyId}-${option.unitId}` === selectedUnitKey,
  );

  const maintenanceForUnit = useMemo(() => {
    if (!selectedUnit) {
      return [];
    }

    return maintenanceRequests.filter(
      (item) =>
        item.propertyId === selectedUnit.propertyId && item.unitId === selectedUnit.unitId,
    );
  }, [maintenanceRequests, selectedUnit]);

  useEffect(() => {
    if (unitOptions.length === 0) {
      setSelectedUnitKey(undefined);
      return;
    }

    const selectedStillExists = unitOptions.some(
      (option) => `${option.propertyId}-${option.unitId}` === selectedUnitKey,
    );

    if (!selectedUnitKey || !selectedStillExists) {
      setSelectedUnitKey(`${unitOptions[0].propertyId}-${unitOptions[0].unitId}`);
    }
  }, [selectedUnitKey, unitOptions]);

  const filteredUnitOptions = useMemo(() => {
    const query = unitSearch.trim().toLowerCase();
    if (!query) {
      return unitOptions;
    }

    return unitOptions.filter((option) => option.label.toLowerCase().includes(query));
  }, [unitOptions, unitSearch]);

  const pickPhotoFromLibrary = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please enable photo library access.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length > 0) {
      setPhotoUri(result.assets[0].uri);
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
        setPhotoUri(result.assets[0].uri);
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
      await addVisitNote({
        propertyId: selectedUnit.propertyId,
        unitId: selectedUnit.unitId,
        maintenanceRequestId: selectedMaintenanceId,
        note,
        photoUri,
      });

      setNote('');
      setPhotoUri(undefined);
      setSelectedMaintenanceId(undefined);
      Alert.alert('Saved', 'Site visit note saved successfully.');
    } catch (error) {
      Alert.alert('Unable to save note', (error as Error).message);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.sm }]}
    >
      <Text style={styles.title}>Site Visits</Text>
      <Text style={styles.subtitle}>Capture onsite findings with photos and notes.</Text>

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
        <View style={styles.pillWrap}>
          {filteredUnitOptions.map((option) => {
            const key = `${option.propertyId}-${option.unitId}`;
            const selected = selectedUnitKey === key;
            return (
              <Pressable
                key={key}
                onPress={() => setSelectedUnitKey(key)}
                style={[styles.pill, selected && styles.pillSelected]}
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

        <Text style={styles.fieldLabel}>Related maintenance request (optional)</Text>
        <View style={styles.pillWrap}>
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
                style={[styles.pill, selected && styles.pillSelected]}
              >
                <Text style={[styles.pillText, selected && styles.pillTextSelected]}>
                  {item.title}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {maintenanceForUnit.length === 0 && (
          <Text style={styles.emptyHint}>No maintenance request for the selected unit.</Text>
        )}

        <TextInput
          style={styles.textArea}
          value={note}
          onChangeText={setNote}
          multiline
          placeholder="Add what you saw onsite, what action was taken, and next step."
          placeholderTextColor="#8D9AA5"
        />

        <Pressable style={styles.photoButton} onPress={choosePhoto}>
          <Ionicons name="camera-outline" size={18} color={colors.textPrimary} />
          <Text style={styles.photoButtonLabel}>
            {photoUri ? 'Replace photo' : 'Attach photo'}
          </Text>
        </Pressable>

        {photoUri && <Image source={{ uri: photoUri }} style={styles.previewImage} />}

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
            <View key={item.id} style={styles.noteCard}>
              <Text style={styles.noteMeta}>
                {item.propertyId} · {item.unitId} · {formatRelativeTime(item.createdAt)}
              </Text>
              <Text style={styles.noteBody}>{item.note}</Text>
              {item.photoUri && (
                <Image source={{ uri: item.photoUri }} style={styles.notePhotoThumb} />
              )}
            </View>
          ))
        )}
      </View>
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
  previewImage: {
    width: '100%',
    height: 180,
    borderRadius: radius.md,
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
  notePhotoThumb: {
    width: 86,
    height: 86,
    borderRadius: radius.sm,
  },
});
