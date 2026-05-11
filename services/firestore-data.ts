import {
  addDoc,
  collection,
  doc,
  documentId,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';

import { db } from '@/services/firebase';

export type DashboardData = {
  totalHabitosActivos: number;
  totalTareasPendientes: number;
  habitosCompletadosHoy: number;
  tareasCompletadasHoy: number;
  rachaActual: number;
};

export type WeeklyStat = {
  dateId: string;
  dayLabel: string;
  habitosCompletados: number;
  tareasCompletadas: number;
};

export type HabitItem = {
  id: string;
  titulo: string;
  descripcion: string;
  categoria: string;
  prioridad: number;
  diasSemana: number[];
  completado: boolean;
  activo: boolean;
};

export type HabitFirestore = {
  id_categoria: any;
  categoria_nombre: string;
  titulo: string;
  descripcion: string;
  prioridad: number;
  dias_semana: number[];
  activo: boolean;
  creado_en: any;
  actualizado_en?: any;
};

function toDateId(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseDateId(dateId: string) {
  const [year, month, day] = dateId.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function getDayLabelFromDateId(dateId: string) {
  const parsed = parseDateId(dateId);
  if (!parsed) return dateId;

  return parsed.toLocaleDateString('es-ES', { weekday: 'short' });
}

export function buildDateId(offsetDays = 0) {
  const base = new Date();
  base.setDate(base.getDate() + offsetDays);
  return toDateId(base);
}

/**
 * Obtiene el día de la semana desde un dateId (0=domingo, 6=sábado)
 */
function getDayOfWeekFromDateId(dateId: string): number | null {
  const parsed = parseDateId(dateId);
  if (!parsed) return null;
  return parsed.getDay();
}

/**
 * Verifica si un hábito debe mostrarse para una fecha específica
 */
function shouldHabitBeDisplayed(diasSemana: number[], dateId: string): boolean {
  const dayOfWeek = getDayOfWeekFromDateId(dateId);
  if (dayOfWeek === null) return false;
  return diasSemana.includes(dayOfWeek);
}

export async function getUserDashboard(uid: string): Promise<DashboardData> {
  const snapshot = await getDoc(doc(db, 'usuarios', uid));
  if (!snapshot.exists()) {
    return {
      totalHabitosActivos: 0,
      totalTareasPendientes: 0,
      habitosCompletadosHoy: 0,
      tareasCompletadasHoy: 0,
      rachaActual: 0,
    };
  }

  const dashboard = snapshot.data().dashboard ?? {};

  return {
    totalHabitosActivos: Number(dashboard.total_habitos_activos ?? 0),
    totalTareasPendientes: Number(dashboard.total_tareas_pendientes ?? 0),
    habitosCompletadosHoy: Number(dashboard.habitos_completados_hoy ?? 0),
    tareasCompletadasHoy: Number(dashboard.tareas_completadas_hoy ?? 0),
    rachaActual: Number(dashboard.racha_actual ?? 0),
  };
}

export async function getWeeklyHabitStats(uid: string, days = 7): Promise<WeeklyStat[]> {
  const statsRef = collection(db, 'usuarios', uid, 'estadisticas');
  const statsQuery = query(statsRef, orderBy(documentId(), 'desc'), limit(days));
  const snapshots = await getDocs(statsQuery);

  return snapshots.docs
    .map((item) => {
      const data = item.data();
      return {
        dateId: item.id,
        dayLabel: getDayLabelFromDateId(item.id),
        habitosCompletados: Number(data.habitos_completados ?? 0),
        tareasCompletadas: Number(data.tareas_completadas ?? 0),
      };
    })
    .reverse();
}

export async function getHabitsByDate(uid: string, dateId: string): Promise<HabitItem[]> {
  const habitsRef = collection(db, 'usuarios', uid, 'habitos');
  const habitsQuery = query(habitsRef, where('activo', '==', true));
  const habitsSnapshots = await getDocs(habitsQuery);

  const items = await Promise.all(
    habitsSnapshots.docs.map(async (habitDoc) => {
      const habitData = habitDoc.data() as HabitFirestore;
      const diasSemana = Array.isArray(habitData.dias_semana) ? habitData.dias_semana : [];

      // Solo incluir si el hábito aplica a este día de la semana
      if (!shouldHabitBeDisplayed(diasSemana, dateId)) {
        return null;
      }

      const registerRef = doc(db, 'usuarios', uid, 'habitos', habitDoc.id, 'registros', dateId);
      const registerSnap = await getDoc(registerRef);
      const registerData = registerSnap.exists() ? registerSnap.data() : null;

      return {
        id: habitDoc.id,
        titulo: String(habitData.titulo ?? 'Sin título'),
        descripcion: String(habitData.descripcion ?? ''),
        categoria: String(habitData.categoria_nombre ?? 'General'),
        prioridad: Number(habitData.prioridad ?? 3),
        diasSemana,
        completado: Boolean(registerData?.completado ?? false),
        activo: Boolean(habitData.activo ?? true),
      };
    })
  );

  const filtered = items.filter((item): item is HabitItem => item !== null);
  filtered.sort((a, b) => a.titulo.localeCompare(b.titulo, 'es-ES'));

  return filtered;
}

export async function getCompletedHabitsByDate(uid: string, dateId: string): Promise<HabitItem[]> {
  const habits = await getHabitsByDate(uid, dateId);
  return habits.filter((habit) => habit.completado);
}

export async function getStatsByDate(uid: string, dateId: string) {
  const snapshot = await getDoc(doc(db, 'usuarios', uid, 'estadisticas', dateId));
  return snapshot.exists() ? snapshot.data() : null;
}

export async function getHabitById(uid: string, habitId: string) {
  const snapshot = await getDoc(doc(db, 'usuarios', uid, 'habitos', habitId));
  return snapshot.exists() ? snapshot.data() : null;
}

export async function getUserLogros(uid: string) {
  const logrosRef = collection(db, 'usuarios', uid, 'logros');
  const snapshots = await getDocs(query(logrosRef, orderBy(documentId(), 'asc')));
  return snapshots.docs.map((item) => ({ id: item.id, ...item.data() }));
}

/**
 * Crear un nuevo hábito
 */
export async function createHabit(
  uid: string,
  titulo: string,
  descripcion: string,
  categoryId: string,
  categoryName: string,
  prioridad: number,
  diasSemana: number[]
) {
  const habitsRef = collection(db, 'usuarios', uid, 'habitos');

  const habitPayload: HabitFirestore = {
    id_categoria: doc(db, 'usuarios', uid, 'categorias', categoryId),
    categoria_nombre: categoryName,
    titulo: titulo.trim(),
    descripcion: descripcion.trim(),
    prioridad: Math.max(1, Math.min(5, prioridad)),
    dias_semana: diasSemana,
    activo: true,
    creado_en: serverTimestamp(),
  };

  const docRef = await addDoc(habitsRef, habitPayload);

  // Actualizar dashboard del usuario
  await runTransaction(db, async (transaction) => {
    const userRef = doc(db, 'usuarios', uid);
    const userSnap = await transaction.get(userRef);

    const userData = userSnap.exists() ? userSnap.data() : {};
    const dashboard = (userData.dashboard as Record<string, unknown> | undefined) ?? {};
    const currentActive = Number(dashboard.total_habitos_activos ?? 0);

    transaction.set(
      userRef,
      {
        dashboard: {
          ...dashboard,
          total_habitos_activos: currentActive + 1,
          ultima_actualizacion: serverTimestamp(),
        },
      },
      { merge: true }
    );
  });

  return docRef.id;
}

/**
 * Actualizar un hábito existente
 */
export async function updateHabit(
  uid: string,
  habitId: string,
  updates: Partial<{
    titulo: string;
    descripcion: string;
    categoryId: string;
    categoryName: string;
    prioridad: number;
    diasSemana: number[];
  }>
) {
  const habitRef = doc(db, 'usuarios', uid, 'habitos', habitId);
  const updatePayload: Record<string, any> = {
    actualizado_en: serverTimestamp(),
  };

  if (updates.titulo !== undefined) updatePayload.titulo = updates.titulo.trim();
  if (updates.descripcion !== undefined) updatePayload.descripcion = updates.descripcion.trim();
  if (updates.categoryId !== undefined) {
    updatePayload.id_categoria = doc(db, 'usuarios', uid, 'categorias', updates.categoryId);
  }
  if (updates.categoryName !== undefined) updatePayload.categoria_nombre = updates.categoryName;
  if (updates.prioridad !== undefined) {
    updatePayload.prioridad = Math.max(1, Math.min(5, updates.prioridad));
  }
  if (updates.diasSemana !== undefined) updatePayload.dias_semana = updates.diasSemana;

  await updateDoc(habitRef, updatePayload);
}

/**
 * Desactivar un hábito (soft delete)
 */
export async function deactivateHabit(uid: string, habitId: string) {
  await runTransaction(db, async (transaction) => {
    const userRef = doc(db, 'usuarios', uid);
    const habitRef = doc(db, 'usuarios', uid, 'habitos', habitId);

    const [userSnap, habitSnap] = await Promise.all([
      transaction.get(userRef),
      transaction.get(habitRef),
    ]);

    if (!habitSnap.exists()) return;

    const userData = userSnap.exists() ? userSnap.data() : {};
    const dashboard = (userData.dashboard as Record<string, unknown> | undefined) ?? {};
    const currentActive = Number(dashboard.total_habitos_activos ?? 0);

    // Desactivar hábito
    transaction.update(habitRef, {
      activo: false,
      actualizado_en: serverTimestamp(),
    });

    // Decrementar contador
    transaction.set(
      userRef,
      {
        dashboard: {
          ...dashboard,
          total_habitos_activos: Math.max(0, currentActive - 1),
          ultima_actualizacion: serverTimestamp(),
        },
      },
      { merge: true }
    );
  });
}

/**
 * Reactivar un hábito desactivado
 */
export async function reactivateHabit(uid: string, habitId: string) {
  await runTransaction(db, async (transaction) => {
    const userRef = doc(db, 'usuarios', uid);
    const habitRef = doc(db, 'usuarios', uid, 'habitos', habitId);

    const [userSnap, habitSnap] = await Promise.all([
      transaction.get(userRef),
      transaction.get(habitRef),
    ]);

    if (!habitSnap.exists()) return;

    const userData = userSnap.exists() ? userSnap.data() : {};
    const dashboard = (userData.dashboard as Record<string, unknown> | undefined) ?? {};
    const currentActive = Number(dashboard.total_habitos_activos ?? 0);

    // Reactivar hábito
    transaction.update(habitRef, {
      activo: true,
      actualizado_en: serverTimestamp(),
    });

    // Incrementar contador
    transaction.set(
      userRef,
      {
        dashboard: {
          ...dashboard,
          total_habitos_activos: currentActive + 1,
          ultima_actualizacion: serverTimestamp(),
        },
      },
      { merge: true }
    );
  });
}

/**
 * Eliminar un hábito completamente (hard delete)
 */
export async function deleteHabit(uid: string, habitId: string) {
  await runTransaction(db, async (transaction) => {
    const userRef = doc(db, 'usuarios', uid);
    const habitRef = doc(db, 'usuarios', uid, 'habitos', habitId);

    const [userSnap, habitSnap] = await Promise.all([
      transaction.get(userRef),
      transaction.get(habitRef),
    ]);

    if (!habitSnap.exists()) return;

    const habitData = habitSnap.data() as HabitFirestore;
    const isActive = Boolean(habitData.activo ?? true);

    const userData = userSnap.exists() ? userSnap.data() : {};
    const dashboard = (userData.dashboard as Record<string, unknown> | undefined) ?? {};
    const currentActive = Number(dashboard.total_habitos_activos ?? 0);

    // Eliminar hábito
    transaction.delete(habitRef);

    // Decrementar solo si estaba activo
    if (isActive) {
      transaction.set(
        userRef,
        {
          dashboard: {
            ...dashboard,
            total_habitos_activos: Math.max(0, currentActive - 1),
            ultima_actualizacion: serverTimestamp(),
          },
        },
        { merge: true }
      );
    }
  });
}

export async function completeHabit(uid: string, habitId: string, dateId: string) {
  await runTransaction(db, async (transaction) => {
    const yesterdayId = buildDateId(-1);

    const userRef = doc(db, 'usuarios', uid);
    const habitRegisterRef = doc(db, 'usuarios', uid, 'habitos', habitId, 'registros', dateId);
    const todayStatsRef = doc(db, 'usuarios', uid, 'estadisticas', dateId);
    const yesterdayStatsRef = doc(db, 'usuarios', uid, 'estadisticas', yesterdayId);

    const [userSnap, habitRegisterSnap, todayStatsSnap, yesterdayStatsSnap] = await Promise.all([
      transaction.get(userRef),
      transaction.get(habitRegisterRef),
      transaction.get(todayStatsRef),
      transaction.get(yesterdayStatsRef),
    ]);

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

    console.log('✅ Hábito completado en Firestore:', { uid, habitId, dateId });
  });
}
