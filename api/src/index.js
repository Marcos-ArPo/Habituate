import cors from 'cors';
import 'dotenv/config';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import morgan from 'morgan';
import { z } from 'zod';

import { adminAuth, db, DocumentId, FieldValue, Timestamp } from './firebase-admin.js';

const PORT = Number(process.env.PORT || 3000);
const corsOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const app = express();

app.use(helmet());
app.use(express.json({ limit: '1mb' }));
app.use(
  cors({
    origin: corsOrigins.length > 0 ? corsOrigins : true,
    credentials: true,
  })
);
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    limit: 120,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

const userUpdateSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    email: z.string().trim().email().optional(),
    preferencePhone: z.string().trim().max(32).optional(),
    urgencyPhone: z.string().trim().max(32).optional(),
  })
  .strict();

const settingsUpdateSchema = z
  .object({
    darkMode: z.boolean().optional(),
    fontScale: z.number().min(0.75).max(2).optional(),
  })
  .strict();

const habitCreateSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().max(2000).default(''),
    categoryId: z.string().trim().min(1).max(120),
    categoryName: z.string().trim().min(1).max(120),
    priority: z.number().int().min(1).max(5).default(3),
    daysWeek: z.array(z.number().int().min(0).max(6)).min(1),
  })
  .strict();

const habitUpdateSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(2000).optional(),
    categoryId: z.string().trim().min(1).max(120).optional(),
    categoryName: z.string().trim().min(1).max(120).optional(),
    priority: z.number().int().min(1).max(5).optional(),
    daysWeek: z.array(z.number().int().min(0).max(6)).min(1).optional(),
  })
  .strict();

const taskCreateSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().max(2000).default(''),
    categoryId: z.string().trim().min(1).max(120),
    categoryName: z.string().trim().min(1).max(120),
    priority: z.number().int().min(1).max(5).default(3),
    dueDate: z.string().min(10),
  })
  .strict();

const taskUpdateSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(2000).optional(),
    categoryId: z.string().trim().min(1).max(120).optional(),
    categoryName: z.string().trim().min(1).max(120).optional(),
    priority: z.number().int().min(1).max(5).optional(),
    dueDate: z.string().min(10).optional(),
  })
  .strict();

