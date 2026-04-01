import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import BottomNav from './components/BottomNav';
import './MobileApp.css';

// const GOOGLE_CLIENT_ID = "YOUR_GOOGLE_CLIENT_ID_HERE"; // Moved to prop

const LoginScreen = lazy(() => import('./screens/LoginScreen'));
const HomeScreen = lazy(() => import('./screens/HomeScreen'));
const ActivityScreen = lazy(() => import('./screens/ActivityScreen'));
const ProfileScreen = lazy(() => import('./screens/ProfileScreen'));
const ConductorScreen = lazy(() => import('./screens/ConductorScreen'));
const BusDetailScreen = lazy(() => import('./screens/BusDetailScreen'));

const Loading = () => (
  <div className="mobile-app" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
    <div className="m-loading"><div className="m-spinner" /><span className="m-label">Loading...</span></div>
  </div>
);

const MobileApp = ({ user, loading, login, signup, googleLogin, logout, googleClientId }) => {
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
