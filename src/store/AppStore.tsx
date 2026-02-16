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

interface AddMaintenanceUpdateInput {
  maintenanceRequestId: string;
  note?: string;
  photoUri?: string;
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
  sendMessage: (
    conversationId: string,
    text: string,
    photoUri?: string,
  ) => Promise<void>;
  closeConversation: (conversationId: string) => Promise<void>;
  updateMaintenanceStatus: (
    requestId: string,
    status: MaintenanceStatus,
  ) => Promise<void>;
  addVisitNote: (payload: AddVisitNoteInput) => Promise<void>;
  addMaintenanceUpdate: (payload: AddMaintenanceUpdateInput) => Promise<void>;
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

type MockScopedDataset = {
  conversations: Conversation[];
  messages: Message[];
  maintenanceRequests: MaintenanceRequest[];
  visitNotes: SiteVisitNote[];
};

const allMockConversations = sortConversations(mockConversations);
const allMockMessages = [...mockMessages];
const allMockMaintenanceRequests = [...mockMaintenanceRequests];
const allMockVisitNotes = [...mockVisitNotes];

const initialConversations = allMockConversations;
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

const deriveStableIndex = (seed: string, max: number): number => {
  if (max <= 0) return 0;
  const normalized = seed.trim().toLowerCase();
  if (!normalized) return 0;

  let hash = 0;
  for (let i = 0; i < normalized.length; i += 1) {
    hash = (hash * 33 + normalized.charCodeAt(i)) % 1_000_000_007;
  }
  return Math.abs(hash) % max;
};

const uniqueSorted = (items: string[]): string[] =>
  Array.from(new Set(items)).sort((a, b) => a.localeCompare(b));

const scopePropertyIdsForLandlord = (email: string): string[] => {
  const propertyIds = uniqueSorted(
    allMockConversations.map((item) => item.property.id),
  );
  if (propertyIds.length <= 2) {
    return propertyIds;
  }

  const start = deriveStableIndex(email, propertyIds.length);
  return [
    propertyIds[start],
    propertyIds[(start + 1) % propertyIds.length],
  ];
};

const scopeUnitIdForTenant = (email: string): string | null => {
  const unitIds = uniqueSorted(allMockConversations.map((item) => item.unit.id));
  if (unitIds.length === 0) {
    return null;
  }
  const idx = deriveStableIndex(email, unitIds.length);
  return unitIds[idx] ?? null;
};

const buildScopedMockData = (email: string, role: PmUser['role']): MockScopedDataset => {
  if (isPmRole(role)) {
    return {
      conversations: allMockConversations,
      messages: allMockMessages,
      maintenanceRequests: allMockMaintenanceRequests,
      visitNotes: allMockVisitNotes,
    };
  }

  const normalizedEmail = email.trim().toLowerCase();
  const propertyScope =
    role === 'Landlord'
      ? new Set(scopePropertyIdsForLandlord(normalizedEmail))
      : null;
  const unitScope =
    role === 'Tenant'
      ? scopeUnitIdForTenant(normalizedEmail)
      : null;

  const scopedConversations = allMockConversations.filter((item) => {
    if (propertyScope) {
      return propertyScope.has(item.property.id);
    }
    if (unitScope) {
      return item.unit.id === unitScope;
    }
    return false;
  });

  const scopedConversationIds = new Set(scopedConversations.map((item) => item.id));
  const scopedMaintenanceRequests = allMockMaintenanceRequests.filter((item) => {
    if (propertyScope) {
      return propertyScope.has(item.propertyId);
    }
    if (unitScope) {
      return item.unitId === unitScope;
    }
    return false;
  });
  const scopedMaintenanceIds = new Set(scopedMaintenanceRequests.map((item) => item.id));

  const scopedMessages = allMockMessages.filter((item) =>
    scopedConversationIds.has(item.conversationId),
  );
  const scopedVisitNotes = allMockVisitNotes.filter((item) =>
    scopedMaintenanceIds.has(item.maintenanceRequestId ?? '')
    || (unitScope ? item.unitId === unitScope : false),
  );

  return {
    conversations: sortConversations(scopedConversations),
    messages: scopedMessages,
    maintenanceRequests: scopedMaintenanceRequests,
    visitNotes: scopedVisitNotes,
  };
};

const buildMockProfile = (
  email: string,
  role: PmUser['role'],
  displayName: string,
  scopedData: MockScopedDataset,
): PmUser => {
  const firstConversation = scopedData.conversations[0];
  const defaultAddress = firstConversation?.property.address;

  if (role === 'Tenant') {
    const unitLabel = firstConversation?.unit.label ?? 'your unit';
    return {
      ...mockPmUser,
      name: displayName,
      email,
      role,
      address: defaultAddress,
      bio: `Tenant workspace for ${unitLabel}.`,
      smsNotifs: false,
    };
  }

  if (role === 'Landlord') {
    return {
      ...mockPmUser,
      name: displayName,
      email,
      role,
      address: defaultAddress,
      bio: `Owner workspace for ${scopedData.conversations.length} active property chats.`,
      smsNotifs: false,
    };
  }

  return {
    ...mockPmUser,
    name: displayName,
    email,
    role,
  };
};

const DEFAULT_WORKORDER_URL_PREFIX =
  'https://org.crm.dynamics.com/main.aspx?etn=msdyn_workorder&pagetype=entityrecord&id=';

const summarizeMaintenanceText = (value: string, maxLength: number): string => {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (!normalized) {
    return '';
  }
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
};

const buildMaintenanceTitleFromNote = (note: string): string => {
  const firstSentence = note.split(/[.!?]/)[0] ?? '';
  const compact = summarizeMaintenanceText(firstSentence, 62);
  if (compact.length >= 12) {
    return compact;
  }
  return 'Site visit follow-up';
};

const buildMaintenanceSummaryFromNote = (note: string): string =>
  summarizeMaintenanceText(note, 140) || 'Follow-up required from site visit.';

export const AppStoreProvider = ({ children }: PropsWithChildren) => {
  const [currentUser, setCurrentUser] = useState<PmUser | null>(null);
  const [conversations, setConversations] =
    useState<Conversation[]>(initialConversations);
  const [messages, setMessages] = useState<Message[]>(allMockMessages);
  const [maintenanceRequests, setMaintenanceRequests] = useState<
    MaintenanceRequest[]
  >(allMockMaintenanceRequests);
  const [visitNotes, setVisitNotes] = useState<SiteVisitNote[]>(allMockVisitNotes);

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
            photoUri: payload.photoUri,
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
      const scoped = buildScopedMockData(email, role);

      setApiAuthToken(null);
      setCurrentUser(buildMockProfile(email, role, displayName, scoped));
      setConversations(scoped.conversations);
      setMessages(scoped.messages);
      setMaintenanceRequests(scoped.maintenanceRequests);
      setVisitNotes(scoped.visitNotes);
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
      const scoped = buildScopedMockData(fallbackEmail, 'PM');

      setApiAuthToken(null);
      setCurrentUser(buildMockProfile(fallbackEmail, 'PM', displayName, scoped));
      setConversations(scoped.conversations);
      setMessages(scoped.messages);
      setMaintenanceRequests(scoped.maintenanceRequests);
      setVisitNotes(scoped.visitNotes);
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
    setMessages(allMockMessages);
    setMaintenanceRequests(allMockMaintenanceRequests);
    setVisitNotes(allMockVisitNotes);
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

      const hasPhoto = Boolean(payload.photoUri);
      const noteText = payload.note?.trim() ?? '';
      if (!noteText && !hasPhoto) {
        throw new Error('Add a note or photo before saving.');
      }

      const resolvedNote =
        noteText
        || `${currentUser.name} added a photo update.`;
      const source = payload.source ?? 'maintenance';
      const now = new Date().toISOString();

      if (!runtimeConfig.useMockData) {
        const saved = await remoteApi.addMaintenanceUpdate(
          payload.maintenanceRequestId,
          {
            note: resolvedNote,
            photoUri: payload.photoUri,
            source,
          },
        );
        applyMaintenanceNoteState({
          ...saved,
          source: saved.source ?? source,
          authorName: saved.authorName ?? currentUser.name,
        });
        return;
      }

      const local: SiteVisitNote = {
        id: `maintenance-note-${Date.now()}`,
        propertyId: request.propertyId,
        unitId: request.unitId,
        maintenanceRequestId: request.id,
        note: resolvedNote,
        photoUri: payload.photoUri,
        source,
        authorName: currentUser.name,
        createdAt: now,
      };
      applyMaintenanceNoteState(local);
    },
    [applyMaintenanceNoteState, currentUser, maintenanceRequests],
  );

  const sendMessage = useCallback(
    async (conversationId: string, text: string, photoUri?: string) => {
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
      let message: Message | null = null;
      const actingAsPm = isPmRole(currentUser.role);

      if (!runtimeConfig.useMockData) {
        message = await remoteApi.sendMessage(conversationId, {
          body,
          photoUri,
        });
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
          photoUri,
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
    [addMaintenanceUpdate, conversations, currentUser, resolveLinkedMaintenanceRequest],
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
    const actingUser = currentUser;
    if (!actingUser || !isPmRole(actingUser.role)) {
      throw new Error('Only PM/Supervisor can add site visit notes.');
    }

    if (!payload.note.trim()) {
      throw new Error('Please add note details before saving.');
    }

    const now = new Date().toISOString();
    const ensureMaintenanceRequestInState = (requestId?: string): string => {
      const resolvedId =
        requestId?.trim() || `mnt-${Date.now()}-${Math.floor(Math.random() * 10_000)}`;
      setMaintenanceRequests((prev) => {
        if (prev.some((item) => item.id === resolvedId)) {
          return prev;
        }

        const created: MaintenanceRequest = {
          id: resolvedId,
          propertyId: payload.propertyId,
          unitId: payload.unitId,
          title: buildMaintenanceTitleFromNote(payload.note),
          summary: buildMaintenanceSummaryFromNote(payload.note),
          status: 'new',
          priority: 'medium',
          dataverseUrl: `${DEFAULT_WORKORDER_URL_PREFIX}${resolvedId}`,
          updatedAt: now,
        };
        return [created, ...prev];
      });
      return resolvedId;
    };

    if (!runtimeConfig.useMockData) {
      const saved = await remoteApi.addVisitNote(payload);
      const resolvedMaintenanceRequestId =
        saved.maintenanceRequestId?.trim() || ensureMaintenanceRequestInState();

      ensureMaintenanceRequestInState(resolvedMaintenanceRequestId);

      applyMaintenanceNoteState({
        ...saved,
        maintenanceRequestId: resolvedMaintenanceRequestId,
        source: saved.source ?? 'visit',
        authorName: saved.authorName ?? actingUser.name,
      });

      return;
    }

    const resolvedMaintenanceRequestId = payload.maintenanceRequestId
      ? ensureMaintenanceRequestInState(payload.maintenanceRequestId)
      : ensureMaintenanceRequestInState();

    const note: SiteVisitNote = {
      id: `visit-${Date.now()}`,
      propertyId: payload.propertyId,
      unitId: payload.unitId,
      maintenanceRequestId: resolvedMaintenanceRequestId,
      note: payload.note,
      photoUri: payload.photoUri,
      source: 'visit',
      authorName: actingUser.name,
      createdAt: now,
    };

    applyMaintenanceNoteState(note);
  }, [applyMaintenanceNoteState, currentUser]);

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
      addMaintenanceUpdate,
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
