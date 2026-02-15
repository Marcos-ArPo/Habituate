import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

type Habit = {
  name: string;
  time: string;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
};

export default function HabitosDiaScreen() {
  const insets = useSafeAreaInsets();
  const [selectedDay, setSelectedDay] = useState('Hoy');
  const days = useMemo(() => ['Hoy', 'Mañana', 'Miércoles', 'Jueves'], []);

  const habits = useMemo(
    () => [
      { name: 'Tarea de casa', time: 'Finalización 17:00', label: 'Finalización', icon: 'home' as const },
      { name: 'Tarea de Deporte', time: 'Finalización 12:00', label: 'Finalización', icon: 'bicycle' as const },
      { name: 'Medicación', time: 'Inicio 10:00 - Finalización 10:30', label: 'Finalización', icon: 'medical' as const },
      { name: 'Recoger a los nietos de la es...', time: 'Hora de salida 13:30', label: 'Hora de salida', icon: 'people' as const },
      { name: 'Tarde de piscina', time: 'Inicio 18:00 - Finalización 21:00', label: 'Finalización', icon: 'water' as const },
    ],
    []
  );

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.headerSide} />
        <Text style={styles.headerTitle}>Hábitos del Día</Text>
        <View style={styles.headerSide} />
      </View>

      <View style={styles.daysContainer}>
        {days.map((day) => (
          <Pressable
            key={day}
            onPress={() => setSelectedDay(day)}
            style={[
              styles.dayButton,
              selectedDay === day && styles.dayButtonActive,
            ]}
          >
            <Text
              style={[
                styles.dayButtonText,
                selectedDay === day && styles.dayButtonTextActive,
              ]}
            >
              {day}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {habits.map((habit) => (
          <View key={habit.name} style={styles.habitCard}>
            <View style={styles.habitContent}>
              <View style={styles.iconContainer}>
                <Ionicons name={habit.icon} size={24} color="#2f6bff" />
              </View>
              <View style={styles.habitInfo}>
                <Text style={styles.habitName}>{habit.name}</Text>
                <Text style={styles.habitTime}>{habit.time}</Text>
              </View>
            </View>
            <Pressable style={styles.markButton}>
              <Text style={styles.markButtonText}>Marcar</Text>
            </Pressable>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#ffffff',
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
    color: '#666666',
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