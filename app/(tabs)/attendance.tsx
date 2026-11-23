import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  SectionList,
  TouchableOpacity,
  RefreshControl,
  Animated,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AttendanceDayRow from '../../components/AttendanceDayRow';
import SectionHeader from '../../components/SectionHeader';

import { getAttendanceHistory, AttendanceRecord } from '../../api/attendance';
import { calcStats, groupByWeek } from '../../utils/attendanceUtils';
import { useChild } from '../../hooks/useChild';
import { Colors } from '../../constants/colors';

// ─── Constants ─────────────────────────────────────────────────────────────────
const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

// ─── Shimmer block ─────────────────────────────────────────────────────────────
function ShimmerBlock({ width, height, style }: {
  width: number | string;
  height: number;
  style?: object;
}) {
  const opacity = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 800, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);
  return (
    <Animated.View
      style={[{ width, height, borderRadius: 8, backgroundColor: '#E2E8F0', opacity }, style]}
    />
  );
}

// ─── Stats Card ────────────────────────────────────────────────────────────────
function StatColumn({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.statCol}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ─── Screen ────────────────────────────────────────────────────────────────────
export default function AttendanceScreen() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-indexed

  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Get child id from the child hook (re-use existing hook)
  const { child } = useChild();

  const monthScrollRef = useRef<ScrollView>(null);

  // Scroll the month pill into view when switched
  useEffect(() => {
    // approx pill width 70px — scroll so active is centred
    monthScrollRef.current?.scrollTo({
      x: Math.max(0, (selectedMonth - 1) * 70 - 100),
      animated: true,
    });
  }, [selectedMonth]);

  // ── Data loading ──────────────────────────────────────────────────────────
  const loadRecords = useCallback(async (month: number) => {
    if (!child?.id) return;
    setError(false);
    try {
      const data = await getAttendanceHistory(child.id, currentYear, month);
      setRecords(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [child?.id, currentYear]);

  useEffect(() => {
    setLoading(true);
    setRecords([]);
    loadRecords(selectedMonth);
  }, [selectedMonth, loadRecords]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadRecords(selectedMonth);
    setRefreshing(false);
  }, [loadRecords, selectedMonth]);

  // ── Derived ───────────────────────────────────────────────────────────────
  const stats = calcStats(records, currentYear, selectedMonth);
  const sections = groupByWeek(records);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <View style={styles.screen}>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <SafeAreaView edges={['top']} style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerBrand}>IDENTRA - CARE VISION</Text>
          <Text style={styles.headerTitle}>Attendance</Text>
        </View>
      </SafeAreaView>

      {/* ── Month Pill Selector ────────────────────────────────────────── */}
      <View style={styles.monthBar}>
        <ScrollView
          ref={monthScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.monthScroll}
        >
          {MONTH_LABELS.map((label, idx) => {
            const month = idx + 1;
            const active = month === selectedMonth;
            return (
              <TouchableOpacity
                key={month}
                style={[styles.monthPill, active && styles.monthPillActive]}
                onPress={() => setSelectedMonth(month)}
                activeOpacity={0.75}
              >
                <Text style={[styles.monthPillText, active && styles.monthPillTextActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Body ───────────────────────────────────────────────────────── */}
      {loading ? (
        <ScrollView contentContainerStyle={styles.bodyPad}>
          {/* Stats skeleton */}
          <View style={[styles.statsCard, styles.mx16]}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={styles.statCol}>
                <ShimmerBlock width={36} height={24} style={{ marginBottom: 6 }} />
                <ShimmerBlock width={52} height={13} />
              </View>
            ))}
          </View>
          {/* Row skeletons */}
          {[0, 1, 2, 4, 5].map((i) => (
            <View key={i} style={styles.skeletonRow}>
              <ShimmerBlock width={44} height={40} />
              <View style={{ flex: 1, marginLeft: 24, gap: 8 }}>
                <ShimmerBlock width="55%" height={13} />
                <ShimmerBlock width="40%" height={13} />
              </View>
            </View>
          ))}
        </ScrollView>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.date}
          contentContainerStyle={records.length === 0 ? styles.emptyContainer : styles.bodyPad}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.navy}
              colors={[Colors.navy]}
            />
          }
          // ── Stats Card ────────────────────────────────────────────────
          ListHeaderComponent={
            <>
              {error && (
                <TouchableOpacity style={styles.errorBanner} onPress={onRefresh}>
                  <Text style={styles.errorText}>Could not load data. Tap to retry.</Text>
                </TouchableOpacity>
              )}
              <View style={[styles.statsCard, styles.mx16]}>
                <StatColumn value={stats.totalDays} label="Total Days" />
                <View style={styles.statDivider} />
                <StatColumn value={stats.present} label="Present" />
                <View style={styles.statDivider} />
                <StatColumn value={stats.absent} label="Absent" />
              </View>
            </>
          }
          // ── Empty state ───────────────────────────────────────────────
          ListEmptyComponent={
            <View style={styles.emptyInner}>
              <Text style={styles.emptyEmoji}>📋</Text>
              <Text style={styles.emptyText}>No attendance records for this month</Text>
            </View>
          }
          // ── Section header ─────────────────────────────────────────────
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeaderWrap}>
              <SectionHeader icon="📅" title={section.title} />
            </View>
          )}
          // ── Row ────────────────────────────────────────────────────────
          renderItem={({ item, section, index }) => {
            const isLast = index === section.data.length - 1;
            return (
              <View style={[styles.mx16, styles.card]}>
                <AttendanceDayRow
                  date={item.date}
                  dayName={item.dayName}
                  dayNumber={item.dayNumber}
                  dropOffTime={item.dropOffTime}
                  pickupTime={item.pickupTime}
                  isPresent={item.isPresent}
                  isLast={isLast}
                />
              </View>
            );
          }}
          // Group identical section cards by clipping
          stickySectionHeadersEnabled={false}
        />
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  // Header
  header: {
    backgroundColor: Colors.navy,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 6,
  },
  headerContent: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    paddingTop: 4,
  },
  headerBrand: {
    fontSize: 11,
    letterSpacing: 2,
    color: '#93B8E0',
    fontFamily: 'Inter-Regular',
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },

  // Month selector
  monthBar: {
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  monthScroll: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  monthPill: {
    height: 34,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthPillActive: {
    backgroundColor: Colors.navy,
    borderColor: Colors.navy,
  },
  monthPillText: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
    color: Colors.textMuted,
  },
  monthPillTextActive: {
    color: '#FFFFFF',
  },

  // Body
  bodyPad: {
    paddingTop: 16,
    paddingBottom: 32,
    gap: 12,
  },
  mx16: {
    marginHorizontal: 16,
  },

  // Stats card
  statsCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    fontFamily: 'Inter-Bold',
    color: Colors.navy,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    fontFamily: 'Inter-Regular',
  },
  statDivider: {
    width: 1,
    height: '60%',
    backgroundColor: Colors.border,
    alignSelf: 'center',
  },

  // Section header
  sectionHeaderWrap: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },

  // Attendance card (wraps rows)
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },

  // Skeleton
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },

  // Empty state
  emptyContainer: {
    flexGrow: 1,
  },
  emptyInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyEmoji: {
    fontSize: 80,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 15,
    color: Colors.textMuted,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    paddingHorizontal: 32,
  },

  // Error banner
  errorBanner: {
    marginHorizontal: 16,
    marginBottom: 4,
    backgroundColor: Colors.redLight,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: {
    fontSize: 13,
    color: Colors.red,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
  },
});
