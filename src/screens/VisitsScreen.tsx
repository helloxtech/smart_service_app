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
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
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

  const pickPhoto = async () => {
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

  const saveNote = () => {
    if (!selectedUnit) {
      Alert.alert('Select unit', 'Please select a property/unit first.');
      return;
    }

    if (!note.trim()) {
      Alert.alert('Add details', 'Please enter the site visit note before saving.');
      return;
    }

    addVisitNote({
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
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Site Visits</Text>
      <Text style={styles.subtitle}>Capture onsite findings with photos and notes.</Text>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>New site note</Text>

        <Text style={styles.fieldLabel}>Property / Unit</Text>
        <View style={styles.pillWrap}>
          {unitOptions.map((option) => {
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

        <TextInput
          style={styles.textArea}
          value={note}
          onChangeText={setNote}
          multiline
          placeholder="Add what you saw onsite, what action was taken, and next step."
          placeholderTextColor="#8D9AA5"
        />

        <Pressable style={styles.photoButton} onPress={pickPhoto}>
          <Ionicons name="camera-outline" size={18} color={colors.textPrimary} />
          <Text style={styles.photoButtonLabel}>
            {photoUri ? 'Replace photo' : 'Attach photo'}
          </Text>
        </Pressable>

        {photoUri && <Image source={{ uri: photoUri }} style={styles.previewImage} />}

        <PrimaryButton label="Save note" onPress={saveNote} />
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
