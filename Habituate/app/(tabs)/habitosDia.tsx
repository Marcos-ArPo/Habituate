import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/components/app-text';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useUser } from '@/context/user-context';
import { buildDateId, getHabitsByDate, type HabitItem } from '@/services/firestore-data';

type DayOption = {
  label: string;
  offset: number;
};

const ICON_BY_KEY: Record<string, React.ComponentProps<typeof Ionicons>['name']> = {
  home: 'home',
  bicycle: 'bicycle',
  medical: 'medical',
  people: 'people',
  water: 'water',
};

export default function HabitosDiaScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const { currentUser } = useUser();
  const [selectedDay, setSelectedDay] = useState('Hoy');
  const [habits, setHabits] = useState<HabitItem[]>([]);
  const [loading, setLoading] = useState(true);
  const days = useMemo<DayOption[]>(
    () => [
      { label: 'Hoy', offset: 0 },
      { label: 'Mañana', offset: 1 },
      { label: 'Pasado', offset: 2 },
      { label: 'Próximo', offset: 3 },
    ],
    []
  );

  const selectedOffset = useMemo(
    () => days.find((day) => day.label === selectedDay)?.offset ?? 0,
    [days, selectedDay]
  );

  useEffect(() => {
    let cancelled = false;

    async function loadHabits() {
      if (!currentUser?.id) {
        setHabits([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const dateId = buildDateId(selectedOffset);
        const response = await getHabitsByDate(currentUser.id, dateId);
        if (cancelled) return;
        setHabits(response);
      } catch {
        if (cancelled) return;
        setHabits([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadHabits();

    return () => {
      cancelled = true;
    };
  }, [currentUser?.id, selectedOffset]);

  const habitsLabel = useMemo(() => {
    if (loading) return 'Cargando hábitos...';
    if (habits.length === 0) return 'No hay hábitos activos para esta fecha.';
    return '';
  }, [habits.length, loading]);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.headerSide} />
        <AppText style={[styles.headerTitle, { color: colors.text }]}>Hábitos del Día</AppText>
        <View style={styles.headerSide} />
      </View>

      <View style={styles.daysContainer}>
        {days.map((day) => (
          <Pressable
            key={day.label}
            onPress={() => setSelectedDay(day.label)}
            style={[
              styles.dayButton,
              { backgroundColor: colors.elevated },
              selectedDay === day.label && styles.dayButtonActive,
            ]}
          >
            <AppText
              style={[
                styles.dayButtonText,
                selectedDay === day.label && styles.dayButtonTextActive,
                { color: selectedDay === day.label ? colors.onPrimary : colors.mutedText },
              ]}
            >
              {day.label}
            </AppText>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {habitsLabel ? (
          <View style={[styles.habitCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <AppText style={[styles.habitName, { color: colors.mutedText }]}>{habitsLabel}</AppText>
          </View>
        ) : (
          habits.map((habit) => (
            <View
              key={habit.id}
              style={[styles.habitCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.habitContent}>
                <View style={[styles.iconContainer, { backgroundColor: colors.elevated }]}>
                  <Ionicons
                    name={ICON_BY_KEY[habit.icono] ?? 'checkmark-circle-outline'}
                    size={24}
                    color={colors.accent}
                  />
                </View>
                <View style={styles.habitInfo}>
                  <AppText style={[styles.habitName, { color: colors.text }]}>{habit.nombre}</AppText>
                  <AppText style={[styles.habitTime, { color: colors.mutedText }]}>
                    {habit.horaRecordatorio ? `Hora ${habit.horaRecordatorio}` : 'Sin hora configurada'}
                  </AppText>
                </View>
              </View>
              <Pressable
                style={[
                  styles.markButton,
                  { backgroundColor: habit.completado ? colors.elevated : colors.primary },
                ]}>
                <AppText
                  style={[
                    styles.markButtonText,
                    { color: habit.completado ? colors.text : colors.onPrimary },
                  ]}>
                  {habit.completado ? 'Completado' : 'Pendiente'}
                </AppText>
              </Pressable>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    paddingTop: 14,
    paddingHorizontal: 16,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerSide: {
    width: 32,
    height: 32,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    color: '#111111',
  },
  daysContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    justifyContent: 'space-between',
  },
  dayButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#f5f5f5',
  },
  dayButtonActive: {
    backgroundColor: '#111111',
  },
  dayButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  dayButtonTextActive: {
    color: '#ffffff',
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 22,
  },
  habitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#eef2f7',
    borderRadius: 10,
    backgroundColor: '#ffffff',
  },
  habitContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#f0f4ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  habitInfo: {
    flex: 1,
  },
  habitName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111111',
    marginBottom: 2,
  },
  habitTime: {
    fontSize: 11,
    color: '#9ca3af',
  },
  markButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#111111',
    marginLeft: 8,
  },
  markButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
});