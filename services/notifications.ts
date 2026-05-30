import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export type HabitReminderInput = {
  habitId: string;
  title: string;
  daysWeek: number[];
};

export type TaskReminderInput = {
  taskId: string;
  title: string;
  dueDate: Date;
  minutesBefore?: number;
};

let notificationHandlerConfigured = false;
const WEB_NOTIFICATION_STORAGE_KEY = 'habituate:web-notification-schedules';

type WebNotificationContent = {
  title: string;
  body: string;
  data?: Record<string, unknown>;
};

type WebWeeklySchedule = {
  kind: 'weekly';
  dayIndex: number;
  hour: number;
  minute: number;
};

type WebNotificationSchedule = {
  id: string;
  content: WebNotificationContent;
  triggerAt: number;
  repeat?: WebWeeklySchedule;
};

const webTimers = new Map<string, ReturnType<typeof setTimeout>>();

function isWebNotificationsSupported() {
  return Platform.OS === 'web' && typeof Notification !== 'undefined';
}

function isWebSchedule(value: unknown): value is WebNotificationSchedule {
  if (!value || typeof value !== 'object') return false;

  const candidate = value as WebNotificationSchedule;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.triggerAt === 'number' &&
    typeof candidate.content?.title === 'string' &&
    typeof candidate.content?.body === 'string'
  );
}

