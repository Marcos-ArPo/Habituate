import { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useRouter } from 'expo-router';

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const isDisabled = useMemo(() => {
    return email.trim().length === 0 || password.trim().length === 0;
  }, [email, password]);

  return (
    <View style={[styles.safeArea, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: 'padding', android: undefined })}
        style={styles.keyboardAvoid}
      >
        <View style={styles.container}>
          <Text style={styles.title}>Habituate</Text>

          <Text style={styles.subtitle}>Accede a tu cuenta</Text>
          <Text style={styles.description}>
            Introduce tu correo electrónico para iniciar sesión en{`\n`}esta aplicación
          </Text>

          <View style={styles.form}>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Correo electrónico"
              autoCapitalize="none"
              keyboardType="email-address"
              textContentType="emailAddress"
              autoComplete="email"
              returnKeyType="next"
              style={styles.input}
              placeholderTextColor="#9aa0a6"
            />

            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Contraseña"
              secureTextEntry
              textContentType="password"
              autoComplete="password"
              returnKeyType="done"
              style={styles.input}
              placeholderTextColor="#9aa0a6"
            />

            <Pressable
              accessibilityRole="button"
              onPress={() => router.replace('/(tabs)')}
              disabled={isDisabled}
              style={({ pressed }) => [
                styles.button,
                isDisabled && styles.buttonDisabled,
                pressed && !isDisabled && styles.buttonPressed,
              ]}
            >
              <Text style={styles.buttonText}>Continuar</Text>
            </Pressable>
          </View>

          <View style={styles.termsContainer}>
            <Text style={styles.termsText}>
              Al hacer clic en continuar, aceptas nuestros{' '}
              <Text style={styles.termsLink}>Términos de Servicio</Text> y nuestra{' '}
              <Text style={styles.termsLink}>Política de Privacidad</Text>
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
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
    color: '#ffffff',
    fontSize: 13,
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
    textDecorationLine: 'underline',
    color: '#9ca3af',
  },
});