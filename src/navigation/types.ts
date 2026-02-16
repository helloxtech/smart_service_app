import { NavigatorScreenParams } from '@react-navigation/native';

export type InboxStackParamList = {
  Inbox: undefined;
  ConversationDetail: { conversationId: string };
};

export type MaintenanceStackParamList = {
  MaintenanceList: undefined;
  MaintenanceDetail: { requestId: string };
};

export type MainTabParamList = {
  InboxTab: NavigatorScreenParams<InboxStackParamList> | undefined;
  MaintenanceTab: NavigatorScreenParams<MaintenanceStackParamList> | undefined;
  VisitsTab: undefined;
};
