import React from 'react';
import { StyleProp, StyleSheet, Text, TextProps, TextStyle } from 'react-native';

import { useAppSettings } from '@/context/settings-context';

const DEFAULT_FONT_SIZE = 14;

function scaleStyle(style: StyleProp<TextStyle>, factor: number): TextStyle {
  const flat = StyleSheet.flatten(style) ?? {};
  const fontSize = typeof flat.fontSize === 'number' ? flat.fontSize : DEFAULT_FONT_SIZE;
  const lineHeight = typeof flat.lineHeight === 'number' ? flat.lineHeight * factor : undefined;

  return {
    ...flat,
    fontSize: fontSize * factor,
    lineHeight,
  };
}

export function AppText({ style, ...rest }: TextProps) {
  const { fontScale } = useAppSettings();

  return <Text style={scaleStyle(style, fontScale)} {...rest} />;
}
