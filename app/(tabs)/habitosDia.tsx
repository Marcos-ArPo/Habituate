import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  where,
  type Timestamp,
} from 'firebase/firestore';

import { AppText } from '@/components/app-text';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useUser } from '@/context/user-context';
import { buildDateId } from '@/services/firestore-data';
import { db } from '@/services/firebase';

type DayOption = {
  label: string;
  offset: number;
};

type TaskItem = {
  id: string;
  titulo: string;
  descripcion: string;
  fechaVencimiento: Date | null;
  prioridad: number;
};

function toDateFromTimestamp(value: unknown): Date | null {
  if (!value || typeof value !== 'object') return null;
  const maybeTimestamp = value as Timestamp;
  if (typeof maybeTimestamp.toDate !== 'function') return null;
  return maybeTimestamp.toDate();
}

function sameDateAsOffset(date: Date | null, offset: number) {
  if (!date) return offset === 0;
  const selected = new Date();
  selected.setHours(0, 0, 0, 0);
  selected.setDate(selected.getDate() + offset);

  const due = new Date(date);
  due.setHours(0, 0, 0, 0);

  return selected.getTime() === due.getTime();
}

function formatDateTime(date: Date | null) {
  if (!date) return 'Sin fecha de vencimiento';

  return date.toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function HabitosDiaScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const { currentUser } = useUser();
  const [selectedDay, setSelectedDay] = useState('Hoy');
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);

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
    if (!currentUser?.id) {
      setTasks([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const tasksRef = collection(db, 'usuarios', currentUser.id, 'tareas');
    const tasksQuery = query(tasksRef, where('completada', '==', false));

    const unsubscribe = onSnapshot(
      tasksQuery,
      (snapshots) => {
        const mapped = snapshots.docs
          .map((item) => {
            const data = item.data();
            return {
              id: item.id,
              titulo: String(data.titulo ?? 'Sin titulo'),
              descripcion: String(data.descripcion ?? ''),
              fechaVencimiento: toDateFromTimestamp(data.fecha_vencimiento),
              prioridad: Number(data.prioridad ?? 1),
            };
          })
          .filter((task) => sameDateAsOffset(task.fechaVencimiento, selectedOffset))
          .sort((a, b) => {
            const aTime = a.fechaVencimiento?.getTime() ?? 0;
            const bTime = b.fechaVencimiento?.getTime() ?? 0;
            return aTime - bTime;
          });

        setTasks(mapped);
        setLoading(false);
      },
      () => {
        setTasks([]);
        setLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [currentUser?.id, selectedOffset]);

  const tasksLabel = useMemo(() => {
    if (loading) return 'Cargando tareas...';
    if (tasks.length === 0) return 'No hay tareas pendientes para esta fecha.';
    return '';
  }, [loading, tasks.length]);

  async function completeTask(task: TaskItem) {
    if (!currentUser?.id) return;

    try {
      setIsCompleting(true);

      await runTransaction(db, async (transaction) => {
        const todayId = buildDateId(0);
        const yesterdayId = buildDateId(-1);

        const userRef = doc(db, 'usuarios', currentUser.id);
        const taskRef = doc(db, 'usuarios', currentUser.id, 'tareas', task.id);
        const todayStatsRef = doc(db, 'usuarios', currentUser.id, 'estadisticas', todayId);
        const yesterdayStatsRef = doc(db, 'usuarios', currentUser.id, 'estadisticas', yesterdayId);

        const [userSnap, taskSnap, todayStatsSnap, yesterdayStatsSnap] = await Promise.all([
          transaction.get(userRef),
          transaction.get(taskRef),
          transaction.get(todayStatsRef),
          transaction.get(yesterdayStatsRef),
        ]);

        if (!taskSnap.exists()) {
          throw new Error('task-not-found');
        }

        const taskData = taskSnap.data();
        if (Boolean(taskData.completada)) {
          return;
        }

        const userData = userSnap.exists() ? userSnap.data() : {};
        const dashboard = (userData.dashboard as Record<string, unknown> | undefined) ?? {};

        const todayStats = todayStatsSnap.exists() ? todayStatsSnap.data() : {};
        const yesterdayStats = yesterdayStatsSnap.exists() ? yesterdayStatsSnap.data() : {};

        const todayHabits = Number(todayStats.habitos_completados ?? 0);
        const todayTasks = Number(todayStats.tareas_completadas ?? 0);
        const yesterdayHabits = Number(yesterdayStats.habitos_completados ?? 0);
        const yesterdayTasks = Number(yesterdayStats.tareas_completadas ?? 0);

        const todayTotalBefore = todayHabits + todayTasks;
        const yesterdayTotal = yesterdayHabits + yesterdayTasks;

        const currentRacha = Number(dashboard.racha_actual ?? 0);
        const currentRachaMax = Number(todayStats.racha_maxima ?? currentRacha);

        let nextRacha = currentRacha;
        if (todayTotalBefore === 0) {
          nextRacha = yesterdayTotal > 0 ? Math.max(1, currentRacha + 1) : 1;
        }

        const nextRachaMax = Math.max(currentRachaMax, nextRacha);

        const currentPendingTasks = Number(dashboard.total_tareas_pendientes ?? 0);
        const currentCompletedToday = Number(
          dashboard.tareas_completadas_hoy ?? dashboard.tareas_completados_hoy ?? 0
        );

        transaction.update(taskRef, {
          completada: true,
          actualizado_en: serverTimestamp(),
        });

        transaction.set(
          todayStatsRef,
          {
            fecha: todayId,
            habitos_completados: todayHabits,
            tareas_completadas: todayTasks + 1,
            racha_actual: nextRacha,
            racha_maxima: nextRachaMax,
          },
          { merge: true }
        );

        transaction.set(
          userRef,
          {
            dashboard: {
              ...dashboard,
              total_tareas_pendientes: Math.max(0, currentPendingTasks - 1),
              tareas_completadas_hoy: currentCompletedToday + 1,
              // Compatibilidad por si existe typo en documentos previos.
              tareas_completados_hoy: currentCompletedToday + 1,
              racha_actual: nextRacha,
              ultima_actualizacion: serverTimestamp(),
            },
          },
          { merge: true }
        );
      });

      setSelectedTask(null);
      setTasks((prev) => prev.filter((item) => item.id !== task.id));
    } catch {
      Alert.alert('Error', 'No se pudo completar la tarea.');
    } finally {
      setIsCompleting(false);
    }
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.headerSide} />
        <AppText style={[styles.headerTitle, { color: colors.text }]}>Tareas del Día</AppText>
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
        {tasksLabel ? (
          <View style={[styles.habitCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <AppText style={[styles.habitName, { color: colors.mutedText }]}>{tasksLabel}</AppText>
          </View>
        ) : (
          tasks.map((task) => (
            <View
              key={task.id}
              style={[styles.habitCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.habitContent}>
                <View style={[styles.iconContainer, { backgroundColor: colors.elevated }]}>
                  <Ionicons name="checkbox-outline" size={24} color={colors.accent} />
                </View>
                <View style={styles.habitInfo}>
                  <AppText style={[styles.habitName, { color: colors.text }]}>{task.titulo}</AppText>
                  <AppText style={[styles.habitTime, { color: colors.mutedText }]}>
                    {formatDateTime(task.fechaVencimiento)}
                  </AppText>
                </View>
              </View>
              <Pressable style={[styles.markButton, { backgroundColor: colors.primary }]} onPress={() => setSelectedTask(task)}>
                <AppText style={[styles.markButtonText, { color: colors.onPrimary }]}>Ver detalle</AppText>
              </Pressable>
            </View>
          ))
        )}
      </ScrollView>

      <Modal visible={Boolean(selectedTask)} transparent animationType="fade" onRequestClose={() => setSelectedTask(null)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <AppText style={[styles.modalTitle, { color: colors.text }]}>{selectedTask?.titulo ?? ''}</AppText>
            <AppText style={[styles.modalLabel, { color: colors.mutedText }]}>Descripcion</AppText>
            <AppText style={[styles.modalText, { color: colors.text }]}>
              {selectedTask?.descripcion || 'Sin descripcion'}
            </AppText>
            <AppText style={[styles.modalLabel, { color: colors.mutedText }]}>Fecha y hora</AppText>
            <AppText style={[styles.modalText, { color: colors.text }]}>
              {formatDateTime(selectedTask?.fechaVencimiento ?? null)}
            </AppText>

            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalButton, { borderColor: colors.border }]}
                onPress={() => setSelectedTask(null)}>
                <AppText style={[styles.modalButtonText, { color: colors.text }]}>Cerrar</AppText>
              </Pressable>
              <Pressable
                style={[styles.modalButton, { backgroundColor: colors.primary }]}
                onPress={() => selectedTask && completeTask(selectedTask)}
                disabled={isCompleting}>
                <AppText style={[styles.modalButtonText, { color: colors.onPrimary }]}>
                  {isCompleting ? 'Completando...' : 'Completar tarea'}
                </AppText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  modalCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
  },
  modalLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 6,
    marginBottom: 3,
  },
  modalText: {
    fontSize: 13,
    lineHeight: 18,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 14,
    gap: 8,
  },
  modalButton: {
    minHeight: 34,
    borderRadius: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  modalButtonText: {
    fontSize: 12,
    fontWeight: '700',
  },
});