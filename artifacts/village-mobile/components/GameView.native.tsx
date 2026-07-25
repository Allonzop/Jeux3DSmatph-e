import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { useColors } from '@/hooks/useColors';

const GAME_URL = `https://${process.env.EXPO_PUBLIC_DOMAIN}/`;

export default function GameView() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const webViewRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Pass native safe-area insets into the web page so the game positions
  // its HUD and joystick correctly around the Dynamic Island / home bar.
  const injectedJS = `
    (function() {
      window.__NATIVE_APP__ = true;
      window.__NATIVE_INSETS__ = {
        top: ${insets.top},
        bottom: ${insets.bottom},
        left: ${insets.left},
        right: ${insets.right},
      };
    })();
    true;
  `;

  if (hasError) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorTitle, { color: colors.foreground }]}>
          Could not load game
        </Text>
        <Text style={[styles.errorSub, { color: colors.mutedForeground }]}>
          Make sure you're connected to the internet
        </Text>
        <TouchableOpacity
          style={[styles.retryBtn, { backgroundColor: colors.primary, borderRadius: colors.radius }]}
          onPress={() => {
            setHasError(false);
            setLoading(true);
            webViewRef.current?.reload();
          }}
        >
          <Text style={[styles.retryText, { color: colors.primaryForeground }]}>
            Try Again
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <WebView
        ref={webViewRef}
        source={{ uri: GAME_URL }}
        style={styles.webview}
        injectedJavaScript={injectedJS}
        // Required for WebGL / Three.js to run inside WebView
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        allowsFullscreenVideo
        javaScriptEnabled
        domStorageEnabled
        // Disable native scroll — the game handles its own touch events
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        onLoadEnd={() => setLoading(false)}
        onError={() => {
          setLoading(false);
          setHasError(true);
        }}
      />
      {loading && (
        <View
          style={[styles.loadingOverlay, { backgroundColor: colors.background }]}
        >
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
            Loading Village Spatial 3D…
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 24,
  },
  errorTitle: {
    fontSize: 20,
    fontFamily: 'Inter_600SemiBold',
  },
  errorSub: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
  },
  retryBtn: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    marginTop: 8,
  },
  retryText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
});
