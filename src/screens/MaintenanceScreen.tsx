import React, { useMemo, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EmptyState } from '../components/EmptyState';
import { MaintenanceCard } from '../components/MaintenanceCard';
import { MaintenanceStackParamList } from '../navigation/types';
import { useAppStore } from '../store/AppStore';
import { colors, radius, spacing, typography } from '../theme/theme';
import { MaintenanceStatus } from '../types/domain';
import { openExternalUrl } from '../utils/linking';

const filters: Array<{ label: string; value: MaintenanceStatus | 'all' }> = [
  { label: 'All', value: 'all' },
  { label: 'New', value: 'new' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Done', value: 'done' },
];

export const MaintenanceScreen = () => {
  const { maintenanceRequests, updateMaintenanceStatus, conversations, currentUser } = useAppStore();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<MaintenanceStackParamList>>();
  const [activeFilter, setActiveFilter] = useState<MaintenanceStatus | 'all'>('all');
  const canEditStatus = currentUser?.role === 'PM' || currentUser?.role === 'Supervisor';

  const filtered = useMemo(() => {
    if (activeFilter === 'all') {
      return maintenanceRequests;
    }

    return maintenanceRequests.filter((item) => item.status === activeFilter);
  }, [activeFilter, maintenanceRequests]);

  const onStatusChange = async (requestId: string, status: MaintenanceStatus) => {
    try {
      await updateMaintenanceStatus(requestId, status);
    } catch (error) {
      Alert.alert('Status update failed', (error as Error).message);
    }
  };

  const propertyById = useMemo(() => {
    const map = new Map<string, string>();
    conversations.forEach((item) => {
      map.set(item.property.id, item.property.name);
    });
    return map;
  }, [conversations]);

  const unitById = useMemo(() => {
    const map = new Map<string, string>();
    conversations.forEach((item) => {
      map.set(item.unit.id, item.unit.label);
    });
    return map;
  }, [conversations]);

  const openRequestDetails = (requestId: string) => {
    navigation.navigate('MaintenanceDetail', { requestId });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.sm }]}>
      <Text style={styles.title}>Maintenance</Text>
      <Text style={styles.subtitle}>
        {canEditStatus
          ? 'Review details in app. Status changes require tapping Edit status.'
          : 'Tap a request card to view details and conversation context.'}
      </Text>

      <View style={styles.filterRow}>
        {filters.map((filter) => {
          const selected = filter.value === activeFilter;
          return (
            <Pressable
              key={filter.value}
              onPress={() => setActiveFilter(filter.value)}
              style={[styles.filterChip, selected && styles.filterChipActive]}
            >
              <Text style={[styles.filterLabel, selected && styles.filterLabelActive]}>
                {filter.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {filtered.length === 0 ? (
          <EmptyState
            title="No requests"
            subtitle="No maintenance records in this status."
          />
        ) : (
          filtered.map((item) => (
            <MaintenanceCard
              key={item.id}
              item={item}
              propertyName={propertyById.get(item.propertyId)}
              unitLabel={unitById.get(item.unitId)}
              onPress={() => openRequestDetails(item.id)}
              readOnly={!canEditStatus}
              showDataverseLink={canEditStatus}
              onOpenDataverse={
                canEditStatus ? () => openExternalUrl(item.dataverseUrl) : undefined
              }
              onStatusChange={(status) => void onStatusChange(item.id, status)}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.md,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: typography.small,
    marginTop: 4,
    marginBottom: spacing.md,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: spacing.md,
    flexWrap: 'wrap',
  },
  filterChip: {
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: radius.md,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: colors.surface,
  },
  filterChipActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentMuted,
  },
  filterLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  filterLabelActive: {
    color: colors.accent,
  },
  content: {
    gap: spacing.sm,
    paddingBottom: spacing.xl,
  },
});
