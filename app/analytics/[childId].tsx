import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BarChart, LineChart } from 'react-native-chart-kit';

import SectionHeader from '../../components/SectionHeader';
import {
  getActivitySummary,
  getActivityLog,
  ActivitySummary,
  ActivityLogEntry,
  AnalyticsPeriod,
  ActivityCategory,
} from '../../api/analytics';
import { Colors } from '../../constants/colors';

// ─── Constants ─────────────────────────────────────────────────────────────────
const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_WIDTH = SCREEN_WIDTH - 64;

type PeriodKey = 'today' | 'week' | 'month';
const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
];

// ─── Chart config (reused for both charts) ────────────────────────────────────
const makeChartConfig = (lineColor: string) => ({
  backgroundColor: '#FFFFFF',
  backgroundGradientFrom: '#FFFFFF',
  backgroundGradientTo: '#FFFFFF',
  decimalPlaces: 0,
  color: (opacity = 1) => {
    // Parse lineColor hex to rgb
    const hex = lineColor.replace('#', '');
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${opacity})`;
  },
  labelColor: () => Colors.textMuted,
  style: { borderRadius: 12 },
  propsForDots: { r: '4', strokeWidth: '2', stroke: lineColor },
  propsForBackgroundLines: { stroke: Colors.divider, strokeDasharray: '' },
});

const barChartConfig = makeChartConfig(Colors.navy);
const lineChartConfig = makeChartConfig(Colors.red);

// ─── Energy Level Pill ────────────────────────────────────────────────────────
const ENERGY_CONFIG = {
  high: { label: 'High', bg: Colors.greenLight, text: '#166534' },
  medium: { label: 'Medium', bg: Colors.amberLight, text: '#92400E' },
  low: { label: 'Low', bg: Colors.redLight, text: '#991B1B' },
};

function EnergyPill({ level }: { level: keyof typeof ENERGY_CONFIG }) {
  const cfg = ENERGY_CONFIG[level];
  return (
    <View style={[ep.pill, { backgroundColor: cfg.bg }]}>
      <Text style={[ep.text, { color: cfg.text }]}>{cfg.label}</Text>
    </View>
  );
}
const ep = StyleSheet.create({
  pill: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 4, alignSelf: 'flex-start' },
  text: { fontSize: 14, fontWeight: '700', fontFamily: 'Inter-Bold' },
});

// ─── Category Chip ────────────────────────────────────────────────────────────
const CATEGORY_STYLE: Record<ActivityCategory, { bg: string; text: string }> = {
  Movement: { bg: '#EFF6FF', text: Colors.blueAccent },
  Alert: { bg: Colors.amberLight, text: '#92400E' },
  Attendance: { bg: Colors.greenLight, text: '#166534' },
  General: { bg: Colors.divider, text: Colors.textMuted },
};

function CategoryChip({ category }: { category: ActivityCategory }) {
  const cfg = CATEGORY_STYLE[category] ?? CATEGORY_STYLE.General;
  return (
    <View style={[cc.chip, { backgroundColor: cfg.bg }]}>
      <Text style={[cc.text, { color: cfg.text }]}>{category}</Text>
    </View>
  );
}
const cc = StyleSheet.create({
  chip: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 3 },
  text: { fontSize: 11, fontWeight: '700', fontFamily: 'Inter-Bold' },
});

// ─── Activity Log Row ─────────────────────────────────────────────────────────
function LogRow({ entry }: { entry: ActivityLogEntry }) {
  const d = new Date(entry.occurred_at);
  const hh = d.getHours().toString().padStart(2, '0');
  const mm = d.getMinutes().toString().padStart(2, '0');
  return (
    <View style={lr.row}>
      <Text style={lr.time}>{hh}:{mm}</Text>
      <Text style={lr.desc} numberOfLines={2}>{entry.description}</Text>
      <CategoryChip category={entry.category} />
    </View>
  );
}
const lr = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
    gap: 10,
  },
  time: { fontSize: 13, fontWeight: '700', fontFamily: 'Inter-Bold', color: Colors.navy, width: 42 },
  desc: { flex: 1, fontSize: 13, fontFamily: 'Inter-Regular', color: Colors.textPrimary, lineHeight: 18 },
});

// ─── Guard: ensure chart datasets always have at least 2 points ───────────────
function safeDataset(values: number[]): number[] {
  if (values.length === 0) return [0, 0];
  if (values.length === 1) return [values[0], values[0]];
  return values;
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function AnalyticsScreen() {
  const { childId } = useLocalSearchParams<{ childId: string }>();
  const router = useRouter();

  const [period, setPeriod] = useState<PeriodKey>('week');
  const [summary, setSummary] = useState<ActivitySummary | null>(null);
  const [log, setLog] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [logLoading, setLogLoading] = useState(false);
  const [error, setError] = useState(false);

  const todayStr = new Date().toISOString().slice(0, 10);

  const loadSummary = useCallback(
    async (p: AnalyticsPeriod) => {

      setError(false);
      setLoading(true);
      try {
        const data = await getActivitySummary(childId, p);
        setSummary(data);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    },
    [childId],
  );

  const loadLog = useCallback(async () => {
    setLogLoading(true);
    try {
      const data = await getActivityLog(childId, todayStr);
      setLog(data);
    } catch {
      setLog([]);
    } finally {
      setLogLoading(false);
    }
  }, [childId, todayStr]);

  useEffect(() => {
    loadSummary(period);
  }, [period, loadSummary]);

  // Load activity log only when "Today" is selected
  useEffect(() => {
    if (period === 'today') loadLog();
    else setLog([]);
  }, [period, loadLog]);

  // ── Derived chart data ─────────────────────────────────────────────────
  const energyLabels = summary?.energy_by_period.map((p) => p.label) ?? [];
  const energyData = safeDataset(summary?.energy_by_period.map((p) => p.score ?? 0) ?? []);
  const alertLabels = summary?.alerts_by_period.map((p) => p.label) ?? [];
  const alertData = safeDataset(summary?.alerts_by_period.map((p) => p.score ?? 0) ?? []);
  const allZeroAlerts = alertData.every((v) => v === 0);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <View style={s.screen}>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <SafeAreaView edges={['top']} style={s.header}>
        <View style={s.headerRow}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="chevron-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Activity & Analytics</Text>
          <View style={{ width: 24 }} />
        </View>
      </SafeAreaView>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Period Selector ─────────────────────────────────────────── */}
        <View style={s.periodRow}>
          {PERIODS.map((p) => {
            const active = p.key === period;
            return (
              <TouchableOpacity
                key={p.key}
                style={[s.periodPill, active && s.periodPillActive]}
                onPress={() => setPeriod(p.key)}
                activeOpacity={0.75}
              >
                <Text style={[s.periodText, active && s.periodTextActive]}>
                  {p.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {loading ? (
          <View style={s.loadingBox}>
            <ActivityIndicator size="large" color={Colors.navy} />
          </View>
        ) : error ? (
          <TouchableOpacity
            style={s.errorBanner}
            onPress={() => loadSummary(period)}
          >
            <Text style={s.errorText}>
              Could not load analytics. Tap to retry.
            </Text>
          </TouchableOpacity>
        ) : summary ? (
          <>
            {/* ── Energy Level Card ──────────────────────────────────── */}
            <View style={s.card}>
              <Text style={s.cardTitle}>Energy Level</Text>

              <BarChart
                data={{
                  labels: energyLabels,
                  datasets: [{ data: energyData }],
                }}
                width={CHART_WIDTH}
                height={180}
                yAxisLabel=""
                yAxisSuffix=""
                chartConfig={barChartConfig}
                style={s.chart}
                showValuesOnTopOfBars={false}
                fromZero
                withInnerLines
              />

              <View style={s.energyFooter}>
                <EnergyPill level={summary.energy_level} />
                <Text style={s.avgScore}>
                  {summary.avg_score}/100 average activity
                </Text>
              </View>
            </View>

            {/* ── Zone Violations Card ───────────────────────────────── */}
            <View style={s.card}>
              <Text style={s.cardTitle}>Zone Violations</Text>

              {allZeroAlerts ? (
                <View style={s.noAlerts}>
                  <Text style={s.noAlertsEmoji}>✅</Text>
                  <Text style={s.noAlertsText}>
                    No zone violations this period
                  </Text>
                </View>
              ) : (
                <LineChart
                  data={{
                    labels: alertLabels,
                    datasets: [{ data: alertData, color: () => Colors.red }],
                  }}
                  width={CHART_WIDTH}
                  height={180}
                  chartConfig={lineChartConfig}
                  style={s.chart}
                  bezier
                  fromZero
                  withDots
                  withInnerLines
                />
              )}
            </View>

            {/* ── Activity Log (Today only) ──────────────────────────── */}
            {period === 'today' && (
              <View style={s.logCard}>
                <SectionHeader icon="📋" title="Activity Log" />
                <View style={{ marginTop: 12 }}>
                  {logLoading ? (
                    <ActivityIndicator color={Colors.navy} style={{ marginVertical: 16 }} />
                  ) : log.length === 0 ? (
                    <Text style={s.noLog}>No activity recorded today.</Text>
                  ) : (
                    log.map((entry) => (
                      <LogRow key={entry.id} entry={entry} />
                    ))
                  )}
                </View>
              </View>
            )}
          </>
        ) : null}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },

  // Header
  header: {
    backgroundColor: Colors.navy,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },

  // Period selector
  periodRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  periodPill: {
    flex: 1,
    height: 36,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodPillActive: { backgroundColor: Colors.navy, borderColor: Colors.navy },
  periodText: { fontSize: 13, fontWeight: '600', fontFamily: 'Inter-SemiBold', color: Colors.textMuted },
  periodTextActive: { color: '#FFFFFF' },

  // Cards
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    marginHorizontal: 16,
    padding: 20,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Inter-Bold',
    color: Colors.textPrimary,
    marginBottom: 14,
  },
  chart: { borderRadius: 8, marginLeft: -16 },

  // Energy footer
  energyFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 14,
  },
  avgScore: {
    fontSize: 13,
    color: Colors.textMuted,
    fontFamily: 'Inter-Regular',
  },

  // No alerts
  noAlerts: {
    alignItems: 'center',
    paddingVertical: 28,
  },
  noAlertsEmoji: { fontSize: 36, marginBottom: 10 },
  noAlertsText: {
    fontSize: 14,
    color: Colors.green,
    fontFamily: 'Inter-SemiBold',
    fontWeight: '600',
  },

  // Log card
  logCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    marginHorizontal: 16,
    padding: 20,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  noLog: { fontSize: 14, color: Colors.textMuted, fontFamily: 'Inter-Regular', paddingVertical: 12 },

  // States
  loadingBox: { paddingVertical: 60, alignItems: 'center' },
  errorBanner: {
    marginHorizontal: 16,
    backgroundColor: Colors.redLight,
    borderRadius: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FECACA',
    alignItems: 'center',
  },
  errorText: { fontSize: 13, color: Colors.red, fontFamily: 'Inter-Regular' },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: { paddingTop: 0, paddingBottom: 32 },
});
