import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, {
    type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { addDoc, collection, doc, runTransaction, serverTimestamp, Timestamp, updateDoc } from 'firebase/firestore';
import React, { useMemo, useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    TextInput,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { useUser } from '@/context/user-context';
import { useAppTheme } from '@/hooks/use-app-theme';
import { syncAchievementsForUser } from '@/services/achievements';
import { db } from '@/services/firebase';
import { scheduleTaskReminder } from '@/services/notifications';
import { playSuccessSound } from '@/services/sounds';

const PRIORITIES = [1, 2, 3, 4, 5];
const CATEGORY_OPTIONS = [
  { label: 'Deporte al aire libre', id: 'deporte-aire-libre' },
  { label: 'Medicina', id: 'medicina' },
  { label: 'Casa', id: 'casa' },
] as const;

const REMINDER_OPTIONS = [
  { label: 'Al momento', minutesBefore: 0 },
  { label: '15 min antes', minutesBefore: 15 },
  { label: '1 hora antes', minutesBefore: 60 },
  { label: '1 día antes', minutesBefore: 1440 },
] as const;

function parseWebDateTime(webDate: string, webTime: string) {
  const dateMatch = webDate.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const timeMatch = webTime.trim().match(/^(\d{2}):(\d{2})$/);
  if (!dateMatch || !timeMatch) return null;

  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);
  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);

  const parsed = new Date(year, month - 1, day, hour, minute, 0, 0);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function formatDueDate(date: Date | null) {
  if (!date) return 'Sin seleccionar';
  return date.toLocaleString('es-ES', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function CrearTareaScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors } = useAppTheme();
  const { currentUser } = useUser();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(CATEGORY_OPTIONS[0].id);
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [webDate, setWebDate] = useState('');
  const [webTime, setWebTime] = useState('');
  const [priority, setPriority] = useState(3);
  const [reminderMinutesBefore, setReminderMinutesBefore] = useState(15);
  const [isSaving, setIsSaving] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date');

  const canSave = useMemo(() => {
    const hasDate =
      Platform.OS === 'web'
        ? webDate.trim().length > 0 && webTime.trim().length > 0
        : dueDate !== null;

    return title.trim().length > 0 && hasDate && !isSaving;
  }, [dueDate, isSaving, title, webDate, webTime]);

  function openPicker(mode: 'date' | 'time') {
    if (mode === 'time' && !dueDate) {
      Alert.alert('Fecha requerida', 'Primero selecciona una fecha.');
      return;
    }

    setPickerMode(mode);
    setShowPicker(true);
  }

  function onChangeDueDate(event: DateTimePickerEvent, selectedDate?: Date) {
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }

    if (event.type === 'dismissed' || !selectedDate) return;

    if (pickerMode === 'date') {
      const base = dueDate ?? new Date();
      const next = new Date(selectedDate);
      next.setHours(base.getHours(), base.getMinutes(), 0, 0);
      setDueDate(next);
      return;
    }

    const base = dueDate ?? new Date();
    const next = new Date(base);
    next.setHours(selectedDate.getHours(), selectedDate.getMinutes(), 0, 0);
    setDueDate(next);
  }

  async function onSaveTask() {
    if (!currentUser?.id) {
      Alert.alert('Sin sesion', 'Debes iniciar sesion para crear una tarea.');
      return;
    }

    const resolvedDate =
      Platform.OS === 'web' ? parseWebDateTime(webDate, webTime) : dueDate;

    if (!resolvedDate) {
      Alert.alert(
        'Fecha invalida',
        Platform.OS === 'web'
          ? 'En web usa formato fecha YYYY-MM-DD y hora HH:mm.'
          : 'Selecciona una fecha de vencimiento.'
      );
      return;
    }

    if (priority < 1 || priority > 5) {
      Alert.alert('Prioridad invalida', 'La prioridad debe estar entre 1 y 5.');
      return;
    }

    const reminderTime = new Date(resolvedDate.getTime() - reminderMinutesBefore * 60 * 1000);
    if (reminderTime.getTime() <= Date.now()) {
      Alert.alert(
        'Aviso inválido',
        'El recordatorio elegido queda demasiado cerca o ya pasó. Elige un aviso más corto.'
      );
      return;
    }

    try {
      setIsSaving(true);

      const taskPayload: {
        id_categoria: ReturnType<typeof doc> | null;
        categoria_nombre: string;
        titulo: string;
        descripcion: string;
        fecha_vencimiento: Timestamp;
        completada: boolean;
        prioridad: number;
        creado_en: ReturnType<typeof serverTimestamp>;
      } = {
        id_categoria: doc(db, 'usuarios', currentUser.id, 'categorias', selectedCategoryId),
        categoria_nombre:
          CATEGORY_OPTIONS.find((item) => item.id === selectedCategoryId)?.label ?? 'Casa',
        titulo: title.trim(),
        descripcion: description.trim(),
        fecha_vencimiento: Timestamp.fromDate(resolvedDate),
        completada: false,
        prioridad: priority,
        creado_en: serverTimestamp(),
      };

      const createdTaskRef = await addDoc(collection(db, 'usuarios', currentUser.id, 'tareas'), taskPayload);

      const notificationId = await scheduleTaskReminder({
        taskId: createdTaskRef.id,
        title: title.trim(),
        dueDate: resolvedDate,
        minutesBefore: reminderMinutesBefore,
      });

      if (notificationId) {
        await updateDoc(createdTaskRef, { notification_id: notificationId });
      }

      // Incrementar contador de tareas pendientes en el dashboard del usuario
      try {
        await runTransaction(db, async (transaction) => {
          const userRef = doc(db, 'usuarios', currentUser.id);
          const userSnap = await transaction.get(userRef);
          const userData = userSnap.exists() ? userSnap.data() : {};
          const dashboard = (userData.dashboard as Record<string, unknown> | undefined) ?? {};
          const currentPending = Number(dashboard.total_tareas_pendientes ?? 0);

          transaction.set(
            userRef,
            {
              dashboard: {
                ...dashboard,
                total_tareas_pendientes: currentPending + 1,
                ultima_actualizacion: serverTimestamp(),
              },
            },
            { merge: true }
          );
        });
      } catch (err) {
        console.warn('No se pudo actualizar contador de tareas pendientes:', err);
      }

      await syncAchievementsForUser(currentUser.id, 'taskCreated');
      await playSuccessSound();

      Alert.alert('Tarea creada', 'La tarea fue creada correctamente.');
      router.back();
    } catch {
      Alert.alert('Error', 'No se pudo crear la tarea en Firestore.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Pressable style={styles.headerButton} onPress={() => router.back()}>
          <Ionicons name="close" size={24} color={colors.text} />
        </Pressable>
        <AppText style={[styles.headerTitle, { color: colors.text }]}>
          Crear tarea
        </AppText>
        <Pressable
          style={[styles.headerButton, { opacity: canSave ? 1 : 0.5 }]}
          onPress={onSaveTask}
          disabled={!canSave}
        >
          <AppText style={[styles.saveButton, { color: colors.primary }]}>Guardar</AppText>
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.select({ ios: 'padding', android: undefined })}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.field}>
            <AppText style={[styles.label, { color: colors.text }]}>Titulo</AppText>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Ejemplo: Comprar medicacion"
              style={[
                styles.input,
                { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text },
              ]}
              placeholderTextColor={colors.mutedText}
            />
          </View>

          <View style={styles.field}>
            <AppText style={[styles.label, { color: colors.text }]}>Descripcion</AppText>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Detalles de la tarea"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              style={[
                styles.textArea,
                { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text },
              ]}
              placeholderTextColor={colors.mutedText}
            />
          </View>

          <View style={styles.field}>
            <AppText style={[styles.label, { color: colors.text }]}>Categoria</AppText>
            <View style={styles.categoryRow}>
              {CATEGORY_OPTIONS.map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => setSelectedCategoryId(item.id)}
                  style={[
                    styles.categoryButton,
                    {
                      borderColor: colors.border,
                      backgroundColor:
                        selectedCategoryId === item.id ? colors.primary : colors.surface,
                    },
                  ]}
                >
                  <AppText
                    style={{
                      color: selectedCategoryId === item.id ? colors.onPrimary : colors.text,
                      fontSize: 11,
                      fontWeight: '600',
                    }}>
                    {item.label}
                  </AppText>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.field}>
            <AppText style={[styles.label, { color: colors.text }]}>Fecha vencimiento</AppText>
            {Platform.OS === 'web' ? (
              <>
                <input 
                  type='date'
                  value={webDate}
                  onChange={(e) => setWebDate(e.target.value)}
                  style = {{
                    ...styles.webDate,
                    backgroundColor: colors.surface, 
                    borderColor: colors.border, 
                    color: colors.text,
                    font: '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
                  }}
                />
                <input 
                  type='time'
                  value={webTime}
                  onChange={(e) => setWebTime(e.target.value)}
                  style = {{
                    ...styles.webDate,
                    font: '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
                    backgroundColor: colors.surface, 
                    borderColor: colors.border, 
                    color: colors.text,
                  }}
                />
              </>
            ) : (
              <>
                <AppText style={[styles.datePreview, { color: colors.text }]}>{formatDueDate(dueDate)}</AppText>
                <View style={styles.dateActions}>
                  <Pressable
                    onPress={() => openPicker('date')}
                    style={[styles.dateButton, { borderColor: colors.border, backgroundColor: colors.surface }]}
                  >
                    <AppText style={[styles.dateButtonText, { color: colors.text }]}>Seleccionar fecha</AppText>
                  </Pressable>
                  <Pressable
                    onPress={() => openPicker('time')}
                    style={[styles.dateButton, { borderColor: colors.border, backgroundColor: colors.surface }]}
                  >
                    <AppText style={[styles.dateButtonText, { color: colors.text }]}>Seleccionar hora</AppText>
                  </Pressable>
                </View>
              </>
            )}
          </View>

          {showPicker ? (
            <DateTimePicker
              value={dueDate ?? new Date()}
              mode={pickerMode}
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onChangeDueDate}
            />
          ) : null}

          <View style={styles.field}>
            <AppText style={[styles.label, { color: colors.text }]}>Prioridad (1-5)</AppText>
            <View style={styles.priorityRow}>
              {PRIORITIES.map((item) => (
                <Pressable
                  key={item}
                  onPress={() => setPriority(item)}
                  style={[
                    styles.priorityButton,
                    {
                      borderColor: colors.border,
                      backgroundColor: item === priority ? colors.primary : colors.surface,
                    },
                  ]}
                >
                  <AppText
                    style={{
                      color: item === priority ? colors.onPrimary : colors.text,
                      fontSize: 12,
                      fontWeight: '700',
                    }}
                  >
                    {item}
                  </AppText>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.field}>
            <AppText style={[styles.label, { color: colors.text }]}>¿Cuándo quieres que te avise?</AppText>
            <View style={styles.reminderRow}>
              {REMINDER_OPTIONS.map((option) => {
                const selected = reminderMinutesBefore === option.minutesBefore;
                return (
                  <Pressable
                    key={option.minutesBefore}
                    onPress={() => setReminderMinutesBefore(option.minutesBefore)}
                    style={[
                      styles.reminderButton,
                      {
                        borderColor: colors.border,
                        backgroundColor: selected ? colors.primary : colors.surface,
                      },
                    ]}
                  >
                    <AppText
                      style={{
                        color: selected ? colors.onPrimary : colors.text,
                        fontSize: 11,
                        fontWeight: '700',
                        textAlign: 'center',
                      }}
                    >
                      {option.label}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerButton: {
    padding: 8,
    minWidth: 40,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  content: {
    padding: 16,
    paddingBottom: 24,
    gap: 12,
  },
  field: {
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    height: 42,
    paddingHorizontal: 12,
    fontSize: 13,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    minHeight: 96,
    paddingHorizontal: 12,
    paddingTop: 10,
    fontSize: 13,
  },
  priorityRow: {
    flexDirection: 'row',
    gap: 8,
  },
  categoryRow: {
    gap: 8,
  },
  categoryButton: {
    minHeight: 38,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    justifyContent: 'center',
  },
  datePreview: {
    fontSize: 13,
    fontWeight: '600',
  },
  dateActions: {
    flexDirection: 'row',
    gap: 8,
  },
  dateButton: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  priorityButton: {
    width: 36,
    height: 36,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reminderRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  reminderButton: {
    minWidth: 96,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButton: {
    fontWeight: '600',
    fontSize: 16,
  },
  saveText: {
    fontSize: 13,
    fontWeight: '700',
  },
  disabledButton: {
    opacity: 0.5,
  },
  webDate: {
    height: 42,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingLeft: 10,
    paddingRight: 10,
  }
});
