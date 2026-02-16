import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { InboxScreen } from '../screens/InboxScreen';
import { ConversationDetailScreen } from '../screens/ConversationDetailScreen';
import { RoleDashboardScreen } from '../screens/RoleDashboardScreen';
import { InboxStackParamList } from './types';
import { colors } from '../theme/theme';
import { useAppStore } from '../store/AppStore';

const Stack = createNativeStackNavigator<InboxStackParamList>();

export const InboxStackNavigator = () => {
  const { currentUser } = useAppStore();
  const isPmWorkflow = currentUser?.role === 'PM' || currentUser?.role === 'Supervisor';

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
        component={isPmWorkflow ? InboxScreen : RoleDashboardScreen}
        options={{
          title: isPmWorkflow ? 'Smart Service' : 'Home',
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
