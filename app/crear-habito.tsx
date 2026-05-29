import { useRoute } from '@react-navigation/native';
import React, { useEffect, useMemo, useState } from 'react';
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

import { AppText } from '@/components/app-text';
import { DaySelector } from '@/components/ui/day-selector';
import { useUser } from '@/context/user-context';
import { useAppTheme } from '@/hooks/use-app-theme';
import { createHabit, updateHabit } from '@/services/firestore-data';
import { playSuccessSound } from '@/services/sounds';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const CATEGORY_OPTIONS = [
  { id: 'salud', label: 'Salud' },
  { id: 'trabajo', label: 'Trabajo' },
  { id: 'casa', label: 'Casa' },
  { id: 'personal', label: 'Personal' },
  { id: 'ocio', label: 'Ocio' },
];

export default function CrearHabitoScreen() {
  const route = useRoute();
  const router = useRouter();
  const { colors } = useAppTheme();
  const { currentUser } = useUser();

  // Para edición
  const habitId = (route.params as { habitId?: string })?.habitId;
  const initialData = (route.params as { initialData?: any })?.initialData;

  // State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('salud');
  const [priority, setPriority] = useState(3);
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.titulo || '');
      setDescription(initialData.descripcion || '');
      setSelectedCategoryId(initialData.categoryId || 'salud');
      setPriority(initialData.prioridad || 3);
      setSelectedDays(Array.isArray(initialData.diasSemana) ? initialData.diasSemana : []);
    }
  }, [initialData]);

  const canSave = useMemo(() => {
    return title.trim().length > 0 && selectedDays.length > 0 && !isSaving;
  }, [title, selectedDays, isSaving]);

  async function onSaveHabit() {
    if (!currentUser?.id) {
      Alert.alert('Sin sesión', 'Debes iniciar sesión para crear un hábito.');
      return;
    }

    if (selectedDays.length === 0) {
      Alert.alert('Días requeridos', 'Selecciona al menos un día de la semana.');
      return;
    }

    if (priority < 1 || priority > 5) {
      Alert.alert('Prioridad inválida', 'La prioridad debe estar entre 1 y 5.');
      return;
    }

    try {
      setIsSaving(true);

      const categoryName =
        CATEGORY_OPTIONS.find((item) => item.id === selectedCategoryId)?.label ?? 'General';

      if (habitId) {
        // Editar hábito existente
        await updateHabit(currentUser.id, habitId, {
          titulo: title.trim(),
          descripcion: description.trim(),
          categoryId: selectedCategoryId,
          categoryName,
          prioridad: priority,
          diasSemana: selectedDays,
        });

        Alert.alert('Éxito', 'Hábito actualizado correctamente.');
      } else {
        // Crear nuevo hábito
        await createHabit(
          currentUser.id,
          title.trim(),
          description.trim(),
          selectedCategoryId,
          categoryName,
          priority,
          selectedDays
        );

        Alert.alert('Éxito', 'Hábito creado correctamente.');
      }

      await playSuccessSound();

      // Navegar atrás
      setTitle('');
      setDescription('');
      setSelectedCategoryId('salud');
      setPriority(3);
      setSelectedDays([]);
    } catch (error) {
      console.error('Error al guardar hábito:', error);
      Alert.alert('Error', 'No se pudo guardar el hábito. Intenta de nuevo.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Pressable style={styles.headerButton} onPress={() => router.back()}>
          <Ionicons name="close" size={24} color={colors.text} />
        </Pressable>
        <AppText style={[styles.headerTitle, { color: colors.text }]}>
          {habitId ? 'Editar hábito' : 'Crear hábito'}
        </AppText>
        <Pressable
          style={[styles.headerButton, { opacity: canSave ? 1 : 0.5 }]}
          onPress={onSaveHabit}
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
            <AppText style={[styles.label, { color: colors.text }]}>Título</AppText>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Ejemplo: Ejercicio matutino"
              style={[
                styles.input,
                { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text },
              ]}
              placeholderTextColor={colors.mutedText}
            />
          </View>

          <View style={styles.field}>
            <AppText style={[styles.label, { color: colors.text }]}>Descripción</AppText>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Detalles del hábito"
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
            <AppText style={[styles.label, { color: colors.text }]}>Categoría</AppText>
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
                    }}
                  >
                    {item.label}
                  </AppText>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.field}>
            <AppText style={[styles.label, { color: colors.text }]}>Prioridad (1-5)</AppText>
            <View style={styles.priorityContainer}>
              {[1, 2, 3, 4, 5].map((p) => (
                <Pressable
                  key={p}
                  onPress={() => setPriority(p)}
                  style={[
                    styles.priorityButton,
                    {
                      backgroundColor: priority === p ? colors.primary : colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <AppText
                    style={{
                      color: priority === p ? colors.onPrimary : colors.text,
                      fontWeight: '600',
                    }}
                  >
                    {p}
                  </AppText>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.field}>
            <AppText style={[styles.label, { color: colors.text }]}>Días de la semana</AppText>
            <AppText style={[styles.helperText, { color: colors.mutedText }]}>
              Selecciona los días en que deseas hacer este hábito
            </AppText>
            <View style={{ marginTop: 12 }}>
              <DaySelector selectedDays={selectedDays} onDaysChange={setSelectedDays} colors={colors} />
            </View>
          </View>

          {selectedDays.length > 0 && (
            <View style={[styles.field, { backgroundColor: colors.surface, padding: 12, borderRadius: 8 }]}>
              <AppText style={[styles.helperText, { color: colors.text }]}>
                Hábito programado para: {getDayNamesFromIndices(selectedDays).join(', ')}
              </AppText>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function getDayNamesFromIndices(indices: number[]): string[] {
  const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  return indices.map((idx) => dayNames[idx]);
}

const styles = StyleSheet.create({
  container: {
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  headerButton: {
    padding: 8,
    minWidth: 40,
    alignItems: 'center',
  },
  saveButton: {
    fontWeight: '600',
    fontSize: 16,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  field: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  helperText: {
    fontSize: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  categoryRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  categoryButton: {
    flex: 1,
    minWidth: 70,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
  },
  priorityContainer: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  priorityButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
  },
});
