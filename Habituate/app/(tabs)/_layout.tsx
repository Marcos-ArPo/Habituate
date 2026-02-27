import { Tabs, useRouter, usePathname } from 'expo-router';
import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const pathname = usePathname();

  const isHomeActive = pathname === '/';
  const isHabitosActive = pathname === '/habitosDia';
  const isPerfilActive = pathname === '/pantallaPerfil';

  return (
    <View style={styles.container}>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
          headerShown: false,
          tabBarButton: HapticTab,
          tabBarStyle: { display: 'none' },
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
          }}
        />
        <Tabs.Screen
          name="explore"
          options={{
            title: 'Explore',
            tabBarIcon: ({ color }) => <IconSymbol size={28} name="paperplane.fill" color={color} />,
          }}
        />
        <Tabs.Screen
          name="habitosDia"
          options={{
            title: 'Hábitos del Día',
            tabBarIcon: ({ color }) => <IconSymbol size={28} name="paperplane.fill" color={color} />,
          }}
        />
        <Tabs.Screen
          name="pantallaPerfil"
          options={{
            title: 'Perfil',
            tabBarIcon: ({ color }) => <IconSymbol size={28} name="person.fill" color={color} />,
          }}
        />
      </Tabs>

      <View style={styles.bottomNav}>
        <Pressable style={styles.navItem} onPress={() => router.push('/(tabs)')}>
          <Ionicons name="add-outline" size={26} color="#9ca3af" />
        </Pressable>
        <Pressable style={styles.navItem} onPress={() => router.push('/(tabs)')}>
          <Ionicons name="call-outline" size={24} color="#9ca3af" />
        </Pressable>
        <Pressable
          style={styles.navItem}
          onPress={() => router.push('/(tabs)')}
        >
          <Ionicons
            name="home"
            size={24}
            color={isHomeActive ? '#000000' : '#9ca3af'}
          />
        </Pressable>
        <Pressable
          style={styles.navItem}
          onPress={() => router.push('/(tabs)/habitosDia')}
        >
          <Ionicons
            name="notifications-outline"
            size={24}
            color={isHabitosActive ? '#000000' : '#9ca3af'}
          />
        </Pressable>
        <Pressable
          style={styles.navItem}
          onPress={() => router.push('/(tabs)/pantallaPerfil')}
        >
          <Ionicons
            name="person-outline"
            size={24}
            color={isPerfilActive ? '#000000' : '#9ca3af'}
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  bottomNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 44,
  },
});