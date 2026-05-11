import { useRouter } from 'expo-router';
import { collection, doc, documentId, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import React, { useEffect, useMemo, useState } from 'react';
import { LayoutChangeEvent, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Line, Path } from 'react-native-svg';

import { AppText } from '@/components/app-text';
import { useUser } from '@/context/user-context';
import { useAppTheme } from '@/hooks/use-app-theme';
import { db } from '@/services/firebase';
import { type DashboardData, type WeeklyStat } from '@/services/firestore-data';

type Point = { x: number; y: number };

const CHART_WINDOW_DAYS = 3;

function toDateId(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function buildRecentDateIds(days: number) {
  const result: string[] = [];
  const base = new Date();
  base.setHours(0, 0, 0, 0);

  for (let i = days - 1; i >= 0; i -= 1) {
    const current = new Date(base);
    current.setDate(base.getDate() - i);
    result.push(toDateId(current));
  }

  return result;
}

function buildLinePath(points: Point[]) {
  if (points.length === 0) return '';
  return points
    .map((p, index) => {
      const cmd = index === 0 ? 'M' : 'L';
      return `${cmd}${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    })
    .join(' ');
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const router = useRouter();
  const { currentUser } = useUser();
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStat[]>([]);
  const [dashboard, setDashboard] = useState<DashboardData>({
    totalHabitosActivos: 0,
    totalTareasPendientes: 0,
    habitosCompletadosHoy: 0,
    tareasCompletadasHoy: 0,
    rachaActual: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser?.id) return;

    setLoading(true);
    const userRef = doc(db, 'usuarios', currentUser.id);
    const statsRef = collection(db, 'usuarios', currentUser.id, 'estadisticas');
    const dateWindow = buildRecentDateIds(CHART_WINDOW_DAYS);
    const startDateId = dateWindow[0];
    const endDateId = dateWindow[dateWindow.length - 1];
    const statsQuery = query(
      statsRef,
      where(documentId(), '>=', startDateId),
      where(documentId(), '<=', endDateId),
      orderBy(documentId(), 'asc')
    );

    const unsubscribeDashboard = onSnapshot(userRef, (snapshot) => {
      if (!snapshot.exists()) {
        setDashboard({
          totalHabitosActivos: 0,
          totalTareasPendientes: 0,
          habitosCompletadosHoy: 0,
          tareasCompletadasHoy: 0,
          rachaActual: 0,
        });
        return;
      }

      const rawDashboard = snapshot.data().dashboard ?? {};
      setDashboard({
        totalHabitosActivos: Number(rawDashboard.total_habitos_activos ?? 0),
        totalTareasPendientes: Number(rawDashboard.total_tareas_pendientes ?? 0),
        habitosCompletadosHoy: Number(rawDashboard.habitos_completados_hoy ?? 0),
        tareasCompletadasHoy: Number(
          rawDashboard.tareas_completadas_hoy ?? rawDashboard.tareas_completados_hoy ?? 0
        ),
        rachaActual: Number(rawDashboard.racha_actual ?? 0),
      });
    });

    const unsubscribeStats = onSnapshot(
      statsQuery,
      (snapshots) => {
        const byDate = new Map(
          snapshots.docs.map((item) => [
            item.id,
            {
              habitosCompletados: Number(item.data().habitos_completados ?? 0),
              tareasCompletadas: Number(item.data().tareas_completadas ?? 0),
            },
          ])
        );

        const stats: WeeklyStat[] = dateWindow.map((dateId) => {
          const [year, month, day] = dateId.split('-').map(Number);
          const date = new Date(year, month - 1, day);
          const item = byDate.get(dateId);

          return {
            dateId,
            dayLabel: date.toLocaleDateString('es-ES', { weekday: 'short' }),
            habitosCompletados: item?.habitosCompletados ?? 0,
            tareasCompletadas: item?.tareasCompletadas ?? 0,
          };
        });

        setWeeklyStats(stats);
        setLoading(false);
      },
      (error) => {
        console.error('Código de error:', error.code);
        console.error('Mensaje:', error.message);
        setWeeklyStats([]);
        setLoading(false);
      }
    );

    return () => {
      unsubscribeDashboard();
      unsubscribeStats();
    };
  }, [currentUser?.id]);

  const days = useMemo(() => {
    if (weeklyStats.length === 0) {
      return buildRecentDateIds(CHART_WINDOW_DAYS).map((dateId) => {
        const [year, month, day] = dateId.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        return date.toLocaleDateString('es-ES', { weekday: 'short' });
      });
    }
    return weeklyStats.map((item) => item.dayLabel);
  }, [weeklyStats]);

  const data = useMemo(() => {
    if (weeklyStats.length === 0) return Array(CHART_WINDOW_DAYS).fill(0);
    return weeklyStats.map((item) => item.habitosCompletados);
  }, [weeklyStats]);

  const taskData = useMemo(() => {
    if (weeklyStats.length === 0) return Array(CHART_WINDOW_DAYS).fill(0);
    return weeklyStats.map((item) => item.tareasCompletadas);
  }, [weeklyStats]);

  const maxChartValue = useMemo(() => {
    const currentMax = Math.max(...data, ...taskData, 1);
    return Math.max(5, Math.ceil(currentMax / 5) * 5);
  }, [data, taskData]);

  const yTicks = useMemo(() => {
    const step = Math.max(1, Math.ceil(maxChartValue / 4));
    return [0, step, step * 2, step * 3, step * 4];
  }, [maxChartValue]);

  const [chartContainerWidth, setChartContainerWidth] = useState(260);

  const onChartLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0) setChartContainerWidth(w);
  };

  const chart = useMemo(() => {
    const width = chartContainerWidth;
    const height = Math.max(130, width * 0.20);
    const padding = 8;
    const maxY = maxChartValue;
    const minY = 0;

    const plotW = width - padding * 2;
    const plotH = height - padding * 2;

    const habitPoints: Point[] = data.map((v, i) => {
      const tX = data.length <= 1 ? 0 : i / (data.length - 1);
      const tY = (v - minY) / (maxY - minY);

      return {
        x: padding + tX * plotW,
        y: padding + (1 - tY) * plotH,
      };
    });

    const taskPoints: Point[] = taskData.map((v, i) => {
      const tX = taskData.length <= 1 ? 0 : i / (taskData.length - 1);
      const tY = (v - minY) / (maxY - minY);

      return {
        x: padding + tX * plotW,
        y: padding + (1 - tY) * plotH,
      };
    });

    return {
      width,
      height,
      habitPath: buildLinePath(habitPoints),
      taskPath: buildLinePath(taskPoints),
      habitLast: habitPoints[habitPoints.length - 1],
      taskLast: taskPoints[taskPoints.length - 1],
      padding,
      plotW,
      plotH,
    };
  }, [data, taskData, chartContainerWidth, maxChartValue]);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <AppText style={[styles.headerTitle, { color: colors.text }]}>Logros</AppText>
        <View style={styles.headerSide} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
          <AppText style={[styles.cardTitle, { color: colors.text }]}>Completados por día</AppText>
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#2F80ED' }]} />
              <AppText style={[styles.legendText, { color: colors.mutedText }]}>Hábitos</AppText>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#2FA84F' }]} />
              <AppText style={[styles.legendText, { color: colors.mutedText }]}>Tareas</AppText>
            </View>
          </View>
          <View style={styles.chartRow}>
            <View style={styles.yAxis}>
              {yTicks
                .slice()
                .reverse()
                .map((t) => (
                  <AppText key={t} style={[styles.yAxisLabel, { color: colors.mutedText }]}>
                    {t}
                  </AppText>
                ))}
            </View>
            <View style={styles.chartArea} onLayout={onChartLayout}>
              <Svg width="100%" height={chart.height} viewBox={`0 0 ${chart.width} ${chart.height}`}>
                {yTicks.map((t) => {
                  const tY = maxChartValue === 0 ? 0 : t / maxChartValue;
                  const y = chart.padding + (1 - tY) * chart.plotH;
                  return (
                    <Line
                      key={t}
                      x1={chart.padding}
                      x2={chart.padding + chart.plotW}
                      y1={y}
                      y2={y}
                      stroke={colors.border}
                      strokeWidth={1}
                    />
                  );
                })}
                <Path d={chart.habitPath} stroke="#2F80ED" strokeWidth={2.5} fill="none" />
                <Path d={chart.taskPath} stroke="#2FA84F" strokeWidth={2.5} fill="none" />
                {chart.habitLast ? (
                  <Circle cx={chart.habitLast.x} cy={chart.habitLast.y} r={4} fill="#2F80ED" />
                ) : null}
                {chart.taskLast ? (
                  <Circle cx={chart.taskLast.x} cy={chart.taskLast.y} r={4} fill="#2FA84F" />
                ) : null}
              </Svg>

              <View style={styles.xAxis}>
                {weeklyStats.length > 0
                  ? weeklyStats.map((item) => (
                      <AppText key={item.dateId} style={[styles.xAxisLabel, { color: colors.mutedText }]}>
                        {item.dayLabel}
                      </AppText>
                    ))
                  : days.map((d, index) => (
                      <AppText key={`fallback-${index}-${d}`} style={[styles.xAxisLabel, { color: colors.mutedText }]}>
                        {d}
                      </AppText>
                    ))}
              </View>
            </View>
          </View>
        </View>

        <AppText style={[styles.sectionTitle, { color: colors.text }]}>Resumen del dashboard</AppText>
        <View style={[styles.listCard, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
          {loading ? (
            <View style={styles.row}>
              <AppText style={[styles.rowName, { color: colors.mutedText }]}>Cargando datos...</AppText>
            </View>
          ) : (
            <>
              <View style={styles.row}>
                <AppText style={[styles.rowName, { color: colors.text }]}>Hábitos activos</AppText>
                <AppText style={[styles.rowScore, { color: colors.text }]}>{dashboard.totalHabitosActivos}</AppText>
              </View>
              <View style={styles.row}>
                <AppText style={[styles.rowName, { color: colors.text }]}>Tareas pendientes</AppText>
                <AppText style={[styles.rowScore, { color: colors.text }]}>{dashboard.totalTareasPendientes}</AppText>
              </View>
              <View style={styles.row}>
                <AppText style={[styles.rowName, { color: colors.text }]}>Hábitos completados hoy</AppText>
                <AppText style={[styles.rowScore, { color: colors.text }]}>{dashboard.habitosCompletadosHoy}</AppText>
              </View>
              <View style={styles.row}>
                <AppText style={[styles.rowName, { color: colors.text }]}>Tareas completadas hoy</AppText>
                <AppText style={[styles.rowScore, { color: colors.text }]}>{dashboard.tareasCompletadasHoy}</AppText>
              </View>
              <View style={styles.row}>
                <AppText style={[styles.rowName, { color: colors.text }]}>Racha actual</AppText>
                <AppText style={[styles.rowScore, { color: colors.text }]}>{dashboard.rachaActual}</AppText>
              </View>
            </>
          )}
        </View>
      </ScrollView>
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
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    color: '#111111',
    padding: 10,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 22,
  },
  card: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111111',
    marginBottom: 8,
  },
  legendRow: {
    flexDirection: 'row',
    marginBottom: 8,
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  legendText: {
    fontSize: 10,
    fontWeight: '600',
  },
  chartRow: {
    flexDirection: 'row',
  },
  yAxis: {
    width: 28,
    justifyContent: 'space-between',
    paddingTop: 2,
    paddingBottom: 20,
  },
  yAxisLabel: {
    fontSize: 9,
    color: '#9ca3af',
  },
  chartArea: {
    flex: 1,
  },
  xAxis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingLeft: 8,
    paddingRight: 6,
    marginTop: -2,
  },
  xAxisLabel: {
    fontSize: 8,
    color: '#9ca3af',
  },
  sectionTitle: {
    marginTop: 14,
    marginBottom: 8,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    color: '#111111',
  },
  listCard: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  rowName: {
    flex: 1,
    fontSize: 11,
    color: '#111111',
  },
  rowTime: {
    width: 90,
    textAlign: 'center',
    fontSize: 9,
    color: '#9ca3af',
  },
  rowScore: {
    width: 28,
    textAlign: 'right',
    fontSize: 10,
    color: '#9ca3af',
    fontWeight: '700',
  },
});
