import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppStore } from '../store/AppStore';
import { colors, radius, spacing, typography } from '../theme/theme';

type MaintenanceMetric = {
  label: string;
  value: number;
};

export const RoleDashboardScreen = () => {
  const { currentUser, maintenanceRequests, conversations } = useAppStore();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  const role = currentUser?.role;
  const isTenant = role === 'Tenant';
  const isLandlord = role === 'Landlord';
  const isAdmin = role === 'Supervisor';

  const properties = useMemo(
    () =>
      Array.from(
        conversations.reduce((map, item) => {
          map.set(item.property.id, item.property.name);
          return map;
        }, new Map<string, string>()).entries(),
      ).map(([id, name]) => ({ id, name })),
    [conversations],
  );

  const openRequests = maintenanceRequests.filter((item) => item.status !== 'done').length;
  const inProgressRequests = maintenanceRequests.filter((item) => item.status === 'in_progress').length;
  const completedRequests = maintenanceRequests.filter((item) => item.status === 'done').length;

  const metrics: MaintenanceMetric[] = [
    { label: 'Open Requests', value: openRequests },
    { label: 'In Progress', value: inProgressRequests },
    { label: 'Completed', value: completedRequests },
    { label: isTenant ? 'Linked Properties' : 'Portfolio Sites', value: properties.length },
  ];

  const heading = isTenant
    ? 'Tenant Home'
    : isLandlord
      ? 'Landlord Home'
      : isAdmin
        ? 'Admin Home'
        : 'Workspace';
  const subtitle = isTenant
    ? 'Track request progress for your home and view service updates.'
    : isLandlord
      ? 'Monitor maintenance activity across your rental portfolio.'
      : isAdmin
        ? 'Oversee request volume and property health from one place.'
        : 'Role-based dashboard.';

  const workflowText = isTenant
    ? 'Open each request to review details and status history.'
    : isLandlord
      ? 'Review open issues and progress updates property by property.'
      : isAdmin
        ? 'Use maintenance views to monitor queue health and completion pace.'
        : 'Use tabs below to continue.';

  const sortedRequests = useMemo(
    () =>
      [...maintenanceRequests].sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      ),
    [maintenanceRequests],
  );

  const openMaintenanceList = () => {
    navigation.getParent()?.navigate('MaintenanceTab', {
      screen: 'MaintenanceList',
    });
  };

  const openMaintenanceDetail = (requestId: string) => {
    navigation.getParent()?.navigate('MaintenanceTab', {
      screen: 'MaintenanceDetail',
      params: { requestId },
    });
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.sm }]}
    >
      <Text style={styles.title}>{heading}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>

      <View style={styles.metricGrid}>
        {metrics.map((metric) => (
          <Pressable key={metric.label} style={styles.metricCard} onPress={openMaintenanceList}>
            <Text style={styles.metricValue}>{metric.value}</Text>
            <Text style={styles.metricLabel}>{metric.label}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Workflow</Text>
        <Text style={styles.cardBody}>{workflowText}</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardTitle}>Recent maintenance requests</Text>
          <Pressable onPress={openMaintenanceList}>
            <Text style={styles.linkLabel}>View all</Text>
          </Pressable>
        </View>

        {sortedRequests.length === 0 ? (
          <Text style={styles.cardBody}>No requests found.</Text>
        ) : (
          sortedRequests.slice(0, 4).map((request) => (
            <Pressable
              key={request.id}
              style={styles.requestRow}
              onPress={() => openMaintenanceDetail(request.id)}
            >
              <View style={styles.requestCopy}>
                <Text style={styles.requestTitle}>{request.title}</Text>
                <Text style={styles.requestMeta}>{request.status.replace('_', ' ')}</Text>
              </View>
              <Text style={styles.requestAction}>Open</Text>
            </Pressable>
          ))
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Properties in view</Text>
        {properties.length === 0 ? (
          <Text style={styles.cardBody}>No property data available yet.</Text>
        ) : (
          properties.map((property) => {
            const recent = sortedRequests.find((item) => item.propertyId === property.id);

            return (
              <Pressable
                key={property.id}
                style={styles.propertyRow}
                onPress={() => {
                  if (recent) {
                    openMaintenanceDetail(recent.id);
                    return;
                  }
                  openMaintenanceList();
                }}
              >
                <Text style={styles.propertyText}>{property.name}</Text>
                <Text style={styles.propertyAction}>Open</Text>
              </Pressable>
            );
          })
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
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  linkLabel: {
    color: '#2457A5',
    fontSize: typography.small,
    fontWeight: '700',
  },
  requestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: '#FAFCFD',
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  requestCopy: {
    flex: 1,
    gap: 2,
  },
  requestTitle: {
    color: colors.textPrimary,
    fontSize: typography.small,
    fontWeight: '700',
  },
  requestMeta: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  requestAction: {
    color: '#2457A5',
    fontSize: 12,
    fontWeight: '700',
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
