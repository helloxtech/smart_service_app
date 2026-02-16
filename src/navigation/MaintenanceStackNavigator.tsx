import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MaintenanceScreen } from '../screens/MaintenanceScreen';
import { MaintenanceDetailScreen } from '../screens/MaintenanceDetailScreen';
import { MaintenanceStackParamList } from './types';
import { colors } from '../theme/theme';

const Stack = createNativeStackNavigator<MaintenanceStackParamList>();

export const MaintenanceStackNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        headerTitleStyle: { color: colors.textPrimary },
      }}
    >
      <Stack.Screen
        name="MaintenanceList"
        component={MaintenanceScreen}
        options={{
          title: 'Maintenance',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="MaintenanceDetail"
        component={MaintenanceDetailScreen}
        options={{
          title: 'Request details',
        }}
      />
    </Stack.Navigator>
  );
};
