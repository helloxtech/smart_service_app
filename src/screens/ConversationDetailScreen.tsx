import React, { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
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
    addVisitNote,
  } = useAppStore();

  const [draft, setDraft] = useState('');
  const [isNoteModalVisible, setIsNoteModalVisible] = useState(false);
  const [note, setNote] = useState('');
  const [selectedPhotoUri, setSelectedPhotoUri] = useState<string | undefined>();
  const [selectedMaintenanceId, setSelectedMaintenanceId] = useState<string | undefined>();

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
    [conversation?.property.id, conversation?.unit.id, conversationId, maintenanceRequests],
  );

  if (!conversation) {
    return (
      <View style={styles.missingWrap}>
        <Text style={styles.missingTitle}>Conversation not found.</Text>
      </View>
    );
  }

  const onAssign = () => {
    assignConversation(conversation.id);
    markConversationRead(conversation.id);
  };

  const onSend = () => {
    if (!draft.trim()) {
      return;
    }

    sendMessage(conversation.id, draft);
    setDraft('');
  };

  const onCloseConversation = () => {
    Alert.alert('Close conversation', 'Are you sure you want to close this chat?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Close',
        style: 'destructive',
        onPress: () => closeConversation(conversation.id),
      },
    ]);
  };

  const pickPhoto = async () => {
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

  const saveVisitNote = () => {
    if (!note.trim()) {
      Alert.alert('Note required', 'Please add a site visit note before saving.');
      return;
    }

    addVisitNote({
      propertyId: conversation.property.id,
      unitId: conversation.unit.id,
      maintenanceRequestId: selectedMaintenanceId,
      note,
      photoUri: selectedPhotoUri,
    });

    setNote('');
    setSelectedPhotoUri(undefined);
    setSelectedMaintenanceId(undefined);
    setIsNoteModalVisible(false);
    Alert.alert('Saved', 'Site visit note was added.');
  };

  const updateStatus = (requestId: string, status: MaintenanceStatus) => {
    updateMaintenanceStatus(requestId, status);
  };

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
            {conversation.unit.label} · {conversation.unit.bedrooms} bed · {conversation.unit.bathrooms} bath ·{' '}
            {formatCurrency(conversation.unit.rent)}
          </Text>
          <Text style={styles.address}>{conversation.property.address}</Text>

          <View style={styles.contextActions}>
            {conversation.status === 'new' && (
              <PrimaryButton label="Accept Handoff" onPress={onAssign} />
            )}
            <PrimaryButton
              label="Open Property in Dataverse"
              onPress={() => openExternalUrl(conversation.property.dataverseUrl)}
              variant="outline"
            />
            {conversation.dataverseCaseUrl && (
              <PrimaryButton
                label="Open Related Case"
                onPress={() => openExternalUrl(conversation.dataverseCaseUrl!)}
                variant="outline"
              />
            )}
          </View>
        </View>

        {conversation.botEscalated && conversation.status !== 'closed' && (
          <View style={styles.handoffBanner}>
            <Ionicons name="sparkles" size={16} color={colors.warning} />
            <Text style={styles.handoffText}>
              Bot escalated this chat to PM due to confidence threshold.
            </Text>
          </View>
        )}

        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Messages</Text>
          {conversation.status !== 'closed' && (
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
          <Text style={styles.sectionTitle}>Maintenance summary</Text>
        </View>

        <View style={styles.maintenanceWrap}>
          {linkedMaintenance.length === 0 ? (
            <Text style={styles.emptyMaintenance}>
              No maintenance request linked yet.
            </Text>
          ) : (
            linkedMaintenance.map((request) => (
              <MaintenanceCard
                key={request.id}
                compact
                item={request}
                onOpenDataverse={() => openExternalUrl(request.dataverseUrl)}
                onStatusChange={(status) => updateStatus(request.id, status)}
              />
            ))
          )}
        </View>
      </ScrollView>

      <View style={styles.composerWrap}>
        <View style={styles.topComposerRow}>
          <Pressable
            onPress={() => setIsNoteModalVisible(true)}
            style={styles.noteButton}
          >
            <Ionicons name="camera-outline" size={18} color={colors.textPrimary} />
            <Text style={styles.noteButtonLabel}>Add site note + photo</Text>
          </Pressable>
        </View>

        <View style={styles.messageComposer}>
          <TextInput
            style={styles.input}
            value={draft}
            onChangeText={setDraft}
            placeholder="Reply to visitor..."
            placeholderTextColor="#8D9AA5"
            multiline
          />
          <Pressable onPress={onSend} style={styles.sendButton}>
            <Ionicons name="send" size={17} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>

      <Modal visible={isNoteModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Site visit note</Text>
              <Pressable onPress={() => setIsNoteModalVisible(false)}>
                <Ionicons name="close" size={22} color={colors.textPrimary} />
              </Pressable>
            </View>

            <Text style={styles.modalSubtitle}>
              Link this note to a request and add inspection details.
            </Text>

            <View style={styles.requestSelector}>
              {linkedMaintenance.map((request) => {
                const selected = selectedMaintenanceId === request.id;
                return (
                  <Pressable
                    key={request.id}
                    onPress={() => setSelectedMaintenanceId(request.id)}
                    style={[
                      styles.requestPill,
                      selected && styles.requestPillSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.requestPillText,
                        selected && styles.requestPillTextSelected,
                      ]}
                    >
                      {request.title}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <TextInput
              style={styles.noteInput}
              value={note}
              onChangeText={setNote}
              placeholder="What did you observe onsite?"
              placeholderTextColor="#8D9AA5"
              multiline
            />

            <Pressable style={styles.photoPicker} onPress={pickPhoto}>
              <Ionicons name="image-outline" size={18} color={colors.textPrimary} />
              <Text style={styles.photoPickerText}>
                {selectedPhotoUri ? 'Photo attached' : 'Attach photo'}
              </Text>
            </Pressable>

            <View style={styles.modalActions}>
              <PrimaryButton
                label="Cancel"
                onPress={() => setIsNoteModalVisible(false)}
                variant="outline"
              />
              <PrimaryButton label="Save note" onPress={saveVisitNote} />
            </View>
          </View>
        </View>
      </Modal>
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
  topComposerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  noteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: radius.md,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#FAFCFD',
  },
  noteButtonLabel: {
    color: colors.textPrimary,
    fontWeight: '700',
    fontSize: 12,
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
    paddingVertical: 10,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.md,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    color: colors.textPrimary,
    fontSize: typography.heading,
    fontWeight: '800',
  },
  modalSubtitle: {
    color: colors.textSecondary,
    fontSize: typography.small,
    lineHeight: 20,
  },
  requestSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  requestPill: {
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: radius.md,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#FAFCFD',
  },
  requestPillSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accentMuted,
  },
  requestPillText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  requestPillTextSelected: {
    color: colors.accent,
  },
  noteInput: {
    minHeight: 110,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: radius.md,
    backgroundColor: '#FAFCFD',
    color: colors.textPrimary,
    paddingHorizontal: 12,
    paddingVertical: 10,
    textAlignVertical: 'top',
  },
  photoPicker: {
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: radius.md,
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FAFCFD',
  },
  photoPickerText: {
    color: colors.textPrimary,
    fontWeight: '600',
    fontSize: typography.small,
  },
  modalActions: {
    gap: 8,
  },
});
