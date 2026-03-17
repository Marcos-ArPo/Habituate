import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { AppText } from '@/components/app-text';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useUser } from '@/context/user-context';

type ProfileFieldProps = {
  label: string;
  value: string;
  secure?: boolean;
};

function ProfileField({
  label,
  value,
  secure = false,
  textColor,
  mutedColor,
  borderColor,
  surfaceColor,
}: ProfileFieldProps & {
  textColor: string;
  mutedColor: string;
  borderColor: string;
  surfaceColor: string;
}) {
  return (
    <View style={styles.fieldBlock}>
      <AppText style={[styles.fieldLabel, { color: textColor }]}>{label}</AppText>
      <View style={[styles.fieldInput, { borderColor, backgroundColor: surfaceColor }]}> 
        <AppText style={[styles.fieldValue, { color: mutedColor }]}>{secure ? '••••••••••••••••' : value}</AppText>
        <Ionicons name="pencil" size={14} color={textColor} />
      </View>
    </View>
  );
}

export default function PantallaPerfilScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const { currentUser, logoutUser } = useUser();
  const router = useRouter();

  async function handleLogout() {
    await logoutUser();
    router.replace('/index');
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <AppText style={[styles.headerTitle, { color: colors.text }]}>Perfil</AppText>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.profileRow}>
          <View style={styles.avatarContainer}>
            <Ionicons name="person" size={22} color="#ffffff" />
          </View>
          <View style={styles.nameWrap}>
            <AppText style={[styles.nameText, { color: colors.text }]}>
              {currentUser?.name ?? 'Sin nombre'}
            </AppText>
          </View>
          <Ionicons name="person-add-outline" size={16} color={colors.mutedText} />
        </View>

        <ProfileField
          label="Correo Electrónico"
          value={currentUser?.email ?? '—'}
          textColor={colors.text}
          mutedColor={colors.mutedText}
          borderColor={colors.border}
          surfaceColor={colors.surface}
        />
        <ProfileField
          label="Contraseña"
          value="••••••••"
          secure
          textColor={colors.text}
          mutedColor={colors.mutedText}
          borderColor={colors.border}
          surfaceColor={colors.surface}
        />
        <ProfileField
          label="Número Preferencia"
          value={currentUser?.preferencePhone || '—'}
          textColor={colors.text}
          mutedColor={colors.mutedText}
          borderColor={colors.border}
          surfaceColor={colors.surface}
        />
        <ProfileField
          label="Número Urgencia"
          value={currentUser?.urgencyPhone || '—'}
          textColor={colors.text}
          mutedColor={colors.mutedText}
          borderColor={colors.border}
          surfaceColor={colors.surface}
        />

        <Pressable
          style={[styles.primaryButton, { backgroundColor: colors.primary }]}
          onPress={handleLogout}
        >
          <AppText style={[styles.primaryButtonText, { color: colors.onPrimary }]}>Cerrar Sesión</AppText>
        </Pressable>
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
    fontSize: 12,
    fontWeight: '600',
  },
});
