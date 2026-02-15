import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ConversationStatus, MaintenanceStatus } from '../types/domain';
import { colors, radius, typography } from '../theme/theme';
import { toTitleCase } from '../utils/format';

interface StatusBadgeProps {
  status: ConversationStatus | MaintenanceStatus;
}

const styleByStatus: Record<string, { bg: string; fg: string }> = {
  new: { bg: colors.accentMuted, fg: colors.accent },
  assigned: { bg: '#E7F0FF', fg: '#2457A5' },
  waiting: { bg: colors.warningMuted, fg: colors.warning },
  closed: { bg: '#EAECEF', fg: '#5D6B75' },
  in_progress: { bg: '#E7F0FF', fg: '#2457A5' },
  done: { bg: '#E3F6EE', fg: '#177A52' },
};

export const StatusBadge = ({ status }: StatusBadgeProps) => {
  const style = styleByStatus[status] ?? {
    bg: colors.surfaceMuted,
    fg: colors.textSecondary,
  };

  return (
    <View style={[styles.badge, { backgroundColor: style.bg }]}> 
      <Text style={[styles.label, { color: style.fg }]}>{toTitleCase(status)}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: radius.lg,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  label: {
    fontSize: typography.small,
    fontWeight: '700',
  },
});
