import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppStore } from '../store/AppStore';
import { colors, radius, spacing, typography } from '../theme/theme';

export const RoleDashboardScreen = () => {
  const { currentUser, maintenanceRequests, conversations } = useAppStore();
  const insets = useSafeAreaInsets();

  const role = currentUser?.role;
  const isTenant = role === 'Tenant';
  const isLandlord = role === 'Landlord';

  const propertyNames = useMemo(
    () => Array.from(new Set(conversations.map((item) => item.property.name))),
    [conversations],
  );

  const openRequests = maintenanceRequests.filter((item) => item.status !== 'done').length;
  const activeChats = conversations.filter((item) => item.status !== 'closed').length;
  const pendingHandoffs = conversations.filter((item) => item.botEscalated).length;

  const heading = isTenant ? 'Tenant Home' : isLandlord ? 'Landlord Home' : 'Workspace';
  const subtitle = isTenant
    ? 'Track request progress and chat updates for your unit.'
    : isLandlord
      ? 'Monitor service demand and tenant conversations across your portfolio.'
      : 'Role-based dashboard.';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.sm }]}
    >
      <Text style={styles.title}>{heading}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>

      <View style={styles.metricGrid}>
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>{openRequests}</Text>
          <Text style={styles.metricLabel}>Open Requests</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>{activeChats}</Text>
          <Text style={styles.metricLabel}>Active Chats</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>{propertyNames.length}</Text>
          <Text style={styles.metricLabel}>{isTenant ? 'Linked Properties' : 'Portfolio Sites'}</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>{pendingHandoffs}</Text>
          <Text style={styles.metricLabel}>PM Handoff Alerts</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          {isTenant ? 'What you can do' : isLandlord ? 'Owner workflow' : 'Overview'}
        </Text>
        <Text style={styles.cardBody}>
          {isTenant
            ? 'View your request statuses, add message context, and follow updates without needing Dataverse access.'
            : isLandlord
              ? 'Track request load and tenant communication from one place. Escalate only when deeper record detail is required.'
              : 'Use tabs below to continue.'}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Properties in view</Text>
        {propertyNames.length === 0 ? (
          <Text style={styles.cardBody}>No property data available yet.</Text>
        ) : (
          propertyNames.map((name) => (
            <View key={name} style={styles.propertyRow}>
              <Text style={styles.propertyText}>{name}</Text>
            </View>
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
  cardBody: {
    color: colors.textSecondary,
    fontSize: typography.small,
    lineHeight: 20,
  },
  propertyRow: {
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
});
