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

interface AddVisitNoteInput {
  propertyId: string;
  unitId: string;
  maintenanceRequestId?: string;
  note: string;
  photoUri?: string;
}

interface AppStoreValue {
  currentUser: PmUser | null;
  conversations: Conversation[];
  messages: Message[];
  maintenanceRequests: MaintenanceRequest[];
  visitNotes: SiteVisitNote[];
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
  markConversationRead: (conversationId: string) => void;
  assignConversation: (conversationId: string) => void;
  sendMessage: (conversationId: string, text: string) => void;
  closeConversation: (conversationId: string) => void;
  updateMaintenanceStatus: (requestId: string, status: MaintenanceStatus) => void;
  addVisitNote: (payload: AddVisitNoteInput) => void;
}

const AppStoreContext = createContext<AppStoreValue | undefined>(undefined);

const sortConversations = (items: Conversation[]): Conversation[] => {
  return [...items].sort(
    (a, b) =>
      new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime(),
  );
};

export const AppStoreProvider = ({ children }: PropsWithChildren) => {
  const [currentUser, setCurrentUser] = useState<PmUser | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>(
    sortConversations(mockConversations),
  );
  const [messages, setMessages] = useState<Message[]>(mockMessages);
  const [maintenanceRequests, setMaintenanceRequests] = useState<MaintenanceRequest[]>(
    mockMaintenanceRequests,
  );
  const [visitNotes, setVisitNotes] = useState<SiteVisitNote[]>(mockVisitNotes);

  const signIn = useCallback(async (email: string, _password: string) => {
    if (!email.toLowerCase().includes('@')) {
      throw new Error('Please enter a valid work email.');
    }

    // Replace with Entra ID + BFF token exchange in production.
    setCurrentUser({
      ...mockPmUser,
      email,
    });
  }, []);

  const signOut = useCallback(() => {
    setCurrentUser(null);
  }, []);

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

  const assignConversation = useCallback(
    (conversationId: string) => {
      if (!currentUser) {
        return;
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
    (conversationId: string, text: string) => {
      if (!currentUser || !text.trim()) {
        return;
      }

      const now = new Date().toISOString();
      const body = text.trim();

      setMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now()}`,
          conversationId,
          senderType: 'pm',
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
                  status: item.status === 'new' ? 'assigned' : item.status,
                  assignedPmId: currentUser.id,
                  lastMessageAt: now,
                  unreadCount: 0,
                }
              : item,
          ),
        ),
      );
    },
    [currentUser],
  );

  const closeConversation = useCallback((conversationId: string) => {
    const now = new Date().toISOString();

    setConversations((prev) =>
      sortConversations(
        prev.map((item) =>
          item.id === conversationId
            ? {
                ...item,
                status: 'closed',
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
  }, []);

  const updateMaintenanceStatus = useCallback(
    (requestId: string, status: MaintenanceStatus) => {
      const now = new Date().toISOString();
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
    [],
  );

  const addVisitNote = useCallback((payload: AddVisitNoteInput) => {
    const now = new Date().toISOString();
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
  }, []);

  const value = useMemo(
    () => ({
      currentUser,
      conversations,
      messages,
      maintenanceRequests,
      visitNotes,
      signIn,
      signOut,
      markConversationRead,
      assignConversation,
      sendMessage,
      closeConversation,
      updateMaintenanceStatus,
      addVisitNote,
    }),
    [
      addVisitNote,
      assignConversation,
      closeConversation,
      conversations,
      currentUser,
      maintenanceRequests,
      markConversationRead,
      messages,
      sendMessage,
      signIn,
      signOut,
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
