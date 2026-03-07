import { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useRouter } from 'expo-router';

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  const isDisabled = useMemo(() => {
    return email.trim().length === 0 || password.trim().length === 0;
  }, [email, password]);

  return (
    <View
      style={[
        styles.safeArea,
        {
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
          backgroundColor: colors.background,
        },
      ]}>
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: 'padding', android: undefined })}
        style={styles.keyboardAvoid}
      >
        <View style={styles.container}>
          <AppText style={[styles.title, isWide && styles.titleWide, { color: colors.text }]}>Habituate</AppText>

          <AppText style={[styles.subtitle, isWide && styles.subtitleWide, { color: colors.text }]}>Accede a tu cuenta</AppText>
          <AppText style={[styles.description, isWide && styles.descriptionWide, { color: colors.mutedText }]}> 
            Introduce tu correo electrónico para iniciar sesión en{`\n`}esta aplicación
          </AppText>

          <View style={[styles.form, isWide && styles.formWide]}>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Correo electrónico"
              autoCapitalize="none"
              keyboardType="email-address"
              textContentType="emailAddress"
              autoComplete="email"
              returnKeyType="next"
              style={[styles.input, isWide && styles.inputWide, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholderTextColor={colors.mutedText}
            />

            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Contraseña"
              secureTextEntry
              textContentType="password"
              autoComplete="password"
              returnKeyType="done"
              style={[styles.input, isWide && styles.inputWide, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholderTextColor={colors.mutedText}
            />

            <Pressable
              accessibilityRole="button"
              onPress={() => router.replace('/(tabs)')}
              disabled={isDisabled}
              style={({ pressed }) => [
                styles.button,
                isWide && styles.buttonWide,
                { backgroundColor: colors.primary },
                isDisabled && styles.buttonDisabled,
                pressed && !isDisabled && styles.buttonPressed,
              ]}
            >
              <AppText style={[styles.buttonText, { color: colors.onPrimary }]}>Continuar</AppText>
            </Pressable>
          </View>

          <View style={styles.registerContainer}>
            <AppText style={[styles.registerText, { color: colors.mutedText }]}>
              ¿No tienes cuenta?{' '}
              <AppText
                style={[styles.registerLink, { color: colors.primary }]}
                onPress={() => router.push('/register')}
              >
                Regístrate
              </AppText>
            </AppText>
          </View>

          <View style={styles.termsContainer}>
            <AppText style={[styles.termsText, { color: colors.mutedText }]}> 
              Al hacer clic en continuar, aceptas nuestros{' '}
              <AppText style={[styles.termsLink, { color: colors.mutedText }]}>Términos de Servicio</AppText> y nuestra{' '}
              <AppText style={[styles.termsLink, { color: colors.mutedText }]}>Política de Privacidad</AppText>
            </AppText>
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
    color: '#111111',
    marginBottom: 38,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111111',
    marginBottom: 10,
  },
  description: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 18,
  },
  form: {
    width: '100%',
    maxWidth: 360,
    gap: 10,
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 13,
    color: '#111111',
    backgroundColor: '#ffffff',
  },
  button: {
    height: 44,
    borderRadius: 8,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  buttonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  registerContainer: {
    marginTop: 20,
  },
  registerText: {
    fontSize: 12,
    textAlign: 'center',
  },
  registerLink: {
    fontSize: 12,
    fontWeight: '600',
  },
  termsContainer: {
    position: 'absolute',
    bottom: 22,
    left: 24,
    right: 24,
  },
  termsText: {
    fontSize: 10,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 14,
  },
  termsLink: {
    fontSize: 10,
    textDecorationLine: 'underline',
    color: '#9ca3af',
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