import { collection, doc, documentId, getDoc, getDocs, orderBy, query, serverTimestamp, setDoc } from 'firebase/firestore';

import { db } from '@/services/firebase';
import { notifyAchievementUnlocked } from '@/services/notifications';
import { playAchievementSound } from '@/services/sounds';

export type Achievement = {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  unlockedAt?: unknown;
};

type DashboardMetrics = {
  totalHabitosActivos: number;
  totalTareasPendientes: number;
  habitosCompletadosHoy: number;
  tareasCompletadasHoy: number;
  rachaActual: number;
};

type AchievementSignal = 'habitCreated' | 'taskCreated' | 'habitCompleted' | 'taskCompleted' | 'sync';

type AchievementDefinition = {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  isUnlocked: (metrics: DashboardMetrics, signal: AchievementSignal) => boolean;
};

const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  {
    id: 'primer_habito_creado',
    title: 'Primer hábito',
    description: 'Creaste tu primer hábito activo.',
    icon: 'sparkles',
    category: 'creacion',
    isUnlocked: (metrics, signal) => signal === 'habitCreated' || metrics.totalHabitosActivos >= 1,
  },
  {
    id: 'primer_tarea_creada',
    title: 'Primera tarea',
    description: 'Añadiste tu primera tarea pendiente.',
    icon: 'clipboard',
    category: 'creacion',
    isUnlocked: (metrics, signal) => signal === 'taskCreated' || metrics.totalTareasPendientes >= 1,
  },
  {
    id: 'primer_habito_completado',
    title: 'Primer hábito completado',
    description: 'Terminaste tu primer hábito del día.',
    icon: 'checkmark-circle',
    category: 'progreso',
    isUnlocked: (metrics, signal) => signal === 'habitCompleted' || metrics.habitosCompletadosHoy >= 1,
  },
  {
    id: 'primer_tarea_completada',
    title: 'Primera tarea completada',
    description: 'Finalizaste tu primera tarea.',
    icon: 'checkmark-done-circle',
    category: 'progreso',
    isUnlocked: (metrics, signal) => signal === 'taskCompleted' || metrics.tareasCompletadasHoy >= 1,
  },
  {
    id: 'racha_3',
    title: 'Racha de 3 días',
    description: 'Mantienes una racha de 3 días seguidos.',
    icon: 'flame',
    category: 'racha',
    isUnlocked: (metrics) => metrics.rachaActual >= 3,
  },
  {
    id: 'racha_7',
    title: 'Racha de 7 días',
    description: 'Tu constancia ya suma una semana.',
    icon: 'trophy',
    category: 'racha',
    isUnlocked: (metrics) => metrics.rachaActual >= 7,
  },
  {
    id: 'rutina_solida',
    title: 'Rutina sólida',
    description: 'Tienes 5 hábitos activos en marcha.',
    icon: 'barbell',
    category: 'rutina',
    isUnlocked: (metrics) => metrics.totalHabitosActivos >= 5,
  },
];

function normalizeDashboard(data: Record<string, unknown>): DashboardMetrics {
  return {
    totalHabitosActivos: Number(data.total_habitos_activos ?? 0),
    totalTareasPendientes: Number(data.total_tareas_pendientes ?? 0),
    habitosCompletadosHoy: Number(data.habitos_completados_hoy ?? 0),
    tareasCompletadasHoy: Number(data.tareas_completadas_hoy ?? data.tareas_completados_hoy ?? 0),
    rachaActual: Number(data.racha_actual ?? 0),
  };
}

async function unlockAchievement(uid: string, definition: AchievementDefinition) {
  const achievementRef = doc(db, 'usuarios', uid, 'logros', definition.id);
  const snapshot = await getDoc(achievementRef);

  if (snapshot.exists()) {
    return false;
  }

  await setDoc(
    achievementRef,
    {
      titulo: definition.title,
      descripcion: definition.description,
      icono: definition.icon,
      categoria: definition.category,
      desbloqueado_en: serverTimestamp(),
    },
    { merge: true }
  );

  await playAchievementSound();
  await notifyAchievementUnlocked(definition.title, definition.description);
  return true;
}

export async function syncAchievementsForUser(uid: string, signal: AchievementSignal = 'sync') {
  const userSnapshot = await getDoc(doc(db, 'usuarios', uid));
  const dashboardData = userSnapshot.exists() ? (userSnapshot.data().dashboard ?? {}) : {};
  const metrics = normalizeDashboard(dashboardData);

  const unlocked: AchievementDefinition[] = [];
  for (const definition of ACHIEVEMENT_DEFINITIONS) {
    if (!definition.isUnlocked(metrics, signal)) {
      continue;
    }

    const unlockedNow = await unlockAchievement(uid, definition);
    if (unlockedNow) {
      unlocked.push(definition);
    }
  }

  return unlocked;
}

export async function getUnlockedAchievements(uid: string): Promise<Achievement[]> {
  const achievementsRef = collection(db, 'usuarios', uid, 'logros');
  const snapshots = await getDocs(query(achievementsRef, orderBy(documentId(), 'asc')));

  return snapshots.docs.map((item) => ({
    id: item.id,
    ...item.data(),
  })) as Achievement[];
}

export function getAchievementCatalog() {
  return ACHIEVEMENT_DEFINITIONS.map((item) => ({
    id: item.id,
    title: item.title,
    description: item.description,
    icon: item.icon,
    category: item.category,
  }));
}
