/**
 * Web fallback for GameView.
 * Metro picks GameView.native.tsx on iOS/Android; this file handles the
 * web platform where react-native-webview isn't available.
 * On web, prompt the user to open in Expo Go via QR code.
 */
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';

export default function GameView() {
  const colors = useColors();
  const topPad = Platform.OS === 'web' ? 67 : 0;
  const botPad = Platform.OS === 'web' ? 34 : 0;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          paddingTop: topPad,
          paddingBottom: botPad,
        },
      ]}
    >
      <View style={styles.inner}>
        <Ionicons name="game-controller-outline" size={72} color={colors.primary} />
        <Text style={[styles.title, { color: colors.foreground }]}>
          Village Spatial 3D
        </Text>
        <View style={[styles.badge, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="phone-portrait-outline" size={18} color={colors.accent} />
          <Text style={[styles.badgeText, { color: colors.mutedForeground }]}>
            Native mobile experience
          </Text>
        </View>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Scan the QR code in the Replit preview bar to play on your iPhone or Android via Expo Go.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: {
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter_700Bold',
    textAlign: 'center',
    marginTop: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
  },
  subtitle: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 4,
  },
});
