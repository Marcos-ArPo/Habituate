import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

type AppColorScheme = 'light' | 'dark';

type SettingsContextValue = {
  fontScale: number;
  setFontScale: (value: number) => void;
  darkModeEnabled: boolean;
  setDarkModeEnabled: (value: boolean) => void;
  isSettingsHydrated: boolean;
  setSettingsHydrated: (value: boolean) => void;
  resetSettingsToDefaults: () => void;
  colorScheme: AppColorScheme;
};

const FONT_SCALE_MIN = 0.50;
const FONT_SCALE_MAX = 2.0;

const clamp = (value: number) => Math.max(FONT_SCALE_MIN, Math.min(FONT_SCALE_MAX, value));

const defaultValue: SettingsContextValue = {
  fontScale: 1,
  setFontScale: () => undefined,
  darkModeEnabled: false,
  setDarkModeEnabled: () => undefined,
  isSettingsHydrated: false,
  setSettingsHydrated: () => undefined,
  resetSettingsToDefaults: () => undefined,
  colorScheme: 'light',
};

const SettingsContext = createContext<SettingsContextValue>(defaultValue);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useRNColorScheme();
  const defaultDarkMode = systemColorScheme === 'dark';
  const [fontScale, setFontScaleValue] = useState(1);
  const [darkModeEnabled, setDarkModeEnabled] = useState(defaultDarkMode);
  const [isSettingsHydrated, setSettingsHydrated] = useState(false);

  const setFontScale = useCallback((newValue: number) => {
    setFontScaleValue(clamp(newValue));
  }, []);

  const resetSettingsToDefaults = useCallback(() => {
    setFontScaleValue(1);
    setDarkModeEnabled(defaultDarkMode);
    setSettingsHydrated(false);
  }, [defaultDarkMode]);

  const value = useMemo<SettingsContextValue>(
    () => ({
      fontScale,
      setFontScale,
      darkModeEnabled,
      setDarkModeEnabled,
      isSettingsHydrated,
      setSettingsHydrated,
      resetSettingsToDefaults,
      colorScheme: darkModeEnabled ? 'dark' : 'light',
    }),
    [darkModeEnabled, fontScale, isSettingsHydrated, resetSettingsToDefaults, setFontScale]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useAppSettings() {
  return useContext(SettingsContext);
}

export { FONT_SCALE_MAX, FONT_SCALE_MIN };

