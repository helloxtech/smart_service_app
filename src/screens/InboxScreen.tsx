import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ConversationCard } from '../components/ConversationCard';
import { EmptyState } from '../components/EmptyState';
import { useAppStore } from '../store/AppStore';
import { colors, radius, spacing, typography } from '../theme/theme';
import { InboxStackParamList } from '../navigation/types';

type InboxFilter = 'all' | 'new' | 'waiting' | 'in_progress' | 'closed';

const filters: Array<{ label: string; value: InboxFilter }> = [
  { label: 'All', value: 'all' },
  { label: 'New', value: 'new' },
  { label: 'Needs Reply', value: 'waiting' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Closed', value: 'closed' },
];

type Props = NativeStackScreenProps<InboxStackParamList, 'Inbox'>;

export const InboxScreen = ({ navigation }: Props) => {
  const { conversations, currentUser } = useAppStore();
  const insets = useSafeAreaInsets();
  const [activeFilter, setActiveFilter] = useState<InboxFilter>('all');
  const counts = useMemo(
    () => ({
      new: conversations.filter((item) => item.status === 'new').length,
      waiting: conversations.filter((item) => item.status === 'waiting').length,
      in_progress: conversations.filter((item) => item.status === 'assigned').length,
      closed: conversations.filter((item) => item.status === 'closed').length,
    }),
    [conversations],
  );

  const filteredConversations = useMemo(() => {
    if (activeFilter === 'all') {
      return conversations;
    }

    if (activeFilter === 'in_progress') {
      return conversations.filter((item) => item.status === 'assigned');
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
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterRow}
      >
        {filters.map((filter) => {
          const selected = activeFilter === filter.value;
          const count =
            filter.value === 'new'
              ? counts.new
              : filter.value === 'waiting'
                ? counts.waiting
                : filter.value === 'in_progress'
                  ? counts.in_progress
                  : filter.value === 'closed'
                    ? counts.closed
                    : undefined;

          return (
            <Pressable
              key={filter.value}
              onPress={() => setActiveFilter(filter.value)}
              style={[styles.filterChip, selected && styles.filterChipActive]}
            >
              <Text
                numberOfLines={1}
                style={[styles.filterLabel, selected && styles.filterLabelActive]}
              >
                {filter.label}
              </Text>
              {typeof count === 'number' && (
                <View style={[styles.countBadge, selected && styles.countBadgeActive]}>
                  <Text style={[styles.countLabel, selected && styles.countLabelActive]}>
                    {count}
                  </Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>

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
    alignItems: 'flex-start',
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
  filterScroll: {
    marginBottom: spacing.md,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingRight: spacing.md,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 6,
    backgroundColor: colors.surface,
    gap: 4,
  },
  filterChipActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentMuted,
  },
  filterLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },
  filterLabelActive: {
    color: colors.accent,
  },
  countBadge: {
    minWidth: 16,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 999,
    backgroundColor: '#EAECEF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadgeActive: {
    backgroundColor: '#FFFFFF',
  },
  countLabel: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '800',
  },
  countLabelActive: {
    color: colors.accent,
  },
  listContent: {
    paddingBottom: spacing.xl,
  },
});
