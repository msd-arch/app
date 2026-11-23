import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Types ─────────────────────────────────────────────────────────────────────
export type NotifType =
  | 'zone_violation'
  | 'drop_off'
  | 'pickup_reminder'
  | 'general';

export interface AppNotificationItem {
  id: string | number;
  type: NotifType;
  title: string;
  body: string;
  occurred_at: string;   // ISO string
  is_read: boolean;
  child_name: string;
}

interface NotificationState {
  notifications: AppNotificationItem[];
  unreadCount: number;

  // Actions
  setNotifications: (ns: AppNotificationItem[]) => void;
  addNotification: (n: AppNotificationItem) => void;
  markRead: (id: string | number) => void;
  markAllRead: () => void;

  // Legacy (used by tab badge)
  setUnreadCount: (count: number) => void;
  incrementUnread: () => void;
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set) => ({
      notifications: [],
      unreadCount: 0,

      setNotifications: (ns) =>
        set({
          notifications: ns,
          unreadCount: ns.filter((n) => !n.is_read).length,
        }),

      addNotification: (n) =>
        set((state) => {
          // Avoid duplicates
          const exists = state.notifications.some((x) => x.id === n.id);
          if (exists) return state;
          const updated = [n, ...state.notifications];
          return {
            notifications: updated,
            unreadCount: updated.filter((x) => !x.is_read).length,
          };
        }),

      markRead: (id) =>
        set((state) => {
          const updated = state.notifications.map((n) =>
            n.id === id ? { ...n, is_read: true } : n,
          );
          return {
            notifications: updated,
            unreadCount: updated.filter((n) => !n.is_read).length,
          };
        }),

      markAllRead: () =>
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, is_read: true })),
          unreadCount: 0,
        })),

      // Legacy helpers
      setUnreadCount: (count) => set({ unreadCount: count }),
      incrementUnread: () =>
        set((state) => ({ unreadCount: state.unreadCount + 1 })),
    }),
    {
      name: 'identra-notifications',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
