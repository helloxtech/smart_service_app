import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Conversation } from '../types/domain';
import { colors, radius, spacing, typography } from '../theme/theme';
import { formatRelativeTime } from '../utils/format';
import { StatusBadge } from './StatusBadge';

interface ConversationCardProps {
  conversation: Conversation;
  onPress: () => void;
}

export const ConversationCard = ({ conversation, onPress }: ConversationCardProps) => {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.topRow}>
        <Text style={styles.alias}>{conversation.visitorAlias}</Text>
        <Text style={styles.time}>{formatRelativeTime(conversation.lastMessageAt)}</Text>
      </View>

      <View style={styles.metaRow}>
        <Text style={styles.property} numberOfLines={1}>
          {conversation.property.name} · {conversation.unit.label}
        </Text>
      </View>

      <View style={styles.bottomRow}>
        <StatusBadge status={conversation.status} />
        {conversation.unreadCount > 0 && (
          <View style={styles.unreadDot}>
            <Text style={styles.unreadText}>{conversation.unreadCount}</Text>
          </View>
        )}
      </View>

      {conversation.botEscalated && (
        <Text style={styles.escalated}>Bot requested manager takeover</Text>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  alias: {
    fontSize: typography.body,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  property: {
    flex: 1,
    fontSize: typography.small,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  time: {
    fontSize: typography.small,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  unreadDot: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  escalated: {
    color: colors.warning,
    fontSize: typography.small,
    fontWeight: '600',
  },
});
