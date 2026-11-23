import React, { Component, ReactNode, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useFonts } from 'expo-font';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as Updates from 'expo-updates';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuthStore } from '../store/authStore';
import { useNotifications } from '../hooks/useNotifications';
import NotificationBanner from '../components/NotificationBanner';
import OfflineBanner from '../components/OfflineBanner';
import { AppNotificationItem } from '../store/notificationStore';
import { Colors } from '../constants/colors';

// Keep the splash screen visible while fonts load
SplashScreen.preventAutoHideAsync();

// ─── Error Boundary ────────────────────────────────────────────────────────────
interface EBState { hasError: boolean; error: Error | null }

class ErrorBoundary extends Component<{ children: ReactNode }, EBState> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): EBState {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={eb.screen}>
          <Text style={eb.emoji}>⚠️</Text>
          <Text style={eb.title}>Something went wrong</Text>
          <Text style={eb.subtitle}>Please restart the app to continue.</Text>
          <Text style={eb.detail} numberOfLines={3}>
            {this.state.error?.message ?? ''}
          </Text>
          <TouchableOpacity
            style={eb.btn}
            onPress={() => Updates.reloadAsync()}
            accessibilityLabel="Reload the app"
          >
            <Text style={eb.btnText}>Reload App</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const eb = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emoji: { fontSize: 56, marginBottom: 16 },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: 8,
  },
  detail: {
    fontSize: 12,
    color: Colors.red,
    textAlign: 'center',
    marginBottom: 24,
    fontFamily: 'Inter-Regular',
  },
  btn: {
    backgroundColor: Colors.navy,
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 14,
    minWidth: 44,
    minHeight: 44,
  },
  btnText: { fontSize: 15, fontWeight: '700', color: '#FFF' },
});

// ─── App Shell ────────────────────────────────────────────────────────────────
function AppShell() {
  const router = useRouter();
  const [bannerNotif, setBannerNotif] = useState<AppNotificationItem | null>(null);

  useNotifications({
    onForegroundNotification: (n) => setBannerNotif(n),
  });

  return (
    <View style={{ flex: 1 }}>
      {/* Global offline banner */}
      <OfflineBanner />
      <Stack screenOptions={{ headerShown: false }} />
      {/* Global in-app notification banner */}
      <NotificationBanner
        notification={bannerNotif}
        onDismiss={() => setBannerNotif(null)}
      />
    </View>
  );
}

// ─── Root Layout ──────────────────────────────────────────────────────────────
export default function RootLayout() {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);

  const [fontsLoaded, fontError] = useFonts({
    'Inter-Regular': require('../assets/fonts/Inter-Regular.ttf'),
    'Inter-SemiBold': require('../assets/fonts/Inter-SemiBold.ttf'),
    'Inter-Bold': require('../assets/fonts/Inter-Bold.ttf'),
  });

  useEffect(() => {
    if (!fontsLoaded && !fontError) return;

    const redirect = async () => {
      if (accessToken) {
        router.replace('/(tabs)');
      } else {
        router.replace('/(tabs)/');
      }
      await SplashScreen.hideAsync();
    };

    redirect();
  }, [fontsLoaded, fontError, accessToken]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <AppShell />
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
