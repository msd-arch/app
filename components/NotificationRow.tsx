import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../constants/colors';

type NotificationType = 'zone_violation' | 'drop_off' | 'pickup_reminder' | 'general';

interface NotificationRowProps {
  type: NotificationType;
  message: string;
  time: string;
  isLast?: boolean;
}

const ICON_CONFIG: Record<
  NotificationType,
  { emoji: string; backgroundColor: string }
> = {
  zone_violation: { emoji: '⚠️', backgroundColor: Colors.amberLight },
  drop_off: { emoji: '📦', backgroundColor: '#EFF6FF' },
  pickup_reminder: { emoji: '🕐', backgroundColor: '#F0FDF4' },
  general: { emoji: '🔔', backgroundColor: Colors.divider },
};

export default function NotificationRow({
  type,
  message,
  time,
  isLast = false,
}: NotificationRowProps) {
  const icon = ICON_CONFIG[type] ?? ICON_CONFIG.general;

  return (
    <View style={styles.wrapper}>
      <View style={styles.row}>
        {/* Icon */}
        <View style={[styles.iconCircle, { backgroundColor: icon.backgroundColor }]}>
          <Text style={styles.iconEmoji}>{icon.emoji}</Text>
        </View>

        {/* Message */}
        <Text style={styles.message} numberOfLines={2}>
          {message}
        </Text>

        {/* Time */}
        <Text style={styles.time}>{time}</Text>
      </View>

      {/* Divider */}
      {!isLast && <View style={styles.divider} />}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 16,
  },
  row: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconEmoji: {
    fontSize: 18,
  },
  message: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: Colors.textPrimary,
    fontFamily: 'Inter-Regular',
  },
  time: {
    fontSize: 13,
    color: Colors.textMuted,
    fontFamily: 'Inter-Regular',
    marginLeft: 8,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.divider,
  },
});
