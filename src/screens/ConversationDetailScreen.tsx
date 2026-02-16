import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { ChatBubble } from '../components/ChatBubble';
import { MaintenanceCard } from '../components/MaintenanceCard';
import { PrimaryButton } from '../components/PrimaryButton';
import { StatusBadge } from '../components/StatusBadge';
import { InboxStackParamList } from '../navigation/types';
import { useAppStore } from '../store/AppStore';
import { colors, radius, spacing, typography } from '../theme/theme';
import { formatCurrency } from '../utils/format';
import { openExternalUrl } from '../utils/linking';
import { MaintenanceStatus } from '../types/domain';
import { ChatRealtimeClient } from '../services/chatRealtime';

type Props = NativeStackScreenProps<InboxStackParamList, 'ConversationDetail'>;

export const ConversationDetailScreen = ({ route }: Props) => {
  const { conversationId } = route.params;
  const {
    conversations,
    messages,
    maintenanceRequests,
    markConversationRead,
    assignConversation,
    sendMessage,
    closeConversation,
    updateMaintenanceStatus,
    connectConversationRealtime,
    isRemoteMode,
    currentUser,
  } = useAppStore();

  const realtimeClientRef = useRef<ChatRealtimeClient | null>(null);

  const [draft, setDraft] = useState('');
  const [selectedPhotoUri, setSelectedPhotoUri] = useState<string | undefined>();
  const [realtimeError, setRealtimeError] = useState<string | null>(null);
  const canManageConversation =
    currentUser?.role === 'PM' || currentUser?.role === 'Supervisor';

  const conversation = useMemo(
    () => conversations.find((item) => item.id === conversationId),
    [conversationId, conversations],
  );

  const conversationMessages = useMemo(
    () =>
      messages
        .filter((item) => item.conversationId === conversationId)
        .sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        ),
    [conversationId, messages],
  );

  const linkedMaintenance = useMemo(
    () =>
      maintenanceRequests.filter(
        (item) =>
          item.conversationId === conversationId ||
          (item.propertyId === conversation?.property.id &&
            item.unitId === conversation?.unit.id),
      ),
    [
      conversation?.property.id,
      conversation?.unit.id,
      conversationId,
      maintenanceRequests,
    ],
  );

  useEffect(() => {
    markConversationRead(conversationId);
  }, [conversationId, conversationMessages.length, markConversationRead]);

  useEffect(() => {
    let active = true;

    const connect = async () => {
      if (!isRemoteMode || !canManageConversation) {
        return;
      }

      setRealtimeError(null);

      try {
        const client = await connectConversationRealtime(
          conversationId,
          (message) => {
            if (!active) {
              return;
            }
            setRealtimeError(message);
          },
        );

        if (!active) {
          client?.close();
          return;
        }

        realtimeClientRef.current = client;
      } catch (error) {
        if (!active) {
          return;
        }

        setRealtimeError((error as Error).message);
      }
    };

    void connect();

    return () => {
      active = false;
      realtimeClientRef.current?.close();
      realtimeClientRef.current = null;
    };
  }, [canManageConversation, connectConversationRealtime, conversationId, isRemoteMode]);

  if (!conversation) {
    return (
      <View style={styles.missingWrap}>
        <Text style={styles.missingTitle}>Conversation not found.</Text>
      </View>
    );
  }

  const isClosed = conversation.status === 'closed';
  const canAcceptHandoff =
    canManageConversation
    && !conversation.assignedPmId
    && (conversation.status === 'new' || conversation.status === 'waiting');
  const handoffAlreadyAccepted = conversation.botEscalated && Boolean(conversation.assignedPmId);

  const onAssign = async () => {
    if (!canManageConversation) {
      Alert.alert('Restricted action', 'Only PM/Admin users can accept handoff.');
      return;
    }

    try {
      await assignConversation(conversation.id);
      markConversationRead(conversation.id);
    } catch (error) {
      Alert.alert('Unable to assign', (error as Error).message);
    }
  };

  const onSend = async () => {
    if (!draft.trim() && !selectedPhotoUri) {
      return;
    }

    try {
      await sendMessage(conversation.id, draft, selectedPhotoUri);
      setDraft('');
      setSelectedPhotoUri(undefined);
    } catch (error) {
      Alert.alert('Unable to send', (error as Error).message);
    }
  };

  const onCloseConversation = () => {
    if (!canManageConversation) {
      Alert.alert('Restricted action', 'Only PM/Admin users can close chats.');
      return;
    }

    Alert.alert('Close conversation', 'Are you sure you want to close this chat?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Close',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              await closeConversation(conversation.id);
            } catch (error) {
              Alert.alert('Unable to close', (error as Error).message);
            }
          })();
        },
      },
    ]);
  };

  const pickPhotoFromLibrary = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Photo permission required', 'Please allow photo access to attach an image.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length > 0) {
      setSelectedPhotoUri(result.assets[0].uri);
    }
  };

  const capturePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Camera permission required', 'Please allow camera access to capture a photo.');
      return;
    }

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.8,
      });

      if (!result.canceled && result.assets.length > 0) {
        setSelectedPhotoUri(result.assets[0].uri);
      }
    } catch {
      Alert.alert(
        'Camera unavailable',
        'Camera capture is not available in this simulator. Use a physical device or photo library.',
      );
    }
  };

  const choosePhoto = () => {
    Alert.alert('Attach photo', 'Choose photo source', [
      { text: 'Take photo', onPress: () => void capturePhoto() },
      { text: 'Photo library', onPress: () => void pickPhotoFromLibrary() },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const onUpdateStatus = async (requestId: string, status: MaintenanceStatus) => {
    if (!canManageConversation) {
      Alert.alert('Restricted action', 'Only PM/Admin users can update maintenance status.');
      return;
    }

    try {
      await updateMaintenanceStatus(requestId, status);
    } catch (error) {
      Alert.alert('Status update failed', (error as Error).message);
    }
  };

  const workOrderSectionTitle =
    linkedMaintenance.length === 1 ? 'Work order' : 'Work orders';

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={80}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.contextCard}>
          <View style={styles.contextHeader}>
            <View>
              <Text style={styles.visitor}>{conversation.visitorAlias}</Text>
              <Text style={styles.location}>{conversation.property.city}</Text>
            </View>
            <StatusBadge status={conversation.status} />
          </View>

          <Text style={styles.propertyName}>{conversation.property.name}</Text>
          <Text style={styles.unitDetails}>
            {conversation.unit.label} · {conversation.unit.bedrooms} bed ·{' '}
            {conversation.unit.bathrooms} bath · {formatCurrency(conversation.unit.rent)}
          </Text>
          <Text style={styles.address}>{conversation.property.address}</Text>

          {canManageConversation && (
            <View style={styles.contextActions}>
              {canAcceptHandoff && (
                <PrimaryButton label="Accept Handoff" onPress={onAssign} />
              )}
              <PrimaryButton
                label="Open Property in Rental Smart"
                onPress={() => openExternalUrl(conversation.property.dataverseUrl)}
                variant="outline"
              />
              <PrimaryButton
                label="Open Unit in Rental Smart"
                onPress={() => openExternalUrl(conversation.unit.dataverseUrl)}
                variant="outline"
              />
            </View>
          )}
        </View>

        {conversation.botEscalated && !isClosed && (
          <View style={styles.handoffBanner}>
            <Ionicons name="sparkles" size={16} color={colors.warning} />
            <Text style={styles.handoffText}>
              Bot escalated this chat to a manager based on confidence rules.
            </Text>
          </View>
        )}
        {handoffAlreadyAccepted && (
          <View style={styles.acceptedBanner}>
            <Ionicons name="checkmark-circle-outline" size={16} color={colors.accent} />
            <Text style={styles.acceptedText}>
              Handoff already accepted. Current status is {conversation.status}.
            </Text>
          </View>
        )}

        {realtimeError && (
          <View style={styles.realtimeWarning}>
            <Ionicons name="warning-outline" size={16} color={colors.warning} />
            <Text style={styles.realtimeWarningText}>{realtimeError}</Text>
          </View>
        )}

        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Messages</Text>
          {canManageConversation && !isClosed && (
            <Pressable onPress={onCloseConversation}>
              <Text style={styles.closeText}>Close chat</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.chatPanel}>
          {conversationMessages.map((message) => (
            <ChatBubble key={message.id} message={message} />
          ))}
        </View>

        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>{workOrderSectionTitle}</Text>
        </View>

        <View style={styles.maintenanceWrap}>
          {linkedMaintenance.length === 0 ? (
            <Text style={styles.emptyMaintenance}>
              No work order linked yet.
            </Text>
          ) : (
            linkedMaintenance.map((request) => (
              <MaintenanceCard
                key={request.id}
                compact
                item={request}
                readOnly={!canManageConversation || isClosed}
                propertyName={conversation.property.name}
                unitLabel={conversation.unit.label}
                showDataverseLink={canManageConversation}
                onOpenDataverse={
                  canManageConversation
                    ? () => openExternalUrl(request.dataverseUrl)
                    : undefined
                }
                onStatusChange={(status) => onUpdateStatus(request.id, status)}
              />
            ))
          )}
        </View>
      </ScrollView>

      {!isClosed ? (
        <View style={styles.composerWrap}>
          {selectedPhotoUri && (
            <View style={styles.photoPreviewRow}>
              <Image source={{ uri: selectedPhotoUri }} style={styles.photoPreviewThumb} />
              <Text style={styles.photoPreviewText}>Photo attached</Text>
              <Pressable onPress={() => setSelectedPhotoUri(undefined)}>
                <Text style={styles.photoPreviewRemove}>Remove</Text>
              </Pressable>
            </View>
          )}

          <View style={styles.messageComposer}>
            <Pressable style={styles.attachButton} onPress={() => void choosePhoto()}>
              <Ionicons name="image-outline" size={20} color={colors.accent} />
            </Pressable>
            <TextInput
              style={styles.input}
              value={draft}
              onChangeText={setDraft}
              placeholder={canManageConversation ? 'Reply to visitor...' : 'Add a message update...'}
              placeholderTextColor="#8D9AA5"
              multiline
            />
            <Pressable
              onPress={() => void onSend()}
              style={[
                styles.sendButton,
                !draft.trim() && !selectedPhotoUri && styles.sendButtonDisabled,
              ]}
            >
              <Ionicons name="send" size={17} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={styles.closedNoticeWrap}>
          <Text style={styles.closedNoticeText}>
            Conversation is closed. Reopen from back-office if new updates are needed.
          </Text>
        </View>
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
  content: {
    padding: spacing.md,
    paddingBottom: 150,
    gap: spacing.md,
  },
  contextCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  contextHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  visitor: {
    color: colors.textPrimary,
    fontWeight: '800',
    fontSize: typography.heading,
  },
  location: {
    color: colors.textSecondary,
    fontSize: typography.small,
    marginTop: 2,
  },
  propertyName: {
    color: colors.textPrimary,
    fontSize: typography.body,
    fontWeight: '700',
  },
  unitDetails: {
    color: colors.textSecondary,
    fontSize: typography.small,
    fontWeight: '600',
  },
  address: {
    color: colors.textSecondary,
    fontSize: typography.small,
  },
  contextActions: {
    gap: 8,
    marginTop: 4,
  },
  handoffBanner: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    backgroundColor: colors.warningMuted,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  handoffText: {
    color: colors.warning,
    fontSize: typography.small,
    fontWeight: '700',
    flex: 1,
    lineHeight: 18,
  },
  acceptedBanner: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    backgroundColor: colors.accentMuted,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  acceptedText: {
    color: colors.accent,
    fontSize: typography.small,
    fontWeight: '700',
    flex: 1,
    lineHeight: 18,
    textTransform: 'capitalize',
  },
  realtimeWarning: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    backgroundColor: '#FFF6EA',
    borderWidth: 1,
    borderColor: '#FFD9AD',
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  realtimeWarningText: {
    color: '#7E4B12',
    fontSize: typography.small,
    fontWeight: '600',
    flex: 1,
  },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: typography.heading,
    fontWeight: '800',
  },
  closeText: {
    color: colors.danger,
    fontSize: typography.small,
    fontWeight: '700',
  },
  chatPanel: {
    backgroundColor: '#F7FAFB',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  maintenanceWrap: {
    gap: spacing.sm,
  },
  emptyMaintenance: {
    color: colors.textSecondary,
    fontSize: typography.small,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  composerWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: Platform.OS === 'ios' ? 30 : 14,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },
  photoPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: radius.md,
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: '#FAFCFD',
  },
  photoPreviewThumb: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#E8EEF1',
  },
  photoPreviewText: {
    flex: 1,
    color: colors.textPrimary,
    fontWeight: '600',
    fontSize: typography.small,
  },
  photoPreviewRemove: {
    color: colors.danger,
    fontWeight: '700',
    fontSize: 12,
  },
  attachButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAFCFD',
  },
  messageComposer: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: radius.md,
    backgroundColor: '#FAFCFD',
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: colors.textPrimary,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#94C9B2',
  },
  closedNoticeWrap: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    paddingBottom: Platform.OS === 'ios' ? 28 : 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  closedNoticeText: {
    color: colors.textSecondary,
    fontSize: typography.small,
    lineHeight: 20,
    textAlign: 'center',
  },
});
