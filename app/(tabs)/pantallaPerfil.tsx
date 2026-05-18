import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { updateEmail, updatePassword } from 'firebase/auth';

import { AppText } from '@/components/app-text';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useUser } from '@/context/user-context';
import { auth } from '@/services/firebase';

type ProfileFieldProps = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  secure?: boolean;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  editable?: boolean;
};

function ProfileField({
  label,
  value,
  onChangeText,
  secure = false,
  keyboardType = 'default',
  editable = true,
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
        <TextInput
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secure}
          autoCapitalize={keyboardType === 'email-address' ? 'none' : 'sentences'}
          keyboardType={keyboardType}
          editable={editable}
          style={[styles.fieldValue, { color: mutedColor }]}
          placeholderTextColor={mutedColor}
        />
        <Ionicons name="create-outline" size={14} color={textColor} />
      </View>
    </View>
  );
}

export default function PantallaPerfilScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const { currentUser, logoutUser, updateCurrentUser } = useUser();
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [preferencePhone, setPreferencePhone] = useState('');
  const [urgencyPhone, setUrgencyPhone] = useState('');
  const [password, setPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setName(currentUser?.name ?? '');
    setEmail(currentUser?.email ?? '');
    setPreferencePhone(currentUser?.preferencePhone ?? '');
    setUrgencyPhone(currentUser?.urgencyPhone ?? '');
    setPassword('');
  }, [currentUser]);

  const hasChanges = useMemo(() => {
    if (!currentUser) return false;

    return (
      name.trim() !== currentUser.name ||
      email.trim() !== currentUser.email ||
      preferencePhone.trim() !== currentUser.preferencePhone ||
      urgencyPhone.trim() !== currentUser.urgencyPhone ||
      password.trim().length > 0
    );
  }, [currentUser, email, name, password, preferencePhone, urgencyPhone]);

  async function handleLogout() {
    await logoutUser();
    router.replace('/');
  }

  async function handleSaveChanges() {
    if (!currentUser) return;

    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPreferencePhone = preferencePhone.trim();
    const trimmedUrgencyPhone = urgencyPhone.trim();
    const trimmedPassword = password.trim();

    if (!trimmedName) {
      Alert.alert('Dato inválido', 'El nombre no puede estar vacío.');
      return;
    }

    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      Alert.alert('Dato inválido', 'Introduce un correo electrónico válido.');
      return;
    }

    if (trimmedPassword && trimmedPassword.length < 6) {
      Alert.alert('Dato inválido', 'La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setIsSaving(true);

    try {
      if (auth.currentUser && trimmedEmail !== (auth.currentUser.email ?? '').toLowerCase()) {
        await updateEmail(auth.currentUser, trimmedEmail);
      }

      if (auth.currentUser && trimmedPassword) {
        await updatePassword(auth.currentUser, trimmedPassword);
      }

      const updated = await updateCurrentUser({
        name: trimmedName,
        email: trimmedEmail,
        preferencePhone: trimmedPreferencePhone,
        urgencyPhone: trimmedUrgencyPhone,
      });

      if (!updated) {
        Alert.alert('Error', 'No se pudieron guardar los cambios en Firestore.');
        return;
      }

      setPassword('');
      Alert.alert('Guardado', 'Tus cambios se han guardado correctamente.');
    } catch (error) {
      const code =
        typeof error === 'object' && error && 'code' in error ? String(error.code) : 'unknown';

      if (code === 'auth/requires-recent-login') {
        Alert.alert(
          'Reautenticación requerida',
          'Para cambiar correo o contraseña, vuelve a iniciar sesión e inténtalo de nuevo.'
        );
      } else if (code === 'auth/email-already-in-use') {
        Alert.alert('Correo en uso', 'Ese correo ya está registrado en otra cuenta.');
      } else {
        Alert.alert('Error', 'No se pudieron guardar tus cambios.');
      }
    } finally {
      setIsSaving(false);
    }
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
            <AppText style={[styles.nameText, { color: colors.text }]}>{name || 'Sin nombre'}</AppText>
          </View>
          <Ionicons name="person-add-outline" size={16} color={colors.mutedText} />
        </View>

        <ProfileField
          label="Nombre"
          value={name}
          onChangeText={setName}
          textColor={colors.text}
          mutedColor={colors.mutedText}
          borderColor={colors.border}
          surfaceColor={colors.surface}
        />

        <ProfileField
          label="Correo Electrónico"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          textColor={colors.text}
          mutedColor={colors.mutedText}
          borderColor={colors.border}
          surfaceColor={colors.surface}
        />
        <ProfileField
          label="Contraseña"
          value={password}
          onChangeText={setPassword}
          secure
          textColor={colors.text}
          mutedColor={colors.mutedText}
          borderColor={colors.border}
          surfaceColor={colors.surface}
        />
        <ProfileField
          label="Número Preferencia"
          value={preferencePhone}
          onChangeText={setPreferencePhone}
          keyboardType="phone-pad"
          textColor={colors.text}
          mutedColor={colors.mutedText}
          borderColor={colors.border}
          surfaceColor={colors.surface}
        />
        <ProfileField
          label="Número Urgencia"
          value={urgencyPhone}
          onChangeText={setUrgencyPhone}
          keyboardType="phone-pad"
          textColor={colors.text}
          mutedColor={colors.mutedText}
          borderColor={colors.border}
          surfaceColor={colors.surface}
        />

        <Pressable
          style={[
            styles.primaryButton,
            { backgroundColor: colors.primary },
            (!hasChanges || isSaving) && styles.disabledButton,
          ]}
          onPress={handleSaveChanges}
          disabled={!hasChanges || isSaving}
        >
          <AppText style={[styles.primaryButtonText, { color: colors.onPrimary }]}>
            {isSaving ? 'Guardando...' : 'Guardar cambios'}
          </AppText>
        </Pressable>

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
  disabledButton: {
    opacity: 0.45,
  },
});
