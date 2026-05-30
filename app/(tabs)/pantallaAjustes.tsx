import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import Constants from 'expo-constants';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { FONT_SCALE_MAX, FONT_SCALE_MIN, useAppSettings } from '@/context/settings-context';
import { useUser } from '@/context/user-context';
import { useAppTheme } from '@/hooks/use-app-theme';
import { db } from '@/services/firebase';
import { ensureNotificationPermission } from '@/services/notifications';

type RowProps = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  subtitle: string;
  right: React.ReactNode;
  colors: {
    text: string;
    mutedText: string;
    border: string;
  };
};

function SettingRow({ icon, title, subtitle, right, colors }: RowProps) {
  return (
    <View style={[styles.row, { borderBottomColor: colors.border }]}>
      <Ionicons name={icon} size={24} color={colors.text} style={styles.rowIcon} />
      <View style={styles.rowTextWrap}>
        <AppText style={[styles.rowTitle, { color: colors.text }]}>{title}</AppText>
        <AppText style={[styles.rowSubtitle, { color: colors.mutedText }]}>{subtitle}</AppText>
      </View>
      <View style={styles.rowRight}>{right}</View>
    </View>
  );
}

export default function PantallaAjustesScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const { currentUser } = useUser();
  const {
    fontScale,
    setFontScale,
    darkModeEnabled,
    setDarkModeEnabled,
    notificationsEnabled,
    setNotificationsEnabled,
  } = useAppSettings();

  const [draftFontScale, setDraftFontScale] = useState(fontScale);
  const [draftDarkModeEnabled, setDraftDarkModeEnabled] = useState(darkModeEnabled);
  const [draftNotificationsEnabled, setDraftNotificationsEnabled] = useState(notificationsEnabled);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setDraftFontScale(fontScale);
    setDraftDarkModeEnabled(darkModeEnabled);
    setDraftNotificationsEnabled(notificationsEnabled);
  }, [darkModeEnabled, fontScale, notificationsEnabled]);

  const hasPendingChanges = useMemo(
    () =>
      Math.abs(draftFontScale - fontScale) > 0.001 ||
      draftDarkModeEnabled !== darkModeEnabled ||
      draftNotificationsEnabled !== notificationsEnabled,
    [darkModeEnabled, draftDarkModeEnabled, draftFontScale, draftNotificationsEnabled, fontScale, notificationsEnabled]
  );

  const applyChanges = async () => {
    if (!currentUser?.id) {
      Alert.alert('Sin sesion', 'Debes iniciar sesion para guardar tus ajustes.');
      return;
    }

    try {
      setIsSaving(true);

      if (draftNotificationsEnabled && !notificationsEnabled) {
        const granted = await ensureNotificationPermission();
        if (!granted) {
          Alert.alert(
            'Permisos requeridos',
            'Debes permitir las notificaciones para activar los recordatorios.'
          );
          setDraftNotificationsEnabled(false);
          return;
        }
      }

      await updateDoc(doc(db, 'usuarios', currentUser.id), {
        config_tamano_fuente: draftFontScale,
        config_modo_oscuro: draftDarkModeEnabled,
        config_notificaciones: draftNotificationsEnabled,
        updatedAt: serverTimestamp(),
      });

      setFontScale(draftFontScale);
      setDarkModeEnabled(draftDarkModeEnabled);
      setNotificationsEnabled(draftNotificationsEnabled);
    } catch {
      Alert.alert('Error', 'No se pudieron guardar los ajustes en Firestore.');
    } finally {
      setIsSaving(false);
    }
  };

  const fontLabel = `${Math.round(draftFontScale * 100)}%`;
  const appVersion = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}> 
      <View style={[styles.header, { paddingTop: insets.top, borderBottomColor: colors.border }]}> 
        <AppText style={[styles.headerTitle, { color: colors.text }]}>Ajustes</AppText>
      </View>

      <View style={styles.content}>
        <View style={[styles.row, { borderBottomColor: colors.border }]}> 
          <Ionicons name="text-outline" size={24} color={colors.text} style={styles.rowIcon} />
          <View style={styles.rowTextWrap}>
            <AppText style={[styles.rowTitle, { color: colors.text }]}>Tamaño de letra</AppText>
            <AppText style={[styles.rowSubtitle, { color: colors.mutedText }]}>{fontLabel}</AppText>
          </View>
          <View style={styles.sliderContainer}>
            <Slider
              minimumValue={FONT_SCALE_MIN}
              maximumValue={FONT_SCALE_MAX}
              step={0.05}
              value={draftFontScale}
              onValueChange={setDraftFontScale}
              minimumTrackTintColor={colors.primary}
              maximumTrackTintColor={colors.border}
              thumbTintColor={colors.primary}
              style={styles.sliderControl}
            />
          </View>
        </View>

        <SettingRow
          icon="sunny-outline"
          title="Modo oscuro"
          subtitle={draftDarkModeEnabled ? 'Activado' : 'Desactivado'}
          colors={colors}
          right={
            <Switch
              value={draftDarkModeEnabled}
              onValueChange={setDraftDarkModeEnabled}
              trackColor={{ false: '#d1d5db', true: '#6b7280' }}
              thumbColor={draftDarkModeEnabled ? colors.primary : '#f9fafb'}
            />
          }
        />

        <SettingRow
          icon="notifications-outline"
          title="Notificaciones"
          subtitle={draftNotificationsEnabled ? 'Recordatorios activos' : 'Recordatorios desactivados'}
          colors={colors}
          right={
            <Pressable
              onPress={() => {
                setDraftNotificationsEnabled((value) => !value);
              }}
              style={[
                styles.toggleButton,
                {
                  backgroundColor: draftNotificationsEnabled ? colors.primary : colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <Ionicons
                name={draftNotificationsEnabled ? 'notifications' : 'notifications-off-outline'}
                size={16}
                color={draftNotificationsEnabled ? colors.onPrimary : colors.text}
              />
              <AppText
                style={[
                  styles.toggleButtonText,
                  { color: draftNotificationsEnabled ? colors.onPrimary : colors.text },
                ]}
              >
                {draftNotificationsEnabled ? 'Desactivar' : 'Activar'}
              </AppText>
            </Pressable>
          }
        />

        <View style={styles.versionWrap}>
          <AppText style={[styles.versionLabel, { color: colors.text }]}>Version</AppText>
          <AppText style={[styles.versionValue, { color: colors.mutedText }]}>v. {appVersion}</AppText>
        </View>
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 8 }]}> 
        <Pressable
          style={[
            styles.saveButton,
            { backgroundColor: colors.primary },
            (!hasPendingChanges || isSaving) && styles.saveButtonDisabled,
          ]}
          onPress={applyChanges}
          disabled={!hasPendingChanges || isSaving}>
          <AppText style={[styles.saveButtonText, { color: colors.onPrimary }]}>
            {isSaving ? 'Guardando...' : 'Confirmar cambios'}
          </AppText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  row: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    paddingVertical: 10,
  },
  rowIcon: {
    marginRight: 12,
  },
  rowTextWrap: {
    flex: 1,
    justifyContent: 'center',
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  rowSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  rowRight: {
    marginLeft: 10,
  },
  toggleButton: {
    minWidth: 118,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  toggleButtonText: {
    fontSize: 12,
    fontWeight: '700',
  },
  sliderContainer: {
    width: 100,
    justifyContent: 'center',
    marginLeft: 10,
  },
  sliderControl: {
    width: '100%',
    height: 24,
  },
  versionWrap: {
    marginTop: 14,
    marginLeft: 36,
  },
  versionLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  versionValue: {
    fontSize: 12,
    marginTop: 2,
  },
  footer: {
    marginTop: 'auto',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  saveButton: {
    height: 42,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.45,
  },
  saveButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
