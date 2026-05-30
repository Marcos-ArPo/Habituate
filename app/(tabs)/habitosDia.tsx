import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import {
    collection,
    doc,
    onSnapshot,
    query,
    runTransaction,
    serverTimestamp,
    where,
    type Timestamp
} from 'firebase/firestore';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { useUser } from '@/context/user-context';
import { useAppTheme } from '@/hooks/use-app-theme';
import { syncAchievementsForUser } from '@/services/achievements';
import { db } from '@/services/firebase';
import {
    buildDateId,
    deactivateHabit,
    deleteHabit,
    getHabitsByDate,
    reactivateHabit,
    type HabitItem,
} from '@/services/firestore-data';
import { cancelNotificationId } from '@/services/notifications';
import { playSuccessSound } from '@/services/sounds';

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

type TabType = 'tareas' | 'habitos';

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
}

function getDayNamesFromIndices(indices: number[]): string {
  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sab'];
  return indices.map((idx) => dayNames[idx]).join(', ');
}

export default function HabitosDiaScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const { currentUser } = useUser();
  const navigation = useNavigation();

  // State
  const [selectedDay, setSelectedDay] = useState('Hoy');
  const [activeTab, setActiveTab] = useState<TabType>('tareas');
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [habits, setHabits] = useState<HabitItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [selectedHabit, setSelectedHabit] = useState<HabitItem | null>(null);
  const [habitOptionsId, setHabitOptionsId] = useState<string | null>(null);
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

  const dateId = useMemo(() => buildDateId(selectedOffset), [selectedOffset]);

  // Cargar tareas
  useEffect(() => {
    if (!currentUser?.id) {
      setTasks([]);
      return;
    }

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
      },
      () => {
        setTasks([]);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [currentUser?.id, selectedOffset]);

  // Cargar hábitos
  useEffect(() => {
    if (!currentUser?.id) {
      setHabits([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    getHabitsByDate(currentUser.id, dateId)
      .then((loadedHabits) => {
        setHabits(loadedHabits);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Error cargando hábitos:', error);
        setHabits([]);
        setLoading(false);
      });
  }, [currentUser?.id, dateId]);

  const emptyLabel = useMemo(() => {
    if (loading) return 'Cargando...';
    if (activeTab === 'tareas') {
      return tasks.length === 0 ? 'No hay tareas pendientes para esta fecha.' : '';
    } else {
      return habits.length === 0 ? 'No hay hábitos programados para esta fecha.' : '';
    }
  }, [loading, tasks.length, habits.length, activeTab]);

  async function completeTask(task: TaskItem) {
    if (!currentUser?.id) return;

    try {
      setIsCompleting(true);
      let taskNotificationId: string | null = null;

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
        taskNotificationId = String(taskData.notification_id ?? '');
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

        console.log('📝 Escribiendo estadísticas:', {
          path: `usuarios/${currentUser.id}/estadisticas/${todayId}`,
          data: {
            fecha: todayId,
            habitos_completados: todayHabits,
            tareas_completadas: todayTasks + 1,
            racha_actual: nextRacha,
            racha_maxima: nextRachaMax,
          },
        });

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

      await cancelNotificationId(taskNotificationId);
      await syncAchievementsForUser(currentUser.id, 'taskCompleted');
      await playSuccessSound();

      setSelectedTask(null);
      setTasks((prev) => prev.filter((item) => item.id !== task.id));
    } catch {
      Alert.alert('Error', 'No se pudo completar la tarea.');
    } finally {
      setIsCompleting(false);
    }
  }

  async function completeHabit(habitId: string) {
    if (!currentUser?.id) return;

    try {
      setIsCompleting(true);

      await runTransaction(db, async (transaction) => {
        const yesterdayId = buildDateId(-1);

        const userRef = doc(db, 'usuarios', currentUser.id);
        const habitRegisterRef = doc(
          db,
          'usuarios',
          currentUser.id,
          'habitos',
          habitId,
          'registros',
          dateId
        );
        const todayStatsRef = doc(db, 'usuarios', currentUser.id, 'estadisticas', dateId);
        const yesterdayStatsRef = doc(db, 'usuarios', currentUser.id, 'estadisticas', yesterdayId);

        const [userSnap, habitRegisterSnap, todayStatsSnap, yesterdayStatsSnap] = await Promise.all(
          [
            transaction.get(userRef),
            transaction.get(habitRegisterRef),
            transaction.get(todayStatsRef),
            transaction.get(yesterdayStatsRef),
          ]
        );

        // Si el hábito ya está marcado como completado, salir
        if (habitRegisterSnap.exists() && Boolean(habitRegisterSnap.data().completado)) {
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

        const currentCompletedHabitsToday = Number(dashboard.habitos_completados_hoy ?? 0);

        // Registrar el hábito como completado
        transaction.set(
          habitRegisterRef,
          {
            completado: true,
            completado_en: serverTimestamp(),
          },
          { merge: true }
        );

        // Actualizar estadísticas del día
        transaction.set(
          todayStatsRef,
          {
            fecha: dateId,
            habitos_completados: todayHabits + 1,
            tareas_completadas: todayTasks,
            racha_actual: nextRacha,
            racha_maxima: nextRachaMax,
          },
          { merge: true }
        );

        // Actualizar dashboard del usuario
        transaction.set(
          userRef,
          {
            dashboard: {
              ...dashboard,
              habitos_completados_hoy: currentCompletedHabitsToday + 1,
              racha_actual: nextRacha,
              ultima_actualizacion: serverTimestamp(),
            },
          },
          { merge: true }
        );
      });

      await syncAchievementsForUser(currentUser.id, 'habitCompleted');
      await playSuccessSound();

      setSelectedHabit(null);
      setHabits((prev) =>
        prev.map((h) => (h.id === habitId ? { ...h, completado: true } : h))
      );
    } catch (error) {
      console.error('Error al completar hábito:', error);
      Alert.alert('Error', 'No se pudo completar el hábito.');
    } finally {
      setIsCompleting(false);
    }
  }

  function navigateToCreateHabit() {
    (navigation as any).navigate('crear-habito');
  }

  function navigateToCreateTask() {
    (navigation as any).navigate('crear-tarea');
  }

  function navigateToEditHabit(habit: HabitItem) {
    const habitFromList = habits.find((h) => h.id === habit.id);
    if (habitFromList) {
      (navigation as any).navigate('crear-habito', {
        habitId: habit.id,
        initialData: habitFromList,
      });
    }
    setHabitOptionsId(null);
  }

  async function handleDeactivateHabit(habitId: string) {
    Alert.alert('Desactivar hábito', '¿Desactivar este hábito?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Desactivar',
        onPress: async () => {
          try {
            if (currentUser?.id) {
              await deactivateHabit(currentUser.id, habitId);
              setHabits((prev) => prev.filter((h) => h.id !== habitId));
              setHabitOptionsId(null);
              Alert.alert('Éxito', 'Hábito desactivado.');
            }
          } catch (error) {
            console.error('Error desactivando hábito:', error);
            Alert.alert('Error', 'No se pudo desactivar el hábito.');
          }
        },
        style: 'destructive',
      },
    ]);
  }

  async function handleReactivateHabit(habitId: string) {
    try {
      if (currentUser?.id) {
        await reactivateHabit(currentUser.id, habitId);
        // Recargar hábitos
        const updated = await getHabitsByDate(currentUser.id, dateId);
        setHabits(updated);
        setHabitOptionsId(null);
        Alert.alert('Éxito', 'Hábito reactivado.');
      }
    } catch (error) {
      console.error('Error reactivando hábito:', error);
      Alert.alert('Error', 'No se pudo reactivar el hábito.');
    }
  }

  async function handleDeleteHabit(habitId: string) {
    Alert.alert('Eliminar hábito', '¿Eliminar este hábito permanentemente?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        onPress: async () => {
          try {
            if (currentUser?.id) {
              await deleteHabit(currentUser.id, habitId);
              setHabits((prev) => prev.filter((h) => h.id !== habitId));
              setHabitOptionsId(null);
              Alert.alert('Éxito', 'Hábito eliminado.');
            }
          } catch (error) {
            console.error('Error eliminando hábito:', error);
            Alert.alert('Error', 'No se pudo eliminar el hábito.');
          }
        },
        style: 'destructive',
      },
    ]);
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.headerSide} />
        <AppText style={[styles.headerTitle, { color: colors.text }]}>Mi Día</AppText>
        <View style={styles.headerSide} />
      </View>

      <View style={[styles.tabsContainer, { borderBottomColor: colors.border }]}>
        <Pressable
          onPress={() => setActiveTab('tareas')}
          style={[
            styles.tab,
            activeTab === 'tareas' && { borderBottomColor: colors.primary, borderBottomWidth: 3 },
          ]}
        >
          <AppText style={[
              styles.tabText,
              { color: activeTab === 'tareas' ? colors.primary : colors.mutedText }
            ]}>
            Tareas {tasks.length > 0 && `(${tasks.length})`}
          </AppText>
        </Pressable>
        <Pressable
          onPress={() => setActiveTab('habitos')}
          style={[
            styles.tab,
            activeTab === 'habitos' && { borderBottomColor: colors.primary, borderBottomWidth: 3 },
          ]}
        >
          <AppText style={[
              styles.tabText, 
              { color: activeTab === 'habitos' ? colors.primary : colors.mutedText }
            ]}>
            Hábitos {habits.filter(h => !h.completado).length > 0 && `(${habits.filter(h => !h.completado).length})`}
          </AppText>
        </Pressable>
      </View>

      <View style={styles.daysContainer}>
        {days.map((day) => (
          <Pressable
            key={day.label}
            onPress={() => setSelectedDay(day.label)}
            style={[
              styles.dayButton,
              { backgroundColor: colors.elevated },
              selectedDay === day.label && { backgroundColor: colors.primary },
            ]}
          >
            <AppText
              style={[
                styles.dayButtonText,
                selectedDay === day.label && { color: colors.onPrimary, fontWeight: '700' },
                { color: selectedDay === day.label ? colors.onPrimary : colors.mutedText },
              ]}
            >
              {day.label}
            </AppText>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {emptyLabel ? (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <AppText style={[styles.emptyText, { color: colors.mutedText }]}>{emptyLabel}</AppText>
          </View>
        ) : activeTab === 'tareas' ? (
          tasks.map((task) => (
            <View
              key={task.id}
              style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.cardContent}>
                <View style={[styles.iconContainer, { backgroundColor: colors.elevated }]}>
                  <Ionicons name="checkmark-circle-outline" size={24} color={colors.primary} />
                </View>
                <View style={styles.cardInfo}>
                  <AppText style={[styles.cardTitle, { color: colors.text }]}>{task.titulo}</AppText>
                  <AppText style={[styles.cardMeta, { color: colors.mutedText }]}>
                    {formatDateTime(task.fechaVencimiento)}
                  </AppText>
                </View>
              </View>
              <Pressable
                style={[styles.actionButton, { backgroundColor: colors.primary }]}
                onPress={() => setSelectedTask(task)}
              >
                <AppText style={[styles.actionButtonText, { color: colors.onPrimary }]}>Ver</AppText>
              </Pressable>
            </View>
          ))
        ) : (
          habits.map((habit) => (
            <Pressable
              key={habit.id}
              onLongPress={() => setHabitOptionsId(habit.id)}
              style={[
                styles.card,
                { backgroundColor: colors.surface, borderColor: colors.border },
                habit.completado && { opacity: 0.6 },
              ]}
            >
              <View style={styles.cardContent}>
                <View style={[styles.iconContainer, { backgroundColor: colors.elevated }]}>
                  <Ionicons
                    name={habit.completado ? 'checkmark-circle' : 'checkmark-circle-outline'}
                    size={24}
                    color={habit.completado ? colors.accent : colors.primary}
                  />
                </View>
                <View style={styles.cardInfo}>
                  <AppText style={[styles.cardTitle, { color: colors.text, textDecorationLine: habit.completado ? 'line-through' : 'none' }]}>
                    {habit.titulo}
                  </AppText>
                  <AppText style={[styles.cardMeta, { color: colors.mutedText }]}>
                    {getDayNamesFromIndices(habit.diasSemana)}
                  </AppText>
                </View>
              </View>
              {!habit.completado && (
                <Pressable
                  style={[styles.actionButton, { backgroundColor: colors.primary }]}
                  onPress={() => setSelectedHabit(habit)}
                >
                  <AppText style={[styles.actionButtonText, { color: colors.onPrimary }]}>Completar</AppText>
                </Pressable>
              )}
            </Pressable>
          ))
        )}
      </ScrollView>

      {/* Floating Action Button centrado inferior */}
      <Pressable
        style={[
          styles.fabCenter,
          { backgroundColor: colors.primary },
        ]}
        onPress={() => (activeTab === 'tareas' ? navigateToCreateTask() : navigateToCreateHabit())}
      >
        <Ionicons name="add" size={40} color={colors.onPrimary} />
      </Pressable>

      {/* Modal para tareas */}
      <Modal visible={Boolean(selectedTask)} transparent animationType="fade" onRequestClose={() => setSelectedTask(null)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <AppText style={[styles.modalTitle, { color: colors.text }]}>{selectedTask?.titulo ?? ''}</AppText>
            <AppText style={[styles.modalLabel, { color: colors.mutedText }]}>Descripción</AppText>
            <AppText style={[styles.modalText, { color: colors.text }]}>
              {selectedTask?.descripcion || 'Sin descripción'}
            </AppText>
            <AppText style={[styles.modalLabel, { color: colors.mutedText }]}>Fecha y hora</AppText>
            <AppText style={[styles.modalText, { color: colors.text }]}>
              {formatDateTime(selectedTask?.fechaVencimiento ?? null)}
            </AppText>

            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalButton, { borderColor: colors.border }]}
                onPress={() => setSelectedTask(null)}
              >
                <AppText style={[styles.modalButtonText, { color: colors.text }]}>Cerrar</AppText>
              </Pressable>
              <Pressable
                style={[styles.modalButton, { backgroundColor: colors.primary }]}
                onPress={() => selectedTask && completeTask(selectedTask)}
                disabled={isCompleting}
              >
                <AppText style={[styles.modalButtonText, { color: colors.onPrimary }]}>
                  {isCompleting ? 'Completando...' : 'Completar tarea'}
                </AppText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal para hábitos */}
      <Modal visible={Boolean(selectedHabit)} transparent animationType="fade" onRequestClose={() => setSelectedHabit(null)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <AppText style={[styles.modalTitle, { color: colors.text }]}>{selectedHabit?.titulo ?? ''}</AppText>
            <AppText style={[styles.modalLabel, { color: colors.mutedText }]}>Descripción</AppText>
            <AppText style={[styles.modalText, { color: colors.text }]}>
              {selectedHabit?.descripcion || 'Sin descripción'}
            </AppText>
            <AppText style={[styles.modalLabel, { color: colors.mutedText }]}>Días</AppText>
            <AppText style={[styles.modalText, { color: colors.text }]}>
              {selectedHabit?.diasSemana ? getDayNamesFromIndices(selectedHabit.diasSemana) : 'N/A'}
            </AppText>
            <AppText style={[styles.modalLabel, { color: colors.mutedText }]}>Categoría</AppText>
            <AppText style={[styles.modalText, { color: colors.text }]}>
              {selectedHabit?.categoria || 'General'}
            </AppText>

            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalButton, { borderColor: colors.border }]}
                onPress={() => setSelectedHabit(null)}
              >
                <AppText style={[styles.modalButtonText, { color: colors.text }]}>Cerrar</AppText>
              </Pressable>
              <Pressable
                style={[styles.modalButton, { backgroundColor: colors.primary }]}
                onPress={() => selectedHabit && completeHabit(selectedHabit.id)}
                disabled={isCompleting}
              >
                <AppText style={[styles.modalButtonText, { color: colors.onPrimary }]}>
                  {isCompleting ? 'Completando...' : 'Marcar completado'}
                </AppText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal para opciones de hábito */}
      <Modal
        visible={Boolean(habitOptionsId)}
        transparent
        animationType="fade"
        onRequestClose={() => setHabitOptionsId(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setHabitOptionsId(null)}>
          <View style={[styles.optionsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Pressable
              style={[styles.optionButton, { borderBottomColor: colors.border, borderBottomWidth: 1 }]}
              onPress={() => {
                const habit = habits.find((h) => h.id === habitOptionsId);
                if (habit) navigateToEditHabit(habit);
              }}
            >
              <Ionicons name="pencil" size={18} color={colors.primary} />
              <AppText style={[styles.optionText, { color: colors.text }]}>Editar</AppText>
            </Pressable>
            <Pressable
              style={[styles.optionButton, { borderBottomColor: colors.border, borderBottomWidth: 1 }]}
              onPress={() => {
                if (habitOptionsId) handleDeactivateHabit(habitOptionsId);
              }}
            >
              <Ionicons name="pause-circle" size={18} color="#f59e0b" />
              <AppText style={[styles.optionText, { color: '#f59e0b' }]}>Desactivar</AppText>
            </Pressable>
            <Pressable
              style={[styles.optionButton]}
              onPress={() => {
                if (habitOptionsId) handleDeleteHabit(habitOptionsId);
              }}
            >
              <Ionicons name="trash" size={18} color="#ef4444" />
              <AppText style={[styles.optionText, { color: '#ef4444' }]}>Eliminar</AppText>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    paddingTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerSide: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingHorizontal: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 0,
  },
  fab: {
    position: 'absolute',
    alignSelf: 'center',
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  fabCenter: {
    position: 'absolute',
    top: '92%',
    left: '50%',
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    transform: [{ translateX: -36 }, { translateY: -36 }],
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
  },
  daysContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    justifyContent: 'space-between',
    gap: 8,
  },
  dayButton: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  dayButtonText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 22,
    gap: 10,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 10,
  },
  cardContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  cardMeta: {
    fontSize: 11,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 13,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 8,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
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
    padding: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  modalLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 3,
  },
  modalText: {
    fontSize: 13,
    lineHeight: 18,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
    gap: 8,
  },
  modalButton: {
    minHeight: 36,
    borderRadius: 8,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  modalButtonText: {
    fontSize: 12,
    fontWeight: '700',
  },
  optionsCard: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
    minWidth: 150,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  optionText: {
    fontSize: 13,
    fontWeight: '500',
  },
});