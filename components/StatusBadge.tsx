import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../constants/colors';

interface StatusBadgeProps {
  status: 'inside' | 'outside' | 'unknown';
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const config = {
    inside: {
      borderColor: Colors.green,
      backgroundColor: Colors.greenLight,
      textColor: '#166534',
      dotColor: Colors.green,
      label: 'Inside',
    },
    outside: {
      borderColor: '#D1D5DB',
      backgroundColor: '#F9FAFB',
      textColor: Colors.textMuted,
      dotColor: '#9CA3AF',
      label: 'Outside',
    },
    unknown: {
      borderColor: '#D1D5DB',
      backgroundColor: '#F9FAFB',
      textColor: Colors.textMuted,
      dotColor: '#D1D5DB',
      label: 'Unknown',
    },
  }[status];

  return (
    <View
      style={[
        styles.badge,
        { borderColor: config.borderColor, backgroundColor: config.backgroundColor },
      ]}
    >
      <View style={[styles.dot, { backgroundColor: config.dotColor }]} />
      <Text style={[styles.label, { color: config.textColor }]}>
        {config.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
  },
});
