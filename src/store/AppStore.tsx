import React, {
  PropsWithChildren,
  createContext,
  useEffect,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import { Platform } from 'react-native';
import {
  Conversation,
  MaintenanceRequest,
  MaintenanceStatus,
  Message,
  PmUser,
  SiteVisitNote,
} from '../types/domain';
import { setApiAuthToken } from '../services/api';
import { remoteApi, type MicrosoftSignInRequest } from '../services/remoteApi';
import { runtimeConfig } from '../services/runtimeConfig';
import {
  ChatRealtimeClient,
  RealtimeMessagePayload,
  connectChatRealtime,
} from '../services/chatRealtime';
import {
  notifyIncomingChat,
  registerForExpoPushToken,
} from '../services/notifications';
import {
  clearPersistedAuthSession,
  loadPersistedAuthSession,
  persistAuthSession,
} from '../services/authSession';

interface AddVisitNoteInput {
  propertyId: string;
  unitId: string;
  maintenanceRequestId?: string;
  note: string;
  photoUri?: string;
  photoUris?: string[];
}

interface AddMaintenanceUpdateInput {
  maintenanceRequestId: string;
  note?: string;
  photoUri?: string;
  photoUris?: string[];
  source?: 'maintenance' | 'chat';
}

interface UpdateProfileInput {
  name: string;
  phone?: string;
  address?: string;
  bio?: string;
  emailNotifs: boolean;
  smsNotifs: boolean;
}

interface AppStoreValue {
  isHydratingAuth: boolean;
  currentUser: PmUser | null;
  conversations: Conversation[];
  messages: Message[];
  maintenanceRequests: MaintenanceRequest[];
  visitNotes: SiteVisitNote[];
  isRemoteMode: boolean;
  refreshBootstrap: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithMicrosoft: (payload: MicrosoftSignInRequest) => Promise<void>;
  signOut: () => void;
  updateProfile: (payload: UpdateProfileInput) => Promise<void>;
  markConversationRead: (conversationId: string) => void;
  assignConversation: (conversationId: string) => Promise<void>;
  sendMessage: (
    conversationId: string,
    text: string,
    photoUri?: string,
    forceSendIfInactive?: boolean,
  ) => Promise<void>;
  closeConversation: (conversationId: string) => Promise<void>;
  updateMaintenanceStatus: (
    requestId: string,
    status: MaintenanceStatus,
  ) => Promise<void>;
  addVisitNote: (payload: AddVisitNoteInput) => Promise<SiteVisitNote>;
  addMaintenanceUpdate: (payload: AddMaintenanceUpdateInput) => Promise<void>;
  refreshConversationMessages: (conversationId: string) => Promise<void>;
  connectConversationRealtime: (
    conversationId: string,
    onError?: (message: string) => void,
  ) => Promise<ChatRealtimeClient | null>;
}

const AppStoreContext = createContext<AppStoreValue | undefined>(undefined);

const sortConversations = (items: Conversation[]): Conversation[] => {
  return [...items].sort(
    (a, b) =>
      new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime(),
  );
};

const normalizeConversation = (item: Conversation): Conversation =>
  item.status === 'closed'
    ? {
        ...item,
        unreadCount: 0,
      }
    : item;

const normalizeConversations = (items: Conversation[]): Conversation[] =>
  items.map(normalizeConversation);

const initialConversations: Conversation[] = [];
const initialMessages: Message[] = [];
const initialMaintenanceRequests: MaintenanceRequest[] = [];
const initialVisitNotes: SiteVisitNote[] = [];
const isPmRole = (role: PmUser['role'] | undefined): boolean =>
  role === 'PM' || role === 'Supervisor';

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error ?? 'unknown_error');

const logAuthEvent = (event: string, data: Record<string, unknown> = {}): void =>
{
  // eslint-disable-next-line no-console
  console.info(`[auth] ${event}`, data);
};

const logAuthWarn = (event: string, error: unknown, data: Record<string, unknown> = {}): void =>
{
  // eslint-disable-next-line no-console
  console.warn(`[auth] ${event}`, {
    ...data,
    message: getErrorMessage(error),
  });
};

const formatDisplayName = (email: string): string => {
  const localPart = email.split('@')[0]?.trim();
  if (!localPart) {
    return 'Portal User';
  }
  return (
    localPart
      .split(/[._-]/g)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ') || 'Portal User'
  );
};

