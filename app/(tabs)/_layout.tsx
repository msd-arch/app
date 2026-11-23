import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { useNotificationStore } from '../../store/notificationStore';

// Red dot badge shown on the Alerts tab when unread > 0
function AlertBadge() {
  return <View style={styles.badge} />;
}

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface TabIconProps {
  name: IoniconName;
  nameFocused: IoniconName;
  color: string;
  focused: boolean;
  size: number;
  showBadge?: boolean;
}

function TabIcon({ name, nameFocused, color, focused, size, showBadge = false }: TabIconProps) {
  return (
    <View>
      <Ionicons name={focused ? nameFocused : name} size={size} color={color} />
      {showBadge && <AlertBadge />}
    </View>
  );
}

export default function TabsLayout() {
  const unreadCount = useNotificationStore((s) => s.unreadCount);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: Colors.navy,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: styles.label,
      }}
    >
      {/* Home */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused, size }) => (
            <TabIcon
              name="home-outline"
              nameFocused="home"
              color={color}
              focused={focused}
              size={size}
            />
          ),
        }}
      />

      {/* Attendance */}
      <Tabs.Screen
        name="attendance"
        options={{
          title: 'Attendance',
          tabBarIcon: ({ color, focused, size }) => (
            <TabIcon
              name="clipboard-outline"
              nameFocused="clipboard"
              color={color}
              focused={focused}
              size={size}
            />
          ),
        }}
      />

      {/* Alerts */}
      <Tabs.Screen
        name="alerts"
        options={{
          title: 'Alerts',
          tabBarIcon: ({ color, focused, size }) => (
            <TabIcon
              name="notifications-circle-outline"
              nameFocused="notifications-circle"
              color={color}
              focused={focused}
              size={size}
              showBadge={unreadCount > 0}
            />
          ),
        }}
      />

      {/* Fees */}
      <Tabs.Screen
        name="fees"
        options={{
          title: 'Fees',
          tabBarIcon: ({ color, focused, size }) => (
            <TabIcon
              name="card-outline"
              nameFocused="card"
              color={color}
              focused={focused}
              size={size}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#FFFFFF',
    borderTopColor: Colors.border,
    borderTopWidth: 1,
    height: 64,
    paddingBottom: 8,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.red,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
});