function toDateId(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDateId(dateId) {
  const [year, month, day] = String(dateId).split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function getYesterdayDateId(dateId) {
  const parsed = parseDateId(dateId);
  if (!parsed) return toDateId(new Date(Date.now() - 24 * 60 * 60 * 1000));
  parsed.setDate(parsed.getDate() - 1);
  return toDateId(parsed);
}

function normalizeTimestamp(value) {
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  return null;
}

function getDayLabelFromDateId(dateId) {
  const parsed = parseDateId(dateId);
  if (!parsed) return dateId;
  return parsed.toLocaleDateString('es-ES', { weekday: 'short' });
}

function buildDefaultDashboard() {
  return {
    total_habitos_activos: 0,
    total_tareas_pendientes: 0,
    habitos_completados_hoy: 0,
    tareas_completadas_hoy: 0,
    tareas_completados_hoy: 0,
    racha_actual: 0,
    ultima_actualizacion: FieldValue.serverTimestamp(),
  };
}

function buildDefaultConfig() {
  return {
    config_modo_oscuro: false,
    config_tamano_fuente: 1,
    token_fcm: '',
  };
}

function getUserRef(uid) {
  return db.collection('usuarios').doc(uid);
}

function getHabitsRef(uid) {
  return getUserRef(uid).collection('habitos');
}

function getTasksRef(uid) {
  return getUserRef(uid).collection('tareas');
}

function getStatsRef(uid) {
  return getUserRef(uid).collection('estadisticas');
}

function getAchievementsRef(uid) {
  return getUserRef(uid).collection('logros');
}

function mapUserSnapshot(uid, data, fallbackEmail = '', fallbackName = '') {
  return {
    id: uid,
    name: String(data.nombre ?? data.name ?? fallbackName ?? ''),
    email: String(data.email ?? fallbackEmail ?? ''),
    preferencePhone: String(data.telefono_preferencia ?? data.preferencePhone ?? ''),
    urgencyPhone: String(data.telefono_urgencia ?? data.urgencyPhone ?? ''),
  };
}

function mapUserDocument(snapshot, authUser) {
  const data = snapshot.exists ? snapshot.data() : {};
  return {
    profile: mapUserSnapshot(snapshot.id, data, authUser.email || '', authUser.name || ''),
    settings: {
      darkMode: Boolean(data.config_modo_oscuro ?? false),
      fontScale: Number(data.config_tamano_fuente ?? 1),
    },
    dashboard: {
      totalHabitosActivos: Number(data.dashboard?.total_habitos_activos ?? 0),
      totalTareasPendientes: Number(data.dashboard?.total_tareas_pendientes ?? 0),
      habitosCompletadosHoy: Number(data.dashboard?.habitos_completados_hoy ?? 0),
      tareasCompletadasHoy: Number(
        data.dashboard?.tareas_completadas_hoy ?? data.dashboard?.tareas_completados_hoy ?? 0
      ),
      rachaActual: Number(data.dashboard?.racha_actual ?? 0),
      updatedAt: normalizeTimestamp(data.dashboard?.ultima_actualizacion),
    },
    createdAt: normalizeTimestamp(data.fecha_registro),
    avatarUrl: String(data.avatar_url ?? ''),
  };
}

function serializeHabit(doc) {
  const data = doc.data();
  return {
    id: doc.id,
    categoryId: data.id_categoria?.id ?? data.id_categoria ?? null,
    categoryName: String(data.categoria_nombre ?? 'General'),
    title: String(data.titulo ?? ''),
    description: String(data.descripcion ?? ''),
    priority: Number(data.prioridad ?? 3),
    daysWeek: Array.isArray(data.dias_semana) ? data.dias_semana : [],
    active: Boolean(data.activo ?? true),
    createdAt: normalizeTimestamp(data.creado_en),
    updatedAt: normalizeTimestamp(data.actualizado_en),
  };
}

function serializeTask(doc) {
  const data = doc.data();
  return {
    id: doc.id,
    categoryId: data.id_categoria?.id ?? data.id_categoria ?? null,
    categoryName: String(data.categoria_nombre ?? 'General'),
    title: String(data.titulo ?? ''),
    description: String(data.descripcion ?? ''),
    dueDate: normalizeTimestamp(data.fecha_vencimiento),
    completed: Boolean(data.completada ?? false),
    priority: Number(data.prioridad ?? 3),
    createdAt: normalizeTimestamp(data.creado_en),
    updatedAt: normalizeTimestamp(data.actualizado_en),
    completedAt: normalizeTimestamp(data.completada_en),
  };
}

function getDayOfWeekFromDateId(dateId) {
  const parsed = parseDateId(dateId);
  if (!parsed) return null;
  return parsed.getDay();
}

function shouldHabitBeDisplayed(daysWeek, dateId) {
  const dayOfWeek = getDayOfWeekFromDateId(dateId);
  if (dayOfWeek === null) return false;
  return daysWeek.includes(dayOfWeek);
}

function authorizeRequest(req, res, next) {
  const header = String(req.headers.authorization ?? '');
  const [, token] = header.split(' ');

  if (!header.startsWith('Bearer ') || !token) {
    return res.status(401).json({ error: 'missing_bearer_token' });
  }

  adminAuth
    .verifyIdToken(token)
    .then((decoded) => {
      req.authUser = {
        uid: decoded.uid,
        email: decoded.email ?? '',
        name: decoded.name ?? '',
      };
      next();
    })
    .catch(() => res.status(401).json({ error: 'invalid_token' }));
}

async function ensureUserDocument(authUser) {
  const userRef = getUserRef(authUser.uid);
  const snapshot = await userRef.get();

  if (!snapshot.exists) {
    const fallbackUser = mapUserSnapshot(authUser.uid, {}, authUser.email ?? '', authUser.name ?? '');

    await userRef.set(
      {
        ...fallbackUser,
        ...buildDefaultConfig(),
        fecha_registro: FieldValue.serverTimestamp(),
        avatar_url: '',
        dashboard: buildDefaultDashboard(),
      },
      { merge: true }
    );

    return userRef.get();
  }

  return snapshot;
}

async function computeDailyTotals(transaction, uid, dateId) {
  const todayStatsRef = getStatsRef(uid).doc(dateId);
  const yesterdayStatsRef = getStatsRef(uid).doc(getYesterdayDateId(dateId));

  const [todayStatsSnap, yesterdayStatsSnap] = await Promise.all([
    transaction.get(todayStatsRef),
    transaction.get(yesterdayStatsRef),
  ]);

  const todayStats = todayStatsSnap.exists ? todayStatsSnap.data() : {};
  const yesterdayStats = yesterdayStatsSnap.exists ? yesterdayStatsSnap.data() : {};

  return {
    todayStatsRef,
    todayHabits: Number(todayStats.habitos_completados ?? 0),
    todayTasks: Number(todayStats.tareas_completadas ?? 0),
    yesterdayHabits: Number(yesterdayStats.habitos_completados ?? 0),
    yesterdayTasks: Number(yesterdayStats.tareas_completadas ?? 0),
  };
}

function handleValidationError(res, error) {
  if (error instanceof z.ZodError) {
    res.status(400).json({ error: 'invalid_payload', details: error.flatten() });
    return true;
  }

  return false;
}

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'habituate-api', timestamp: new Date().toISOString() });
});

