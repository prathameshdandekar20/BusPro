/**
 * Platform detection utilities for SmartBus
 * Detects whether the app is running inside a Capacitor native container (APK)
 * or in a regular web browser.
 */

export const isNativeApp = () => {
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
