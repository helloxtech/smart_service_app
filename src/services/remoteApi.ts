import { api } from './api';
import {
  Conversation,
  MaintenanceRequest,
  MaintenanceStatus,
  Message,
  PmUser,
  SiteVisitNote,
} from '../types/domain';

export interface SignInResponse {
  user: PmUser;
  accessToken: string;
}

interface MicrosoftSignInRequest {
  email?: string;
  name?: string;
}

export interface BootstrapResponse {
  conversations: Conversation[];
  messages: Message[];
  maintenanceRequests: MaintenanceRequest[];
  visitNotes: SiteVisitNote[];
}

export interface ChatAccessResponse {
  wsUrl?: string;
  token: string;
}

interface VisitNoteInput {
  propertyId: string;
  unitId: string;
  maintenanceRequestId?: string;
  note: string;
  photoUri?: string;
  photoUris?: string[];
}

interface ConversationMessageInput {
  body: string;
  photoUri?: string;
}

interface MaintenanceUpdateInput {
  note: string;
  photoUri?: string;
  photoUris?: string[];
  source?: 'maintenance' | 'chat';
}

export const remoteApi = {
  signIn: (email: string, password: string) =>
    api.post<SignInResponse>('/mobile/pm/auth/sign-in', {
      email,
      password,
    }),

  signInWithMicrosoft: (payload: MicrosoftSignInRequest) =>
    api.post<SignInResponse>('/mobile/pm/auth/microsoft', payload),

  getBootstrap: () => api.get<BootstrapResponse>('/mobile/pm/bootstrap'),

  assignConversation: (conversationId: string) =>
    api.post<void>(`/mobile/pm/conversations/${conversationId}/assign`, {}),

  sendMessage: (conversationId: string, payload: ConversationMessageInput) =>
    api.post<Message>(`/mobile/pm/conversations/${conversationId}/messages`, payload),

  closeConversation: (conversationId: string) =>
    api.post<void>(`/mobile/pm/conversations/${conversationId}/close`, {}),

  updateMaintenanceStatus: (requestId: string, status: MaintenanceStatus) =>
    api.patch<MaintenanceRequest>(`/mobile/pm/maintenance/${requestId}`, {
      status,
    }),

  addVisitNote: (payload: VisitNoteInput) =>
    api.post<SiteVisitNote>('/mobile/pm/visit-notes', payload),

  addMaintenanceUpdate: (requestId: string, payload: MaintenanceUpdateInput) =>
    api.post<SiteVisitNote>(`/mobile/pm/maintenance/${requestId}/updates`, payload),

  getChatAccess: (conversationId: string) =>
    api.post<ChatAccessResponse>(`/mobile/pm/conversations/${conversationId}/chat-access`, {}),
};
