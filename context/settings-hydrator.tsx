import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useRef } from 'react';

import { useAppSettings } from '@/context/settings-context';
import { useUser } from '@/context/user-context';
import { db } from '@/services/firebase';

const DEFAULT_FONT_SCALE = 1;
const DEFAULT_DARK_MODE = false;

export function SettingsHydrator() {
  const { currentUser, isHydrated: isUserHydrated } = useUser();
  const {
    setFontScale,
    setDarkModeEnabled,
    setSettingsHydrated,
    resetSettingsToDefaults,
  } = useAppSettings();
  const lastHydratedUserId = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function hydrateSettings() {
      if (!isUserHydrated) {
        return;
      }

      if (!currentUser?.id) {
        lastHydratedUserId.current = null;
        resetSettingsToDefaults();
        return;
      }

      if (lastHydratedUserId.current === currentUser.id) {
        setSettingsHydrated(true);
        return;
      }

      setSettingsHydrated(false);

      try {
        const snapshot = await getDoc(doc(db, 'usuarios', currentUser.id));
        if (cancelled) {
          return;
        }

        if (snapshot.exists()) {
          const data = snapshot.data();
          const remoteFontScale =
            typeof data.config_tamano_fuente === 'number'
              ? Number(data.config_tamano_fuente)
              : DEFAULT_FONT_SCALE;
          const remoteDarkMode =
            typeof data.config_modo_oscuro === 'boolean'
              ? data.config_modo_oscuro
              : DEFAULT_DARK_MODE;

          setFontScale(remoteFontScale);
          setDarkModeEnabled(remoteDarkMode);
        } else {
          setFontScale(DEFAULT_FONT_SCALE);
          setDarkModeEnabled(DEFAULT_DARK_MODE);
        }
      } catch {
        if (cancelled) {
          return;
        }

        setFontScale(DEFAULT_FONT_SCALE);
        setDarkModeEnabled(DEFAULT_DARK_MODE);
      } finally {
        if (cancelled) {
          return;
        }

        lastHydratedUserId.current = currentUser.id;
        setSettingsHydrated(true);
      }
    }

    hydrateSettings();

    return () => {
      cancelled = true;
    };
  }, [
    currentUser?.id,
    isUserHydrated,
    resetSettingsToDefaults,
    setDarkModeEnabled,
    setFontScale,
    setSettingsHydrated,
  ]);

  return null;
}
