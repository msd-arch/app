import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors } from '../constants/colors';

interface AppHeaderProps {
  parentName: string;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

export default function AppHeader({ parentName }: AppHeaderProps) {
  const greeting = getGreeting();
  const router = useRouter();

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.container}>
        {/* Text block — flex: 1 keeps it left-aligned regardless of icon width */}
        <View style={{ flex: 1 }}>
          <Text style={styles.brandLabel}>IDENTRA - CARE VISION</Text>
          <Text style={styles.greeting}>
            {greeting}, {parentName} 👋
          </Text>
        </View>

        {/* Settings gear */}
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push('/settings');
          }}
          hitSlop={12}
          style={styles.gearBtn}
          accessibilityLabel="Open settings"
          accessibilityHint="Navigates to the app settings screen"
        >
          <Ionicons
            name="settings-outline"
            size={20}
            color="rgba(255,255,255,0.45)"
          />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: Colors.navy,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 6,
  },
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    paddingTop: 4,
  },
  brandLabel: {
    fontSize: 11,
    letterSpacing: 2,
    color: '#93B8E0',
    fontFamily: 'Inter-Regular',
    marginBottom: 6,
  },
  greeting: {
    fontSize: 22,
    fontWeight: '700',
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  gearBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 44,
    minHeight: 44,
  },
});
