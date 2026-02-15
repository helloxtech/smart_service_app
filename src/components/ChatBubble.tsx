import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Message } from '../types/domain';
import { colors, radius, spacing, typography } from '../theme/theme';

interface ChatBubbleProps {
  message: Message;
}

export const ChatBubble = ({ message }: ChatBubbleProps) => {
  if (message.senderType === 'system') {
    return (
      <View style={styles.systemWrap}>
        <Text style={styles.systemText}>{message.body}</Text>
      </View>
    );
  }

  const isPm = message.senderType === 'pm';

  return (
    <View style={[styles.row, isPm ? styles.rowPm : styles.rowVisitor]}>
      <View style={[styles.bubble, isPm ? styles.bubblePm : styles.bubbleVisitor]}>
        <Text style={[styles.sender, isPm ? styles.senderPm : styles.senderVisitor]}>
          {message.senderName}
        </Text>
        <Text style={[styles.body, isPm ? styles.bodyPm : styles.bodyVisitor]}>
          {message.body}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    marginVertical: 5,
    width: '100%',
  },
  rowPm: {
    alignItems: 'flex-end',
  },
  rowVisitor: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '84%',
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: 4,
  },
  bubblePm: {
    backgroundColor: colors.accent,
    borderBottomRightRadius: 6,
  },
  bubbleVisitor: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderBottomLeftRadius: 6,
  },
  sender: {
    fontSize: 11,
    fontWeight: '700',
  },
  senderPm: {
    color: '#E7FFF2',
  },
  senderVisitor: {
    color: colors.textSecondary,
  },
  body: {
    fontSize: typography.body,
    lineHeight: 21,
  },
  bodyPm: {
    color: '#FFFFFF',
  },
  bodyVisitor: {
    color: colors.textPrimary,
  },
  systemWrap: {
    alignItems: 'center',
    marginVertical: spacing.sm,
  },
  systemText: {
    fontSize: typography.small,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
