import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import apiClient from '../../api/client';
import NotificationRow from '../../components/NotificationRow';
import {
  useNotificationStore,
  AppNotificationItem,
  NotifType,
} from '../../store/notificationStore';
import { Colors } from '../../constants/colors';
import { formatNotifTime } from '../../utils/formatNotifTime';

// ─── Filter config ──────────────────────────────────────────────────────────────
type FilterKey = 'all' | 'safety' | 'attendance' | 'fees' | 'reminders';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'safety', label: 'Safety' },
  { key: 'attendance', label: 'Attendance' },
  { key: 'fees', label: 'Fees' },
  { key: 'reminders', label: 'Reminders' },
];

function applyFilter(
  items: AppNotificationItem[],
  filter: FilterKey,
): AppNotificationItem[] {
  switch (filter) {
    case 'safety':
      return items.filter((n) => n.type === 'zone_violation');
    case 'attendance':
      return items.filter(
        (n) => n.type === 'drop_off' || n.type === 'pickup_reminder',
      );
    case 'fees':
      return items.filter(
        (n) =>
          n.type === 'general' &&
          /fee|payment|due|overdue/i.test(n.body + n.title),
      );
    case 'reminders':
      return items.filter((n) => n.type === 'pickup_reminder');
    default:
      return items;
  }
}

// ─── Date group labels ─────────────────────────────────────────────────────────
type GroupKey = 'today' | 'yesterday' | 'this_week' | 'older';

function getGroupKey(isoDate: string): GroupKey {
  const now = new Date();
  const d = new Date(isoDate);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = Math.round((today.getTime() - target.getTime()) / 86400000);
  if (diff === 0) return 'today';
  if (diff === 1) return 'yesterday';
  if (diff <= 7) return 'this_week';
  return 'older';
}

const GROUP_LABELS: Record<GroupKey, string> = {
  today: 'Today',
  yesterday: 'Yesterday',
  this_week: 'Earlier this week',
  older: 'Older',
};

const GROUP_ORDER: GroupKey[] = ['today', 'yesterday', 'this_week', 'older'];

interface ListItem {
  kind: 'header' | 'row';
  key: string;
  groupLabel?: string;
  notification?: AppNotificationItem;
}

function buildListData(items: AppNotificationItem[]): ListItem[] {
  const groups = new Map<GroupKey, AppNotificationItem[]>();
  for (const key of GROUP_ORDER) groups.set(key, []);
  for (const n of items) groups.get(getGroupKey(n.occurred_at))!.push(n);

  const result: ListItem[] = [];
  for (const key of GROUP_ORDER) {
    const group = groups.get(key)!;
    if (!group.length) continue;
    result.push({ kind: 'header', key: `h-${key}`, groupLabel: GROUP_LABELS[key] });
    for (const n of group) {
      result.push({ kind: 'row', key: `r-${n.id}`, notification: n });
    }
  }
  return result;
}

