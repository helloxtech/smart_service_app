import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { MainTabParamList } from './types';
import { InboxStackNavigator } from './InboxStackNavigator';
import { MaintenanceStackNavigator } from './MaintenanceStackNavigator';
import { VisitsScreen } from '../screens/VisitsScreen';
import { RoleProfileScreen } from '../screens/RoleProfileScreen';
import { colors } from '../theme/theme';
import { useAppStore } from '../store/AppStore';

const Tab = createBottomTabNavigator<MainTabParamList>();

export const MainTabNavigator = () => {
  const { currentUser } = useAppStore();
  const isPmWorkflow = currentUser?.role === 'PM' || currentUser?.role === 'Supervisor';

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '700',
          marginTop: -2,
        },
        tabBarStyle: {
          height: 66,
          paddingTop: 6,
          paddingBottom: 8,
          borderTopColor: colors.border,
        },
        tabBarIcon: ({ color, size }) => {
          if (isPmWorkflow) {
            if (route.name === 'InboxTab') {
              return <Ionicons name="chatbubble-ellipses-outline" color={color} size={size} />;
            }

            if (route.name === 'MaintenanceTab') {
              return <Ionicons name="construct-outline" color={color} size={size} />;
            }

            return <Ionicons name="clipboard-outline" color={color} size={size} />;
          }

          if (route.name === 'InboxTab') {
            return <Ionicons name="home-outline" color={color} size={size} />;
          }
          if (route.name === 'MaintenanceTab') {
            return <Ionicons name="construct-outline" color={color} size={size} />;
          }
          return <Ionicons name="person-circle-outline" color={color} size={size} />;
        },
      })}
    >
      <Tab.Screen
        name="InboxTab"
        component={InboxStackNavigator}
        options={{
          title: isPmWorkflow ? 'Inbox' : 'Home',
        }}
      />
      <Tab.Screen
        name="MaintenanceTab"
        component={MaintenanceStackNavigator}
        options={{
          title: isPmWorkflow ? 'Maintenance' : 'Requests',
        }}
      />
      <Tab.Screen
        name="VisitsTab"
        component={isPmWorkflow ? VisitsScreen : RoleProfileScreen}
        options={{
          title: isPmWorkflow ? 'Site Visits' : 'Account',
        }}
      />
    </Tab.Navigator>
  );
};
