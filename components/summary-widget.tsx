import React from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';

export type SummaryWidgetProps = {
  colors: {
    surface: string;
    border: string;
    text: string;
    mutedText: string;
    primary: string;
    onPrimary: string;
  };
  title?: string;
  subtitle?: string;
  habitsActive: number;
  tasksPending: number;
  streak: number;
};

export function SummaryWidget({
  colors,
  title = 'Widget del día',
  subtitle = 'Resumen rápido de tu progreso',
  habitsActive,
  tasksPending,
  streak,
}: SummaryWidgetProps) {
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.header}>
        <View>
          <AppText style={[styles.title, { color: colors.text }]}>{title}</AppText>
          <AppText style={[styles.subtitle, { color: colors.mutedText }]}>{subtitle}</AppText>
        </View>
        <View style={[styles.badge, { backgroundColor: colors.primary }]}>
          <AppText style={[styles.badgeText, { color: colors.onPrimary }]}>{streak} días</AppText>
        </View>
      </View>

      <View style={styles.metricsRow}>
        <MetricBlock label="Hábitos activos" value={habitsActive} colors={colors} />
        <MetricBlock label="Tareas pendientes" value={tasksPending} colors={colors} />
        <MetricBlock label="Racha" value={streak} colors={colors} suffix="d" />
      </View>
    </View>
  );
}

function MetricBlock({
  label,
  value,
  suffix,
  colors,
}: {
  label: string;
  value: number;
  suffix?: string;
  colors: SummaryWidgetProps['colors'];
}) {
  return (
    <View style={[styles.metric, { borderColor: colors.border }]}>
      <AppText style={[styles.metricValue, { color: colors.text }]}>
        {value}
        {suffix ?? ''}
      </AppText>
      <AppText style={[styles.metricLabel, { color: colors.mutedText }]}>{label}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  subtitle: {
    marginTop: 2,
    fontSize: 12,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  metric: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 22,
    fontWeight: '800',
  },
  metricLabel: {
    marginTop: 4,
    fontSize: 11,
    textAlign: 'center',
  },
});
