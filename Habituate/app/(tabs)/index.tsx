import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';

import { Ionicons } from '@expo/vector-icons';

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
  const days = useMemo(
    () => ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'],
    []
  );

  const data = useMemo(() => [1, 4, 3, 6, 10, 8, 18], []);
  const yTicks = useMemo(() => [0, 5, 10, 15, 20], []);

  const chart = useMemo(() => {
    const width = 260;
    const height = 130;
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
  }, [data]);

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
    <View style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerSide}>
          <Ionicons name="person-outline" size={18} color="#111" />
        </View>
        <Text style={styles.headerTitle}>Logros</Text>
        <View style={styles.headerSide} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Hábitos completados</Text>
          <View style={styles.chartRow}>
            <View style={styles.yAxis}>
              {yTicks
                .slice()
                .reverse()
                .map((t) => (
                  <Text key={t} style={styles.yAxisLabel}>
                    {t}
                  </Text>
                ))}
            </View>
            <View style={styles.chartArea}>
              <Svg width={chart.width} height={chart.height}>
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
                      stroke="#eef2f7"
                      strokeWidth={1}
                    />
                  );
                })}
                <Path d={chart.path} stroke="#2f6bff" strokeWidth={2.5} fill="none" />
                {chart.last ? (
                  <Circle cx={chart.last.x} cy={chart.last.y} r={4} fill="#2f6bff" />
                ) : null}
              </Svg>

              <View style={styles.xAxis}>
                {days.map((d) => (
                  <Text key={d} style={styles.xAxisLabel}>
                    {d}
                  </Text>
                ))}
              </View>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Habitos Completados</Text>
        <View style={styles.listCard}>
          {completed.map((item) => (
            <View key={item.name} style={styles.row}>
              <Text style={styles.rowName}>{item.name}</Text>
              <Text style={styles.rowTime}>{item.time}</Text>
              <Text style={styles.rowScore}>{item.score}</Text>
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
    backgroundColor: '#ffffff',
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
    borderColor: '#eef2f7',
    borderRadius: 10,
    padding: 12,
    backgroundColor: '#ffffff',
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
    borderColor: '#eef2f7',
    borderRadius: 10,
    paddingVertical: 6,
    backgroundColor: '#ffffff',
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
