import React, { useEffect, useRef, useCallback } from 'react';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import apiClient from '../api/client';
import { useAuthStore } from '../store/authStore';
import {
  useNotificationStore,
  AppNotificationItem,
  NotifType,
} from '../store/notificationStore';

// ─── Notification display config ───────────────────────────────────────────────
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// ─── WebSocket reconnect backoff ───────────────────────────────────────────────
const BACKOFF_STEPS = [1000, 2000, 4000, 8000, 16000, 30000];

// ─── Push token registration ───────────────────────────────────────────────────
async function registerPushToken(): Promise<string | null> {
  if (Platform.OS === 'web') return null;

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return null;

  // Use projectId from app config if available
  const tokenData = await Notifications.getExpoPushTokenAsync();
  return tokenData.data;
}

// ─── Hook ──────────────────────────────────────────────────────────────────────
interface UseNotificationsOptions {
  /** Called with the latest notification when one arrives in foreground */
  onForegroundNotification?: (n: AppNotificationItem) => void;
}

export function useNotifications({ onForegroundNotification }: UseNotificationsOptions = {}) {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const addNotification = useNotificationStore((s) => s.addNotification);

  const wsRef = useRef<WebSocket | null>(null);
  const backoffIndexRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unmountedRef = useRef(false);

  // ── WebSocket connection ──────────────────────────────────────────────────
  const connectWebSocket = useCallback(() => {
    if (unmountedRef.current || !accessToken) return;

    const apiBase = process.env.EXPO_PUBLIC_API_URL ?? '';
    // Replace http(s):// with ws(s)://
    const wsBase = apiBase.replace(/^http/, 'ws');
    const url = `${wsBase}/ws/notifications/?token=${accessToken}`;

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      backoffIndexRef.current = 0; // reset on successful connect
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as {
          type: string;
          notification: AppNotificationItem;
        };
        if (payload.notification) {
          addNotification(payload.notification);
        }
      } catch {
        // malformed frame — ignore
      }
    };

    ws.onclose = () => {
      if (unmountedRef.current) return;
      // Exponential backoff reconnect
      const delay = BACKOFF_STEPS[Math.min(backoffIndexRef.current, BACKOFF_STEPS.length - 1)];
      backoffIndexRef.current = Math.min(backoffIndexRef.current + 1, BACKOFF_STEPS.length - 1);
      reconnectTimerRef.current = setTimeout(connectWebSocket, delay);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [accessToken, addNotification]);

  // ── Mount effect ──────────────────────────────────────────────────────────
  useEffect(() => {
    unmountedRef.current = false;

    (async () => {
      // 1. Request permission + get push token
      const pushToken = await registerPushToken();

      // 2. Register with backend
      if (pushToken) {
        try {
          await apiClient.post('/api/devices/register/', {
            token: pushToken,
            platform: Platform.OS,
          });
        } catch {
          // Non-fatal — app works without push token registration
        }
      }

      // 3. Connect WebSocket
      connectWebSocket();
    })();

    // 4. Foreground notification received handler
    const foregroundSub = Notifications.addNotificationReceivedListener((notification) => {
      const data = notification.request.content.data as Partial<AppNotificationItem>;
      const item: AppNotificationItem = {
        id: data.id ?? notification.request.identifier,
        type: (data.type as NotifType) ?? 'general',
        title: notification.request.content.title ?? '',
        body: notification.request.content.body ?? '',
        occurred_at: new Date().toISOString(),
        is_read: false,
        child_name: data.child_name ?? '',
      };
      addNotification(item);
      onForegroundNotification?.(item);
      // Haptic alert for zone violations
      if (item.type === 'zone_violation') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
    });

    // 5. Background/tapped handler — navigate to /alerts
    const responseSub = Notifications.addNotificationResponseReceivedListener(() => {
      router.push('/(tabs)/alerts');
    });

    return () => {
      unmountedRef.current = true;
      foregroundSub.remove();
      responseSub.remove();
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      wsRef.current?.close();
    };
  }, [connectWebSocket, addNotification, onForegroundNotification, router]);
}
