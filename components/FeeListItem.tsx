import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FeeRecord, FeeStatus } from '../api/fees';
import { Colors } from '../constants/colors';

interface FeeListItemProps {
  fee: FeeRecord;
  onPress: () => void;
}

const STATUS_CONFIG: Record<
  FeeStatus,
  { label: string; color: string; bg: string; border: string }
> = {
  paid: {
    label: 'Paid',
    color: '#166534',
    bg: Colors.greenLight,
    border: Colors.green,
  },
  pending: {
    label: 'Pending',
    color: '#92400E',
    bg: Colors.amberLight,
    border: Colors.amber,
  },
  overdue: {
    label: 'Overdue',
    color: '#991B1B',
    bg: Colors.redLight,
    border: Colors.red,
  },
};

function formatDueDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function FeeListItem({ fee, onPress }: FeeListItemProps) {
  const cfg = STATUS_CONFIG[fee.status];

  if (fee.status === 'paid') {
    return (
      <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.75}>
        {/* Green checkmark */}
        <View style={styles.paidIcon}>
          <Ionicons name="checkmark-circle" size={28} color={Colors.green} />
        </View>

        {/* Info */}
        <View style={styles.info}>
          <Text style={styles.month}>{fee.month}</Text>
          <Text style={styles.paidOn}>
            Paid on {fee.paid_date ? formatDueDate(fee.paid_date) : '—'}
          </Text>
        </View>

        {/* Amount */}
        <Text style={styles.amountPaid}>Rs. {fee.amount.toLocaleString()}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      {/* Top row: month + status badge */}
      <View style={styles.cardTop}>
        <Text style={styles.month}>{fee.month}</Text>
        <View
          style={[
            styles.badge,
            { backgroundColor: cfg.bg, borderColor: cfg.border },
          ]}
        >
          <Text style={[styles.badgeText, { color: cfg.color }]}>
            {cfg.label}
          </Text>
        </View>
      </View>

      {/* Amount */}
      <Text style={styles.amount}>Rs. {fee.amount.toLocaleString()}</Text>

      {/* Due date + chevron */}
      <View style={styles.cardBottom}>
        <Text style={styles.dueDate}>
          Due by {formatDueDate(fee.due_date)}
        </Text>
        <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // Paid row style
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  paidIcon: { marginRight: 12 },
  info: { flex: 1 },
  paidOn: { fontSize: 12, color: Colors.textMuted, fontFamily: 'Inter-Regular', marginTop: 2 },
  amountPaid: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
    color: Colors.textSecondary,
  },

  // Pending / overdue card style
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  month: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'Inter-Bold',
    color: Colors.textPrimary,
  },
  amount: {
    fontSize: 26,
    fontWeight: '700',
    fontFamily: 'Inter-Bold',
    color: Colors.navy,
  },
  dueDate: {
    fontSize: 13,
    color: Colors.textMuted,
    fontFamily: 'Inter-Regular',
  },
  badge: {
    borderWidth: 1.5,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Inter-Bold',
  },
});
