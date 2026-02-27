import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function PantallaEmergenciaScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <Text style={styles.headerTitle}>Urgencias</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <View style={styles.iconWrap}>
            <Ionicons name="business-outline" size={22} color="#111111" />
          </View>
          <Pressable style={styles.actionButton}>
            <Text style={styles.actionButtonText}>Llamada de Emergencia</Text>
          </Pressable>
        </View>

        <View style={styles.section}>
          <View style={styles.iconWrap}>
            <Ionicons name="accessibility-outline" size={22} color="#111111" />
          </View>
          <Pressable style={styles.actionButton}>
            <Text style={styles.actionButtonText}>Llamada Preferente</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#e5e5e5',
  },
  header: {
    paddingTop: 14,
    paddingHorizontal: 16,
    paddingBottom: 10,
    alignItems: 'center',
    backgroundColor: '#ffffff',
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
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '500',
  },
});