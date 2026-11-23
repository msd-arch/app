import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import StatusBadge from '../../components/StatusBadge';
import {
  fetchChildDetail,
  fetchTodayTimeline,
  fetchMonthlyStats,
  ChildDetail,
  TimelineEvent,
  TimelineEventType,
  MonthlyStats,
} from '../../api/child';
import { Colors } from '../../constants/colors';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const AVATAR: Record<string, string> = {
  female: '👧',
  male: '👦',
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function formatRegistration(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

// Timeline event config
const EVENT_CONFIG: Record<
  TimelineEventType,
  { dot: string; suffix?: string }
> = {
  drop_off: { dot: Colors.navy },
  pickup: { dot: Colors.green },
  zone_violation: { dot: Colors.amber, suffix: ' ⚠️' },
  pickup_scheduled: { dot: Colors.blueAccent },
  general: { dot: Colors.textMuted },
};

// ─── Timeline Node ────────────────────────────────────────────────────────────
function TimelineNode({
  event,
  isLast,
}: {
  event: TimelineEvent;
  isLast: boolean;
}) {
  const cfg = EVENT_CONFIG[event.event_type] ?? EVENT_CONFIG.general;
  return (
    <View style={tl.row}>
      {/* Line + dot column */}
      <View style={tl.lineCol}>
        <View style={[tl.dot, { backgroundColor: cfg.dot }]} />
        {!isLast && <View style={tl.line} />}
      </View>

      {/* Content */}
      <View style={tl.content}>
        <Text style={tl.eventTitle}>
          {event.description}
          {cfg.suffix ?? ''}
        </Text>
        <Text style={tl.eventTime}>{formatTime(event.occurred_at)}</Text>
      </View>
    </View>
  );
}

const tl = StyleSheet.create({
  row: { flexDirection: 'row', minHeight: 52 },
  lineCol: { width: 24, alignItems: 'center' },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
    zIndex: 1,
  },
  line: {
    flex: 1,
    width: 2,
    backgroundColor: Colors.border,
    marginTop: 2,
  },
  content: { flex: 1, paddingLeft: 14, paddingBottom: 18 },
  eventTitle: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
    color: Colors.textPrimary,
    lineHeight: 20,
  },
  eventTime: {
    fontSize: 12,
    color: Colors.textMuted,
    fontFamily: 'Inter-Regular',
    marginTop: 2,
  },
});

// ─── Quick Stat Column ────────────────────────────────────────────────────────
function StatCol({
  value,
  label,
  valueColor,
}: {
  value: string;
  label: string;
  valueColor?: string;
}) {
  return (
    <View style={sc.col}>
      <Text style={[sc.value, valueColor ? { color: valueColor } : {}]}>
        {value}
      </Text>
      <Text style={sc.label}>{label}</Text>
    </View>
  );
}

