import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import PrimaryButton from './PrimaryButton';
import { Colors } from '../constants/colors';

interface FeeCardProps {
  amount: number;
  month: string;
  dueDate: string;
  status: 'pending' | 'paid' | 'overdue';
  onPayNow: () => void;
}

export default function FeeCard({
  amount,
  month,
  dueDate,
  status,
  onPayNow,
}: FeeCardProps) {
  const showPayButton = status === 'pending' || status === 'overdue';

  return (
    <View style={styles.card}>
      {/* Section Label */}
      <View style={styles.labelRow}>
        <Text style={styles.labelIcon}>💳</Text>
        <Text style={styles.labelText}>FEES</Text>
      </View>

      {/* Amount */}
      <Text style={styles.amount}>
        Rs. {amount.toLocaleString()}
      </Text>

      {/* Subtitle + overdue badge */}
      <View style={styles.subtitleRow}>
        <Text style={styles.subtitle}>
          {month} — Due by {dueDate}
        </Text>
        {status === 'overdue' && (
          <View style={styles.overdueBadge}>
            <Text style={styles.overdueText}>OVERDUE</Text>
          </View>
        )}
      </View>

      {/* Pay Now button */}
      {showPayButton && (
        <View style={styles.buttonWrapper}>
          <PrimaryButton label="Pay Now" onPress={onPayNow} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 6,
  },
  labelIcon: {
    fontSize: 16,
  },
  labelText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Inter-Bold',
    color: Colors.textMuted,
    letterSpacing: 1.5,
  },
  amount: {
    fontSize: 32,
    fontWeight: '700',
    fontFamily: 'Inter-Bold',
    color: Colors.navy,
    marginBottom: 6,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textMuted,
    fontFamily: 'Inter-Regular',
  },
  overdueBadge: {
    backgroundColor: Colors.red,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  overdueText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'Inter-Bold',
    letterSpacing: 1,
  },
  buttonWrapper: {
    marginTop: 16,
  },
});