app.get('/v1/me', authorizeRequest, async (req, res, next) => {
  try {
    const snapshot = await ensureUserDocument(req.authUser);
    res.json(mapUserDocument(snapshot, req.authUser));
  } catch (error) {
    next(error);
  }
});

app.patch('/v1/me', authorizeRequest, async (req, res, next) => {
  try {
    const payload = userUpdateSchema.parse(req.body ?? {});
    const userRef = getUserRef(req.authUser.uid);
    const updatePayload = {
      ...(payload.name !== undefined ? { nombre: payload.name, name: payload.name } : {}),
      ...(payload.email !== undefined ? { email: payload.email } : {}),
      ...(payload.preferencePhone !== undefined
        ? { telefono_preferencia: payload.preferencePhone, preferencePhone: payload.preferencePhone }
        : {}),
      ...(payload.urgencyPhone !== undefined
        ? { telefono_urgencia: payload.urgencyPhone, urgencyPhone: payload.urgencyPhone }
        : {}),
      updatedAt: FieldValue.serverTimestamp(),
      ultima_actualizacion: FieldValue.serverTimestamp(),
    };

    await userRef.set(updatePayload, { merge: true });
    const snapshot = await userRef.get();
    res.json(mapUserDocument(snapshot, req.authUser));
  } catch (error) {
    if (!handleValidationError(res, error)) next(error);
  }
});

app.patch('/v1/me/settings', authorizeRequest, async (req, res, next) => {
  try {
    const payload = settingsUpdateSchema.parse(req.body ?? {});
    const userRef = getUserRef(req.authUser.uid);
    const updatePayload = {
      ...(payload.darkMode !== undefined ? { config_modo_oscuro: payload.darkMode } : {}),
      ...(payload.fontScale !== undefined ? { config_tamano_fuente: payload.fontScale } : {}),
      ultima_actualizacion: FieldValue.serverTimestamp(),
    };

    await userRef.set(updatePayload, { merge: true });
    const snapshot = await userRef.get();
    res.json(mapUserDocument(snapshot, req.authUser));
  } catch (error) {
    if (!handleValidationError(res, error)) next(error);
  }
});

