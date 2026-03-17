import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { AppText } from '@/components/app-text';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useUser } from '@/context/user-context';

export default function SetupPhonesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const { updateCurrentUser } = useUser();
  const [preferencePhone, setPreferencePhone] = useState('');
  const [urgencyPhone, setUrgencyPhone] = useState('');
  const [preferenceError, setPreferenceError] = useState('');
  const [urgencyError, setUrgencyError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  const PHONE_REGEX = /^[+\d\s\-().]{6,20}$/;

  function validatePhone(value: string): string {
    if (value.trim().length === 0) return 'Este campo es obligatorio.';
    if (!PHONE_REGEX.test(value.trim())) return 'Introduce un número de teléfono válido.';
    return '';
  }

  async function handleContinue() {
    const pErr = validatePhone(preferencePhone);
    const uErr = validatePhone(urgencyPhone);
    setPreferenceError(pErr);
    setUrgencyError(uErr);
    if (pErr || uErr) return;

    setIsSubmitting(true);
    const saved = await updateCurrentUser({
      preferencePhone: preferencePhone.trim(),
      urgencyPhone: urgencyPhone.trim(),
    });

    setIsSubmitting(false);
    if (!saved) {
      Alert.alert('Error', 'No se pudo guardar la información.');
      return;
    }

    router.replace('/(tabs)');
  }

  return (
    <View
      style={[
        styles.safeArea,
        {
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
          backgroundColor: colors.background,
        },
      ]}
    >
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: 'padding', android: undefined })}
        style={styles.keyboardAvoid}
      >
        <View style={styles.container}>
          <AppText style={[styles.title, isWide && styles.titleWide, { color: colors.text }]}>
            Habituate
          </AppText>

          <AppText style={[styles.subtitle, isWide && styles.subtitleWide, { color: colors.text }]}>
            Números de contacto
          </AppText>
          <AppText style={[styles.description, isWide && styles.descriptionWide, { color: colors.mutedText }]}>
            Configura tu número de preferencia y{`\n`}número de urgencia para tu cuenta
          </AppText>

          <View style={[styles.form, isWide && styles.formWide]}>
            <View>
              <AppText style={[styles.label, { color: colors.text }]}>Número de preferencia</AppText>
              <TextInput
                value={preferencePhone}
                onChangeText={(v) => { setPreferencePhone(v); setPreferenceError(''); }}
                placeholder="Ej: +34 666 123 456"
                keyboardType="phone-pad"
                textContentType="telephoneNumber"
                autoComplete="tel"
                returnKeyType="next"
                style={[
                  styles.input,
                  isWide && styles.inputWide,
                  {
                    backgroundColor: colors.surface,
                    borderColor: preferenceError ? '#ef4444' : colors.border,
                    color: colors.text,
                  },
                ]}
                placeholderTextColor={colors.mutedText}
              />
              {preferenceError ? (
                <AppText style={styles.errorText}>{preferenceError}</AppText>
              ) : null}
            </View>

            <View>
              <AppText style={[styles.label, { color: colors.text }]}>Número de urgencia</AppText>
              <TextInput
                value={urgencyPhone}
                onChangeText={(v) => { setUrgencyPhone(v); setUrgencyError(''); }}
                placeholder="Ej: 112"
                keyboardType="phone-pad"
                textContentType="telephoneNumber"
                autoComplete="tel"
                returnKeyType="done"
                style={[
                  styles.input,
                  isWide && styles.inputWide,
                  {
                    backgroundColor: colors.surface,
                    borderColor: urgencyError ? '#ef4444' : colors.border,
                    color: colors.text,
                  },
                ]}
                placeholderTextColor={colors.mutedText}
              />
              {urgencyError ? (
                <AppText style={styles.errorText}>{urgencyError}</AppText>
              ) : null}
            </View>

            <Pressable
              accessibilityRole="button"
              onPress={handleContinue}
              disabled={isSubmitting}
              style={({ pressed }) => [
                styles.button,
                isWide && styles.buttonWide,
                { backgroundColor: colors.primary },
                isSubmitting && styles.buttonPressed,
                pressed && styles.buttonPressed,
              ]}
            >
              <AppText style={[styles.buttonText, { color: colors.onPrimary }]}>Guardar y continuar</AppText>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  keyboardAvoid: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 38,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
  },
  description: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 18,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  form: {
    width: '100%',
    maxWidth: 360,
    gap: 10,
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 13,
  },
  button: {
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 11,
    color: '#ef4444',
    marginTop: 4,
    marginLeft: 2,
  },
  titleWide: {
    fontSize: 32,
    marginBottom: 48,
  },
  subtitleWide: {
    fontSize: 22,
    marginBottom: 14,
  },
  descriptionWide: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 24,
  },
  formWide: {
    maxWidth: 480,
    gap: 14,
  },
  inputWide: {
    height: 52,
    fontSize: 16,
    borderRadius: 10,
    paddingHorizontal: 16,
  },
  buttonWide: {
    height: 52,
    borderRadius: 10,
  },
});