const normalizePhotoUris = (
  photoUris?: string[],
  fallbackPhotoUri?: string,
): string[] => {
  const values = [...(photoUris ?? []), fallbackPhotoUri ?? '']
    .map((item) => item.trim())
    .filter(Boolean);
  return Array.from(new Set(values)).slice(0, 8);
};

const getPrimaryPhotoUri = (photoUris: string[]): string | undefined =>
  photoUris.length > 0 ? photoUris[0] : undefined;

export const AppStoreProvider = ({ children }: PropsWithChildren) => {
  const [isHydratingAuth, setIsHydratingAuth] = useState(true);
  const [currentUser, setCurrentUser] = useState<PmUser | null>(null);
  const [conversations, setConversations] =
    useState<Conversation[]>(initialConversations);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [maintenanceRequests, setMaintenanceRequests] = useState<
    MaintenanceRequest[]
  >(initialMaintenanceRequests);
  const [visitNotes, setVisitNotes] = useState<SiteVisitNote[]>(initialVisitNotes);

  const isRemoteMode = true;

  const applyBootstrapState = useCallback((bootstrap: {
    conversations: Conversation[];
    messages: Message[];
    maintenanceRequests: MaintenanceRequest[];
    visitNotes: SiteVisitNote[];
  }) => {
    setConversations(sortConversations(normalizeConversations(bootstrap.conversations)));
    setMessages(bootstrap.messages);
    setMaintenanceRequests(bootstrap.maintenanceRequests);
    setVisitNotes(bootstrap.visitNotes);
  }, []);

  const refreshBootstrap = useCallback(async () => {
    if (!currentUser) {
      return;
    }

    const bootstrap = await remoteApi.getBootstrap();
    applyBootstrapState(bootstrap);
  }, [applyBootstrapState, currentUser]);

  const markConversationRead = useCallback((conversationId: string) => {
    setConversations((prev) =>
      normalizeConversations(
        prev.map((item) =>
          item.id === conversationId
            ? {
                ...item,
                unreadCount: 0,
              }
            : item,
        ),
      ),
    );
  }, []);

  const applyRealtimeMessage = useCallback(
    (payload: RealtimeMessagePayload) => {
      const createdAt = payload.createdAt ?? new Date().toISOString();
      const messageId =
        payload.id ??
        `rt-${payload.conversationId}-${createdAt}-${payload.senderType}-${payload.senderName}`;

      setMessages((prev) => {
        if (prev.some((item) => item.id === messageId)) {
          return prev;
        }

        return [
          ...prev,
          {
            id: messageId,
            conversationId: payload.conversationId,
            senderType: payload.senderType,
            senderName: payload.senderName,
            body: payload.body,
            photoUri: payload.photoUri,
            createdAt,
          },
        ];
      });

      setConversations((prev) =>
        sortConversations(
          normalizeConversations(
            prev.map((item) => {
              if (item.id !== payload.conversationId) {
                return item;
              }

              if (item.status === 'closed') {
                return item;
              }

              const fromVisitorOrBot =
                payload.senderType === 'visitor' || payload.senderType === 'bot';
              const fromAnotherPm =
                payload.senderType === 'pm' &&
                payload.senderName !== currentUser?.name;

              return {
                ...item,
                lastMessageAt: createdAt,
                unreadCount:
                  fromVisitorOrBot || fromAnotherPm
                    ? item.unreadCount + 1
                    : item.unreadCount,
              };
            }),
          ),
        ),
      );

      if (
        isPmRole(currentUser?.role)
        && (payload.senderType === 'visitor' || payload.senderType === 'bot')
      ) {
        const title =
          payload.senderType === 'visitor'
            ? `New message from ${payload.senderName}`
            : 'Bot update';
        const body = payload.body?.trim() || 'New chat activity.';
        void notifyIncomingChat(title, body.slice(0, 140));
      }
    },
    [currentUser?.name, currentUser?.role],
  );

  const registerPushNotifications = useCallback(async (user: PmUser) => {
    const expoPushToken = await registerForExpoPushToken();
    if (!expoPushToken) {
      return;
    }

    try {
      await remoteApi.registerPushToken({
        expoPushToken,
        platform: Platform.OS === 'ios' ? 'ios' : 'android',
      });
    } catch (error) {
      // Notification registration should not block sign-in.
      logAuthWarn('push_registration_failed', error, { userId: user.id });
    }
  }, []);

  useEffect(() => {
    let active = true;

    const restoreSession = async () => {
      try {
        const session = await loadPersistedAuthSession();
        if (!session) {
          logAuthEvent('restore.no_session');
          return;
        }

        setApiAuthToken(session.accessToken);
        setCurrentUser(session.user);

        const bootstrap = await remoteApi.getBootstrap();
        if (!active) {
          return;
        }

        applyBootstrapState(bootstrap);
        void registerPushNotifications(session.user);
        logAuthEvent('restore.success', { userId: session.user.id, role: session.user.role });
      } catch (error) {
        if (!active) {
          return;
        }

        logAuthWarn('restore.failed', error);
        setApiAuthToken(null);
        setCurrentUser(null);
        setConversations(initialConversations);
        setMessages(initialMessages);
        setMaintenanceRequests(initialMaintenanceRequests);
        setVisitNotes(initialVisitNotes);
        void clearPersistedAuthSession();
      } finally {
        if (active) {
          setIsHydratingAuth(false);
        }
      }
    };

    void restoreSession();
    return () => {
      active = false;
    };
  }, [applyBootstrapState, registerPushNotifications]);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!email.toLowerCase().includes('@')) {
      throw new Error('Please enter a valid email.');
    }

    try {
      const session = await remoteApi.signIn(email, password);
      setApiAuthToken(session.accessToken);
      setCurrentUser(session.user);
      await persistAuthSession({
        accessToken: session.accessToken,
        user: session.user,
      });

      const bootstrap = await remoteApi.getBootstrap();
      applyBootstrapState(bootstrap);
      void registerPushNotifications(session.user);
      logAuthEvent('sign_in.success', { userId: session.user.id, role: session.user.role });
    } catch (error) {
      logAuthWarn('sign_in.failed', error);
      throw error;
    }
  }, [applyBootstrapState, registerPushNotifications]);

  const signInWithMicrosoft = useCallback(async (payload: MicrosoftSignInRequest) => {
    try {
      const session = await remoteApi.signInWithMicrosoft(payload);
      setApiAuthToken(session.accessToken);
      setCurrentUser(session.user);
      await persistAuthSession({
        accessToken: session.accessToken,
        user: session.user,
      });

      const bootstrap = await remoteApi.getBootstrap();
      applyBootstrapState(bootstrap);
      void registerPushNotifications(session.user);
      logAuthEvent('microsoft_sign_in.success', { userId: session.user.id, role: session.user.role });
    } catch (error) {
      logAuthWarn('microsoft_sign_in.failed', error);
      throw error;
    }
  }, [applyBootstrapState, registerPushNotifications]);

  const signOut = useCallback(() => {
    logAuthEvent('sign_out');
    setApiAuthToken(null);
    void clearPersistedAuthSession();
    setCurrentUser(null);
    setConversations(initialConversations);
    setMessages(initialMessages);
    setMaintenanceRequests(initialMaintenanceRequests);
    setVisitNotes(initialVisitNotes);
  }, []);

  const updateProfile = useCallback(
    async (payload: UpdateProfileInput) => {
      if (!currentUser) {
        throw new Error('Please sign in before updating your profile.');
      }

      const name = payload.name.trim();

      if (!name) {
        throw new Error('Name is required.');
      }

      // Mobile profile writes are currently local-only until a dedicated profile endpoint is added.
      setCurrentUser((prev) =>
        prev
          ? {
              ...prev,
              name,
              phone: payload.phone?.trim(),
              address: payload.address?.trim(),
              bio: payload.bio?.trim(),
              emailNotifs: payload.emailNotifs,
              smsNotifs: payload.smsNotifs,
            }
          : prev,
      );
    },
    [currentUser],
  );

  const assignConversation = useCallback(
    async (conversationId: string) => {
      if (!currentUser || !isPmRole(currentUser.role)) {
        throw new Error('Please sign in before assigning conversations.');
      }

      await remoteApi.assignConversation(conversationId);

      const now = new Date().toISOString();

      setConversations((prev) =>
        sortConversations(
          normalizeConversations(
            prev.map((item) =>
              item.id === conversationId
                ? {
                    ...item,
                    status: 'assigned',
                    assignedPmId: currentUser.id,
                    lastMessageAt: now,
                    unreadCount: 0,
                  }
                : item,
            ),
          ),
        ),
      );

      setMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now()}`,
          conversationId,
          senderType: 'system',
          senderName: 'System',
          body: `${currentUser.name} accepted handoff from bot.`,
          createdAt: now,
        },
      ]);
    },
    [currentUser],
  );

  const resolveLinkedMaintenanceRequest = useCallback(
    (conversationId: string): MaintenanceRequest | undefined => {
      const byConversation = maintenanceRequests.find(
        (item) => item.conversationId === conversationId,
      );
      if (byConversation) {
        return byConversation;
      }

      const conversation = conversations.find((item) => item.id === conversationId);
      if (!conversation) {
        return undefined;
      }

      return maintenanceRequests.find(
        (item) =>
          item.propertyId === conversation.property.id
          && item.unitId === conversation.unit.id,
      );
    },
    [conversations, maintenanceRequests],
  );

  const applyMaintenanceNoteState = useCallback((note: SiteVisitNote) => {
    setVisitNotes((prev) => [note, ...prev]);

    if (note.maintenanceRequestId) {
      setMaintenanceRequests((prev) =>
        prev.map((item) =>
          item.id === note.maintenanceRequestId
            ? {
                ...item,
                updatedAt: note.createdAt,
              }
            : item,
        ),
      );
    }
  }, []);

  const addMaintenanceUpdate = useCallback(
    async (payload: AddMaintenanceUpdateInput) => {
      if (!currentUser) {
        throw new Error('Please sign in before adding updates.');
      }

      const request = maintenanceRequests.find(
        (item) => item.id === payload.maintenanceRequestId,
      );
      if (!request) {
        throw new Error('Maintenance request not found.');
      }

      const normalizedPhotoUris = normalizePhotoUris(payload.photoUris, payload.photoUri);
      const hasPhoto = normalizedPhotoUris.length > 0;
      const noteText = payload.note?.trim() ?? '';
      if (!noteText && !hasPhoto) {
        throw new Error('Add a note or photo before saving.');
      }

      const resolvedNote =
        noteText
        || `${currentUser.name} added a photo update.`;
      const source = payload.source ?? 'maintenance';
      const saved = await remoteApi.addMaintenanceUpdate(
        payload.maintenanceRequestId,
        {
          note: resolvedNote,
          photoUri: getPrimaryPhotoUri(normalizedPhotoUris),
          photoUris: normalizedPhotoUris,
          source,
        },
      );
      applyMaintenanceNoteState({
        ...saved,
        photoUris: normalizePhotoUris(saved.photoUris, saved.photoUri),
        photoUri: getPrimaryPhotoUri(normalizePhotoUris(saved.photoUris, saved.photoUri)),
        source: saved.source ?? source,
        authorName: saved.authorName ?? currentUser.name,
      });
    },
    [applyMaintenanceNoteState, currentUser, maintenanceRequests],
  );

  const sendMessage = useCallback(
    async (
      conversationId: string,
      text: string,
      photoUri?: string,
      forceSendIfInactive = false,
    ) => {
      if (!currentUser) {
        return;
      }

      const hasPhoto = Boolean(photoUri);
      const trimmedText = text.trim();
      if (!trimmedText && !hasPhoto) {
        return;
      }

      const conversation = conversations.find((item) => item.id === conversationId);
      if (conversation?.status === 'closed') {
        throw new Error('Cannot send a message to a closed conversation.');
      }

      const body = trimmedText || 'Shared a photo.';
      const actingAsPm = isPmRole(currentUser.role);

      const message = await remoteApi.sendMessage(conversationId, {
        body,
        photoUri,
        forceSendIfInactive,
      });

      const now = message?.createdAt ?? new Date().toISOString();

      setMessages((prev) => [
        ...prev,
        { ...message, createdAt: now },
      ]);

      setConversations((prev) =>
        sortConversations(
          normalizeConversations(
            prev.map((item) =>
              item.id === conversationId
                ? {
                    ...item,
                    status: actingAsPm
                      ? item.status === 'new'
                        ? 'assigned'
                        : item.status
                      : item.status === 'closed'
                        ? 'closed'
                        : 'waiting',
                    assignedPmId: actingAsPm ? currentUser.id : item.assignedPmId,
                    lastMessageAt: now,
                    unreadCount: 0,
                  }
                : item,
            ),
          ),
        ),
      );

      if (hasPhoto) {
        const linkedRequest = resolveLinkedMaintenanceRequest(conversationId);
        if (linkedRequest) {
          try {
            await addMaintenanceUpdate({
              maintenanceRequestId: linkedRequest.id,
              note: `${currentUser.name} shared a photo in chat.`,
              photoUri,
              source: 'chat',
            });
          } catch {
            // Chat send should not fail if maintenance auto-link cannot be stored.
          }
        }
      }
    },
    [
      addMaintenanceUpdate,
      conversations,
      currentUser,
      resolveLinkedMaintenanceRequest,
    ],
  );

  const closeConversation = useCallback(async (conversationId: string) => {
    if (!isPmRole(currentUser?.role)) {
      throw new Error('Only manager/supervisor can close conversations.');
    }

    await remoteApi.closeConversation(conversationId);

    const now = new Date().toISOString();

    setConversations((prev) =>
      sortConversations(
        normalizeConversations(
          prev.map((item) =>
            item.id === conversationId
              ? {
                  ...item,
                  status: 'closed',
                  unreadCount: 0,
                  lastMessageAt: now,
                }
              : item,
          ),
        ),
      ),
    );

    setMessages((prev) => [
      ...prev,
      {
        id: `msg-${Date.now()}`,
        conversationId,
        senderType: 'system',
        senderName: 'System',
        body: 'Conversation closed by property manager.',
        createdAt: now,
      },
    ]);
  }, [currentUser?.role]);

  const updateMaintenanceStatus = useCallback(
    async (requestId: string, status: MaintenanceStatus) => {
      if (!isPmRole(currentUser?.role)) {
        throw new Error('Only manager/supervisor can update maintenance status.');
      }

      const updated = await remoteApi.updateMaintenanceStatus(requestId, status);

      setMaintenanceRequests((prev) =>
        prev.map((item) => (item.id === requestId ? updated : item)),
      );
    },
    [currentUser?.role],
  );

  const addVisitNote = useCallback(async (payload: AddVisitNoteInput) => {
    const actingUser = currentUser;
    if (!actingUser || !isPmRole(actingUser.role)) {
      throw new Error('Only manager/supervisor can add site visit notes.');
    }

    if (!payload.note.trim()) {
      throw new Error('Please add note details before saving.');
    }

    const saved = await remoteApi.addVisitNote(payload);
    const resolvedMaintenanceRequestId = saved.maintenanceRequestId?.trim();
    if (!resolvedMaintenanceRequestId) {
      throw new Error('Visit note saved, but backend did not return linked maintenance request.');
    }

    const normalizedSavedPhotoUris = normalizePhotoUris(saved.photoUris, saved.photoUri);
    const normalizedSaved: SiteVisitNote = {
      ...saved,
      maintenanceRequestId: resolvedMaintenanceRequestId,
      photoUris: normalizedSavedPhotoUris,
      photoUri: getPrimaryPhotoUri(normalizedSavedPhotoUris),
      source: saved.source ?? 'visit',
      authorName: saved.authorName ?? actingUser.name,
    };
    applyMaintenanceNoteState(normalizedSaved);

    // Refresh from backend to ensure newly auto-created maintenance requests are shown with full data.
    const bootstrap = await remoteApi.getBootstrap();
    applyBootstrapState(bootstrap);

    return normalizedSaved;
  }, [applyBootstrapState, applyMaintenanceNoteState, currentUser]);

  const refreshConversationMessages = useCallback(
    async (conversationId: string) => {
      const response = await remoteApi.getConversationMessages(conversationId);
      const remoteConversation = response.conversation;
      const remoteMessages = [...response.messages].sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );

      const insertedMessages: Message[] = [];
      let latestCreatedAt: string | null = null;

      setMessages((prev) => {
        const existingIds = new Set(
          prev
            .filter((item) => item.conversationId === conversationId)
            .map((item) => item.id),
        );

        let merged = prev;

        for (const item of remoteMessages) {
          if (
            !latestCreatedAt
            || new Date(item.createdAt).getTime() > new Date(latestCreatedAt).getTime()
          ) {
            latestCreatedAt = item.createdAt;
          }

          if (existingIds.has(item.id)) {
            continue;
          }

          insertedMessages.push(item);
          existingIds.add(item.id);
          merged = [...merged, item];
        }

        return merged;
      });

      if (insertedMessages.length === 0) {
        if (remoteConversation) {
          setConversations((prev) =>
            sortConversations(
              normalizeConversations(
                prev.map((item) =>
                  item.id === conversationId
                    ? {
                        ...item,
                        status: remoteConversation.status ?? item.status,
                        lifecycleStatus: remoteConversation.lifecycleStatus ?? item.lifecycleStatus,
                        closedReason: remoteConversation.closedReason ?? item.closedReason,
                        assignedPmId: remoteConversation.assignedPmId ?? item.assignedPmId,
                        unreadCount:
                          typeof remoteConversation.unreadCount === 'number'
                            ? remoteConversation.unreadCount
                            : item.unreadCount,
                        lastMessageAt: remoteConversation.lastMessageAt ?? item.lastMessageAt,
                      }
                    : item,
                ),
              ),
            ),
          );
        }
        return;
      }

      const unreadIncrements = insertedMessages.filter(
        (item) =>
          item.senderType === 'visitor'
          || item.senderType === 'bot'
          || (item.senderType === 'pm' && item.senderName !== currentUser?.name),
      ).length;

      setConversations((prev) =>
        sortConversations(
          normalizeConversations(
            prev.map((item) =>
              item.id === conversationId
                ? {
                    ...item,
                    status: remoteConversation?.status ?? item.status,
                    lifecycleStatus: remoteConversation?.lifecycleStatus ?? item.lifecycleStatus,
                    closedReason: remoteConversation?.closedReason ?? item.closedReason,
                    assignedPmId: remoteConversation?.assignedPmId ?? item.assignedPmId,
                    unreadCount:
                      typeof remoteConversation?.unreadCount === 'number'
                        ? remoteConversation.unreadCount
                        : item.unreadCount + unreadIncrements,
                    lastMessageAt:
                      remoteConversation?.lastMessageAt
                      ?? latestCreatedAt
                      ?? item.lastMessageAt,
                  }
                : item,
            ),
          ),
        ),
      );

      if (isPmRole(currentUser?.role)) {
        for (const item of insertedMessages) {
          if (item.senderType !== 'visitor' && item.senderType !== 'bot') {
            continue;
          }

          const title =
            item.senderType === 'visitor'
              ? `New message from ${item.senderName}`
              : 'Bot update';
          const body = item.body?.trim() || 'New chat activity.';
          void notifyIncomingChat(title, body.slice(0, 140));
        }
      }
    },
    [currentUser?.name, currentUser?.role],
  );

  const connectConversationRealtime = useCallback(
    async (conversationId: string, onError?: (message: string) => void) => {
      if (!isPmRole(currentUser?.role)) {
        return null;
      }

      const access = await remoteApi.getChatAccess(conversationId);
      const wsUrl = access.wsUrl ?? runtimeConfig.defaultChatWsUrl;

      if (!wsUrl) {
        return null;
      }

      return connectChatRealtime({
        wsUrl,
        token: access.token,
        conversationId,
        onMessage: applyRealtimeMessage,
        onError,
      });
    },
    [applyRealtimeMessage, currentUser?.role],
  );

  const value = useMemo(
    () => ({
      isHydratingAuth,
      currentUser,
      conversations,
      messages,
      maintenanceRequests,
      visitNotes,
      isRemoteMode,
      refreshBootstrap,
      signIn,
      signInWithMicrosoft,
      signOut,
      updateProfile,
      markConversationRead,
      assignConversation,
      sendMessage,
      closeConversation,
      updateMaintenanceStatus,
      addVisitNote,
      addMaintenanceUpdate,
      refreshConversationMessages,
      connectConversationRealtime,
    }),
    [
      addVisitNote,
      addMaintenanceUpdate,
      assignConversation,
      closeConversation,
      connectConversationRealtime,
      conversations,
      currentUser,
      isHydratingAuth,
      isRemoteMode,
      maintenanceRequests,
      markConversationRead,
      messages,
      refreshBootstrap,
      sendMessage,
      signIn,
      signInWithMicrosoft,
      signOut,
      updateProfile,
      updateMaintenanceStatus,
      refreshConversationMessages,
      visitNotes,
    ],
  );

  return (
    <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>
  );
};

export const useAppStore = (): AppStoreValue => {
  const context = useContext(AppStoreContext);
  if (!context) {
    throw new Error('useAppStore must be used within AppStoreProvider');
  }

  return context;
};
