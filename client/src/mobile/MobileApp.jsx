import { lazy, Suspense, useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { isNativeApp } from '../utils/platform';
import { GoogleOAuthProvider } from '@react-oauth/google';
import BottomNav from './components/BottomNav';
import './MobileApp.css';

const LoginScreen = lazy(() => import('./screens/LoginScreen'));
const HomeScreen = lazy(() => import('./screens/HomeScreen'));
const ActivityScreen = lazy(() => import('./screens/ActivityScreen'));
const ProfileScreen = lazy(() => import('./screens/ProfileScreen'));
const ConductorScreen = lazy(() => import('./screens/ConductorScreen'));
const ConductorHomeScreen = lazy(() => import('./screens/ConductorHomeScreen'));
const BusDetailScreen = lazy(() => import('./screens/BusDetailScreen'));
const BookingScreen = lazy(() => import('./screens/BookingScreen'));
const Settings = lazy(() => import('../pages/Settings'));
const LegalPage = lazy(() => import('../pages/LegalPage'));

/* ── Branded Splash Screen ─────────────────────────────── */
const SplashScreen = ({ onFinish }) => {
  useEffect(() => {
    const timer = setTimeout(onFinish, 2200);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div className="m-splash">
      <div className="m-splash-bg" />
      <div className="m-splash-content">
        <div className="m-splash-logo-ring">
          <div className="m-splash-logo-inner">
            <span className="m-splash-bus-icon">🚌</span>
          </div>
          <div className="m-splash-ring-glow" />
        </div>
        <h1 className="m-splash-title">Smart<span>Bus</span></h1>
        <p className="m-splash-tagline">Your Journey, Our Priority</p>
        <div className="m-splash-loader">
          <div className="m-splash-loader-bar" />
        </div>
        <span className="m-splash-version">v1.0.11</span>
      </div>
    </div>
  );
};

/* ── Inline Loading Spinner ─────────────────────────────── */
const Loading = () => (
  <div className="mobile-app" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', flexDirection: 'column' }}>
    <div className="m-loading">
      <div className="m-spinner" />
    </div>
    <span className="m-label" style={{ marginTop: '15px' }}>Loading...</span>
  </div>
);

/* ── Main App ───────────────────────────────────────────── */
const MobileApp = ({ user, loading, login, signup, googleLogin, logout, googleClientId }) => {
  const [splashDone, setSplashDone] = useState(false);
  const [updateInfo, setUpdateInfo] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const APP_VERSION = '1.0.11'; // Client version

  useEffect(() => {
    if (!isNativeApp()) return;

    const checkForUpdates = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
        const response = await fetch(`${apiUrl}/app-update`);
        const data = await response.json();
        if (data.latestVersion && data.latestVersion !== APP_VERSION) {
          setUpdateInfo({
            version: data.latestVersion,
            downloadUrl: data.downloadUrl,
            changelog: data.changelog || 'Bug fixes and improvements.',
          });
        }
      } catch (err) {
        console.warn('App update check failed:', err);
      }
    };
    checkForUpdates();
    const interval = setInterval(checkForUpdates, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const handleDownloadUpdate = async () => {
    if (!updateInfo?.downloadUrl) return;
    setIsDownloading(true);
    try {
      // Try using the Capacitor Browser plugin to open in system browser
      // which handles APK download + install prompt natively
      const { Browser } = await import('@capacitor/browser').catch(() => ({}));
      if (Browser?.open) {
        await Browser.open({ url: updateInfo.downloadUrl, windowName: '_system' });
      } else {
        // Fallback: create a temporary link and trigger download
        const a = document.createElement('a');
        a.href = updateInfo.downloadUrl;
        a.download = 'SmartBus.apk';
        a.target = '_system';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch (err) {
      // Final fallback
      window.location.href = updateInfo.downloadUrl;
    }
    setTimeout(() => setIsDownloading(false), 5000);
  };

  if (!splashDone) return <SplashScreen onFinish={() => setSplashDone(true)} />;
  if (loading) return <Loading />;

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <Router>
        <div className="mobile-app">
          {/* In-App Update Banner */}
          <AnimatePresence>
            {updateInfo && (
              <motion.div
                className="update-banner-toast"
                initial={{ y: -100, x: '-50%', opacity: 0 }}
                animate={{ y: 0, x: '-50%', opacity: 1 }}
                exit={{ y: -100, x: '-50%', opacity: 0 }}
                style={{ position: 'fixed', top: '10px', left: '50%', transform: 'translateX(-50%)', zIndex: 99999, width: '90%', maxWidth: '400px' }}
              >
                <div className="update-content">
                  <span className="update-icon">🚀</span>
                  <div className="update-text">
                    <strong>Update v{updateInfo.version} Available!</strong>
                    <span>{updateInfo.changelog} (Install APK after download)</span>
                  </div>
                </div>
                <button
                  className="update-btn-action"
                  onClick={handleDownloadUpdate}
                  disabled={isDownloading}
                >
                  {isDownloading ? 'Downloading...' : 'Download Update'}
                </button>
                <button className="update-btn-close" onClick={() => setUpdateInfo(null)}>✕</button>
              </motion.div>
            )}
          </AnimatePresence>

          <Suspense fallback={<Loading />}>
            <Routes>
              {/* Auth */}
              <Route path="/login" element={
                user ? <Navigate to={user.role === 'conductor' ? '/conductor' : '/dashboard'} replace /> :
                <LoginScreen login={login} signup={signup} googleLogin={googleLogin} />
              } />
              <Route path="/signup" element={<Navigate to="/login" replace />} />

              {/* Passenger / Conductor Home */}
              <Route path="/dashboard" element={
                user
                  ? (user.role === 'conductor' || user.role === 'admin')
                    ? <ConductorHomeScreen user={user} />
                    : <HomeScreen user={user} />
                  : <Navigate to="/login" replace />
              } />
              <Route path="/activity" element={
                user ? <ActivityScreen user={user} /> : <Navigate to="/login" replace />
              } />
              <Route path="/profile" element={
                user ? <ProfileScreen user={user} logout={logout} /> : <Navigate to="/login" replace />
              } />
              <Route path="/bus/:id" element={
                user ? <BusDetailScreen user={user} /> : <Navigate to="/login" replace />
              } />
              <Route path="/book/:id" element={
                user ? <BookingScreen user={user} /> : <Navigate to="/login" replace />
              } />

              {/* Conductor */}
              <Route path="/conductor" element={
                user?.role === 'conductor' || user?.role === 'admin'
                  ? <ConductorScreen user={user} />
                  : <Navigate to="/dashboard" replace />
              } />

              {/* Settings & Legal */}
              <Route path="/settings" element={
                user ? <Settings user={user} /> : <Navigate to="/login" replace />
              } />
              <Route path="/privacy-policy" element={<LegalPage />} />
              <Route path="/terms" element={<LegalPage />} />

              {/* Landing → redirect to login or dashboard */}
              <Route path="/" element={
                user ? <Navigate to={user.role === 'conductor' ? '/conductor' : '/dashboard'} replace /> :
                <Navigate to="/login" replace />
              } />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>

          {/* Bottom Nav — only when logged in */}
          {user && <BottomNav isConductor={user.role === 'conductor' || user.role === 'admin'} />}
        </div>
      </Router>
    </GoogleOAuthProvider>
  );
};

export default MobileApp;
