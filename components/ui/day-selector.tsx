import { AppText } from '@/components/app-text';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

const DAYS = [
  { label: 'Dom', value: 0 },
  { label: 'Lun', value: 1 },
  { label: 'Mar', value: 2 },
  { label: 'Mié', value: 3 },
  { label: 'Jue', value: 4 },
  { label: 'Vie', value: 5 },
  { label: 'Sab', value: 6 },
];

type DaySelectorProps = {
  selectedDays: number[];
  onDaysChange: (days: number[]) => void;
  colors: {
    primary: string;
    onPrimary: string;
    surface: string;
    border: string;
    text: string;
  };
};

export function DaySelector({ selectedDays, onDaysChange, colors }: DaySelectorProps) {
  const handleToggleDay = (dayValue: number) => {
    const isSelected = selectedDays.includes(dayValue);
    const newDays = isSelected
      ? selectedDays.filter((d) => d !== dayValue)
      : [...selectedDays, dayValue].sort((a, b) => a - b);
    onDaysChange(newDays);
  };

  return (
    <View style={styles.container}>
      {DAYS.map((day) => {
        const isSelected = selectedDays.includes(day.value);
        return (
          <Pressable
            key={day.value}
            onPress={() => handleToggleDay(day.value)}
            style={[
              styles.dayButton,
              {
                backgroundColor: isSelected ? colors.primary : colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <AppText
              style={[
                styles.dayLabel,
                {
                  color: isSelected ? colors.onPrimary : colors.text,
                  fontWeight: isSelected ? '700' : '500',
                },
              ]}
            >
              {day.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  dayButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
});