function readWebSchedules(): WebNotificationSchedule[] {
  if (Platform.OS !== 'web') {
    return [];
  }

  try {
    const raw = globalThis.localStorage?.getItem(WEB_NOTIFICATION_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter(isWebSchedule) : [];
  } catch {
    return [];
  }
}

function writeWebSchedules(schedules: WebNotificationSchedule[]) {
  if (Platform.OS !== 'web') {
    return;
  }

  try {
    globalThis.localStorage?.setItem(WEB_NOTIFICATION_STORAGE_KEY, JSON.stringify(schedules));
  } catch {
    // Ignore storage failures on web.
  }
}

function upsertWebSchedule(schedule: WebNotificationSchedule) {
  const schedules = readWebSchedules();
  const nextSchedules = [...schedules.filter((item) => item.id !== schedule.id), schedule];
  writeWebSchedules(nextSchedules);
}

function removeWebSchedule(id: string) {
  const schedules = readWebSchedules().filter((schedule) => schedule.id !== id);
  writeWebSchedules(schedules);
}

function clearWebTimer(id: string) {
  const timer = webTimers.get(id);
  if (timer) {
    clearTimeout(timer);
    webTimers.delete(id);
  }
}

function createWebNotificationId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `web-${crypto.randomUUID()}`;
  }

  return `web-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getWebNotificationPermission() {
  if (!isWebNotificationsSupported()) {
    return 'denied' as const;
  }

  return Notification.permission;
}

function computeNextWeeklyTrigger(dayIndex: number, hour: number, minute: number, fromDate = new Date()) {
  const nextDate = new Date(fromDate);
  nextDate.setSeconds(0, 0);
  nextDate.setHours(hour, minute, 0, 0);

  const today = fromDate.getDay();
  const daysAhead = (dayIndex - today + 7) % 7;

  if (daysAhead > 0) {
    nextDate.setDate(nextDate.getDate() + daysAhead);
  } else if (nextDate.getTime() <= fromDate.getTime()) {
    nextDate.setDate(nextDate.getDate() + 7);
  }

  return nextDate;
}

function showWebNotification(content: WebNotificationContent) {
  if (!isWebNotificationsSupported() || getWebNotificationPermission() !== 'granted') {
    return;
  }

  new Notification(content.title, {
    body: content.body,
    data: content.data,
  });
}

function scheduleWebNotification(schedule: WebNotificationSchedule) {
  clearWebTimer(schedule.id);

  const delay = Math.max(0, schedule.triggerAt - Date.now());
  const timer = globalThis.setTimeout(() => {
    showWebNotification(schedule.content);

    if (schedule.repeat) {
      const nextTriggerAt = computeNextWeeklyTrigger(
        schedule.repeat.dayIndex,
        schedule.repeat.hour,
        schedule.repeat.minute
      ).getTime();
      const nextSchedule = { ...schedule, triggerAt: nextTriggerAt };
      upsertWebSchedule(nextSchedule);
      scheduleWebNotification(nextSchedule);
      return;
    }

    removeWebSchedule(schedule.id);
    webTimers.delete(schedule.id);
  }, delay);

  webTimers.set(schedule.id, timer);
}

export function restoreWebNotificationSchedules() {
  if (Platform.OS !== 'web') {
    return;
  }

  readWebSchedules().forEach((schedule) => {
    if (schedule.repeat) {
      const nextTriggerAt = computeNextWeeklyTrigger(
        schedule.repeat.dayIndex,
        schedule.repeat.hour,
        schedule.repeat.minute
      ).getTime();
      const nextSchedule = { ...schedule, triggerAt: nextTriggerAt };
      upsertWebSchedule(nextSchedule);
      scheduleWebNotification(nextSchedule);
      return;
    }

    if (schedule.triggerAt > Date.now()) {
      scheduleWebNotification(schedule);
      return;
    }

    removeWebSchedule(schedule.id);
  });
}

export function configureNotificationHandler() {
  if (Platform.OS === 'web') {
    return;
  }

  if (notificationHandlerConfigured) {
    return;
  }

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  notificationHandlerConfigured = true;
}

export async function ensureNotificationChannel() {
  if (Platform.OS !== 'android') {
    return;
  }

  await Notifications.setNotificationChannelAsync('habituate-reminders', {
    name: 'Recordatorios de Habituate',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#4f46e5',
    sound: 'default',
  });
}

export async function requestNotificationPermission() {
  if (Platform.OS === 'web') {
    if (!isWebNotificationsSupported()) {
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission === 'denied') {
      return false;
    }

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  const current = await Notifications.getPermissionsAsync();
  if (current.granted || current.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
    return true;
  }

  const next = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: true,
      allowSound: true,
    },
  });

  return next.granted || next.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
}

export async function ensureNotificationPermission() {
  await ensureNotificationChannel();
  return requestNotificationPermission();
}

function getWeekdayTrigger(dayIndex: number): Notifications.WeeklyTriggerInput {
  return {
    type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
    weekday: dayIndex + 1,
    hour: 8,
    minute: 0,
    channelId: 'habituate-reminders',
  };
}

export async function scheduleHabitReminders({ habitId, title, daysWeek }: HabitReminderInput) {
  if (Platform.OS === 'web') {
    const permissionGranted = await ensureNotificationPermission();
    if (!permissionGranted) {
      return [];
    }

    const ids = daysWeek.map((dayIndex) => {
      const id = createWebNotificationId();
      const triggerAt = computeNextWeeklyTrigger(dayIndex, 8, 0).getTime();
      const schedule: WebNotificationSchedule = {
        id,
        triggerAt,
        repeat: {
          kind: 'weekly',
          dayIndex,
          hour: 8,
          minute: 0,
        },
        content: {
          title: 'Recordatorio de hábito',
          body: `Es momento de completar ${title}`,
          data: { kind: 'habit', habitId },
        },
      };

      upsertWebSchedule(schedule);
      scheduleWebNotification(schedule);

      return id;
    });

    return ids;
  }

  const permissionGranted = await ensureNotificationPermission();
  if (!permissionGranted) {
    return [];
  }

  const ids = await Promise.all(
    daysWeek.map((dayIndex) =>
      Notifications.scheduleNotificationAsync({
        content: {
          title: 'Recordatorio de hábito',
          body: `Es momento de completar ${title}`,
          sound: true,
          data: { kind: 'habit', habitId },
        },
        trigger: getWeekdayTrigger(dayIndex),
      })
    )
  );

  return ids;
}

export async function scheduleTaskReminder({
  taskId,
  title,
  dueDate,
  minutesBefore = 0,
}: TaskReminderInput) {
  if (Platform.OS === 'web') {
    const permissionGranted = await ensureNotificationPermission();
    if (!permissionGranted) {
      return null;
    }

    const reminderDate = new Date(dueDate.getTime() - Math.max(0, minutesBefore) * 60 * 1000);
    if (reminderDate.getTime() <= Date.now()) {
      return null;
    }

    const id = createWebNotificationId();
    const schedule: WebNotificationSchedule = {
      id,
      triggerAt: reminderDate.getTime(),
      content: {
        title: 'Tarea pendiente',
        body: `Recuerda completar: ${title}`,
        data: { kind: 'task', taskId },
      },
    };

    upsertWebSchedule(schedule);
    scheduleWebNotification(schedule);
    return id;
  }

  const permissionGranted = await ensureNotificationPermission();
  if (!permissionGranted) {
    return null;
  }

  const reminderDate = new Date(dueDate.getTime() - Math.max(0, minutesBefore) * 60 * 1000);

  if (reminderDate.getTime() <= Date.now()) {
    return null;
  }

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Tarea pendiente',
      body: `Recuerda completar: ${title}`,
      sound: true,
      data: { kind: 'task', taskId },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: reminderDate,
      channelId: 'habituate-reminders',
    },
  });

  return id;
}

export async function notifyAchievementUnlocked(title: string, description: string) {
  if (Platform.OS === 'web') {
    const permissionGranted = await ensureNotificationPermission();
    if (!permissionGranted) {
      return;
    }

    showWebNotification({
      title: `Logro desbloqueado: ${title}`,
      body: description,
      data: { kind: 'achievement', title },
    });
    return;
  }

  const permissionGranted = await ensureNotificationPermission();
  if (!permissionGranted) {
    return;
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title: `Logro desbloqueado: ${title}`,
      body: description,
      sound: true,
      data: { kind: 'achievement', title },
    },
    trigger: null,
  });
}

export async function cancelNotificationIds(notificationIds: Array<string | null | undefined>) {
  if (Platform.OS === 'web') {
    notificationIds.filter(Boolean).forEach((id) => {
      clearWebTimer(String(id));
      removeWebSchedule(String(id));
    });
    return;
  }

  await Promise.all(
    notificationIds.filter(Boolean).map((id) => Notifications.cancelScheduledNotificationAsync(String(id)))
  );
}

export async function cancelNotificationId(notificationId: string | null | undefined) {
  if (!notificationId) {
    return;
  }

  if (Platform.OS === 'web') {
    clearWebTimer(notificationId);
    removeWebSchedule(notificationId);
    return;
  }

  await Notifications.cancelScheduledNotificationAsync(notificationId);
}