const sc = StyleSheet.create({
  col: { flex: 1, alignItems: 'center' },
  value: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'Inter-Bold',
    color: Colors.navy,
    marginBottom: 3,
  },
  label: {
    fontSize: 12,
    color: Colors.textMuted,
    fontFamily: 'Inter-Regular',
  },
});

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function ChildProfileScreen() {
  const { childId } = useLocalSearchParams<{ childId: string }>();
  const router = useRouter();

  const [child, setChild] = useState<ChildDetail | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [stats, setStats] = useState<MonthlyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setError(false);
    try {
      const [c, t, s] = await Promise.all([
        fetchChildDetail(childId),
        fetchTodayTimeline(childId),
        fetchMonthlyStats(childId),
      ]);
      setChild(c);
      setTimeline(t.slice(0, 6));
      setStats(s);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [childId]);

  useEffect(() => { load(); }, [load]);

  // ─────────────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={s.loadingScreen}>
        <ActivityIndicator size="large" color={Colors.navy} />
      </View>
    );
  }

  if (error || !child) {
    return (
      <View style={s.loadingScreen}>
        <Text style={s.errorMsg}>Could not load child profile.</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 12 }}>
          <Text style={{ color: Colors.blueAccent, fontFamily: 'Inter-SemiBold', fontSize: 14 }}>
            ← Go back
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const avatar = AVATAR[child.gender ?? 'male'];
  const alertsToday = stats?.zone_alerts_today ?? 0;
  const currentStatus = child.current_status;

  return (
    <View style={s.screen}>
      {/* ── HERO ───────────────────────────────────────────────────────── */}
      <SafeAreaView edges={['top']} style={s.hero}>
        {/* Back button */}
        <TouchableOpacity
          style={s.backBtn}
          onPress={() => router.back()}
          hitSlop={12}
        >
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Avatar + info */}
        <View style={s.heroBody}>
          <View style={s.avatarCircle}>
            <Text style={s.avatarEmoji}>{avatar}</Text>
          </View>
          <Text style={s.childName}>{child.name}</Text>
          <Text style={s.childSub}>
            {child.code} · Age {child.age}
          </Text>
          <View style={s.badgeWrap}>
            <StatusBadge status={currentStatus} />
          </View>
        </View>
      </SafeAreaView>

      {/* ── CONTENT (white sheet overlapping hero) ─────────────────────── */}
      <ScrollView
        style={s.sheet}
        contentContainerStyle={s.sheetContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Quick Stats Row ─────────────────────────────────────────── */}
        <View style={s.statsRow}>
          <StatCol
            value={String(stats?.present_days ?? '—')}
            label="Present"
          />
          <View style={s.statDivider} />
          <StatCol
            value={String(alertsToday)}
            label="Alerts"
            valueColor={alertsToday > 0 ? Colors.red : Colors.navy}
          />
          <View style={s.statDivider} />
          <StatCol
            value={
              currentStatus === 'inside'
                ? 'Inside'
                : currentStatus === 'outside'
                  ? 'Outside'
                  : '—'
            }
            label="Status"
            valueColor={
              currentStatus === 'inside' ? '#166534' : Colors.textSecondary
            }
          />
        </View>

        {/* ── Today's Timeline ────────────────────────────────────────── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Today's Activity</Text>

          {timeline.length === 0 ? (
            <Text style={s.emptyTimeline}>No activity recorded today.</Text>
          ) : (
            <View style={s.timelineWrap}>
              {timeline.map((event, idx) => (
                <TimelineNode
                  key={event.id}
                  event={event}
                  isLast={idx === timeline.length - 1}
                />
              ))}
            </View>
          )}
        </View>

        {/* ── Quick Links ─────────────────────────────────────────────── */}
        <View style={s.quickLinksRow}>
          <TouchableOpacity
            style={s.quickLinkCard}
            activeOpacity={0.8}
            onPress={() => router.push('/(tabs)/attendance' as any)}
          >
            <Text style={s.quickLinkText}>📋  View full attendance →</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={s.quickLinkCard}
            activeOpacity={0.8}
            onPress={() => router.push(`/analytics/${child.id}` as any)}
          >
            <Text style={s.quickLinkText}>📊  Activity analytics →</Text>
          </TouchableOpacity>
        </View>

        {/* ── RFID Info ────────────────────────────────────────────────── */}
        <View style={[s.rfidCard]}>
          <Text style={s.rfidHeading}>🔖  RFID Information</Text>
          <View style={s.rfidRow}>
            <Text style={s.rfidLabel}>Tag ID</Text>
            <Text style={s.rfidValue}>{child.rfid_tag_id}</Text>
          </View>
          <View style={[s.rfidRow, { borderBottomWidth: 0 }]}>
            <Text style={s.rfidLabel}>Registered since</Text>
            <Text style={s.rfidValueNormal}>
              {formatRegistration(child.created_at)}
            </Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const HERO_HEIGHT = 260;

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },

  // Loading / error
  loadingScreen: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorMsg: { fontSize: 15, color: Colors.textMuted, fontFamily: 'Inter-Regular' },

  // Hero
  hero: {
    backgroundColor: Colors.navy,
    minHeight: HERO_HEIGHT,
    paddingBottom: 40,      // extra so sheet overlap looks right
  },
  backBtn: {
    position: 'absolute',
    top: 56,
    left: 16,
    zIndex: 10,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBody: {
    alignItems: 'center',
    paddingTop: 52,
    paddingHorizontal: 24,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  avatarEmoji: { fontSize: 40 },
  childName: {
    fontSize: 22,
    fontWeight: '700',
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  childSub: {
    fontSize: 14,
    color: '#93B8E0',
    fontFamily: 'Inter-Regular',
    marginBottom: 12,
  },
  badgeWrap: { alignItems: 'center' },

  // White sheet
  sheet: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: -20,
  },
  sheetContent: { paddingTop: 0 },

  // Stats row
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: Colors.border,
  },

  // Section
  section: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Inter-Bold',
    color: Colors.textPrimary,
    marginBottom: 16,
  },
  emptyTimeline: {
    fontSize: 14,
    color: Colors.textMuted,
    fontFamily: 'Inter-Regular',
    paddingBottom: 8,
  },
  timelineWrap: { paddingLeft: 4 },

  // Quick links
  quickLinksRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    gap: 10,
    marginTop: 8,
    marginBottom: 16,
  },
  quickLinkCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  quickLinkText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Inter-Bold',
    color: Colors.navy,
    lineHeight: 19,
  },

  // RFID card
  rfidCard: {
    marginHorizontal: 16,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  rfidHeading: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Inter-Bold',
    color: Colors.textMuted,
    letterSpacing: 1.2,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  rfidRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  rfidLabel: {
    fontSize: 13,
    color: Colors.textMuted,
    fontFamily: 'Inter-Regular',
  },
  rfidValue: {
    fontSize: 13,
    color: Colors.textPrimary,
    fontFamily: 'Inter-Bold',  // monospace-like with Inter-Bold
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  rfidValueNormal: {
    fontSize: 13,
    color: Colors.textPrimary,
    fontFamily: 'Inter-SemiBold',
    fontWeight: '600',
  },
});
