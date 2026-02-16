import { NavigatorScreenParams } from '@react-navigation/native';

export type InboxStackParamList = {
  Inbox: undefined;
  ConversationDetail: { conversationId: string };
};

export type MainTabParamList = {
  InboxTab: NavigatorScreenParams<InboxStackParamList> | undefined;
  MaintenanceTab: undefined;
  VisitsTab: undefined;
};
