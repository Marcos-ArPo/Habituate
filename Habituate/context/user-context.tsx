import React, { createContext, useContext, useMemo, useState } from 'react';

export type User = {
  id: string;
  name: string;
  email: string;
  preferencePhone: string;
  urgencyPhone: string;
};

type StoredUser = User & {
  password: string;
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
  const [users, setUsers] = useState<StoredUser[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const value = useMemo<UserContextValue>(
    () => ({
      currentUser,
      isHydrated: true,
      registerUser: async (name, email, password) => {
        try {
          const normalizedEmail = email.trim().toLowerCase();
          const exists = users.some((u) => u.email.toLowerCase() === normalizedEmail);
          if (exists) return 'already_exists';

          const newUser: StoredUser = {
            id: normalizedEmail,
            name,
            email: normalizedEmail,
            password,
            preferencePhone: '',
            urgencyPhone: '',
          };

          setUsers((prev) => [...prev, newUser]);
          setCurrentUser({
            id: newUser.id,
            name: newUser.name,
            email: newUser.email,
            preferencePhone: newUser.preferencePhone,
            urgencyPhone: newUser.urgencyPhone,
          });

          return 'ok';
        } catch {
          return 'error';
        }
      },
      loginUser: async (email, password) => {
        const normalizedEmail = email.trim().toLowerCase();
        const found = users.find((u) => u.email.toLowerCase() === normalizedEmail);
        if (!found) return 'not_found';
        if (found.password !== password) return 'invalid_credentials';

        setCurrentUser({
          id: found.id,
          name: found.name,
          email: found.email,
          preferencePhone: found.preferencePhone,
          urgencyPhone: found.urgencyPhone,
        });

        return 'ok';
      },
      updateCurrentUser: async (data) => {
        if (!currentUser) return false;

        const nextUser: User = { ...currentUser, ...data };
        setCurrentUser(nextUser);
        setUsers((prev) =>
          prev.map((u) =>
            u.id === currentUser.id
              ? {
                  ...u,
                  name: nextUser.name,
                  email: nextUser.email,
                  preferencePhone: nextUser.preferencePhone,
                  urgencyPhone: nextUser.urgencyPhone,
                }
              : u
          )
        );

        return true;
      },
      logoutUser: async () => {
        setCurrentUser(null);
      },
    }),
    [currentUser, users]
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  return useContext(UserContext);
}
