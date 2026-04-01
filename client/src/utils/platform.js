/**
 * Platform detection utilities for SmartBus
 * Detects whether the app is running inside a Capacitor native container (APK)
 * or in a regular web browser.
 */

export const isNativeApp = () => {
  // TEST TOGGLE: If you want to see the mobile design in the browser,
  // add ?platform=native to your URL (e.g. localhost:5173/?platform=native)
  const params = new URLSearchParams(window.location.search);
  if (params.get('platform') === 'native') return true;

  // Capacitor injects this on the window object when running inside the native shell
  return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
};

export const isWebBrowser = () => !isNativeApp();

export const getPlatform = () => {
  if (isNativeApp()) {
    return window.Capacitor.getPlatform(); // 'android' or 'ios'
  }
  return 'web';
};
