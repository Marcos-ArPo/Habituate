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

export function configureNotificationHandler() {
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
  const permissionGranted = await ensureNotificationPermission();
  if (!permissionGranted || Platform.OS === 'web') {
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
  const permissionGranted = await ensureNotificationPermission();
  if (!permissionGranted || Platform.OS === 'web') {
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
  const permissionGranted = await ensureNotificationPermission();
  if (!permissionGranted || Platform.OS === 'web') {
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
    return;
  }

  await Promise.all(
    notificationIds.filter(Boolean).map((id) => Notifications.cancelScheduledNotificationAsync(String(id)))
  );
}

export async function cancelNotificationId(notificationId: string | null | undefined) {
  if (!notificationId || Platform.OS === 'web') {
    return;
  }

  await Notifications.cancelScheduledNotificationAsync(notificationId);
}
