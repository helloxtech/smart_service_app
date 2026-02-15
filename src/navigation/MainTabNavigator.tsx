import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { MainTabParamList } from './types';
import { InboxStackNavigator } from './InboxStackNavigator';
import { MaintenanceScreen } from '../screens/MaintenanceScreen';
import { VisitsScreen } from '../screens/VisitsScreen';
import { colors } from '../theme/theme';

const Tab = createBottomTabNavigator<MainTabParamList>();

export const MainTabNavigator = () => {
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
          if (route.name === 'InboxTab') {
            return <Ionicons name="chatbubble-ellipses-outline" color={color} size={size} />;
          }

          if (route.name === 'MaintenanceTab') {
            return <Ionicons name="construct-outline" color={color} size={size} />;
          }

          return <Ionicons name="clipboard-outline" color={color} size={size} />;
        },
      })}
    >
      <Tab.Screen
        name="InboxTab"
        component={InboxStackNavigator}
        options={{
          title: 'Inbox',
        }}
      />
      <Tab.Screen
        name="MaintenanceTab"
        component={MaintenanceScreen}
        options={{
          title: 'Maintenance',
        }}
      />
      <Tab.Screen
        name="VisitsTab"
        component={VisitsScreen}
        options={{
          title: 'Site Visits',
        }}
      />
    </Tab.Navigator>
  );
};
