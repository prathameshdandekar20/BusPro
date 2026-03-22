import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { authService } from '../services/dataService';
import './Navbar.css';

const Navbar = ({ user, onLogout, isProfileOpen, setIsProfileOpen, theme, onToggleTheme }) => {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [hoveredTab, setHoveredTab] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 940);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const liquidPillTransition = {
    type: 'spring',
    stiffness: 450,
    damping: 35,
    mass: 0.8
  };

  const [activeSection, setActiveSection] = useState('hero');

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
      
      // Determine which section is currently active based on scroll
      if (location.pathname === '/') {
        const sections = ['hero', 'features', 'how-it-works', 'contact'];
        let current = '';
        
        for (const section of sections) {
          const element = document.getElementById(section);
          if (element) {
            const rect = element.getBoundingClientRect();
            // If the section's top is past the middle of the screen, and its bottom is below the middle
            if (rect.top <= window.innerHeight / 2 && rect.bottom >= window.innerHeight / 3) {
              current = section;
            }
          }
        }
        
        if (current) {
          setActiveSection(current);
        } else if (window.scrollY < window.innerHeight / 2) {
          setActiveSection('hero');
        }
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // initial check
    return () => window.removeEventListener('scroll', handleScroll);
  }, [location.pathname]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [setIsProfileOpen]);

  useEffect(() => {
    setMenuOpen(false);
    setIsProfileOpen(false);
  }, [location, setIsProfileOpen]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (menuOpen && isMobile) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen, isMobile]);

  const handleLogout = () => {
    onLogout();
    navigate('/');
  };

  const getDashboardLink = () => {
    if (!user) return '/login';
    return user.role === 'conductor' ? '/conductor' : '/dashboard';
  };

  const navLinks = [
    { title: 'Home', path: '/', id: 'hero' },
    { title: 'Features', path: '/#features', id: 'features', isHash: true },
    { title: 'How It Works', path: '/#how-it-works', id: 'how-it-works', isHash: true },
    { title: 'Contact', path: '/#contact', id: 'contact', isHash: true },
  ];

  if (user) {
    if (user.role === 'conductor') {
      navLinks.push({ title: 'Conductor Dashboard', path: '/conductor', id: 'nav-conductor', isExternal: true });
    } else {
      navLinks.push({ title: 'Dashboard', path: '/dashboard', id: 'nav-dashboard' });
    }
  }

  return (
    <motion.nav
      className={`navbar gpu-accel ${scrolled ? 'navbar-scrolled' : ''}`}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
    >
      <div className="navbar-container">
        <Link to="/" className="navbar-logo" id="nav-logo">
          <div className="logo-icon">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <rect x="3" y="6" width="22" height="14" rx="4" stroke="#D4AF37" strokeWidth="2" />
              <circle cx="9" cy="22" r="2.5" stroke="#D4AF37" strokeWidth="1.5" />
              <circle cx="19" cy="22" r="2.5" stroke="#D4AF37" strokeWidth="1.5" />
              <rect x="7" y="9" width="5" height="5" rx="1" fill="#D4AF37" opacity="0.6" />
              <rect x="16" y="9" width="5" height="5" rx="1" fill="#D4AF37" opacity="0.6" />
              <line x1="14" y1="6" x2="14" y2="3" stroke="#D4AF37" strokeWidth="1.5" strokeLinecap="round" />
              <circle cx="14" cy="2" r="1" fill="#D4AF37" />
            </svg>
          </div>
          <span className="logo-text">SmartBus</span>
        </Link>

        {/* Theme Toggle Switch */}
        <button 
          className={`theme-toggle ${theme === 'light' ? 'theme-toggle-light' : ''}`}
          onClick={onToggleTheme}
          aria-label="Toggle theme"
          id="theme-toggle"
        >
          <div className="theme-toggle-track">
            <span className="theme-toggle-icon sun-icon">☀️</span>
            <span className="theme-toggle-icon moon-icon">🌙</span>
            <div className="theme-toggle-thumb" />
          </div>
        </button>

        <div 
          className={`navbar-links ${menuOpen ? 'active' : ''}`}
          onTouchMove={(e) => {
            if (!isMobile) return;
            const touch = e.touches[0];
            const element = document.elementFromPoint(touch.clientX, touch.clientY);
            if (element) {
              const linkEl = element.closest('.nav-link, .btn-nav-login, .btn-nav-signup');
              if (linkEl) {
                if (linkEl.classList.contains('nav-link')) {
                  const title = linkEl.getAttribute('data-title');
                  if (title && hoveredTab !== title) setHoveredTab(title);
                } else if (linkEl.classList.contains('btn-nav-login')) {
                  if (hoveredTab !== 'Login') setHoveredTab('Login');
                } else if (linkEl.classList.contains('btn-nav-signup')) {
                  if (hoveredTab !== 'Signup') setHoveredTab('Signup');
                }
              } else {
                setHoveredTab(null);
              }
            }
          }}
          onTouchEnd={() => isMobile && setHoveredTab(null)}
        >
          <div className="nav-links-inner" onMouseLeave={() => !isMobile && setHoveredTab(null)}>
            {navLinks.map((link) => {
              const isActive = location.pathname === '/' ? activeSection === link.id : location.pathname === link.path;
              return (
                <Link
                  key={link.title}
                  to={link.path}
                  target={link.isExternal ? '_blank' : undefined}
                  className={`nav-link ${isActive ? 'active' : ''}`}
                  id={`nav-link-${link.id}`}
                  data-title={link.title}
                  onMouseEnter={() => !isMobile && setHoveredTab(link.title)}
                  onTouchStart={() => isMobile && setHoveredTab(link.title)}
                  onClick={(e) => {
                    if (isMobile) setMenuOpen(false);
                    if (link.isExternal) {
                       e.preventDefault();
                       window.open(window.location.origin + link.path, '_blank');
                    }
                  }}
                >
                  <span className="nav-link-text" style={{ position: 'relative', zIndex: 10 }}>{link.title}</span>
                  {((hoveredTab === link.title) || (!hoveredTab && isActive)) && (
                    <motion.div
                      layoutId="nav-liquid-pill"
                      className="nav-liquid-bg gpu-accel"
                      transition={liquidPillTransition}
                    />
                  )}
                </Link>
              );
            })}
          </div>

          {user ? (
            <div
              className="nav-profile-container"
              ref={dropdownRef}
              onMouseEnter={() => {
                if (!isMobile) {
                  setHoveredTab('Profile');
                  setIsProfileOpen(true);
                }
              }}
              onMouseLeave={() => {
                if (!isMobile) {
                  setHoveredTab(null);
                  setIsProfileOpen(false);
                }
              }}
            >
              <button
                className={`nav-profile-trigger ${isProfileOpen ? 'active' : ''}`}
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                aria-expanded={isProfileOpen}
              >
                <div className="nav-avatar" style={{ position: 'relative', zIndex: 10 }}>
                  {user.avatar ? (
                    <img src={user.avatar} alt="Avatar" className="nav-avatar-img" />
                  ) : (
                    user.name ? user.name[0].toUpperCase() : 'U'
                  )}
                </div>
                <span className="nav-user-name" style={{ position: 'relative', zIndex: 10 }}>{user.name || 'User'}</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className={`chevron ${isProfileOpen ? 'open' : ''}`} style={{ position: 'relative', zIndex: 10 }}>
                  <path d="M6 9l6 6 6-6" />
                </svg>
                {hoveredTab === 'Profile' && (
                  <motion.div
                    layoutId="nav-liquid-pill"
                    className="nav-liquid-bg gpu-accel"
                    transition={liquidPillTransition}
                  />
                )}
              </button>

              <AnimatePresence>
                {isProfileOpen && (
                  <motion.div
                    key="profile-dropdown"
                    className="nav-profile-dropdown"
                    initial={isMobile ? { opacity: 0, height: 0, overflow: 'hidden' } : { opacity: 0, y: 10, scale: 0.95 }}
                    animate={isMobile ? { opacity: 1, height: 'auto', overflow: 'hidden' } : { opacity: 1, y: 0, scale: 1 }}
                    exit={isMobile ? { opacity: 0, height: 0, overflow: 'hidden' } : { opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
                  >
                    <motion.div 
                      className="profile-dropdown-content"
                      initial={isMobile ? { opacity: 0, y: -20 } : false}
                      animate={isMobile ? { opacity: 1, y: 0 } : false}
                      transition={{ delay: 0.1, duration: 0.3 }}
                    >
                      <div className="profile-dropdown-header">
                        <div className="dropdown-avatar">
                          {user.avatar ? (
                            <img src={user.avatar} alt="Avatar" className="dropdown-avatar-img" />
                          ) : (
                            user.name ? user.name[0].toUpperCase() : 'U'
                          )}
                        </div>
                        <div className="dropdown-info">
                          <span className="dropdown-name">{user?.name || 'User'}</span>
                          <span className="dropdown-email">{user?.email || ''}</span>
                          <span className="dropdown-role-badge">{user?.role}</span>
                        </div>
                      </div>

                      <Link to="/settings" className="dropdown-item" onClick={() => { setIsProfileOpen(false); setMenuOpen(false); }}>
                        <span className="item-icon">👤</span>
                        <span>My Profile</span>
                      </Link>

                      <div className="dropdown-divider" />

                      <button onClick={() => { handleLogout(); setIsProfileOpen(false); setMenuOpen(false); }} className="dropdown-item logout-item">
                        <span className="item-icon">🚪</span>
                        <span>Logout</span>
                      </button>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <div className="nav-auth-buttons">
              <Link
                to="/login"
                className="btn-nav-login"
                onMouseEnter={() => !isMobile && setHoveredTab('Login')}
                onTouchStart={() => isMobile && setHoveredTab('Login')}
                onClick={() => isMobile && setMenuOpen(false)}
              >
                <span className="nav-link-text" style={{ position: 'relative', zIndex: 10 }}>Sign In</span>
                {hoveredTab === 'Login' && (
                  <motion.div
                    layoutId="nav-liquid-pill"
                    className="nav-liquid-bg"
                    transition={liquidPillTransition}
                  />
                )}
              </Link>
              <Link
                to="/signup"
                className="btn-nav-signup"
                onMouseEnter={() => !isMobile && setHoveredTab('Signup')}
                onTouchStart={() => isMobile && setHoveredTab('Signup')}
                onClick={() => isMobile && setMenuOpen(false)}
              >
                <span className="nav-link-text" style={{ position: 'relative', zIndex: 10 }}>Get Started</span>
                {hoveredTab === 'Signup' && (
                  <motion.div
                    layoutId="nav-liquid-pill"
                    className="nav-liquid-bg signup-pill-bg"
                    transition={liquidPillTransition}
                  />
                )}
              </Link>
            </div>
          )}
        </div>

        {/* Mobile overlay */}
        {menuOpen && isMobile && (
          <div className="mobile-nav-overlay" onClick={() => setMenuOpen(false)} />
        )}

        <button
          className={`navbar-toggle ${menuOpen ? 'active' : ''}`}
          onClick={() => setMenuOpen(!menuOpen)}
          id="nav-toggle"
          aria-label="Toggle menu"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>
    </motion.nav>
  );
};

export default Navbar;