app.get('/v1/me/dashboard', authorizeRequest, async (req, res, next) => {
  try {
    const snapshot = await ensureUserDocument(req.authUser);
    const data = snapshot.data() || {};
    res.json({
      totalHabitosActivos: Number(data.dashboard?.total_habitos_activos ?? 0),
      totalTareasPendientes: Number(data.dashboard?.total_tareas_pendientes ?? 0),
      habitosCompletadosHoy: Number(data.dashboard?.habitos_completados_hoy ?? 0),
      tareasCompletadasHoy: Number(
        data.dashboard?.tareas_completadas_hoy ?? data.dashboard?.tareas_completados_hoy ?? 0
      ),
      rachaActual: Number(data.dashboard?.racha_actual ?? 0),
      updatedAt: normalizeTimestamp(data.dashboard?.ultima_actualizacion),
    });
  } catch (error) {
    next(error);
  }
});

app.get('/v1/me/stats', authorizeRequest, async (req, res, next) => {
  try {
    const days = Math.max(1, Math.min(30, Number(req.query.days ?? 7)));
    const statsSnap = await getStatsRef(req.authUser.uid)
      .orderBy(DocumentId, 'desc')
      .limit(days)
      .get();

    res.json(
      statsSnap.docs
        .map((doc) => {
          const data = doc.data();
          return {
            dateId: doc.id,
            dayLabel: getDayLabelFromDateId(doc.id),
            habitosCompletados: Number(data.habitos_completados ?? 0),
            tareasCompletadas: Number(data.tareas_completadas ?? 0),
            rachaActual: Number(data.racha_actual ?? 0),
            rachaMaxima: Number(data.racha_maxima ?? 0),
          };
        })
        .reverse()
    );
  } catch (error) {
    next(error);
  }
});

app.get('/v1/me/habits', authorizeRequest, async (req, res, next) => {
  try {
    const dateId = String(req.query.date ?? toDateId(new Date()));
    const habitsSnap = await getHabitsRef(req.authUser.uid).where('activo', '==', true).get();

    const items = await Promise.all(
      habitsSnap.docs.map(async (habitDoc) => {
        const habitData = habitDoc.data();
        const daysWeek = Array.isArray(habitData.dias_semana) ? habitData.dias_semana : [];

        if (!shouldHabitBeDisplayed(daysWeek, dateId)) {
          return null;
        }

        const registerSnap = await habitDoc.ref.collection('registros').doc(dateId).get();
        const registerData = registerSnap.exists ? registerSnap.data() : null;

        return {
          id: habitDoc.id,
          title: String(habitData.titulo ?? 'Sin título'),
          description: String(habitData.descripcion ?? ''),
          categoryId: habitData.id_categoria?.id ?? habitData.id_categoria ?? null,
          categoryName: String(habitData.categoria_nombre ?? 'General'),
          priority: Number(habitData.prioridad ?? 3),
          daysWeek,
          completed: Boolean(registerData?.completado ?? false),
          active: Boolean(habitData.activo ?? true),
          createdAt: normalizeTimestamp(habitData.creado_en),
        };
      })
    );

    res.json(items.filter(Boolean).sort((a, b) => a.title.localeCompare(b.title, 'es-ES')));
  } catch (error) {
    next(error);
  }
});

app.post('/v1/me/habits', authorizeRequest, async (req, res, next) => {
  try {
    const payload = habitCreateSchema.parse(req.body ?? {});
    const userRef = getUserRef(req.authUser.uid);
    const habitsRef = getHabitsRef(req.authUser.uid);

    const createdHabitId = await db.runTransaction(async (transaction) => {
      const habitRef = habitsRef.doc();
      transaction.set(habitRef, {
        id_categoria: userRef.collection('categorias').doc(payload.categoryId),
        categoria_nombre: payload.categoryName,
        titulo: payload.title,
        descripcion: payload.description,
        prioridad: payload.priority,
        dias_semana: payload.daysWeek,
        activo: true,
        creado_en: FieldValue.serverTimestamp(),
      });

      const userSnap = await transaction.get(userRef);
      const userData = userSnap.exists ? userSnap.data() : {};
      const dashboard = userData.dashboard ?? {};

      transaction.set(
        userRef,
        {
          dashboard: {
            ...dashboard,
            total_habitos_activos: Number(dashboard.total_habitos_activos ?? 0) + 1,
            ultima_actualizacion: FieldValue.serverTimestamp(),
          },
        },
        { merge: true }
      );

      return habitRef.id;
    });

    const snapshot = await habitsRef.doc(createdHabitId).get();
    res.status(201).json(serializeHabit(snapshot));
  } catch (error) {
    if (!handleValidationError(res, error)) next(error);
  }
});

