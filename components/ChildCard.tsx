import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import StatusBadge from './StatusBadge';
import { Colors } from '../constants/colors';

interface ChildCardProps {
  id: string | number;
  name: string;
  code: string;
  age: number;
  status: 'inside' | 'outside' | 'unknown';
  gender?: 'male' | 'female';
}

export default function ChildCard({
  id,
  name,
  code,
  age,
  status,
  gender = 'male',
}: ChildCardProps) {
  const router = useRouter();
  const avatar = gender === 'female' ? '👧' : '👦';

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.85}
      onPress={() => router.push(`/child/${id}` as any)}
    >
      {/* Avatar */}
      <View style={styles.avatarCircle}>
        <Text style={styles.avatarEmoji}>{avatar}</Text>
      </View>

      {/* Info */}
      <View style={styles.info}>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.meta}>
          {code} · Age {age}
        </Text>
        <View style={styles.badgeRow}>
          <StatusBadge status={status} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarEmoji: {
    fontSize: 24,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Inter-Bold',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  meta: {
    fontSize: 13,
    color: Colors.textMuted,
    fontFamily: 'Inter-Regular',
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: 'row',
  },
});
