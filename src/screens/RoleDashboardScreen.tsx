import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ConversationCard } from '../components/ConversationCard';
import { useAppStore } from '../store/AppStore';
import { colors, radius, spacing, typography } from '../theme/theme';
import { openExternalUrl } from '../utils/linking';

type PropertySummary = {
  id: string;
  name: string;
  dataverseUrl: string;
};

export const RoleDashboardScreen = () => {
  const { currentUser, maintenanceRequests, conversations } = useAppStore();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  const role = currentUser?.role;
  const isTenant = role === 'Tenant';
  const isLandlord = role === 'Landlord';
  const isAdmin = role === 'Supervisor';

  const properties = useMemo<PropertySummary[]>(
    () =>
      Array.from(
        conversations.reduce((map, item) => {
          map.set(item.property.id, {
            id: item.property.id,
            name: item.property.name,
            dataverseUrl: item.property.dataverseUrl,
          });
          return map;
        }, new Map<string, PropertySummary>()).values(),
      ),
    [conversations],
  );

  const activeConversations = useMemo(
    () =>
      [...conversations]
        .filter((item) => item.status !== 'closed')
        .sort(
          (a, b) =>
            new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime(),
        ),
    [conversations],
  );

  const escalatedConversation = activeConversations.find((item) => item.botEscalated);

  const openRequests = maintenanceRequests.filter((item) => item.status !== 'done').length;
  const activeChats = activeConversations.length;
  const pendingHandoffs = conversations.filter((item) => item.botEscalated).length;

  const heading = isTenant
    ? 'Tenant Home'
    : isLandlord
      ? 'Landlord Home'
      : isAdmin
        ? 'Admin Home'
        : 'Workspace';
  const subtitle = isTenant
    ? 'Track request progress and chat updates for your unit.'
    : isLandlord
      ? 'Monitor service demand and tenant conversations across your portfolio.'
      : isAdmin
        ? 'Oversee portfolio requests and escalation flow.'
        : 'Role-based dashboard.';

  const openConversation = (conversationId: string) => {
    navigation.navigate('ConversationDetail', { conversationId });
  };

  const openMaintenanceTab = () => {
    navigation.getParent()?.navigate('MaintenanceTab');
  };

  const openProperty = (property: PropertySummary) => {
    void openExternalUrl(property.dataverseUrl);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.sm }]}
    >
      <Text style={styles.title}>{heading}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>

      <View style={styles.metricGrid}>
        <Pressable style={styles.metricCard} onPress={openMaintenanceTab}>
          <Text style={styles.metricValue}>{openRequests}</Text>
          <Text style={styles.metricLabel}>Open Requests</Text>
        </Pressable>
        <Pressable
          style={styles.metricCard}
          onPress={() => {
            const first = activeConversations[0];
            if (!first) return;
            openConversation(first.id);
          }}
        >
          <Text style={styles.metricValue}>{activeChats}</Text>
          <Text style={styles.metricLabel}>Active Chats</Text>
        </Pressable>
        <Pressable
          style={styles.metricCard}
          onPress={() => {
            const first = properties[0];
            if (!first) return;
            openProperty(first);
          }}
        >
          <Text style={styles.metricValue}>{properties.length}</Text>
          <Text style={styles.metricLabel}>{isTenant ? 'Linked Properties' : 'Portfolio Sites'}</Text>
        </Pressable>
        <Pressable
          style={styles.metricCard}
          onPress={() => {
            if (!escalatedConversation) return;
            openConversation(escalatedConversation.id);
          }}
        >
          <Text style={styles.metricValue}>{pendingHandoffs}</Text>
          <Text style={styles.metricLabel}>PM Handoff Alerts</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          {isTenant ? 'What you can do' : isLandlord ? 'Owner workflow' : isAdmin ? 'Admin workflow' : 'Overview'}
        </Text>
        <Text style={styles.cardBody}>
          {isTenant
            ? 'View your request statuses, add message context, and follow updates without needing Dataverse access.'
            : isLandlord
              ? 'Track request load and tenant communication from one place. Escalate only when deeper record detail is required.'
              : isAdmin
                ? 'Review incoming demand, open maintenance queues, and coordinate PM handoff response.'
                : 'Use tabs below to continue.'}
        </Text>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardTitle}>Recent conversations</Text>
          <Pressable onPress={openMaintenanceTab}>
            <Text style={styles.linkLabel}>View requests</Text>
          </Pressable>
        </View>
        {activeConversations.length === 0 ? (
          <Text style={styles.cardBody}>No active conversations right now.</Text>
        ) : (
          activeConversations.slice(0, 3).map((conversation) => (
            <ConversationCard
              key={conversation.id}
              conversation={conversation}
              onPress={() => openConversation(conversation.id)}
            />
          ))
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Properties in view</Text>
        {properties.length === 0 ? (
          <Text style={styles.cardBody}>No property data available yet.</Text>
        ) : (
          properties.map((property) => (
            <Pressable
              key={property.id}
              style={styles.propertyRow}
              onPress={() => openProperty(property)}
            >
              <Text style={styles.propertyText}>{property.name}</Text>
              <Text style={styles.propertyAction}>Open</Text>
            </Pressable>
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
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.md,
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
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricCard: {
    width: '48%',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    minHeight: 84,
    justifyContent: 'center',
  },
  metricValue: {
    color: colors.accent,
    fontWeight: '800',
    fontSize: 24,
  },
  metricLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: 8,
  },
  cardTitle: {
    color: colors.textPrimary,
    fontSize: typography.heading,
    fontWeight: '800',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  linkLabel: {
    color: '#2457A5',
    fontSize: typography.small,
    fontWeight: '700',
  },
  cardBody: {
    color: colors.textSecondary,
    fontSize: typography.small,
    lineHeight: 20,
  },
  propertyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: '#FAFCFD',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  propertyText: {
    color: colors.textPrimary,
    fontSize: typography.small,
    fontWeight: '700',
  },
  propertyAction: {
    color: '#2457A5',
    fontSize: 12,
    fontWeight: '700',
  },
});
