import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Animated,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';

import AppHeader from '../../components/AppHeader';
import ChildCard from '../../components/ChildCard';
import NotificationRow from '../../components/NotificationRow';
import FeeCard from '../../components/FeeCard';
import SectionHeader from '../../components/SectionHeader';

import { useAuthStore } from '../../store/authStore';
import { useChild } from '../../hooks/useChild';
import { fetchRecentNotifications, AppNotification } from '../../api/notifications';
import { Colors } from '../../constants/colors';

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
        Animated.timing(opacity, {
          toValue: 1.0,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.4,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        { width, height, borderRadius: 8, backgroundColor: '#E2E8F0', opacity },
        style,
      ]}
    />
  );
}

// ─── Skeleton for ChildCard ────────────────────────────────────────────────────
function ChildCardSkeleton() {
  return (
    <View style={[styles.card, styles.skeletonCard]}>
      <ShimmerBlock width={48} height={48} style={{ borderRadius: 24 }} />
      <View style={{ flex: 1, marginLeft: 14, gap: 8 }}>
        <ShimmerBlock width="60%" height={16} />
        <ShimmerBlock width="40%" height={13} />
        <ShimmerBlock width={80} height={26} style={{ borderRadius: 20 }} />
      </View>
    </View>
  );
}

// ─── Skeleton for Notifications card ──────────────────────────────────────────
function NotifCardSkeleton() {
  return (
    <View style={[styles.card, styles.mx16, styles.sectionCard]}>
      <ShimmerBlock width={140} height={16} style={{ marginBottom: 16 }} />
      {[0, 1, 2].map((i) => (
        <View key={i} style={styles.skeletonRow}>
          <ShimmerBlock width={36} height={36} style={{ borderRadius: 18 }} />
          <View style={{ flex: 1, marginLeft: 12, gap: 6 }}>
            <ShimmerBlock width="80%" height={13} />
            <ShimmerBlock width="30%" height={12} />
          </View>
        </View>
      ))}
    </View>
  );
}

// ─── Skeleton for FeeCard ─────────────────────────────────────────────────────
function FeeCardSkeleton() {
  return (
    <View style={[styles.card, styles.mx16, { padding: 20, gap: 12 }]}>
      <ShimmerBlock width={80} height={14} />
      <ShimmerBlock width="50%" height={36} />
      <ShimmerBlock width="70%" height={13} />
      <ShimmerBlock width="100%" height={56} style={{ borderRadius: 24 }} />
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const parentName = user?.first_name ?? 'Parent';

  // Child data + polling
  const { child, loading: childLoading, error: childError, refetch: refetchChild } = useChild();

  // Notifications
  const [notifs, setNotifs] = useState<AppNotification[]>([]);
  const [notifsLoading, setNotifsLoading] = useState(true);
  const [notifsError, setNotifsError] = useState(false);

  const loadNotifs = useCallback(async () => {
    setNotifsError(false);
    try {
      const data = await fetchRecentNotifications(3);
      setNotifs(data);
    } catch {
      setNotifsError(true);
    } finally {
      setNotifsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifs();
  }, [loadNotifs]);

  // Pull-to-refresh
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchChild(), loadNotifs()]);
    setRefreshing(false);
  }, [refetchChild, loadNotifs]);

  const isLoading = childLoading || notifsLoading;
  const hasError = childError || notifsError;

  // ── Stub fee data (replace with real API when fee endpoint exists) ──────────
  const feeData = {
    amount: 4500,
    month: 'March 2026',
    dueDate: 'March 15',
    status: 'pending' as const,
    onPayNow: () => { /* navigate to payment screen */ },
  };

  return (
    <View style={styles.screen}>
      {/* Header */}
      <AppHeader parentName={parentName} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.navy}
            colors={[Colors.navy]}
          />
        }
      >
        {/* ── Error Banner ─────────────────────────────────────────────────── */}
        {hasError && !isLoading && (
          <TouchableOpacity
            style={styles.errorBanner}
            onPress={onRefresh}
            activeOpacity={0.7}
          >
            <Text style={styles.errorText}>
              Could not load data. Tap to retry.
            </Text>
          </TouchableOpacity>
        )}

        {/* ── Child Card ───────────────────────────────────────────────────── */}
        {isLoading ? (
          <View style={styles.mx16}>
            <ChildCardSkeleton />
          </View>
        ) : child ? (
          <View style={styles.mx16}>
            <ChildCard
              id={child.id}
              name={child.name}
              code={child.code}
              age={child.age}
              status={child.status}
              gender={child.gender}
            />
          </View>
        ) : null}

        {/* ── Notifications Card ───────────────────────────────────────────── */}
        {notifsLoading ? (
          <NotifCardSkeleton />
        ) : (
          <View style={[styles.card, styles.mx16, styles.sectionCard]}>
            <SectionHeader icon="🔔" title="Notifications" />
            <View style={styles.notifList}>
              {notifs.length === 0 ? (
                <Text style={styles.emptyText}>No recent notifications</Text>
              ) : (
                notifs.map((n, idx) => (
                  <NotificationRow
                    key={n.id}
                    type={n.type}
                    message={n.message}
                    time={n.time}
                    isLast={idx === notifs.length - 1}
                  />
                ))
              )}
            </View>

            {/* "View all →" link */}
            <TouchableOpacity
              style={styles.viewAllRow}
              onPress={() => router.push('/(tabs)/alerts')}
              activeOpacity={0.7}
            >
              <Text style={styles.viewAllText}>View all →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Fee Card ─────────────────────────────────────────────────────── */}
        {isLoading ? (
          <FeeCardSkeleton />
        ) : (
          <View style={styles.mx16}>
            <FeeCard {...feeData} />
          </View>
        )}

        {/* Bottom padding */}
        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 16,
    gap: 16,
  },
  mx16: {
    marginHorizontal: 16,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionCard: {
    paddingTop: 16,
    paddingHorizontal: 0,
    overflow: 'hidden',
  },
  skeletonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  notifList: {
    marginTop: 8,
  },
  viewAllRow: {
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    marginTop: 4,
  },
  viewAllText: {
    fontSize: 13,
    color: Colors.blueAccent,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
  },
  errorBanner: {
    marginHorizontal: 16,
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
  emptyText: {
    fontSize: 14,
    color: Colors.textMuted,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
});
