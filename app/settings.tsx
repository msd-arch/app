import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Linking,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useAuthStore } from '../store/authStore';
import { logoutParent } from '../api/auth';
import apiClient from '../api/client';
import { NotificationPreferences } from '../types';
import { Colors } from '../constants/colors';

// ─── Row components ────────────────────────────────────────────────────────────
function SettingsRow({
  icon,
  label,
  onPress,
  accessibilityLabel,
  right,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress?: () => void;
  accessibilityLabel: string;
  right?: React.ReactNode;
}) {
  return (
    <TouchableOpacity
      style={rows.row}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
    >
      <View style={rows.left}>
        <Ionicons name={icon} size={20} color={Colors.navy} style={rows.icon} />
        <Text style={rows.label}>{label}</Text>
      </View>
      {right ?? (
        <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
      )}
    </TouchableOpacity>
  );
}

const rows = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
    minHeight: 44,
  },
  left: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  icon: { marginRight: 12 },
  label: { fontSize: 15, color: Colors.textPrimary, fontFamily: 'Inter-Regular' },
});

// ─── Toggle row ────────────────────────────────────────────────────────────────
function ToggleRow({
  label,
  value,
  onValueChange,
  disabled = false,
  isLast = false,
}: {
  label: string;
  value: boolean;
  onValueChange?: (v: boolean) => void;
  disabled?: boolean;
  isLast?: boolean;
}) {
  return (
    <View
      style={[
        tr.row,
        isLast && { borderBottomWidth: 0 },
        disabled && { opacity: 0.55 },
      ]}
    >
      <Text style={tr.label}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ true: Colors.navy, false: Colors.border }}
        thumbColor="#FFFFFF"
        ios_backgroundColor={Colors.border}
        accessibilityLabel={label}
      />
    </View>
  );
}

const tr = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
    minHeight: 44,
  },
  label: { fontSize: 15, color: Colors.textPrimary, fontFamily: 'Inter-Regular', flex: 1, marginRight: 8 },
});

// ─── Section wrapper ───────────────────────────────────────────────────────────
function Section({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <View style={sec.wrap}>
      {title && <Text style={sec.title}>{title}</Text>}
      <View style={sec.card}>{children}</View>
    </View>
  );
}

const sec = StyleSheet.create({
  wrap: { marginHorizontal: 16, marginBottom: 16 },
  title: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Inter-Bold',
    color: Colors.textMuted,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
});

// ─── Screen ────────────────────────────────────────────────────────────────────
const DEFAULT_PREFS: Omit<NotificationPreferences, 'zone_violation_alerts'> = {
  drop_off_confirmation: true,
  pickup_reminders: true,
  fee_due_reminders: true,
  weekly_activity_report: false,
};

