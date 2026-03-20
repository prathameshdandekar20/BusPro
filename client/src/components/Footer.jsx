import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { fadeInUp, staggerContainer, staggerItem } from '../animations/variants';
import './Footer.css';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer-glow" />
      <motion.div
        className="footer-container section-container"
        variants={staggerContainer()}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
      >
        <div className="footer-grid">
          <motion.div className="footer-brand" variants={staggerItem}>
            <div className="footer-logo">
              <div className="footer-logo-icon">
                <svg width="24" height="24" viewBox="0 0 28 28" fill="none">
                  <rect x="3" y="6" width="22" height="14" rx="4" stroke="#D4AF37" strokeWidth="2"/>
                  <circle cx="9" cy="22" r="2.5" stroke="#D4AF37" strokeWidth="1.5"/>
                  <circle cx="19" cy="22" r="2.5" stroke="#D4AF37" strokeWidth="1.5"/>
                </svg>
              </div>
              <Link to="/" onClick={() => window.scrollTo(0, 0)} style={{ color: 'inherit', textDecoration: 'none' }}>
                <span>SmartBus</span>
              </Link>
            </div>
            <p className="footer-description">
              Revolutionizing public transport with real-time tracking, 
              smart seat management, and seamless boarding experience.
            </p>
            <div className="footer-socials">
              {[
                { 
                  name: 'Twitter', 
                  url: 'https://twitter.com',
                  icon: (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                  )
                },
                { 
                  name: 'LinkedIn', 
                  url: 'https://linkedin.com',
                  icon: (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                    </svg>
                  )
                },
                { 
                  name: 'GitHub', 
                  url: 'https://github.com',
                  icon: (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
                    </svg>
                  )
                },
                { 
                  name: 'Instagram', 
                  url: 'https://instagram.com',
                  icon: (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 1.366.062 2.633.334 3.608 1.308.975.975 1.246 2.242 1.308 3.608.058 1.266.069 1.646.069 4.85s-.011 3.584-.069 4.85c-.062 1.366-.334 2.633-1.308 3.608-.975.975-2.242 1.246-3.608 1.308-1.266.058-1.646.069-4.85.069s-3.584-.011-4.85-.069c-1.366-.062-2.633-.334-3.608-1.308-.975-.975-1.246-2.242-1.308-3.608-.058-1.266-.069-1.646-.069-4.85s.011-3.584.069-4.85c.062-1.366.334-2.633 1.308-3.608.975-.975 2.242-1.246 3.608-1.308 1.266-.058 1.646-.069 4.85-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.947.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.058-1.281.072-1.689.072-4.947 0-3.259-.014-3.668-.072-4.948-.2-4.354-2.617-6.78-6.979-6.98-1.281-.058-1.69-.072-4.949-.072zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                    </svg>
                  )
                }
              ].map((platform) => (
                <a 
                  key={platform.name} 
                  href={platform.url} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="footer-social-link" 
                  aria-label={platform.name}
                >
                  {platform.icon}
                </a>
              ))}
            </div>
          </motion.div>

          <motion.div className="footer-links-group" variants={staggerItem}>
            <h4>Product</h4>
            <Link to="/#features">Features</Link>
            <Link to="/#how-it-works">How It Works</Link>
            <Link to="/dashboard">Dashboard</Link>
            <Link to="/signup">Try for Free</Link>
          </motion.div>

          <motion.div className="footer-links-group" variants={staggerItem}>
            <h4>Company</h4>
            <Link to="/#hero">About Us</Link>
            <Link to="/careers">Careers</Link>
            <Link to="/news">News & Updates</Link>
            <Link to="/#contact">Contact</Link>
          </motion.div>

          <motion.div className="footer-links-group" variants={staggerItem}>
            <h4>Legal</h4>
            <Link to="/privacy">Privacy Policy</Link>
            <Link to="/terms">Terms of Service</Link>
            <Link to="/cookies">Cookie Policy</Link>
            <Link to="/gdpr">GDPR Compliance</Link>
          </motion.div>
        </div>

        <motion.div className="footer-bottom" variants={fadeInUp}>
          <div className="footer-bottom-info">
            <p>&copy; {currentYear} SmartBus Technologies. All rights reserved.</p>
            <p className="footer-tagline">Built with precision. Designed for tomorrow.</p>
          </div>
          <div className="india-badge">
            <span className="india-text">Proudly Made in India</span>
            <div className="tricolor-flag">
              <div className="flag-saffron"></div>
              <div className="flag-white">
                <div className="ashoka-chakra"></div>
              </div>
              <div className="flag-green"></div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </footer>
  );
};

export default Footer;

