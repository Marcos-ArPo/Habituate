import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { useUser } from '@/context/user-context';
import { useAppTheme } from '@/hooks/use-app-theme';

export default function PantallaEmergenciaScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const { currentUser } = useUser();

  async function callPhone(phone: string, type: 'urgencia' | 'preferente') {
    if (!phone) {
      Alert.alert('Sin numero', `No hay numero de ${type} configurado en tu perfil.`);
      return;
    }

    const normalized = phone.replace(/[^\d+]/g, '');

    if (!normalized) {
      Alert.alert('Numero invalido', 'El numero configurado no tiene un formato valido.');
      return;
    }

    const telUrl = `tel:${normalized}`;

    try {
      await Linking.openURL(telUrl);
    } catch {
      Alert.alert('No disponible', 'Este dispositivo no permite iniciar llamadas.');
    }
  }

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
          <Pressable
            style={[styles.actionButton, { backgroundColor: colors.primary }]}
            onPress={() => callPhone(currentUser?.urgencyPhone ?? '', 'urgencia')}>
            <AppText style={[styles.actionButtonText, { color: colors.onPrimary }]}>
              Llamada de Emergencia {currentUser?.urgencyPhone ? `(${currentUser.urgencyPhone})` : ''}
            </AppText>
          </Pressable>
        </View>

        <View style={styles.section}>
          <View style={styles.iconWrap}>
            <Ionicons name="accessibility-outline" size={22} color={colors.text} />
          </View>
          <Pressable
            style={[styles.actionButton, { backgroundColor: colors.primary }]}
            onPress={() => callPhone(currentUser?.preferencePhone ?? '', 'preferente')}>
            <AppText style={[styles.actionButtonText, { color: colors.onPrimary }]}>
              Llamada Preferente {currentUser?.preferencePhone ? `(${currentUser.preferencePhone})` : ''}
            </AppText>
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