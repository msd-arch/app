import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
  Pressable,
} from 'react-native';
import { Colors } from '../constants/colors';
import { AppNotificationItem } from '../store/notificationStore';

const TYPE_ICON: Record<string, string> = {
  zone_violation: '⚠️',
  drop_off: '📦',
  pickup_reminder: '🕐',
  general: '🔔',
};

interface NotificationBannerProps {
  notification: AppNotificationItem | null;
  onDismiss: () => void;
}

export default function NotificationBanner({
  notification,
  onDismiss,
}: NotificationBannerProps) {
  const translateY = useRef(new Animated.Value(-160)).current;
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    Animated.timing(translateY, {
      toValue: -160,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setVisible(false);
      onDismiss();
    });
  }, [translateY, onDismiss]);

  useEffect(() => {
    if (!notification) return;

    setVisible(true);
    // Slide in
    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 4,
    }).start();

    // Auto-dismiss after 4 seconds
    timerRef.current = setTimeout(dismiss, 4000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [notification, translateY, dismiss]);

  if (!visible || !notification) return null;

  const icon = TYPE_ICON[notification.type] ?? '🔔';

  return (
    <Animated.View
      style={[styles.banner, { transform: [{ translateY }] }]}
      pointerEvents="box-none"
    >
      <Pressable onPress={dismiss} style={styles.pressable}>
        {/* Top row: icon + title + X */}
        <View style={styles.topRow}>
          <Text style={styles.icon}>{icon}</Text>
          <Text style={styles.title} numberOfLines={1}>
            {notification.title}
          </Text>
          <TouchableOpacity onPress={dismiss} hitSlop={12}>
            <Text style={styles.close}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Body */}
        {!!notification.body && (
          <Text style={styles.body} numberOfLines={2}>
            {notification.body}
          </Text>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 16,
    right: 16,
    zIndex: 999,
    backgroundColor: Colors.navy,
    borderRadius: 12,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  pressable: {},
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  icon: {
    fontSize: 18,
  },
  title: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  close: {
    fontSize: 14,
    color: '#93B8E0',
    fontWeight: '600',
  },
  body: {
    marginTop: 6,
    fontSize: 13,
    color: '#B8CEE8',
    fontFamily: 'Inter-Regular',
    lineHeight: 18,
  },
});