app.patch('/v1/me/habits/:habitId', authorizeRequest, async (req, res, next) => {
  try {
    const payload = habitUpdateSchema.parse(req.body ?? {});
    const habitRef = getHabitsRef(req.authUser.uid).doc(req.params.habitId);
    const existing = await habitRef.get();

    if (!existing.exists) {
      return res.status(404).json({ error: 'habit_not_found' });
    }

    const updatePayload = {
      actualizado_en: FieldValue.serverTimestamp(),
    };

    if (payload.title !== undefined) updatePayload.titulo = payload.title;
    if (payload.description !== undefined) updatePayload.descripcion = payload.description;
    if (payload.priority !== undefined) updatePayload.prioridad = payload.priority;
    if (payload.daysWeek !== undefined) updatePayload.dias_semana = payload.daysWeek;
    if (payload.categoryName !== undefined) updatePayload.categoria_nombre = payload.categoryName;
    if (payload.categoryId !== undefined) {
      updatePayload.id_categoria = getUserRef(req.authUser.uid).collection('categorias').doc(payload.categoryId);
    }

    await habitRef.set(updatePayload, { merge: true });
    const snapshot = await habitRef.get();
    res.json(serializeHabit(snapshot));
  } catch (error) {
    if (!handleValidationError(res, error)) next(error);
  }
});

