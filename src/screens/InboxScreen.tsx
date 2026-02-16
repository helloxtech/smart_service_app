import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ConversationCard } from '../components/ConversationCard';
import { EmptyState } from '../components/EmptyState';
import { useAppStore } from '../store/AppStore';
import { colors, radius, spacing, typography } from '../theme/theme';
import { InboxStackParamList } from '../navigation/types';
import { ConversationStatus } from '../types/domain';

type InboxFilter = 'all' | ConversationStatus;

const filters: Array<{ label: string; value: InboxFilter }> = [
  { label: 'All', value: 'all' },
  { label: 'New', value: 'new' },
  { label: 'Assigned', value: 'assigned' },
  { label: 'Needs Reply', value: 'waiting' },
  { label: 'Closed', value: 'closed' },
];

type Props = NativeStackScreenProps<InboxStackParamList, 'Inbox'>;

export const InboxScreen = ({ navigation }: Props) => {
  const { conversations, currentUser } = useAppStore();
  const insets = useSafeAreaInsets();
  const [activeFilter, setActiveFilter] = useState<InboxFilter>('all');

  const filteredConversations = useMemo(() => {
    if (activeFilter === 'all') {
      return conversations;
    }

    if (activeFilter === 'assigned') {
      return conversations.filter(
        (item) => item.status === 'assigned' || item.status === 'waiting',
      );
    }

    return conversations.filter((item) => item.status === activeFilter);
  }, [activeFilter, conversations]);

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.sm }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Live Inbox</Text>
          <Text style={styles.subtitle}>Hello {currentUser?.name.split(' ')[0] ?? 'PM'}</Text>
        </View>
        <View style={styles.statChip}>
          <Text style={styles.statNumber}>
            {conversations.filter((item) => item.status === 'new').length}
          </Text>
          <Text style={styles.statLabel}>new</Text>
        </View>
      </View>

      <View style={styles.filterRow}>
        {filters.map((filter) => {
          const selected = activeFilter === filter.value;
          return (
            <Pressable
              key={filter.value}
              onPress={() => setActiveFilter(filter.value)}
              style={[styles.filterChip, selected && styles.filterChipActive]}
            >
              <Text
                style={[styles.filterLabel, selected && styles.filterLabelActive]}
              >
                {filter.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <FlatList
        data={filteredConversations}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <ConversationCard
            conversation={item}
            onPress={() =>
              navigation.navigate('ConversationDetail', {
                conversationId: item.id,
              })
            }
          />
        )}
        ListEmptyComponent={
          <EmptyState
            title="No conversations"
            subtitle="No chats match this filter right now."
          />
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
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
  statChip: {
    backgroundColor: colors.accentMuted,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
  },
  statNumber: {
    fontWeight: '800',
    color: colors.accent,
    fontSize: 18,
  },
  statLabel: {
    color: colors.accent,
    fontWeight: '600',
    fontSize: 11,
    textTransform: 'uppercase',
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: spacing.md,
  },
  filterChip: {
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: radius.md,
    paddingHorizontal: 10,
    paddingVertical: 7,
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
  listContent: {
    paddingBottom: spacing.xl,
  },
});
