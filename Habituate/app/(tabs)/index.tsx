import React, { useMemo, useState } from 'react';
import { LayoutChangeEvent, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Line, Path } from 'react-native-svg';

import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/components/app-text';
import { useAppTheme } from '@/hooks/use-app-theme';

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
  const days = useMemo(
    () => ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'],
    []
  );

  const data = useMemo(() => [1, 4, 3, 6, 10, 8, 18], []);
  const yTicks = useMemo(() => [0, 5, 10, 15, 20], []);
  const [chartContainerWidth, setChartContainerWidth] = useState(260);

  const onChartLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0) setChartContainerWidth(w);
  };

  const chart = useMemo(() => {
    const width = chartContainerWidth;
    const height = Math.max(130, width * 0.20);
    const padding = 8;
    const maxY = 20;
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
  }, [data, chartContainerWidth]);

  const completed = useMemo(
    () => [
      { name: 'Tarea de Casa', time: '10:00 - 11:30', score: '+6' },
      { name: 'Tarea de Deporte', time: '12:00 - 13:30', score: '+8' },
      { name: 'Tarea de Salida', time: '13:45 - 15:30', score: '+2' },
      { name: 'Tarea de Medicación', time: '21:00 - 21:30', score: '+9' },
    ],
    []
  );

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
                  const tY = t / 20;
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
          {completed.map((item) => (
            <View key={item.name} style={styles.row}>
              <AppText style={[styles.rowName, { color: colors.text }]}>{item.name}</AppText>
              <AppText style={[styles.rowTime, { color: colors.mutedText }]}>{item.time}</AppText>
              <AppText style={[styles.rowScore, { color: colors.mutedText }]}>{item.score}</AppText>
            </View>
          ))}
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