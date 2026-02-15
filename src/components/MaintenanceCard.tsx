import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaintenanceRequest, MaintenanceStatus } from '../types/domain';
import { colors, radius, spacing, typography } from '../theme/theme';
import { formatRelativeTime } from '../utils/format';
import { StatusBadge } from './StatusBadge';

interface MaintenanceCardProps {
  item: MaintenanceRequest;
  onOpenDataverse: () => void;
  onStatusChange: (status: MaintenanceStatus) => void;
  compact?: boolean;
}

const options: MaintenanceStatus[] = ['new', 'in_progress', 'done'];

export const MaintenanceCard = ({
  item,
  onOpenDataverse,
  onStatusChange,
  compact = false,
}: MaintenanceCardProps) => {
  return (
    <View style={[styles.card, compact && styles.compact]}>
      <View style={styles.headerRow}>
        <View style={styles.titleWrap}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.summary}>{item.summary}</Text>
        </View>
        <StatusBadge status={item.status} />
      </View>

      <Text style={styles.updated}>Updated {formatRelativeTime(item.updatedAt)}</Text>

      <View style={styles.optionRow}>
        {options.map((option) => {
          const selected = option === item.status;
          return (
            <Pressable
              key={option}
              onPress={() => onStatusChange(option)}
              style={[styles.optionButton, selected && styles.optionSelected]}
            >
              <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                {option === 'in_progress' ? 'In Progress' : option === 'new' ? 'New' : 'Done'}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable style={styles.deepLinkButton} onPress={onOpenDataverse}>
        <Text style={styles.deepLinkLabel}>Open full work order in Dataverse</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    backgroundColor: colors.surface,
    gap: spacing.sm,
  },
  compact: {
    marginBottom: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  titleWrap: {
    flex: 1,
    gap: 3,
  },
  title: {
    color: colors.textPrimary,
    fontWeight: '700',
    fontSize: typography.body,
  },
  summary: {
    color: colors.textSecondary,
    fontSize: typography.small,
    lineHeight: 18,
  },
  updated: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
  optionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  optionButton: {
    flex: 1,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  optionSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accentMuted,
  },
  optionText: {
    color: colors.textSecondary,
    fontWeight: '600',
    fontSize: 12,
  },
  optionTextSelected: {
    color: colors.accent,
  },
  deepLinkButton: {
    paddingVertical: 8,
  },
  deepLinkLabel: {
    color: '#2457A5',
    fontSize: typography.small,
    fontWeight: '700',
  },
});
