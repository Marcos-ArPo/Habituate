import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type ProfileFieldProps = {
  label: string;
  value: string;
  secure?: boolean;
};

function ProfileField({ label, value, secure = false }: ProfileFieldProps) {
  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.fieldInput}>
        <Text style={styles.fieldValue}>{secure ? '••••••••••••••••' : value}</Text>
        <Ionicons name="pencil" size={14} color="#111111" />
      </View>
    </View>
  );
}

export default function PantallaPerfilScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <Text style={styles.headerTitle}>Perfil</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.profileRow}>
          <View style={styles.avatarContainer}>
            <Ionicons name="person" size={22} color="#ffffff" />
          </View>
          <View style={styles.nameWrap}>
            <Text style={styles.nameText}>Akinfenwa Miano Mwanga</Text>
          </View>
          <Ionicons name="person-add-outline" size={16} color="#6b7280" />
        </View>

        <ProfileField label="Correo Electrónico" value="akinimawang@gmail.es" />
        <ProfileField label="Contraseña" value="••••••••" secure />
        <ProfileField label="Número Preferencia" value="+38 666 066 660" />
        <ProfileField label="Número Urgencia" value="911" />

        <Pressable style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Ajustes</Text>
        </Pressable>

        <Pressable style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Cerrar Sesión</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#ffffff',
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
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 24,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  avatarContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#d4a05c',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameWrap: {
    flex: 1,
    marginLeft: 10,
    marginRight: 8,
  },
  nameText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111111',
  },
  fieldBlock: {
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111111',
    marginBottom: 6,
  },
  fieldInput: {
    height: 38,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
  },
  fieldValue: {
    flex: 1,
    fontSize: 12,
    color: '#9ca3af',
    marginRight: 8,
  },
  primaryButton: {
    height: 34,
    borderRadius: 6,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
});
