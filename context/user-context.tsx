import {
    createUserWithEmailAndPassword,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signOut,
    updateProfile,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { auth, db } from '@/services/firebase';

export type User = {
  id: string;
  name: string;
  email: string;
  preferencePhone: string;
  urgencyPhone: string;
};

function mapFirestoreUser(
  uid: string,
  data: Record<string, unknown>,
  fallbackEmail = '',
  fallbackName = ''
): User {
  return {
    id: uid,
    name: String(data.nombre ?? data.name ?? fallbackName),
    email: String(data.email ?? fallbackEmail),
    preferencePhone: String(data.telefono_preferencia ?? data.preferencePhone ?? ''),
    urgencyPhone: String(data.telefono_urgencia ?? data.urgencyPhone ?? ''),
  };
}

function buildFirestoreUserPayload(user: User) {
  return {
    nombre: user.name,
    email: user.email,
    telefono_preferencia: user.preferencePhone,
    telefono_urgencia: user.urgencyPhone,
    // Compatibilidad temporal por si hay pantallas antiguas leyendo campos previos.
    preferencePhone: user.preferencePhone,
    urgencyPhone: user.urgencyPhone,
    updatedAt: serverTimestamp(),
  };
}

function buildDefaultConfig() {
  return {
    config_modo_oscuro: false,
    config_tamano_fuente: 1,
    config_notificaciones: false,
    token_fcm: '',
  };
}

function buildDefaultDashboard() {
  return {
    total_habitos_activos: 0,
    total_tareas_pendientes: 0,
    habitos_completados_hoy: 0,
    tareas_completadas_hoy: 0,
    racha_actual: 0,
    ultima_actualizacion: serverTimestamp(),
  };
}

type UserContextValue = {
  currentUser: User | null;
  isHydrated: boolean;
  registerUser: (name: string, email: string, password: string) => Promise<'ok' | 'already_exists' | 'error'>;
  loginUser: (email: string, password: string) => Promise<'ok' | 'invalid_credentials' | 'not_found'>;
  updateCurrentUser: (data: Partial<User>) => Promise<boolean>;
  logoutUser: () => Promise<void>;
};

const UserContext = createContext<UserContextValue>({
  currentUser: null,
  isHydrated: true,
  registerUser: async () => 'error',
  loginUser: async () => 'not_found',
  updateCurrentUser: async () => false,
  logoutUser: async () => undefined,
});

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [isHydrated, setIsHydrated] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setCurrentUser(null);
        setIsHydrated(true);
        return;
      }

      try {
        const userRef = doc(db, 'usuarios', firebaseUser.uid);
        const snapshot = await getDoc(userRef);

        if (snapshot.exists()) {
          const data = snapshot.data();
          setCurrentUser(
            mapFirestoreUser(firebaseUser.uid, data, firebaseUser.email ?? '', firebaseUser.displayName ?? '')
          );
        } else {
          const fallbackUser: User = {
            id: firebaseUser.uid,
            name: firebaseUser.displayName ?? '',
            email: firebaseUser.email ?? '',
            preferencePhone: '',
            urgencyPhone: '',
          };

          await setDoc(
            userRef,
            {
              ...buildFirestoreUserPayload(fallbackUser),
              ...buildDefaultConfig(),
              fecha_registro: serverTimestamp(),
              avatar_url: '',
              dashboard: buildDefaultDashboard(),
            },
            { merge: true }
          );

          setCurrentUser(fallbackUser);
        }
      } catch {
        setCurrentUser({
          id: firebaseUser.uid,
          name: firebaseUser.displayName ?? '',
          email: firebaseUser.email ?? '',
          preferencePhone: '',
          urgencyPhone: '',
        });
      } finally {
        setIsHydrated(true);
      }
    });

    return unsubscribe;
  }, []);

  const value = useMemo<UserContextValue>(
    () => ({
      currentUser,
      isHydrated,
      registerUser: async (name, email, password) => {
        try {
          const normalizedEmail = email.trim().toLowerCase();
          const trimmedName = name.trim();
          const credential = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
          await updateProfile(credential.user, { displayName: trimmedName });

          const newUser: User = {
            id: credential.user.uid,
            name: trimmedName,
            email: normalizedEmail,
            preferencePhone: '',
            urgencyPhone: '',
          };

          await setDoc(doc(db, 'usuarios', credential.user.uid), {
            ...buildFirestoreUserPayload(newUser),
            ...buildDefaultConfig(),
            fecha_registro: serverTimestamp(),
            avatar_url: '',
            dashboard: buildDefaultDashboard(),
          });

          setCurrentUser(newUser);

          return 'ok';
        } catch (error) {
          const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : '';
          if (code === 'auth/email-already-in-use') return 'already_exists';
          return 'error';
        }
      },
      loginUser: async (email, password) => {
        const normalizedEmail = email.trim().toLowerCase();

        try {
          const credential = await signInWithEmailAndPassword(auth, normalizedEmail, password);
          const userRef = doc(db, 'usuarios', credential.user.uid);
          const snapshot = await getDoc(userRef);

          if (snapshot.exists()) {
            const data = snapshot.data();
            setCurrentUser(
              mapFirestoreUser(
                credential.user.uid,
                data,
                credential.user.email ?? normalizedEmail,
                credential.user.displayName ?? ''
              )
            );
          } else {
            const fallbackUser: User = {
              id: credential.user.uid,
              name: credential.user.displayName ?? '',
              email: credential.user.email ?? normalizedEmail,
              preferencePhone: '',
              urgencyPhone: '',
            };

            await setDoc(
              userRef,
              {
                ...buildFirestoreUserPayload(fallbackUser),
                ...buildDefaultConfig(),
                fecha_registro: serverTimestamp(),
                avatar_url: '',
                dashboard: buildDefaultDashboard(),
              },
              { merge: true }
            );

            setCurrentUser(fallbackUser);
          }

          return 'ok';
        } catch (error) {
          const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : '';

          if (code === 'auth/user-not-found') return 'not_found';
          return 'invalid_credentials';
        }
      },
      updateCurrentUser: async (data) => {
        if (!currentUser) return false;
        if (!auth.currentUser) return false;

        const nextUser: User = { ...currentUser, ...data };

        try {
          await updateDoc(doc(db, 'usuarios', auth.currentUser.uid), buildFirestoreUserPayload(nextUser));
          setCurrentUser(nextUser);
          return true;
        } catch {
          return false;
        }
      },
      logoutUser: async () => {
        await signOut(auth);
        setCurrentUser(null);
      },
    }),
    [currentUser, isHydrated]
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  return useContext(UserContext);
}
