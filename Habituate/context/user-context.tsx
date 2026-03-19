import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  fetchSignInMethodsForEmail,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';

import { auth, db } from '@/services/firebase';

export type User = {
  id: string;
  name: string;
  email: string;
  preferencePhone: string;
  urgencyPhone: string;
};

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
        const userRef = doc(db, 'users', firebaseUser.uid);
        const snapshot = await getDoc(userRef);

        if (snapshot.exists()) {
          const data = snapshot.data();
          setCurrentUser({
            id: firebaseUser.uid,
            name: String(data.name ?? firebaseUser.displayName ?? ''),
            email: String(data.email ?? firebaseUser.email ?? ''),
            preferencePhone: String(data.preferencePhone ?? ''),
            urgencyPhone: String(data.urgencyPhone ?? ''),
          });
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
              name: fallbackUser.name,
              email: fallbackUser.email,
              preferencePhone: fallbackUser.preferencePhone,
              urgencyPhone: fallbackUser.urgencyPhone,
              updatedAt: serverTimestamp(),
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

          await setDoc(doc(db, 'users', credential.user.uid), {
            name: newUser.name,
            email: newUser.email,
            preferencePhone: newUser.preferencePhone,
            urgencyPhone: newUser.urgencyPhone,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
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
          // const signInMethods = await fetchSignInMethodsForEmail(auth, normalizedEmail);
          // if (!signInMethods.length) {
          //   console.log("error en signInMethods > ", signInMethods);
          //   return 'not_found'
          // };

          const credential = await signInWithEmailAndPassword(auth, normalizedEmail, password);
          const userRef = doc(db, 'users', credential.user.uid);
          const snapshot = await getDoc(userRef);

          if (snapshot.exists()) {
            const data = snapshot.data();
            setCurrentUser({
              id: credential.user.uid,
              name: String(data.name ?? credential.user.displayName ?? ''),
              email: String(data.email ?? credential.user.email ?? normalizedEmail),
              preferencePhone: String(data.preferencePhone ?? ''),
              urgencyPhone: String(data.urgencyPhone ?? ''),
            });
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
                name: fallbackUser.name,
                email: fallbackUser.email,
                preferencePhone: fallbackUser.preferencePhone,
                urgencyPhone: fallbackUser.urgencyPhone,
                updatedAt: serverTimestamp(),
              },
              { merge: true }
            );

            setCurrentUser(fallbackUser);
          }

          return 'ok';
        } catch (error) {
          // const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : '';
          console.log("Login incorrecto > dentro del catch");

          // if (code === 'auth/user-not-found') return 'not_found';
          return 'invalid_credentials';
        }
      },
      updateCurrentUser: async (data) => {
        if (!currentUser) return false;
        if (!auth.currentUser) return false;

        const nextUser: User = { ...currentUser, ...data };

        try {
          await updateDoc(doc(db, 'users', auth.currentUser.uid), {
            name: nextUser.name,
            email: nextUser.email,
            preferencePhone: nextUser.preferencePhone,
            urgencyPhone: nextUser.urgencyPhone,
            updatedAt: serverTimestamp(),
          });
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
