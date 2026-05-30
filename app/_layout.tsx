import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import 'react-native-reanimated';

import { SettingsProvider, useAppSettings } from '@/context/settings-context';
import { SettingsHydrator } from '@/context/settings-hydrator';
import { UserProvider } from '@/context/user-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
    configureNotificationHandler,
    ensureNotificationChannel,
    restoreWebNotificationSchedules,
} from '@/services/notifications';

export const unstable_settings = {
  anchor: 'loading',
};

export default function RootLayout() {
  return (
    <SettingsProvider>
      <UserProvider>
        <SettingsHydrator />
        <RootNavigator />
      </UserProvider>
    </SettingsProvider>
  );
}

function RootNavigator() {
  useEffect(() => {
    configureNotificationHandler();
    ensureNotificationChannel().catch(() => undefined);
    restoreWebNotificationSchedules();
  }, []);

  const colorScheme = useColorScheme();
  const { colorScheme: appColorScheme } = useAppSettings();

  return (
    <ThemeProvider value={(appColorScheme ?? colorScheme) === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="loading" options={{ headerShown: false }} />
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="register" options={{ headerShown: false }} />
        <Stack.Screen name="setup-phones" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="crear-tarea" options={{ headerShown: false }} />
        <Stack.Screen name="crear-habito" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
