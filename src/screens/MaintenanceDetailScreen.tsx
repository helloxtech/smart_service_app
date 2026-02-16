import React, { useMemo } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaintenanceCard } from '../components/MaintenanceCard';
import { PrimaryButton } from '../components/PrimaryButton';
import { MaintenanceStackParamList } from '../navigation/types';
import { useAppStore } from '../store/AppStore';
import { colors, radius, spacing, typography } from '../theme/theme';
import { MaintenanceStatus } from '../types/domain';
import { formatRelativeTime } from '../utils/format';
import { openExternalUrl } from '../utils/linking';

type Props = NativeStackScreenProps<MaintenanceStackParamList, 'MaintenanceDetail'>;

export const MaintenanceDetailScreen = ({ route }: Props) => {
  const { requestId } = route.params;
  const {
    maintenanceRequests,
    conversations,
    updateMaintenanceStatus,
    currentUser,
  } = useAppStore();
  const insets = useSafeAreaInsets();

  const canEditStatus = currentUser?.role === 'PM' || currentUser?.role === 'Supervisor';

  const request = useMemo(
    () => maintenanceRequests.find((item) => item.id === requestId),
    [maintenanceRequests, requestId],
  );

  const propertyName = useMemo(() => {
    if (!request) return undefined;
    const match = conversations.find((item) => item.property.id === request.propertyId);
    return match?.property.name;
  }, [conversations, request]);

  const unitLabel = useMemo(() => {
    if (!request) return undefined;
    const match = conversations.find((item) => item.unit.id === request.unitId);
    return match?.unit.label;
  }, [conversations, request]);

  const relatedConversation = useMemo(() => {
    if (!request) return undefined;
    return conversations.find(
      (item) =>
        item.id === request.conversationId
        || (
          item.property.id === request.propertyId
          && item.unit.id === request.unitId
        ),
    );
  }, [conversations, request]);

  const onStatusChange = async (status: MaintenanceStatus) => {
    if (!request) return;

    try {
      await updateMaintenanceStatus(request.id, status);
    } catch (error) {
      Alert.alert('Status update failed', (error as Error).message);
    }
  };

  if (!request) {
    return (
      <View style={styles.missingWrap}>
        <Text style={styles.missingTitle}>Maintenance request not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.sm }]}
    >
      <Text style={styles.heading}>{request.title}</Text>
      <Text style={styles.subtitle}>Detailed request context and latest status.</Text>

      <MaintenanceCard
        item={request}
        readOnly={!canEditStatus}
        propertyName={propertyName}
        unitLabel={unitLabel}
        showDataverseLink={canEditStatus}
        onOpenDataverse={canEditStatus ? () => openExternalUrl(request.dataverseUrl) : undefined}
        onStatusChange={(status) => void onStatusChange(status)}
      />

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Request timeline</Text>
        <Text style={styles.metaLine}>Last updated: {formatRelativeTime(request.updatedAt)}</Text>
        <Text style={styles.metaLine}>Priority: {request.priority.toUpperCase()}</Text>
        <Text style={styles.metaLine}>Current status: {request.status.replace('_', ' ')}</Text>
      </View>

      {relatedConversation ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Conversation context</Text>
          <Text style={styles.metaLine}>Visitor: {relatedConversation.visitorAlias}</Text>
          <Text style={styles.metaLine}>Property: {relatedConversation.property.name}</Text>
          <Text style={styles.metaLine}>Unit: {relatedConversation.unit.label}</Text>
          <Text style={styles.metaLine}>Chat status: {relatedConversation.status}</Text>
        </View>
      ) : null}

      {canEditStatus && (
        <PrimaryButton
          label="Open full work order in Rental Smart"
          onPress={() => void openExternalUrl(request.dataverseUrl)}
          variant="outline"
        />
      )}
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
  heading: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: typography.small,
    marginTop: 2,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: 6,
  },
  cardTitle: {
    color: colors.textPrimary,
    fontSize: typography.heading,
    fontWeight: '800',
    marginBottom: 2,
  },
  metaLine: {
    color: colors.textSecondary,
    fontSize: typography.small,
    fontWeight: '600',
  },
  missingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  missingTitle: {
    color: colors.textPrimary,
    fontSize: typography.body,
    fontWeight: '700',
  },
});
