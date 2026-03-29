import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { authService } from '../services/dataService';
import './Navbar.css';

const Navbar = ({ user, onLogout, isProfileOpen, setIsProfileOpen, theme, onToggleTheme }) => {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [hoveredTab, setHoveredTab] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [activeSection, setActiveSection] = useState('hero');
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Refs for transient touch state (avoids React re-renders during touch)
  const touchStateRef = useRef({
    isDragging: false,
    lastElem: null,
    startX: 0,
    startY: 0,
  });
  const hoverClearTimeoutRef = useRef(null);
  const scrollBlockedRef = useRef(false);
  const scrollBlockTimeoutRef = useRef(null);
  const rafRef = useRef(null);

  // Apple-like spring: smooth deceleration, no bounce
  const liquidPillTransition = {
    type: 'spring',
    stiffness: 350,
    damping: 38,
    mass: 0.6,
    restDelta: 0.5,
    restSpeed: 10,
  };

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 940);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
      if (scrollBlockedRef.current) return;
      
      if (location.pathname === '/') {
        const sections = ['hero', 'features', 'how-it-works', 'contact'];
        let current = '';
        for (const section of sections) {
          const element = document.getElementById(section);
          if (element) {
            const rect = element.getBoundingClientRect();
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
    handleScroll();
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
    { title: 'Download App', path: '/download-app', id: 'nav-app' },
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

  // Resolve which nav element the finger is on — returns { title, type, elem } or null
  const resolveNavElement = useCallback((clientX, clientY) => {
    const elem = document.elementFromPoint(clientX, clientY);
    if (!elem) return null;

    const linkEl = elem.closest('.nav-link, .btn-nav-login, .btn-nav-signup, .nav-profile-trigger');
    if (!linkEl) return null;

    if (linkEl.classList.contains('nav-link')) {
      const title = linkEl.getAttribute('data-title');
      return title ? { title, type: 'nav-link', elem: linkEl } : null;
    } else if (linkEl.classList.contains('btn-nav-login')) {
      return { title: 'Login', type: 'login', elem: linkEl };
    } else if (linkEl.classList.contains('btn-nav-signup')) {
      return { title: 'Signup', type: 'signup', elem: linkEl };
    } else if (linkEl.classList.contains('nav-profile-trigger')) {
      return { title: 'Profile', type: 'profile', elem: linkEl };
    }
    return null;
  }, []);

  const blockScrollObserver = useCallback(() => {
    scrollBlockedRef.current = true;
    if (scrollBlockTimeoutRef.current) clearTimeout(scrollBlockTimeoutRef.current);
    scrollBlockTimeoutRef.current = setTimeout(() => { scrollBlockedRef.current = false; }, 2000);
  }, []);

  const scheduleClearHover = useCallback((delayMs = 600) => {
    if (hoverClearTimeoutRef.current) clearTimeout(hoverClearTimeoutRef.current);
    hoverClearTimeoutRef.current = setTimeout(() => {
      setHoveredTab(null);
    }, delayMs);
  }, []);

  // ===== Touch Handlers =====
  const handleTouchStart = useCallback((e) => {
    if (hoverClearTimeoutRef.current) clearTimeout(hoverClearTimeoutRef.current);
    if (scrollBlockTimeoutRef.current) clearTimeout(scrollBlockTimeoutRef.current);

    const t = e.touches[0];
    touchStateRef.current = {
      isDragging: false,
      lastElem: null,
      startX: t.clientX,
      startY: t.clientY,
    };
    scrollBlockedRef.current = true;

    const resolved = resolveNavElement(t.clientX, t.clientY);
    if (resolved) {
      touchStateRef.current.lastElem = resolved.elem;
      setHoveredTab(resolved.title);
    }
  }, [resolveNavElement]);

  const handleTouchMove = useCallback((e) => {
    const t = e.touches[0];
    const ts = touchStateRef.current;

    // Detect drag (> 5px movement)
    if (!ts.isDragging) {
      const dx = t.clientX - ts.startX;
      const dy = t.clientY - ts.startY;
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        ts.isDragging = true;
      }
    }

    // Throttle using rAF for smooth 60fps updates
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const resolved = resolveNavElement(t.clientX, t.clientY);
      if (resolved) {
        if (resolved.elem !== ts.lastElem) {
          ts.lastElem = resolved.elem;
          setHoveredTab(resolved.title);
        }
      } else {
        if (ts.lastElem) {
          ts.lastElem = null;
          // Don't clear hovered tab instantly — let it stay smooth
        }
      }
    });
  }, [resolveNavElement]);

  const handleTouchEnd = useCallback((e) => {
    const touch = e.changedTouches[0];
    const ts = touchStateRef.current;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    const resolved = resolveNavElement(touch.clientX, touch.clientY);

    if (ts.isDragging && resolved) {
      // User dragged and released on a nav element — navigate to it
      if (isMobile) setMenuOpen(false);

      if (resolved.type === 'profile') {
        setIsProfileOpen(!isProfileOpen);
        blockScrollObserver();
        scheduleClearHover(800);
        touchStateRef.current = { isDragging: false, lastElem: null, startX: 0, startY: 0 };
        return;
      }

      // Optimistically lock the active section BEFORE navigating
      if (resolved.type === 'nav-link') {
        const linkId = resolved.elem.getAttribute('id');
        if (linkId && linkId.startsWith('nav-link-')) {
          setActiveSection(linkId.replace('nav-link-', ''));
        }
      }

      const path = resolved.elem.getAttribute('href');
      const target = resolved.elem.getAttribute('target');
      if (target === '_blank') {
        window.open(window.location.origin + path, '_blank');
      } else if (path) {
        navigate(path);
      }
    }

    // Smoothly clear the hover highlight after finger lifts
    scheduleClearHover(600);
    blockScrollObserver();

    touchStateRef.current = { isDragging: false, lastElem: null, startX: 0, startY: 0 };
  }, [resolveNavElement, isMobile, isProfileOpen, setIsProfileOpen, navigate, blockScrollObserver, scheduleClearHover]);

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
          style={{ touchAction: 'manipulation' }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
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
                  onClick={(e) => {
                    if (isMobile) setMenuOpen(false);
                    if (link.id) {
                      setActiveSection(link.id);
                      blockScrollObserver();
                    }
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
                onClick={(e) => { e.preventDefault(); setIsProfileOpen(!isProfileOpen); }}
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
                    transition={{ duration: 0.35, ease: [0.25, 1, 0.5, 1] }}
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
