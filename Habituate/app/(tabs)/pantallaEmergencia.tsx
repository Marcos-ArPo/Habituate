import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { useAppTheme } from '@/hooks/use-app-theme';

export default function PantallaEmergenciaScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();

  return (
    <View style={[styles.screen, { backgroundColor: colors.elevated }]}> 
      <View style={[styles.header, { paddingTop: insets.top, backgroundColor: colors.surface }]}> 
        <AppText style={[styles.headerTitle, { color: colors.text }]}>Urgencias</AppText>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <View style={styles.iconWrap}>
            <Ionicons name="business-outline" size={22} color={colors.text} />
          </View>
          <Pressable style={[styles.actionButton, { backgroundColor: colors.primary }]}>
            <AppText style={[styles.actionButtonText, { color: colors.onPrimary }]}>Llamada de Emergencia</AppText>
          </Pressable>
        </View>

        <View style={styles.section}>
          <View style={styles.iconWrap}>
            <Ionicons name="accessibility-outline" size={22} color={colors.text} />
          </View>
          <Pressable style={[styles.actionButton, { backgroundColor: colors.primary }]}>
            <AppText style={[styles.actionButtonText, { color: colors.onPrimary }]}>Llamada Preferente</AppText>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    paddingTop: 14,
    paddingHorizontal: 16,
    paddingBottom: 10,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111111',
  },
  content: {
    paddingTop: 28,
    paddingBottom: 24,
    paddingHorizontal: 0,
  },
  section: {
    marginBottom: 34,
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  actionButton: {
    height: 74,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
  },
  actionButtonText: {
    fontSize: 11,
    fontWeight: '500',
  },
});