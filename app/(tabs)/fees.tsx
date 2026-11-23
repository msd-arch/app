import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import FeeListItem from '../../components/FeeListItem';
import SectionHeader from '../../components/SectionHeader';
import { fetchFees, FeeRecord } from '../../api/fees';
import { useChild } from '../../hooks/useChild';
import { Colors } from '../../constants/colors';

// ─── Helpers ───────────────────────────────────────────────────────────────────
function extractYear(month: string): string {
  // month is like "March 2026" — grab last token
  return month.split(' ').pop() ?? '';
}

function groupByYear(fees: FeeRecord[]): { year: string; data: FeeRecord[] }[] {
  const map = new Map<string, FeeRecord[]>();
  for (const fee of fees) {
    const y = extractYear(fee.month);
    if (!map.has(y)) map.set(y, []);
    map.get(y)!.push(fee);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => Number(b) - Number(a))
    .map(([year, data]) => ({ year, data }));
}

// ─── List item union type ──────────────────────────────────────────────────────
type ListRow =
  | { kind: 'yearHeader'; key: string; year: string }
  | { kind: 'fee'; key: string; fee: FeeRecord };

// ─── Screen ────────────────────────────────────────────────────────────────────
export default function FeesScreen() {
  const router = useRouter();
  const { child } = useChild();

  const [fees, setFees] = useState<FeeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    if (!child?.id) return
    setError(false);
    try {
      const data = await fetchFees(child.id);
      setFees(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [child?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  // ── Derived ───────────────────────────────────────────────────────────────
  const outstanding = useMemo(
    () =>
      fees
        .filter((f) => f.status !== 'paid')
        .reduce((sum, f) => sum + f.amount, 0),
    [fees],
  );

  const lastPaid = useMemo(() => {
    const paid = fees
      .filter((f) => f.status === 'paid' && f.paid_date)
      .sort((a, b) => (b.paid_date! > a.paid_date! ? 1 : -1));
    if (!paid.length) return null;
    const d = new Date(paid[0].paid_date! + 'T00:00:00');
    return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  }, [fees]);

  // Flatten grouped records into FlatList rows
  const listData = useMemo<ListRow[]>(() => {
    const groups = groupByYear(fees);
    const spanMultipleYears = groups.length > 1;
    const rows: ListRow[] = [];
    for (const { year, data } of groups) {
      if (spanMultipleYears) {
        rows.push({ kind: 'yearHeader', key: `y-${year}`, year });
      }
      for (const fee of data) {
        rows.push({ kind: 'fee', key: `f-${fee.id}`, fee });
      }
    }
    return rows;
  }, [fees]);

  // ─────────────────────────────────────────────────────────────────────────
  const renderItem = ({ item }: { item: ListRow }) => {
    if (item.kind === 'yearHeader') {
      return (
        <View style={styles.yearHeaderWrap}>
          <SectionHeader icon="📆" title={item.year} />
        </View>
      );
    }
    return (
      <FeeListItem
        fee={item.fee}
        onPress={() => router.push(`/payment/${item.fee.id}` as any)}
      />
    );
  };

  return (
    <View style={styles.screen}>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <SafeAreaView edges={['top']} style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerBrand}>IDENTRA - CARE VISION</Text>
          <Text style={styles.headerTitle}>Fees</Text>
        </View>
      </SafeAreaView>

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
          // ── Summary card pinned at top ──────────────────────────────
          ListHeaderComponent={
            <>
              {error && (
                <TouchableOpacity style={styles.errorBanner} onPress={onRefresh}>
                  <Text style={styles.errorText}>
                    Could not load fees. Tap to retry.
                  </Text>
                </TouchableOpacity>
              )}
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>Outstanding Balance</Text>
                <Text
                  style={[
                    styles.summaryAmount,
                    { color: outstanding > 0 ? Colors.red : Colors.green },
                  ]}
                >
                  Rs. {outstanding.toLocaleString()}
                </Text>
                {lastPaid && (
                  <View style={styles.lastPaidRow}>
                    <Text style={styles.lastPaidText}>
                      Last paid: {lastPaid}
                    </Text>
                  </View>
                )}
              </View>
            </>
          }
          // ── Empty state ─────────────────────────────────────────────
          ListEmptyComponent={
            fees.length === 0 && !error ? (
              <View style={styles.emptyInner}>
                <Text style={styles.emptyEmoji}>💳</Text>
                <Text style={styles.emptyText}>No fee records found.</Text>
              </View>
            ) : null
          }
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        />
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },

  header: {
    backgroundColor: Colors.navy,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 6,
  },
  headerContent: { paddingHorizontal: 20, paddingBottom: 16, paddingTop: 4 },
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

  // Summary card
  summaryCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  summaryLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    fontFamily: 'Inter-Regular',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  summaryAmount: {
    fontSize: 28,
    fontWeight: '700',
    fontFamily: 'Inter-Bold',
    marginBottom: 4,
  },
  lastPaidRow: { alignItems: 'flex-end' },
  lastPaidText: {
    fontSize: 13,
    color: Colors.textMuted,
    fontFamily: 'Inter-Regular',
  },

  // Year header
  yearHeaderWrap: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },

  // Layout
  listContent: { paddingTop: 16, paddingBottom: 32 },
  loadingCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyContainer: { flexGrow: 1 },
  emptyInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyEmoji: { fontSize: 60, marginBottom: 12 },
  emptyText: {
    fontSize: 15,
    color: Colors.textMuted,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
  },

  // Error banner
  errorBanner: {
    marginHorizontal: 16,
    marginBottom: 8,
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
