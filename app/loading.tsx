import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { useUser } from '@/context/user-context';
import { useAppTheme } from '@/hooks/use-app-theme';

export default function LoadingScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const { currentUser, isHydrated } = useUser();

  useEffect(() => {
    if (!isHydrated) return;

    if (currentUser) {
      router.replace('/(tabs)/pantallaInicio');
      return;
    }

    router.replace('/');
  }, [currentUser, isHydrated, router]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppText style={[styles.title, { color: colors.text }]}>Habituate</AppText>
      <ActivityIndicator size="large" color={colors.primary} />
      <AppText style={[styles.subtitle, { color: colors.mutedText }]}>Comprobando tu sesión</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 18,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 13,
  },
});