// ─── Screen ────────────────────────────────────────────────────────────────────
export default function AlertsScreen() {
  const notifications = useNotificationStore((s) => s.notifications);
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const markRead = useNotificationStore((s) => s.markRead);
  const markAllReadStore = useNotificationStore((s) => s.markAllRead);
  const setNotifications = useNotificationStore((s) => s.setNotifications);

  const [filter, setFilter] = useState<FilterKey>('all');
  const [loading, setLoading] = useState(notifications.length === 0);
  const [refreshing, setRefreshing] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  // ── Fetch all notifications from API ────────────────────────────────────
  const fetchNotifications = useCallback(async () => {
    try {
      const { data } = await apiClient.get<
        {
          id: string | number;
          notification_type: NotifType;
          title: string;
          message: string;
          occurred_at: string;
          is_read: boolean;
          child_name: string;
        }[]
      >('/api/notifications/?ordering=-occurred_at&limit=100');

      const normalised: AppNotificationItem[] = data.map((n) => ({
        id: n.id,
        type: n.notification_type,
        title: n.title,
        body: n.message,
        occurred_at: n.occurred_at,
        is_read: n.is_read,
        child_name: n.child_name,
      }));
      setNotifications(normalised);
    } catch {
      // Keep existing store data on error
    } finally {
      setLoading(false);
    }
  }, [setNotifications]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  }, [fetchNotifications]);

  // ── Mark individual as read ────────────────────────────────────────────
  const handleTapNotification = useCallback(
    async (n: AppNotificationItem) => {
      if (!n.is_read) {
        markRead(n.id);
        try {
          await apiClient.patch(`/api/notifications/${n.id}/read/`);
        } catch {
          // best-effort
        }
      }
    },
    [markRead],
  );

  // ── Mark all read ──────────────────────────────────────────────────────
  const handleMarkAllRead = useCallback(async () => {
    setMarkingAll(true);
    try {
      await apiClient.patch('/api/notifications/mark-all-read/');
      markAllReadStore();
    } catch {
      // fallback: still update local store
      markAllReadStore();
    } finally {
      setMarkingAll(false);
    }
  }, [markAllReadStore]);

  // ── Derived list ───────────────────────────────────────────────────────
  const filtered = useMemo(
    () => applyFilter(notifications, filter),
    [notifications, filter],
  );
  const listData = useMemo(() => buildListData(filtered), [filtered]);

  // ─────────────────────────────────────────────────────────────────────────
  const renderItem = ({ item }: { item: ListItem }) => {
    if (item.kind === 'header') {
      return (
        <View style={styles.groupHeader}>
          <Text style={styles.groupLabel}>{item.groupLabel}</Text>
        </View>
      );
    }

    const n = item.notification!;
    const isLast = listData[listData.indexOf(item) + 1]?.kind !== 'row';

    return (
      <TouchableOpacity
        activeOpacity={0.75}
        onPress={() => handleTapNotification(n)}
      >
        <View style={styles.rowWrapper}>
          {/* Unread indicator stripe */}
          {!n.is_read && <View style={styles.unreadStripe} />}
          <View style={{ flex: 1 }}>
            <NotificationRow
              type={n.type}
              message={n.body}
              time={formatNotifTime(n.occurred_at)}
              isLast={isLast}
            />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.screen}>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <SafeAreaView edges={['top']} style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.headerBrand}>IDENTRA - CARE VISION</Text>
              <Text style={styles.headerTitle}>Alerts</Text>
            </View>
            {unreadCount > 0 && (
              <TouchableOpacity
                onPress={handleMarkAllRead}
                disabled={markingAll}
                style={styles.markAllBtn}
              >
                {markingAll ? (
                  <ActivityIndicator size="small" color="#93B8E0" />
                ) : (
                  <Text style={styles.markAllText}>Mark all read</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </SafeAreaView>

      {/* ── Filter Tabs ─────────────────────────────────────────────────── */}
      <View style={styles.filterBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {FILTERS.map((f) => {
            const active = f.key === filter;
            return (
              <TouchableOpacity
                key={f.key}
                style={[styles.filterPill, active && styles.filterPillActive]}
                onPress={() => setFilter(f.key)}
                activeOpacity={0.75}
              >
                <Text
                  style={[styles.filterText, active && styles.filterTextActive]}
                >
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── List ────────────────────────────────────────────────────────── */}
      {loading ? (
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color={Colors.navy} />
        </View>
      ) : (
        <FlatList
          data={listData}
          keyExtractor={(item) => item.key}
          renderItem={renderItem}
          contentContainerStyle={
            listData.length === 0 ? styles.emptyContainer : styles.listContent
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.navy}
              colors={[Colors.navy]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyInner}>
              <Text style={styles.emptyEmoji}>🔕</Text>
              <Text style={styles.emptyText}>
                No alerts yet. Zone violations and reminders will appear here.
              </Text>
            </View>
          }
          // Wrap all rows in a card
          ListHeaderComponent={
            listData.length > 0 ? <View style={styles.listTopPad} /> : null
          }
        />
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
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
  headerContent: { paddingHorizontal: 20, paddingBottom: 16, paddingTop: 4 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
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
  markAllBtn: { paddingBottom: 4 },
  markAllText: {
    fontSize: 13,
    color: '#93B8E0',
    fontFamily: 'Inter-SemiBold',
    fontWeight: '600',
  },

  // Filter bar
  filterBar: {
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  filterScroll: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  filterPill: {
    height: 34,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterPillActive: { backgroundColor: Colors.navy, borderColor: Colors.navy },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
    color: Colors.textMuted,
  },
  filterTextActive: { color: '#FFFFFF' },

  // List
  listContent: { paddingBottom: 32 },
  listTopPad: { height: 12 },

  // Group date header
  groupHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  groupLabel: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Inter-Bold',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  // Notification row wrapper
  rowWrapper: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    marginBottom: 1,
    borderRadius: 0,
    overflow: 'hidden',
  },
  unreadStripe: {
    width: 3,
    backgroundColor: Colors.blueAccent,
  },

  // States
  loadingCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyContainer: { flexGrow: 1 },
  emptyInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
    paddingHorizontal: 32,
  },
  emptyEmoji: { fontSize: 60, marginBottom: 16 },
  emptyText: {
    fontSize: 15,
    color: Colors.textMuted,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    lineHeight: 22,
  },
});
