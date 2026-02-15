import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { EmptyState } from '../components/EmptyState';
import { MaintenanceCard } from '../components/MaintenanceCard';
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
  const { maintenanceRequests, updateMaintenanceStatus } = useAppStore();
  const [activeFilter, setActiveFilter] = useState<MaintenanceStatus | 'all'>('all');

  const filtered = useMemo(() => {
    if (activeFilter === 'all') {
      return maintenanceRequests;
    }

    return maintenanceRequests.filter((item) => item.status === activeFilter);
  }, [activeFilter, maintenanceRequests]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Maintenance</Text>
      <Text style={styles.subtitle}>
        Update request status quickly from field operations.
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
              onOpenDataverse={() => openExternalUrl(item.dataverseUrl)}
              onStatusChange={(status) => updateMaintenanceStatus(item.id, status)}
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
