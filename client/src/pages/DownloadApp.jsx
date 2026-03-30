import { motion } from 'framer-motion';
import GlassCard from '../components/GlassCard';
import './Dashboard.css'; // Reusing styles

const DownloadApp = () => {
  const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.6, ease: [0.4, 0, 0.2, 1] }
    }
  };

  return (
    <div className="page-wrapper dashboard-page gpu-accel performance-container">
      <div className="dashboard-container section-container" style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <motion.div 
          initial="hidden"
          animate="visible"
          variants={fadeInUp}
          className="app-download-section"
          style={{ width: '100%' }}
        >
          <GlassCard className="app-download-card" style={{ padding: '60px 40px', textAlign: 'center' }}>
            <div className="app-download-flex">
              <div className="app-visual">
                <div className="app-phone-mock">
                  <div className="app-phone-screen">
                    <div className="app-logo-mini">🚌</div>
                    <div className="app-loading-dots">...</div>
                  </div>
                </div>
              </div>
              <div className="app-info-content">
                <h1 className="text-gold" style={{ fontSize: '2.5rem', marginBottom: '16px', fontFamily: 'var(--font-display)' }}>Get the SmartBus App</h1>
                <p className="text-muted" style={{ marginBottom: '32px', fontSize: '1.2rem', lineHeight: '1.6' }}>
                  Experience real-time tracking, instant alerts, and paperless booking right in your pocket. 
                  Download our official Android app for the fastest experience.
                </p>
                
                <div className="app-features-grid">
                  <div className="app-feat-item">🚀 <span>Lightning Fast</span></div>
                  <div className="app-feat-item">📍 <span>GPS Tracking</span></div>
                  <div className="app-feat-item">🔔 <span>Push Alerts</span></div>
                  <div className="app-feat-item">📴 <span>Offline Tickets</span></div>
                </div>

                <div style={{ marginTop: '20px' }}>
                  <a 
                    href="/downloads/SmartBus.apk" 
                    download 
                    className="btn-primary app-download-btn"
                    style={{ 
                      padding: '18px 40px', 
                      fontSize: '1.2rem', 
                      fontWeight: 800, 
                      borderRadius: 'var(--radius-full)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '12px'
                    }}
                  >
                    <span>📥</span> Download for Android
                  </a>
                </div>
                
                <p className="text-faint" style={{ marginTop: '20px', fontSize: '0.9rem' }}>
                  Version 1.0.1 • Supports Android 8.0 and above
                </p>
              </div>
            </div>
          </GlassCard>

          <div className="pwa-instructions" style={{ marginTop: '40px' }}>
            <h3 className="text-gold" style={{ marginBottom: '15px', fontSize: '1.5rem' }}>Don't want to download?</h3>
            <p className="text-muted" style={{ fontSize: '1.1rem' }}>
              You can also use our **Instant Web App**. Open this site in Chrome on your phone, 
              tap the menu (three dots), and select **"Add to Home Screen"**.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default DownloadApp;
