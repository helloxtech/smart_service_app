export type ConversationStatus = 'new' | 'assigned' | 'waiting' | 'closed';
export type SenderType = 'visitor' | 'pm' | 'bot' | 'system';
export type MaintenanceStatus = 'new' | 'in_progress' | 'done';

export interface PmUser {
  id: string;
  name: string;
  email: string;
  role: 'PM' | 'Supervisor';
}

export interface PropertyInfo {
  id: string;
  name: string;
  city: string;
  address: string;
  dataverseUrl: string;
}

export interface UnitInfo {
  id: string;
  label: string;
  bedrooms: number;
  bathrooms: number;
  rent: number;
}

export interface Message {
  id: string;
  conversationId: string;
  senderType: SenderType;
  senderName: string;
  body: string;
  createdAt: string;
}

export interface MaintenanceRequest {
  id: string;
  conversationId?: string;
  propertyId: string;
  unitId: string;
  title: string;
  summary: string;
  status: MaintenanceStatus;
  priority: 'low' | 'medium' | 'high';
  dataverseUrl: string;
  updatedAt: string;
}

export interface SiteVisitNote {
  id: string;
  propertyId: string;
  unitId: string;
  maintenanceRequestId?: string;
  note: string;
  photoUri?: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  visitorAlias: string;
  status: ConversationStatus;
  property: PropertyInfo;
  unit: UnitInfo;
  assignedPmId?: string;
  hasBot: boolean;
  botEscalated: boolean;
  unreadCount: number;
  lastMessageAt: string;
  dataverseCaseUrl?: string;
}
