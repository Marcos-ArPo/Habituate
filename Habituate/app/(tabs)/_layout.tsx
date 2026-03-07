import { Tabs, useRouter, usePathname } from 'expo-router';
import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();

  const isHomeActive = pathname === '/';
  const isHabitosActive = pathname === '/habitosDia';
  const isPerfilActive = pathname === '/pantallaPerfil';
  const isEmergenciaActive = pathname === '/pantallaEmergencia';
  const isAjustesActive = pathname === '/pantallaAjustes';

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
          name="pantallaEmergencia"
          options={{
            title: 'Urgencias',
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
        <Tabs.Screen
          name="pantallaAjustes"
          options={{
            title: 'Ajustes',
            tabBarIcon: ({ color }) => <IconSymbol size={28} name="gearshape.fill" color={color} />,
          }}
        />
      </Tabs>

      <View
        style={[
          styles.bottomNav,
          {
            paddingBottom: insets.bottom + 12,
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
          },
        ]}>
        <Pressable style={styles.navItem} onPress={() => router.push('/pantallaAjustes' as never)}>
          <Ionicons name="cog-outline" size={26} color={isAjustesActive ? colors.text : colors.mutedText} />
        </Pressable>
        <Pressable
          style={styles.navItem}
          onPress={() => router.push('/(tabs)/pantallaEmergencia')}
        >
          <Ionicons
            name="call-outline"
            size={24}
            color={isEmergenciaActive ? colors.text : colors.mutedText}
          />
        </Pressable>
        <Pressable
          style={styles.navItem}
          onPress={() => router.push('/(tabs)')}
        >
          <Ionicons
            name="home"
            size={24}
            color={isHomeActive ? colors.text : colors.mutedText}
          />
        </Pressable>
        <Pressable
          style={styles.navItem}
          onPress={() => router.push('/(tabs)/habitosDia')}
        >
          <Ionicons
            name="notifications-outline"
            size={24}
            color={isHabitosActive ? colors.text : colors.mutedText}
          />
        </Pressable>
        <Pressable
          style={styles.navItem}
          onPress={() => router.push('/(tabs)/pantallaPerfil')}
        >
          <Ionicons
            name="person-outline"
            size={24}
            color={isPerfilActive ? colors.text : colors.mutedText}
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
    paddingTop: 12,
    paddingHorizontal: 20,
    borderTopWidth: 1,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 44,
  },
});