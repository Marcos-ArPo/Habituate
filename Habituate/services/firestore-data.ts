import {
  collection,
  doc,
  documentId,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
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
};

export type HabitItem = {
  id: string;
  nombre: string;
  descripcion: string;
  horaRecordatorio: string;
  icono: string;
  completado: boolean;
  calificacion: number | null;
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
      const habitData = habitDoc.data();
      const registerRef = doc(db, 'usuarios', uid, 'habitos', habitDoc.id, 'registros', dateId);
      const registerSnap = await getDoc(registerRef);
      const registerData = registerSnap.exists() ? registerSnap.data() : null;

      return {
        id: habitDoc.id,
        nombre: String(habitData.nombre ?? 'Sin nombre'),
        descripcion: String(habitData.descripcion ?? ''),
        horaRecordatorio: String(habitData.hora_recordatorio ?? ''),
        icono: String(habitData.icono ?? ''),
        completado: Boolean(registerData?.completado ?? false),
        calificacion:
          typeof registerData?.calificacion === 'number' ? Number(registerData.calificacion) : null,
      };
    })
  );

  items.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es-ES'));

  return items;
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