export default function SettingsScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  const [prefs, setPrefs] = useState(DEFAULT_PREFS);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // Fetch preferences on mount
  useEffect(() => {
    (async () => {
      try {
        const { data } = await apiClient.get<NotificationPreferences>(
          '/api/parents/me/preferences/',
        );
        setPrefs({
          drop_off_confirmation: data.drop_off_confirmation,
          pickup_reminders: data.pickup_reminders,
          fee_due_reminders: data.fee_due_reminders,
          weekly_activity_report: data.weekly_activity_report,
        });
      } catch {
        // use defaults on error
      }
    })();
  }, []);

  // Save prefs on toggle
  const handleToggle = useCallback(
    async (key: keyof typeof DEFAULT_PREFS, value: boolean) => {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const updated = { ...prefs, [key]: value };
      setPrefs(updated);
      setSavingPrefs(true);
      try {
        await apiClient.patch('/api/parents/me/preferences/', {
          [key]: value,
        });
      } catch {
        // rollback on error
        setPrefs(prefs);
      } finally {
        setSavingPrefs(false);
      }
    },
    [prefs],
  );

  // Logout flow
  const handleLogout = useCallback(() => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setLoggingOut(true);
            try {
              await logoutParent();
            } catch {
              // proceed even if API fails
            } finally {
              clearAuth();
              router.replace('/(auth)/login');
            }
          },
        },
      ],
    );
  }, [clearAuth, router]);

  // Initials from name
  const initials = [user?.first_name?.[0], user?.last_name?.[0]]
    .filter(Boolean)
    .join('')
    .toUpperCase() || 'U';

  const fullName = user
    ? `${user.first_name} ${user.last_name}`.trim()
    : 'Parent';

  return (
    <View style={s.screen}>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <SafeAreaView edges={['top']} style={s.header}>
        <View style={s.headerRow}>
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.back();
            }}
            hitSlop={12}
            style={s.backBtn}
            accessibilityLabel="Go back"
            accessibilityHint="Navigates to the previous screen"
          >
            <Ionicons name="chevron-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Settings</Text>
          <View style={{ width: 36 }} />
        </View>
      </SafeAreaView>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Profile Card ────────────────────────────────────────────── */}
        <Section>
          <>
            {/* Avatar + info */}
            <View style={s.profileTop}>
              <View style={s.avatarCircle}>
                <Text style={s.avatarInitials}>{initials}</Text>
              </View>
              <View style={s.profileInfo}>
                <Text style={s.profileName}>{fullName}</Text>
                <Text style={s.profileEmail}>{user?.email ?? ''}</Text>
              </View>
            </View>
            {/* Edit Profile row */}
            <SettingsRow
              icon="pencil-outline"
              label="Edit Profile"
              accessibilityLabel="Edit profile"
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/edit-profile' as any);
              }}
            />
          </>
        </Section>

        {/* ── Notification Preferences ─────────────────────────────── */}
        <Section title="Notifications">
          <>
            <ToggleRow
              label="Zone violation alerts"
              value={true}
              disabled
            />
            <ToggleRow
              label="Drop-off confirmation"
              value={prefs.drop_off_confirmation}
              onValueChange={(v) => handleToggle('drop_off_confirmation', v)}
            />
            <ToggleRow
              label="Pickup reminders"
              value={prefs.pickup_reminders}
              onValueChange={(v) => handleToggle('pickup_reminders', v)}
            />
            <ToggleRow
              label="Fee due reminders"
              value={prefs.fee_due_reminders}
              onValueChange={(v) => handleToggle('fee_due_reminders', v)}
            />
            <ToggleRow
              label="Weekly activity report"
              value={prefs.weekly_activity_report}
              onValueChange={(v) => handleToggle('weekly_activity_report', v)}
              isLast
            />
            {savingPrefs && (
              <View style={s.savingRow}>
                <ActivityIndicator size="small" color={Colors.textMuted} />
                <Text style={s.savingText}>Saving…</Text>
              </View>
            )}
          </>
        </Section>

        {/* ── Account ──────────────────────────────────────────────────── */}
        <Section title="Account">
          <>
            <SettingsRow
              icon="lock-closed-outline"
              label="Change Password"
              accessibilityLabel="Change password"
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/change-password' as any);
              }}
            />
            <SettingsRow
              icon="mail-outline"
              label="Contact Support"
              accessibilityLabel="Contact support via email"
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                Linking.openURL('mailto:support@identra.pk');
              }}
            />
          </>
        </Section>

        {/* ── Logout ───────────────────────────────────────────────────── */}
        <View style={[s.mx16]}>
          <TouchableOpacity
            style={s.logoutBtn}
            onPress={handleLogout}
            disabled={loggingOut}
            activeOpacity={0.8}
            accessibilityLabel="Log out of app"
            accessibilityRole="button"
          >
            {loggingOut ? (
              <ActivityIndicator color={Colors.red} />
            ) : (
              <>
                <Ionicons name="log-out-outline" size={20} color={Colors.red} />
                <Text style={s.logoutText}>Log Out</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* ── Version ───────────────────────────────────────────────────── */}
        <Text style={s.version}>Version 1.0.0</Text>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },

  header: {
    backgroundColor: Colors.navy,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Inter-Bold',
    color: '#FFF',
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },

  scroll: { flex: 1 },
  scrollContent: { paddingTop: 16 },
  mx16: { marginHorizontal: 16, marginBottom: 16 },

  // Profile card
  profileTop: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarInitials: {
    fontSize: 22,
    fontWeight: '700',
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  profileInfo: { flex: 1 },
  profileName: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Inter-Bold',
    color: Colors.textPrimary,
    marginBottom: 3,
  },
  profileEmail: {
    fontSize: 13,
    color: Colors.textMuted,
    fontFamily: 'Inter-Regular',
  },

  // Saving indicator
  savingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 10,
    paddingHorizontal: 16,
  },
  savingText: { fontSize: 12, color: Colors.textMuted, fontFamily: 'Inter-Regular' },

  // Logout
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#FECACA',
    height: 52,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Inter-Bold',
    color: Colors.red,
  },

  version: {
    fontSize: 12,
    color: Colors.textMuted,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 8,
  },
});
