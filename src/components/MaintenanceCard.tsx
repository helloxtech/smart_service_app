import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaintenanceRequest, MaintenanceStatus } from '../types/domain';
import { colors, radius, spacing, typography } from '../theme/theme';
import { formatRelativeTime } from '../utils/format';
import { StatusBadge } from './StatusBadge';

interface MaintenanceCardProps {
  item: MaintenanceRequest;
  onOpenDataverse?: () => void;
  onStatusChange: (status: MaintenanceStatus) => void;
  onPress?: () => void;
  compact?: boolean;
  readOnly?: boolean;
  propertyName?: string;
  unitLabel?: string;
  showDataverseLink?: boolean;
}

const options: MaintenanceStatus[] = ['new', 'in_progress', 'done'];

export const MaintenanceCard = ({
  item,
  onOpenDataverse,
  onStatusChange,
  onPress,
  compact = false,
  readOnly = false,
  propertyName,
  unitLabel,
  showDataverseLink = true,
}: MaintenanceCardProps) => {
  const [isEditingStatus, setIsEditingStatus] = useState(false);

  useEffect(() => {
    setIsEditingStatus(false);
  }, [item.status]);

  const onSelectStatus = (status: MaintenanceStatus) => {
    if (status !== item.status) {
      onStatusChange(status);
    }
    setIsEditingStatus(false);
  };

  return (
    <View style={[styles.card, compact && styles.compact]}>
      {onPress ? (
        <Pressable onPress={onPress} style={styles.detailTapArea}>
          <View style={styles.headerRow}>
            <View style={styles.titleWrap}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.summary}>{item.summary}</Text>
            </View>
            <StatusBadge status={item.status} />
          </View>

          <View style={styles.metaWrap}>
            <Text style={styles.metaText}>
              {propertyName ?? item.propertyId} · {unitLabel ?? item.unitId}
            </Text>
            <Text style={styles.metaText}>Priority: {item.priority.toUpperCase()}</Text>
          </View>

          <Text style={styles.updated}>Updated {formatRelativeTime(item.updatedAt)}</Text>
          <Text style={styles.tapHint}>Tap to open full details</Text>
        </Pressable>
      ) : (
        <>
          <View style={styles.headerRow}>
            <View style={styles.titleWrap}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.summary}>{item.summary}</Text>
            </View>
            <StatusBadge status={item.status} />
          </View>

          <View style={styles.metaWrap}>
            <Text style={styles.metaText}>
              {propertyName ?? item.propertyId} · {unitLabel ?? item.unitId}
            </Text>
            <Text style={styles.metaText}>Priority: {item.priority.toUpperCase()}</Text>
          </View>

          <Text style={styles.updated}>Updated {formatRelativeTime(item.updatedAt)}</Text>
        </>
      )}

      {readOnly ? (
        <Text style={styles.readOnlyLabel}>Status is view only for this record.</Text>
      ) : isEditingStatus ? (
        <>
          <View style={styles.optionRow}>
            {options.map((option) => {
              const selected = option === item.status;
              return (
                <Pressable
                  key={option}
                  onPress={() => onSelectStatus(option)}
                  style={[styles.optionButton, selected && styles.optionSelected]}
                >
                  <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                    {option === 'in_progress'
                      ? 'In Progress'
                      : option === 'new'
                        ? 'New'
                        : 'Done'}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Pressable style={styles.editButton} onPress={() => setIsEditingStatus(false)}>
            <Text style={styles.editButtonText}>Cancel status edit</Text>
          </Pressable>
        </>
      ) : (
        <Pressable style={styles.editButton} onPress={() => setIsEditingStatus(true)}>
          <Text style={styles.editButtonText}>Edit status</Text>
        </Pressable>
      )}

      {showDataverseLink && onOpenDataverse && (
        <Pressable style={styles.deepLinkButton} onPress={onOpenDataverse}>
          <Text style={styles.deepLinkLabel}>Open full work order in Dataverse</Text>
        </Pressable>
      )}
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
  detailTapArea: {
    borderRadius: radius.md,
    padding: 2,
    gap: spacing.sm,
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
  tapHint: {
    color: '#2457A5',
    fontSize: 12,
    fontWeight: '700',
  },
  metaWrap: {
    gap: 2,
  },
  metaText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
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
  readOnlyLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  editButton: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: radius.md,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: '#FAFCFD',
  },
  editButtonText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
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
