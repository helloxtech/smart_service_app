import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { InboxScreen } from '../screens/InboxScreen';
import { ConversationDetailScreen } from '../screens/ConversationDetailScreen';
import { InboxStackParamList } from './types';
import { colors } from '../theme/theme';

const Stack = createNativeStackNavigator<InboxStackParamList>();

export const InboxStackNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        headerTitleStyle: { color: colors.textPrimary },
      }}
    >
      <Stack.Screen
        name="Inbox"
        component={InboxScreen}
        options={{
          title: 'Smart Service',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="ConversationDetail"
        component={ConversationDetailScreen}
        options={{
          title: 'Conversation',
        }}
      />
    </Stack.Navigator>
  );
};
