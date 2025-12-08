import React from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Link, Tabs } from 'expo-router';
import { Pressable } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useClientOnlyValue } from '@/components/useClientOnlyValue';

// You can explore the built-in icon families and icons on the web at https://icons.expo.fyi/
function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={28} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#22D3EE',
        tabBarInactiveTintColor: '#64748B',
        tabBarStyle: {
          backgroundColor: '#0B1121',
          borderTopColor: '#1E293B',
        },
        headerStyle: {
          backgroundColor: '#0B1121',
          borderBottomColor: '#1E293B',
          borderBottomWidth: 1,
          shadowOpacity: 0,
          elevation: 0,
        },
        headerTitleStyle: {
          color: '#F8FAFC',
          fontWeight: 'bold',
        },
        // Disable the static render of the header on web
        // to prevent a hydration error in React Navigation v6.
        headerShown: useClientOnlyValue(false, true),
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Overview',
          headerShown: false,
          tabBarIcon: ({ color }) => <TabBarIcon name="dashboard" color={color} />,
        }}
      />
      <Tabs.Screen
        name="samples"
        options={{
          title: 'Samples',
          headerShown: false,
          tabBarIcon: ({ color }) => <TabBarIcon name="flask" color={color} />,
        }}
      />
      <Tabs.Screen
        name="lineages"
        options={{
          title: 'Lineages',
          headerShown: false,
          tabBarIcon: ({ color }) => <TabBarIcon name="sitemap" color={color} />,
        }}
      />


      <Tabs.Screen
        name="dsi"
        options={{
          title: 'DSI & Credits',
          tabBarIcon: ({ color }) => <TabBarIcon name="info-circle" color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <TabBarIcon name="cog" color={color} />,
        }}
      />
    </Tabs>
  );
}