app.post('/v1/me/habits/:habitId/deactivate', authorizeRequest, async (req, res, next) => {
  try {
    const userRef = getUserRef(req.authUser.uid);
    const habitRef = getHabitsRef(req.authUser.uid).doc(req.params.habitId);

    const existing = await habitRef.get();
    if (!existing.exists) {
      return res.status(404).json({ error: 'habit_not_found' });
    }

    await db.runTransaction(async (transaction) => {
      const [userSnap, habitSnap] = await Promise.all([transaction.get(userRef), transaction.get(habitRef)]);
      if (!habitSnap.exists) return;

      const userData = userSnap.exists ? userSnap.data() : {};
      const dashboard = userData.dashboard ?? {};
      const currentActive = Number(dashboard.total_habitos_activos ?? 0);

      transaction.update(habitRef, {
        activo: false,
        actualizado_en: FieldValue.serverTimestamp(),
      });

      transaction.set(
        userRef,
        {
          dashboard: {
            ...dashboard,
            total_habitos_activos: Math.max(0, currentActive - 1),
            ultima_actualizacion: FieldValue.serverTimestamp(),
          },
        },
        { merge: true }
      );
    });

    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.post('/v1/me/habits/:habitId/reactivate', authorizeRequest, async (req, res, next) => {
  try {
    const userRef = getUserRef(req.authUser.uid);
    const habitRef = getHabitsRef(req.authUser.uid).doc(req.params.habitId);

    const existing = await habitRef.get();
    if (!existing.exists) {
      return res.status(404).json({ error: 'habit_not_found' });
    }

    await db.runTransaction(async (transaction) => {
      const [userSnap, habitSnap] = await Promise.all([transaction.get(userRef), transaction.get(habitRef)]);
      if (!habitSnap.exists) return;

      const userData = userSnap.exists ? userSnap.data() : {};
      const dashboard = userData.dashboard ?? {};
      const currentActive = Number(dashboard.total_habitos_activos ?? 0);

      transaction.update(habitRef, {
        activo: true,
        actualizado_en: FieldValue.serverTimestamp(),
      });

      transaction.set(
        userRef,
        {
          dashboard: {
            ...dashboard,
            total_habitos_activos: currentActive + 1,
            ultima_actualizacion: FieldValue.serverTimestamp(),
          },
        },
        { merge: true }
      );
    });

    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.delete('/v1/me/habits/:habitId', authorizeRequest, async (req, res, next) => {
  try {
    const userRef = getUserRef(req.authUser.uid);
    const habitRef = getHabitsRef(req.authUser.uid).doc(req.params.habitId);
    const existing = await habitRef.get();

    if (!existing.exists) {
      return res.status(404).json({ error: 'habit_not_found' });
    }

    await db.runTransaction(async (transaction) => {
      const [userSnap, habitSnap] = await Promise.all([transaction.get(userRef), transaction.get(habitRef)]);
      if (!habitSnap.exists) return;

      const habitData = habitSnap.data();
      const isActive = Boolean(habitData.activo ?? true);
      const userData = userSnap.exists ? userSnap.data() : {};
      const dashboard = userData.dashboard ?? {};
      const currentActive = Number(dashboard.total_habitos_activos ?? 0);

      transaction.delete(habitRef);

      if (isActive) {
        transaction.set(
          userRef,
          {
            dashboard: {
              ...dashboard,
              total_habitos_activos: Math.max(0, currentActive - 1),
              ultima_actualizacion: FieldValue.serverTimestamp(),
            },
          },
          { merge: true }
        );
      }
    });

    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.post('/v1/me/habits/:habitId/complete', authorizeRequest, async (req, res, next) => {
  try {
    const dateId = String(req.body?.dateId ?? toDateId(new Date()));
    const habitRef = getHabitsRef(req.authUser.uid).doc(req.params.habitId);
    const registerRef = habitRef.collection('registros').doc(dateId);
    const userRef = getUserRef(req.authUser.uid);
    const habitExists = await habitRef.get();

    if (!habitExists.exists) {
      return res.status(404).json({ error: 'habit_not_found' });
    }

    await db.runTransaction(async (transaction) => {
      const [userSnap, registerSnap, totals] = await Promise.all([
        transaction.get(userRef),
        transaction.get(registerRef),
        computeDailyTotals(transaction, req.authUser.uid, dateId),
      ]);

      if (registerSnap.exists && Boolean(registerSnap.data().completado)) return;

      const userData = userSnap.exists ? userSnap.data() : {};
      const dashboard = userData.dashboard ?? {};
      const todayTotalBefore = totals.todayHabits + totals.todayTasks;
      const yesterdayTotal = totals.yesterdayHabits + totals.yesterdayTasks;
      const currentRacha = Number(dashboard.racha_actual ?? 0);
      const currentRachaMax = Number(totals.todayStatsRef ? 0 : 0);
      const existingStats = userData.dashboard ?? {};
      const todayStatsSnap = await transaction.get(totals.todayStatsRef);
      const todayStats = todayStatsSnap.exists ? todayStatsSnap.data() : {};
      const currentMax = Number(todayStats.racha_maxima ?? currentRacha);

      let nextRacha = currentRacha;
      if (todayTotalBefore === 0) {
        nextRacha = yesterdayTotal > 0 ? Math.max(1, currentRacha + 1) : 1;
      }

      const nextRachaMax = Math.max(currentMax, nextRacha);

      transaction.set(
        registerRef,
        {
          completado: true,
          completado_en: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      transaction.set(
        totals.todayStatsRef,
        {
          fecha: dateId,
          habitos_completados: totals.todayHabits + 1,
          tareas_completadas: totals.todayTasks,
          racha_actual: nextRacha,
          racha_maxima: nextRachaMax,
        },
        { merge: true }
      );

      transaction.set(
        userRef,
        {
          dashboard: {
            ...existingStats,
            habitos_completados_hoy: Number(dashboard.habitos_completados_hoy ?? 0) + 1,
            racha_actual: nextRacha,
            ultima_actualizacion: FieldValue.serverTimestamp(),
          },
        },
        { merge: true }
      );
    });

    res.json({ ok: true, dateId });
  } catch (error) {
    next(error);
  }
});

app.get('/v1/me/tasks', authorizeRequest, async (req, res, next) => {
  try {
    const completed = String(req.query.completed ?? 'false') === 'true';
    const tasksSnap = await getTasksRef(req.authUser.uid).where('completada', '==', completed).get();
    const items = tasksSnap.docs.map(serializeTask);
    items.sort((a, b) => String(a.dueDate ?? '').localeCompare(String(b.dueDate ?? '')));
    res.json(items);
  } catch (error) {
    next(error);
  }
});

app.post('/v1/me/tasks', authorizeRequest, async (req, res, next) => {
  try {
    const payload = taskCreateSchema.parse(req.body ?? {});
    const dueDate = new Date(payload.dueDate);

    if (Number.isNaN(dueDate.getTime())) {
      return res.status(400).json({ error: 'invalid_due_date' });
    }

    const taskRef = await getTasksRef(req.authUser.uid).add({
      id_categoria: getUserRef(req.authUser.uid).collection('categorias').doc(payload.categoryId),
      categoria_nombre: payload.categoryName,
      titulo: payload.title,
      descripcion: payload.description,
      fecha_vencimiento: Timestamp.fromDate(dueDate),
      completada: false,
      prioridad: payload.priority,
      creado_en: FieldValue.serverTimestamp(),
    });

    await getUserRef(req.authUser.uid).set(
      {
        dashboard: {
          total_tareas_pendientes: FieldValue.increment(1),
          ultima_actualizacion: FieldValue.serverTimestamp(),
        },
      },
      { merge: true }
    );

    const snapshot = await taskRef.get();
    res.status(201).json(serializeTask(snapshot));
  } catch (error) {
    if (!handleValidationError(res, error)) next(error);
  }
});

app.patch('/v1/me/tasks/:taskId', authorizeRequest, async (req, res, next) => {
  try {
    const payload = taskUpdateSchema.parse(req.body ?? {});
    const taskRef = getTasksRef(req.authUser.uid).doc(req.params.taskId);
    const existing = await taskRef.get();

    if (!existing.exists) {
      return res.status(404).json({ error: 'task_not_found' });
    }

    const updatePayload = {
      actualizado_en: FieldValue.serverTimestamp(),
    };

    if (payload.title !== undefined) updatePayload.titulo = payload.title;
    if (payload.description !== undefined) updatePayload.descripcion = payload.description;
    if (payload.priority !== undefined) updatePayload.prioridad = payload.priority;
    if (payload.categoryName !== undefined) updatePayload.categoria_nombre = payload.categoryName;
    if (payload.categoryId !== undefined) {
      updatePayload.id_categoria = getUserRef(req.authUser.uid).collection('categorias').doc(payload.categoryId);
    }
    if (payload.dueDate !== undefined) {
      const dueDate = new Date(payload.dueDate);
      if (Number.isNaN(dueDate.getTime())) {
        return res.status(400).json({ error: 'invalid_due_date' });
      }
      updatePayload.fecha_vencimiento = Timestamp.fromDate(dueDate);
    }

    await taskRef.set(updatePayload, { merge: true });
    const snapshot = await taskRef.get();
    res.json(serializeTask(snapshot));
  } catch (error) {
    if (!handleValidationError(res, error)) next(error);
  }
});

app.delete('/v1/me/tasks/:taskId', authorizeRequest, async (req, res, next) => {
  try {
    const userRef = getUserRef(req.authUser.uid);
    const taskRef = getTasksRef(req.authUser.uid).doc(req.params.taskId);
    const existing = await taskRef.get();

    if (!existing.exists) {
      return res.status(404).json({ error: 'task_not_found' });
    }

    await db.runTransaction(async (transaction) => {
      const [userSnap, taskSnap] = await Promise.all([transaction.get(userRef), transaction.get(taskRef)]);
      if (!taskSnap.exists) return;

      const taskData = taskSnap.data();
      const userData = userSnap.exists ? userSnap.data() : {};
      const dashboard = userData.dashboard ?? {};

      transaction.delete(taskRef);

      if (!Boolean(taskData.completada ?? false)) {
        transaction.set(
          userRef,
          {
            dashboard: {
              ...dashboard,
              total_tareas_pendientes: Math.max(0, Number(dashboard.total_tareas_pendientes ?? 0) - 1),
              ultima_actualizacion: FieldValue.serverTimestamp(),
            },
          },
          { merge: true }
        );
      }
    });

    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.post('/v1/me/tasks/:taskId/complete', authorizeRequest, async (req, res, next) => {
  try {
    const dateId = String(req.body?.dateId ?? toDateId(new Date()));
    const taskRef = getTasksRef(req.authUser.uid).doc(req.params.taskId);
    const userRef = getUserRef(req.authUser.uid);
    const existing = await taskRef.get();

    if (!existing.exists) {
      return res.status(404).json({ error: 'task_not_found' });
    }

    await db.runTransaction(async (transaction) => {
      const [userSnap, taskSnap, totals] = await Promise.all([
        transaction.get(userRef),
        transaction.get(taskRef),
        computeDailyTotals(transaction, req.authUser.uid, dateId),
      ]);

      if (!taskSnap.exists) return;
      if (Boolean(taskSnap.data().completada)) return;

      const userData = userSnap.exists ? userSnap.data() : {};
      const dashboard = userData.dashboard ?? {};
      const todayTotalBefore = totals.todayHabits + totals.todayTasks;
      const yesterdayTotal = totals.yesterdayHabits + totals.yesterdayTasks;
      const currentRacha = Number(dashboard.racha_actual ?? 0);
      const todayStatsSnap = await transaction.get(totals.todayStatsRef);
      const todayStats = todayStatsSnap.exists ? todayStatsSnap.data() : {};
      const currentMax = Number(todayStats.racha_maxima ?? currentRacha);

      let nextRacha = currentRacha;
      if (todayTotalBefore === 0) {
        nextRacha = yesterdayTotal > 0 ? Math.max(1, currentRacha + 1) : 1;
      }

      const nextRachaMax = Math.max(currentMax, nextRacha);

      transaction.update(taskRef, {
        completada: true,
        actualizado_en: FieldValue.serverTimestamp(),
        completada_en: FieldValue.serverTimestamp(),
      });

      transaction.set(
        totals.todayStatsRef,
        {
          fecha: dateId,
          habitos_completados: totals.todayHabits,
          tareas_completadas: totals.todayTasks + 1,
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
            total_tareas_pendientes: Math.max(0, Number(dashboard.total_tareas_pendientes ?? 0) - 1),
            tareas_completadas_hoy: Number(dashboard.tareas_completadas_hoy ?? 0) + 1,
            tareas_completados_hoy: Number(dashboard.tareas_completados_hoy ?? 0) + 1,
            racha_actual: nextRacha,
            ultima_actualizacion: FieldValue.serverTimestamp(),
          },
        },
        { merge: true }
      );
    });

    res.json({ ok: true, dateId });
  } catch (error) {
    next(error);
  }
});

app.get('/v1/me/achievements', authorizeRequest, async (req, res, next) => {
  try {
    const snapshot = await getAchievementsRef(req.authUser.uid).orderBy(DocumentId, 'asc').get();
    res.json(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
  } catch (error) {
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  console.error('API error:', error);
  res.status(500).json({ error: 'internal_error' });
});

app.listen(PORT, () => {
  console.log(`Habituate API listening on port ${PORT}`);
});
