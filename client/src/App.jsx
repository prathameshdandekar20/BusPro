import { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import { useAuth } from './hooks/useAuth';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { isNativeApp } from './utils/platform';
import './index.css';
import './pages/CrystalLight.css';

const GOOGLE_CLIENT_ID = "YOUR_GOOGLE_CLIENT_ID_HERE"; // User should replace this
const APP_VERSION = '1.0.2'; // Change this when you push a new client update

// Lazy load pages for performance
const Landing = lazy(() => import('./pages/Landing'));
const Login = lazy(() => import('./pages/Login'));
const Signup = lazy(() => import('./pages/Signup'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const ConductorDashboard = lazy(() => import('./pages/ConductorDashboard'));
const Settings = lazy(() => import('./pages/Settings'));
const LegalPage = lazy(() => import('./pages/LegalPage'));
const DownloadApp = lazy(() => import('./pages/DownloadApp'));

const LoadingFallback = () => (
  <div className="loading-container">
    <div className="spinner" />
    <p className="text-muted">Loading...</p>
  </div>
);

const BusDetails = lazy(() => import('./pages/BusDetails'));
const BookingPage = lazy(() => import('./pages/BookingPage'));
const GalleryPage = lazy(() => import('./pages/GalleryPage'));
const TicketViewPage = lazy(() => import('./pages/TicketViewPage'));

const ProtectedRoute = ({ children, user, loading, requiredRole }) => {
  if (loading) return <LoadingFallback />;
  if (!user) return <Navigate to="/login" replace />;
  if (requiredRole && user.role !== requiredRole && user.role !== 'admin') {
    return <Navigate to="/" replace />;
  }
  return children;
};

function AppContent({ user, loading, login, signup, googleLogin, logout }) {
  const [updateInfo, setUpdateInfo] = useState(null); // { version, downloadUrl }
  const location = useLocation();
  const isAuthPage = location.pathname === '/login' || location.pathname === '/signup';
  const isLandingPage = location.pathname === '/';
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isTransitioningTheme, setIsTransitioningTheme] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('smartbus-theme') || 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('smartbus-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    if (isTransitioningTheme) return;
    setIsTransitioningTheme(true);
    // Allow overlay to fade in
    setTimeout(() => {
      setTheme(prev => prev === 'dark' ? 'light' : 'dark');
      // Wait for DOM paint and css application, then fade out
      setTimeout(() => setIsTransitioningTheme(false), 500); 
    }, 400); 
  };

  // Only check for app updates when running inside the native APK (Capacitor)
  useEffect(() => {
    if (!isNativeApp()) return; // Skip update check on website

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
    // Re-check every 30 minutes
    const interval = setInterval(checkForUpdates, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (location.hash) {
      const id = location.hash.substring(1);
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      window.scrollTo(0, 0);
    }
  }, [location.pathname, location.hash]);

  const handleDownloadUpdate = () => {
    if (!updateInfo?.downloadUrl) return;
    setIsDownloading(true);
    // Open the APK download URL — the browser/WebView will handle the download
    window.open(updateInfo.downloadUrl, '_system');
    setTimeout(() => setIsDownloading(false), 3000);
  };

  const mainClassName = isAuthPage ? "auth-main-isolated" : (isLandingPage ? "app-main landing-main" : "app-main content-main");

  return (
    <div className="app">
      <div className={`theme-transition-overlay ${isTransitioningTheme ? 'active' : ''}`}>
        <div className="theme-transition-spinner" />
      </div>

      {/* In-App Update Banner — only visible inside Capacitor APK */}
      <AnimatePresence>
        {updateInfo && (
          <motion.div 
            className="update-banner-toast"
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
          >
            <div className="update-content">
              <span className="update-icon">🚀</span>
              <div className="update-text">
                <strong>Update v{updateInfo.version} Available!</strong>
                <span>{updateInfo.changelog}</span>
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

      {!isAuthPage && (
        <Navbar 
          user={user} 
          onLogout={logout} 
          isProfileOpen={isProfileOpen} 
          setIsProfileOpen={setIsProfileOpen}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
      )}

      <main className={mainClassName}>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route path="/" element={<Landing isProfileOpen={isProfileOpen} />} />
            <Route
              path="/login"
              element={
                user ? (
                  <Navigate to={user.role === 'conductor' ? '/conductor' : '/dashboard'} replace />
                ) : (
                  <Login onLogin={login} onGoogleLogin={googleLogin} />
                )
              }
            />
            <Route
              path="/signup"
              element={
                user ? (
                  <Navigate to={user.role === 'conductor' ? '/conductor' : '/dashboard'} replace />
                ) : (
                  <Signup onSignup={signup} onGoogleLogin={googleLogin} />
                )
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute user={user} loading={loading}>
                  <Dashboard user={user} />
                </ProtectedRoute>
              }
            />
            <Route
              path="/conductor"
              element={
                <ProtectedRoute user={user} loading={loading} requiredRole="conductor">
                  <ConductorDashboard user={user} />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute user={user} loading={loading}>
                  <Settings user={user} />
                </ProtectedRoute>
              }
            />
            <Route
              path="/bus/:id"
              element={
                <ProtectedRoute user={user} loading={loading}>
                  <BusDetails user={user} />
                </ProtectedRoute>
              }
            />
            <Route
              path="/book/:id"
              element={
                <ProtectedRoute user={user} loading={loading}>
                  <BookingPage user={user} />
                </ProtectedRoute>
              }
            />
            <Route
              path="/bus/:id/gallery"
              element={
                <ProtectedRoute user={user} loading={loading}>
                  <GalleryPage user={user} />
                </ProtectedRoute>
              }
            />
            <Route
              path="/download-app"
              element={
                <DownloadApp />
              }
            />
            <Route path="/dashboard/ticket/:id" element={<TicketViewPage />} />
            <Route path="/:type" element={<LegalPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>

      {!isAuthPage && <Footer />}
    </div>
  );
}

function App() {
  const { user, loading, login, signup, googleLogin, logout } = useAuth();

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <Router>
        <AppContent 
          user={user} 
          loading={loading} 
          login={login} 
          signup={signup} 
          googleLogin={googleLogin} 
          logout={logout} 
        />
      </Router>
    </GoogleOAuthProvider>
  );
}

export default App;
