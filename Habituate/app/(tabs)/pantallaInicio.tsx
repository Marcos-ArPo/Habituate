import React, { useEffect, useMemo, useState } from 'react';
import { LayoutChangeEvent, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Line, Path } from 'react-native-svg';

import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/components/app-text';
import { useUser } from '@/context/user-context';
import { useAppTheme } from '@/hooks/use-app-theme';
import {
  buildDateId,
  getCompletedHabitsByDate,
  getUserDashboard,
  getWeeklyHabitStats,
  type HabitItem,
  type WeeklyStat,
} from '@/services/firestore-data';

type Point = { x: number; y: number };

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
  const { currentUser } = useUser();
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStat[]>([]);
  const [completedHabits, setCompletedHabits] = useState<HabitItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      if (!currentUser?.id) {
        setWeeklyStats([]);
        setCompletedHabits([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const todayId = buildDateId();

        const [stats, completed] = await Promise.all([
          getWeeklyHabitStats(currentUser.id, 7),
          getCompletedHabitsByDate(currentUser.id, todayId),
          // Lectura de dashboard para mantener sincronizada la vista con el modelo.
          getUserDashboard(currentUser.id),
        ]);

        if (cancelled) return;

        setWeeklyStats(stats);
        setCompletedHabits(completed);
      } catch {
        if (cancelled) return;
        setWeeklyStats([]);
        setCompletedHabits([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, [currentUser?.id]);

  const days = useMemo(() => {
    if (weeklyStats.length === 0) return ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    return weeklyStats.map((item) => item.dayLabel);
  }, [weeklyStats]);

  const data = useMemo(() => {
    if (weeklyStats.length === 0) return [0, 0, 0, 0, 0, 0, 0];
    return weeklyStats.map((item) => item.habitosCompletados);
  }, [weeklyStats]);

  const maxChartValue = useMemo(() => {
    const currentMax = Math.max(...data, 1);
    return Math.max(5, Math.ceil(currentMax / 5) * 5);
  }, [data]);

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

    const points: Point[] = data.map((v, i) => {
      const tX = data.length <= 1 ? 0 : i / (data.length - 1);
      const tY = (v - minY) / (maxY - minY);

      return {
        x: padding + tX * plotW,
        y: padding + (1 - tY) * plotH,
      };
    });

    return {
      width,
      height,
      points,
      path: buildLinePath(points),
      last: points[points.length - 1],
      padding,
      plotW,
      plotH,
    };
  }, [data, chartContainerWidth, maxChartValue]);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.headerSide}>
          <Ionicons name="person-outline" size={18} color={colors.text} />
        </View>
        <AppText style={[styles.headerTitle, { color: colors.text }]}>Logros</AppText>
        <View style={styles.headerSide} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
          <AppText style={[styles.cardTitle, { color: colors.text }]}>Hábitos completados</AppText>
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
                <Path d={chart.path} stroke={colors.accent} strokeWidth={2.5} fill="none" />
                {chart.last ? (
                  <Circle cx={chart.last.x} cy={chart.last.y} r={4} fill={colors.accent} />
                ) : null}
              </Svg>

              <View style={styles.xAxis}>
                {days.map((d) => (
                  <AppText key={d} style={[styles.xAxisLabel, { color: colors.mutedText }]}>
                    {d}
                  </AppText>
                ))}
              </View>
            </View>
          </View>
        </View>

        <AppText style={[styles.sectionTitle, { color: colors.text }]}>Habitos Completados</AppText>
        <View style={[styles.listCard, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
          {loading ? (
            <View style={styles.row}>
              <AppText style={[styles.rowName, { color: colors.mutedText }]}>Cargando datos...</AppText>
            </View>
          ) : completedHabits.length === 0 ? (
            <View style={styles.row}>
              <AppText style={[styles.rowName, { color: colors.mutedText }]}>No hay hábitos completados hoy.</AppText>
            </View>
          ) : (
            completedHabits.map((item) => (
              <View key={item.id} style={styles.row}>
                <AppText style={[styles.rowName, { color: colors.text }]}>{item.nombre}</AppText>
                <AppText style={[styles.rowTime, { color: colors.mutedText }]}>
                  {item.horaRecordatorio ? `Hora ${item.horaRecordatorio}` : 'Sin hora'}
                </AppText>
                <AppText style={[styles.rowScore, { color: colors.mutedText }]}>
                  {item.calificacion ? `+${item.calificacion}` : '--'}
                </AppText>
              </View>
            ))
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
