import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../constants/colors';

interface AttendanceDayRowProps {
  date: string;
  dayName: string;
  dayNumber: string;
  dropOffTime: string | null;
  pickupTime: string | null;
  isPresent: boolean;
  isLast?: boolean;
}

export default function AttendanceDayRow({
  dayName,
  dayNumber,
  dropOffTime,
  pickupTime,
  isPresent,
  isLast = false,
}: AttendanceDayRowProps) {
  return (
    <View style={styles.wrapper}>
      <View style={styles.row}>
        {/* Day label: number + name */}
        <View style={styles.dayLabel}>
          <Text style={styles.dayNumber}>{dayNumber}</Text>
          <Text style={styles.dayName}>{dayName}</Text>
        </View>

        {/* Vertical divider */}
        <View style={styles.vDivider} />

        {/* Times or absent */}
        <View style={styles.times}>
          {!isPresent ? (
            <Text style={styles.absentText}>Absent</Text>
          ) : (
            <>
              {/* Drop off row */}
              <View style={styles.timeRow}>
                <Text style={styles.timeEmoji}>📥</Text>
                <Text style={styles.timeLabel}>Drop off</Text>
                <Text style={[styles.timeValue, styles.dropOffColor]}>
                  {dropOffTime ?? '—'}
                </Text>
              </View>

              {/* Pickup row */}
              <View style={styles.timeRow}>
                <Text style={styles.timeEmoji}>📤</Text>
                <Text style={styles.timeLabel}>Pickup</Text>
                <Text style={[styles.timeValue, styles.pickupColor]}>
                  {pickupTime ?? '—'}
                </Text>
              </View>
            </>
          )}
        </View>
      </View>

      {/* Horizontal divider below row */}
      {!isLast && <View style={styles.hDivider} />}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {},
  row: {
    flexDirection: 'row',
    height: 72,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  dayLabel: {
    width: 44,
    alignItems: 'center',
  },
  dayNumber: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'Inter-Bold',
    color: Colors.navy,
    lineHeight: 24,
  },
  dayName: {
    fontSize: 12,
    color: Colors.textMuted,
    fontFamily: 'Inter-Regular',
    marginTop: 1,
  },
  vDivider: {
    width: 1,
    height: 40,
    backgroundColor: Colors.border,
    marginHorizontal: 12,
  },
  times: {
    flex: 1,
    justifyContent: 'center',
    gap: 4,
  },
  absentText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
    color: Colors.red,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeEmoji: {
    fontSize: 13,
    marginRight: 6,
  },
  timeLabel: {
    fontSize: 13,
    color: Colors.textMuted,
    fontFamily: 'Inter-Regular',
    flex: 1,
  },
  timeValue: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
  },
  dropOffColor: {
    color: '#166534',
  },
  pickupColor: {
    color: Colors.textMuted,
  },
  hDivider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginLeft: 72, // aligns with content, not the day number
  },
});
