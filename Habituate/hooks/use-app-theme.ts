import { useMemo } from 'react';

import { useAppSettings } from '@/context/settings-context';

export function useAppTheme() {
  const { colorScheme } = useAppSettings();
  const isDark = colorScheme === 'dark';

  return useMemo(
    () => ({
      isDark,
      colors: {
        background: isDark ? '#111111' : '#ffffff',
        surface: isDark ? '#1a1a1a' : '#ffffff',
        elevated: isDark ? '#202020' : '#f5f5f5',
        text: isDark ? '#f5f5f5' : '#111111',
        mutedText: isDark ? '#b8b8b8' : '#9ca3af',
        border: isDark ? '#303030' : '#e5e7eb',
        primary: isDark ? '#f5f5f5' : '#000000',
        onPrimary: isDark ? '#111111' : '#ffffff',
        accent: isDark ? '#7ea2ff' : '#2f6bff',
      },
    }),
    [isDark]
  );
}
