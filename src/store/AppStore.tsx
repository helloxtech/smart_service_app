import React, {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import {
  Conversation,
  MaintenanceRequest,
  MaintenanceStatus,
  Message,
  PmUser,
  SiteVisitNote,
} from '../types/domain';
import {
  mockConversations,
  mockMaintenanceRequests,
  mockMessages,
  mockPmUser,
  mockVisitNotes,
} from '../services/mockData';
import { setApiAuthToken } from '../services/api';
import { remoteApi } from '../services/remoteApi';
import { runtimeConfig } from '../services/runtimeConfig';
import {
  ChatRealtimeClient,
  RealtimeMessagePayload,
  connectChatRealtime,
} from '../services/chatRealtime';

interface AddVisitNoteInput {
  propertyId: string;
  unitId: string;
  maintenanceRequestId?: string;
  note: string;
  photoUri?: string;
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
  currentUser: PmUser | null;
  conversations: Conversation[];
  messages: Message[];
  maintenanceRequests: MaintenanceRequest[];
  visitNotes: SiteVisitNote[];
  isRemoteMode: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithMicrosoft: (emailHint?: string) => Promise<void>;
  signOut: () => void;
  updateProfile: (payload: UpdateProfileInput) => Promise<void>;
  markConversationRead: (conversationId: string) => void;
  assignConversation: (conversationId: string) => Promise<void>;
  sendMessage: (conversationId: string, text: string) => Promise<void>;
  closeConversation: (conversationId: string) => Promise<void>;
  updateMaintenanceStatus: (
    requestId: string,
    status: MaintenanceStatus,
  ) => Promise<void>;
  addVisitNote: (payload: AddVisitNoteInput) => Promise<void>;
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

const initialConversations = sortConversations(mockConversations);
const isPmRole = (role: PmUser['role'] | undefined): boolean =>
  role === 'PM' || role === 'Supervisor';

const detectRoleFromEmail = (email: string): PmUser['role'] => {
  const normalized = email.toLowerCase();
  if (normalized.includes('supervisor') || normalized.includes('admin')) {
    return 'Supervisor';
  }
  if (normalized.includes('tenant')) {
    return 'Tenant';
  }
  if (normalized.includes('landlord') || normalized.includes('owner')) {
    return 'Landlord';
  }
  return 'PM';
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

export const AppStoreProvider = ({ children }: PropsWithChildren) => {
  const [currentUser, setCurrentUser] = useState<PmUser | null>(null);
  const [conversations, setConversations] =
    useState<Conversation[]>(initialConversations);
  const [messages, setMessages] = useState<Message[]>(mockMessages);
  const [maintenanceRequests, setMaintenanceRequests] = useState<
    MaintenanceRequest[]
  >(mockMaintenanceRequests);
  const [visitNotes, setVisitNotes] = useState<SiteVisitNote[]>(mockVisitNotes);

  const isRemoteMode = !runtimeConfig.useMockData;

  const markConversationRead = useCallback((conversationId: string) => {
    setConversations((prev) =>
      prev.map((item) =>
        item.id === conversationId
          ? {
              ...item,
              unreadCount: 0,
            }
          : item,
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
            createdAt,
          },
        ];
      });

      setConversations((prev) =>
        sortConversations(
          prev.map((item) => {
            if (item.id !== payload.conversationId) {
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
      );
    },
    [currentUser?.name],
  );

  const signIn = useCallback(async (email: string, password: string) => {
    if (!email.toLowerCase().includes('@')) {
      throw new Error('Please enter a valid email.');
    }

    if (runtimeConfig.useMockData) {
      const role = detectRoleFromEmail(email);
      const displayName = formatDisplayName(email);

      setApiAuthToken(null);
      setCurrentUser({
        ...mockPmUser,
        name: displayName,
        email,
        role,
      });
      setConversations(initialConversations);
      setMessages(mockMessages);
      setMaintenanceRequests(mockMaintenanceRequests);
      setVisitNotes(mockVisitNotes);
      return;
    }

    const session = await remoteApi.signIn(email, password);
    setApiAuthToken(session.accessToken);
    setCurrentUser(session.user);

    const bootstrap = await remoteApi.getBootstrap();
    setConversations(sortConversations(bootstrap.conversations));
    setMessages(bootstrap.messages);
    setMaintenanceRequests(bootstrap.maintenanceRequests);
    setVisitNotes(bootstrap.visitNotes);
  }, []);

  const signInWithMicrosoft = useCallback(async (emailHint?: string) => {
    const normalizedEmailHint = emailHint?.trim().toLowerCase();

    if (runtimeConfig.useMockData) {
      const fallbackEmail = normalizedEmailHint || 'pm@rentalsmart.ca';
      const displayName = formatDisplayName(fallbackEmail);

      setApiAuthToken(null);
      setCurrentUser({
        ...mockPmUser,
        name: displayName,
        email: fallbackEmail,
        role: 'PM',
      });
      setConversations(initialConversations);
      setMessages(mockMessages);
      setMaintenanceRequests(mockMaintenanceRequests);
      setVisitNotes(mockVisitNotes);
      return;
    }

    const session = await remoteApi.signInWithMicrosoft({
      email: normalizedEmailHint,
      name: normalizedEmailHint ? formatDisplayName(normalizedEmailHint) : undefined,
    });
    setApiAuthToken(session.accessToken);
    setCurrentUser(session.user);

    const bootstrap = await remoteApi.getBootstrap();
    setConversations(sortConversations(bootstrap.conversations));
    setMessages(bootstrap.messages);
    setMaintenanceRequests(bootstrap.maintenanceRequests);
    setVisitNotes(bootstrap.visitNotes);
  }, []);

  const signOut = useCallback(() => {
    setApiAuthToken(null);
    setCurrentUser(null);
    setConversations(initialConversations);
    setMessages(mockMessages);
    setMaintenanceRequests(mockMaintenanceRequests);
    setVisitNotes(mockVisitNotes);
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

      if (!runtimeConfig.useMockData) {
        await remoteApi.assignConversation(conversationId);
      }

      const now = new Date().toISOString();

      setConversations((prev) =>
        sortConversations(
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

  const sendMessage = useCallback(
    async (conversationId: string, text: string) => {
      if (!currentUser || !text.trim()) {
        return;
      }

      const conversation = conversations.find((item) => item.id === conversationId);
      if (conversation?.status === 'closed') {
        throw new Error('Cannot send a message to a closed conversation.');
      }

      const body = text.trim();
      let message: Message | null = null;
      const actingAsPm = isPmRole(currentUser.role);

      if (!runtimeConfig.useMockData) {
        message = await remoteApi.sendMessage(conversationId, body);
      }

      const now = message?.createdAt ?? new Date().toISOString();

      setMessages((prev) => [
        ...prev,
        message ?? {
          id: `msg-${Date.now()}`,
          conversationId,
          senderType: actingAsPm ? 'pm' : 'visitor',
          senderName: currentUser.name,
          body,
          createdAt: now,
        },
      ]);

      setConversations((prev) =>
        sortConversations(
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
      );
    },
    [conversations, currentUser],
  );

  const closeConversation = useCallback(async (conversationId: string) => {
    if (!isPmRole(currentUser?.role)) {
      throw new Error('Only PM/Supervisor can close conversations.');
    }

    if (!runtimeConfig.useMockData) {
      await remoteApi.closeConversation(conversationId);
    }

    const now = new Date().toISOString();

    setConversations((prev) =>
      sortConversations(
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
        throw new Error('Only PM/Supervisor can update maintenance status.');
      }

      const now = new Date().toISOString();

      if (!runtimeConfig.useMockData) {
        const updated = await remoteApi.updateMaintenanceStatus(requestId, status);

        setMaintenanceRequests((prev) =>
          prev.map((item) => (item.id === requestId ? updated : item)),
        );
        return;
      }

      setMaintenanceRequests((prev) =>
        prev.map((item) =>
          item.id === requestId
            ? {
                ...item,
                status,
                updatedAt: now,
              }
            : item,
        ),
      );
    },
    [currentUser?.role],
  );

  const addVisitNote = useCallback(async (payload: AddVisitNoteInput) => {
    if (!isPmRole(currentUser?.role)) {
      throw new Error('Only PM/Supervisor can add site visit notes.');
    }

    if (!payload.note.trim()) {
      throw new Error('Please add note details before saving.');
    }

    const now = new Date().toISOString();

    if (!runtimeConfig.useMockData) {
      const saved = await remoteApi.addVisitNote(payload);
      setVisitNotes((prev) => [saved, ...prev]);

      if (saved.maintenanceRequestId) {
        setMaintenanceRequests((prev) =>
          prev.map((item) =>
            item.id === saved.maintenanceRequestId
              ? {
                  ...item,
                  updatedAt: saved.createdAt,
                }
              : item,
          ),
        );
      }

      return;
    }

    const note: SiteVisitNote = {
      id: `visit-${Date.now()}`,
      propertyId: payload.propertyId,
      unitId: payload.unitId,
      maintenanceRequestId: payload.maintenanceRequestId,
      note: payload.note,
      photoUri: payload.photoUri,
      createdAt: now,
    };

    setVisitNotes((prev) => [note, ...prev]);

    if (payload.maintenanceRequestId) {
      setMaintenanceRequests((prev) =>
        prev.map((item) =>
          item.id === payload.maintenanceRequestId
            ? {
                ...item,
                updatedAt: now,
              }
            : item,
        ),
      );
    }
  }, [currentUser?.role]);

  const connectConversationRealtime = useCallback(
    async (conversationId: string, onError?: (message: string) => void) => {
      if (!isPmRole(currentUser?.role)) {
        return null;
      }

      if (runtimeConfig.useMockData) {
        return null;
      }

      const access = await remoteApi.getChatAccess(conversationId);
      const wsUrl = access.wsUrl ?? runtimeConfig.defaultChatWsUrl;

      if (!wsUrl) {
        throw new Error(
          'Missing websocket URL. Configure EXPO_PUBLIC_CHAT_WS_URL or provide wsUrl from chat-access endpoint.',
        );
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
      currentUser,
      conversations,
      messages,
      maintenanceRequests,
      visitNotes,
      isRemoteMode,
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
      connectConversationRealtime,
    }),
    [
      addVisitNote,
      assignConversation,
      closeConversation,
      connectConversationRealtime,
      conversations,
      currentUser,
      isRemoteMode,
      maintenanceRequests,
      markConversationRead,
      messages,
      sendMessage,
      signIn,
      signInWithMicrosoft,
      signOut,
      updateProfile,
      updateMaintenanceStatus,
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
