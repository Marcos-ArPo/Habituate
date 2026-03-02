import React from 'react';
import { StyleProp, Text, TextProps, TextStyle } from 'react-native';

import { useAppSettings } from '@/context/settings-context';

function scaleStyle(style: StyleProp<TextStyle>, factor: number): StyleProp<TextStyle> {
  if (!style) return style;

  if (Array.isArray(style)) {
    return style.map((entry) => scaleStyle(entry as StyleProp<TextStyle>, factor));
  }

  if (typeof style !== 'object') {
    return style;
  }

  const typed = style as TextStyle;
  return {
    ...typed,
    fontSize: typeof typed.fontSize === 'number' ? typed.fontSize * factor : typed.fontSize,
    lineHeight: typeof typed.lineHeight === 'number' ? typed.lineHeight * factor : typed.lineHeight,
  };
}

export function AppText({ style, ...rest }: TextProps) {
  const { fontScale } = useAppSettings();

  return <Text style={scaleStyle(style, fontScale)} {...rest} />;
}
