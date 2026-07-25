/**
 * Safe-area handling that works in BOTH environments:
 * - Mobile Safari / installed PWA: CSS `env(safe-area-inset-*)` works natively
 *   (defaults are declared in index.css).
 * - The native app's WebView: `env()` returns 0 there, so the Expo wrapper
 *   injects `window.__NATIVE_INSETS__` after the page loads. We poll briefly
 *   for it and promote the values to the `--safe-*` CSS variables.
 */

declare global {
  interface Window {
    __NATIVE_APP__?: boolean;
    __NATIVE_INSETS__?: { top: number; bottom: number; left: number; right: number };
  }
}

function applyInsets(insets: { top: number; bottom: number; left: number; right: number }) {
  const root = document.documentElement.style;
  root.setProperty('--safe-top', `${Math.max(0, insets.top)}px`);
  root.setProperty('--safe-bottom', `${Math.max(0, insets.bottom)}px`);
  root.setProperty('--safe-left', `${Math.max(0, insets.left)}px`);
  root.setProperty('--safe-right', `${Math.max(0, insets.right)}px`);
}

export function initSafeAreaInsets() {
  if (window.__NATIVE_INSETS__) {
    applyInsets(window.__NATIVE_INSETS__);
    return;
  }
  // The WebView injects the values after load — poll for up to ~10s, then
  // give up (we're in a normal browser and env() already handles it).
  let tries = 0;
  const timer = window.setInterval(() => {
    tries += 1;
    if (window.__NATIVE_INSETS__) {
      applyInsets(window.__NATIVE_INSETS__);
      window.clearInterval(timer);
    } else if (tries > 40) {
      window.clearInterval(timer);
    }
  }, 250);
}
