import React, { createContext, useContext, useMemo, useState } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

type AppColorScheme = 'light' | 'dark';

type SettingsContextValue = {
  fontScale: number;
  setFontScale: (value: number) => void;
  darkModeEnabled: boolean;
  setDarkModeEnabled: (value: boolean) => void;
  soundEnabled: boolean;
  setSoundEnabled: (value: boolean) => void;
  reminderEnabled: boolean;
  setReminderEnabled: (value: boolean) => void;
  colorScheme: AppColorScheme;
};

const FONT_SCALE_MIN = 0.85;
const FONT_SCALE_MAX = 1.35;

const clamp = (value: number) => Math.max(FONT_SCALE_MIN, Math.min(FONT_SCALE_MAX, value));

const defaultValue: SettingsContextValue = {
  fontScale: 1,
  setFontScale: () => undefined,
  darkModeEnabled: false,
  setDarkModeEnabled: () => undefined,
  soundEnabled: true,
  setSoundEnabled: () => undefined,
  reminderEnabled: false,
  setReminderEnabled: () => undefined,
  colorScheme: 'light',
};

const SettingsContext = createContext<SettingsContextValue>(defaultValue);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useRNColorScheme();
  const [fontScale, setFontScaleValue] = useState(1);
  const [darkModeEnabled, setDarkModeEnabled] = useState(systemColorScheme === 'dark');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [reminderEnabled, setReminderEnabled] = useState(false);

  const value = useMemo<SettingsContextValue>(
    () => ({
      fontScale,
      setFontScale: (newValue: number) => setFontScaleValue(clamp(newValue)),
      darkModeEnabled,
      setDarkModeEnabled,
      soundEnabled,
      setSoundEnabled,
      reminderEnabled,
      setReminderEnabled,
      colorScheme: darkModeEnabled ? 'dark' : 'light',
    }),
    [darkModeEnabled, fontScale, reminderEnabled, soundEnabled]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useAppSettings() {
  return useContext(SettingsContext);
}

export { FONT_SCALE_MAX, FONT_SCALE_MIN };
