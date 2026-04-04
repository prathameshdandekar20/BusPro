import { lazy, Suspense, useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import BottomNav from './components/BottomNav';
import './MobileApp.css';

const LoginScreen = lazy(() => import('./screens/LoginScreen'));
const HomeScreen = lazy(() => import('./screens/HomeScreen'));
const ActivityScreen = lazy(() => import('./screens/ActivityScreen'));
const ProfileScreen = lazy(() => import('./screens/ProfileScreen'));
const ConductorScreen = lazy(() => import('./screens/ConductorScreen'));
const BusDetailScreen = lazy(() => import('./screens/BusDetailScreen'));
const BookingScreen = lazy(() => import('./screens/BookingScreen'));

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
        <span className="m-splash-version">v1.0.5</span>
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

  if (!splashDone) return <SplashScreen onFinish={() => setSplashDone(true)} />;
  if (loading) return <Loading />;

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <Router>
        <div className="mobile-app">
          <Suspense fallback={<Loading />}>
            <Routes>
              {/* Auth */}
              <Route path="/login" element={
                user ? <Navigate to={user.role === 'conductor' ? '/conductor' : '/dashboard'} replace /> :
                <LoginScreen login={login} signup={signup} googleLogin={googleLogin} />
              } />
              <Route path="/signup" element={<Navigate to="/login" replace />} />

              {/* Passenger */}
              <Route path="/dashboard" element={
                user ? <HomeScreen user={user} /> : <Navigate to="/login" replace />
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
