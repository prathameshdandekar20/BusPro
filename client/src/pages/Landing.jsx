import { useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import GlassCard from '../components/GlassCard';
import { 
  fadeInUp, 
  staggerContainer, 
  staggerItem, 
  fadeIn, 
  liquidFloat,
  slideInFromBottom,
  scaleIn,
  textVariant
} from '../animations/variants';
import './Landing.css';

/* ========= Custom CountUp Component (No library = No crashes) ========= */
const Counter = ({ end, duration = 2000, suffix = '' }) => {
  const [count, setCount] = useState(0);
  const startTime = useRef(null);
  const [inView, setInView] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setInView(true); },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!inView) return;
    let animationFrame;
    const animate = (timestamp) => {
      if (!startTime.current) startTime.current = timestamp;
      const progress = Math.min((timestamp - startTime.current) / duration, 1);
      setCount(Math.floor(progress * end));
      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };
    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [end, duration, inView]);

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
};

const HeroSection = ({ isProfileOpen }) => {
  const { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 200], [0, 50]);
  const opacity = useTransform(scrollY, [0, 300], [1, 0]);
  const profileShift = isProfileOpen ? 250 : 0;

  return (
    <section className="hero-section gpu-accel performance-container" id="hero">
      <motion.div className="hero-gradient-bg gpu-accel" style={{ opacity }} />
      <div className="hero-glow-ambient" />

      <motion.div variants={staggerContainer(0.2, 0.1)} initial="hidden" animate="visible" className="hero-content section-container">
        <div className="hero-text-col">
          <motion.div variants={fadeInUp} className="hero-badge">Real-Time Public Transport</motion.div>
          <motion.h1 variants={textVariant(0.3)} className="hero-title">Ride Smarter.<br /><span className="hero-title-gold">Track Every Bus.</span><br />Live.</motion.h1>
          <motion.p variants={fadeInUp} className="hero-subtitle">SmartBus revolutionizes your daily commute with real-time bus tracking, live seat availability, and seamless digital boarding — all from your phone.</motion.p>
          <motion.div variants={fadeInUp} className="hero-buttons">
            <Link to="/signup" className="btn-primary" id="hero-get-started">Get Started Free →</Link>
            <a href="#features" className="btn-secondary" id="hero-view-demo">Explore Features</a>
          </motion.div>
          <motion.div variants={fadeInUp} className="hero-metrics">
            {[{ label: 'Active Cities', value: '12+' }, { label: 'Bus Operators', value: '50+' }, { label: 'Happy Riders', value: '25K+' }].map((m) => (
              <div key={m.label} className="hero-metric">
                <span className="hero-metric-value">{m.value}</span>
                <span className="hero-metric-label">{m.label}</span>
              </div>
            ))}
          </motion.div>
        </div>

        <motion.div animate={{ y: profileShift }} transition={{ type: 'spring', stiffness: 300, damping: 30 }} className="hero-visual">
          <motion.div style={{ y: y1 }} variants={slideInFromBottom} initial="hidden" animate="visible">
            <motion.div variants={liquidFloat} animate="animate" className="hero-phone-mockup gpu-accel">
              <div className="phone-screen">
                <div className="phone-header">
                  <div className="phone-status-bar">
                    <span>9:41</span>
                    <div className="phone-status-icons"><span>●●●●</span><span>WiFi</span><span>100%</span></div>
                  </div>
                  <h4>SmartBus</h4>
                  <p>3 Buses Nearby</p>
                </div>
                <div className="phone-bus-list">
                  {[{ num: 'BUS 42A', route: 'Central → Airport', seats: 12, color: '#00c853' }, { num: 'BUS 17B', route: 'Station → Mall', seats: 3, color: '#ff9100' }, { num: 'BUS 08C', route: 'Park → Beach', seats: 0, color: '#ff4444' }].map((b) => (
                    <div key={b.num} className="phone-bus-item">
                      <div className="phone-bus-info"><span className="phone-bus-num">{b.num}</span><span className="phone-bus-route">{b.route}</span></div>
                      <span className="phone-bus-seats" style={{ color: b.color }}>{b.seats > 0 ? `${b.seats} seats` : 'Full'}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      </motion.div>
    </section>
  );
};

const LightCrystalHero = () => {
  return (
    <section className="crystal-hero-container section" id="hero">
      <div className="crystal-ambient-bg" />
      
      <div className="crystal-hero-glass-frame">
        <div className="crystal-frame-inner">
          <motion.h1 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="crystal-frame-title"
          >
            THE ADVANCED "CRYSTAL"<br/>UI FRAMEWORK
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="crystal-frame-subtitle"
          >
            Experience Realistic Clarity, Precise Refraction, and Deep Fluidity.
          </motion.p>
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="crystal-frame-buttons"
          >
            <Link to="/signup" className="btn-crystal-glass">Get Started Now</Link>
          </motion.div>
        </div>

        {/* Decorative Floating Crystal Shards inside frame area */}
        <div className="crystal-shard shard-1" />
        <div className="crystal-shard shard-2" />
        <div className="crystal-droplet drop-1" />
        <div className="crystal-droplet drop-2" />
      </div>

      <div className="crystal-cards-row">
        <motion.div 
          className="crystal-feature-card"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <div className="crystal-feature-icon">💎</div>
          <h3 className="crystal-feature-title">Optical Brilliance</h3>
          <p className="crystal-feature-desc">Experience Realistic Clarity, Precise refraction, and Deep fluidity, stem-and-communieration and refections.</p>
        </motion.div>
        
        <motion.div 
          className="crystal-feature-card"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="crystal-feature-icon">🕸️</div>
          <h3 className="crystal-feature-title">Fluidic Interaction</h3>
          <p className="crystal-feature-desc">This tools networks conamies and node of netrations, constoctor fluid and ants fluid connections.</p>
        </motion.div>

        <motion.div 
          className="crystal-feature-card"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <div className="crystal-feature-icon">💠</div>
          <h3 className="crystal-feature-title">Immersive Depths</h3>
          <p className="crystal-feature-desc">Envocrsate immersive layers icols for frames to pranastertive system and osnlomsn reflections.</p>
        </motion.div>
      </div>
    </section>
  );
};

const StatsSection = () => {
  const stats = [{ end: 25000, suffix: '+', label: 'Total Users', icon: '👥' }, { end: 150, suffix: '+', label: 'Active Buses', icon: '🚌' }, { end: 12, suffix: '', label: 'Cities Served', icon: '🏙️' }, { end: 5000, suffix: '+', label: 'Daily Trips', icon: '📊' }];
  return (
    <section className="stats-section section">
      <div className="stats-bg-glow" />
      <div className="section-container">
        <motion.div variants={staggerContainer(0.1)} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} className="stats-grid">
          {stats.map((stat) => (
            <motion.div key={stat.label} variants={staggerItem} className="stat-card-wrap">
              <GlassCard className="stat-card">
                <div className="stat-icon">{stat.icon}</div>
                <div className="stat-value"><Counter end={stat.end} suffix={stat.suffix} /></div>
                <div className="stat-label">{stat.label}</div>
              </GlassCard>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

const FeaturesSection = () => {
  const features = [{ icon: '📍', title: 'Real-Time Bus Tracking', description: 'Track every bus on the map with live GPS updates. Know exactly when your bus arrives.' }, { icon: '💺', title: 'Seat Availability', description: 'See live seat availability before boarding. Never stand in a crowded bus again.' }, { icon: '🗺️', title: 'Smart Route Discovery', description: 'Find the best routes with AI-powered suggestions based on traffic and timing.' }, { icon: '⭐', title: 'Loyalty Rewards', description: 'Earn points on every ride and redeem them for free trips and exclusive perks.' }, { icon: '📊', title: 'Conductor Dashboard', description: 'Powerful tools for conductors to manage trips, seats, and passenger flow effortlessly.' }, { icon: '⚡', title: 'Fast Boarding', description: 'Digital boarding passes for instant validation. No queues, no paper tickets.' }];
  return (
    <section className="features-section section" id="features">
      <div className="section-container">
        <motion.div variants={fadeInUp} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} className="section-header">
          <span className="section-badge">✦ FEATURES</span>
          <h2 className="section-title">Everything You Need to Commute Smart</h2>
          <p className="section-subtitle">From real-time tracking to digital boarding, SmartBus delivers a complete public transport experience.</p>
        </motion.div>
        <motion.div variants={staggerContainer(0.08)} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.1 }} className="features-grid grid-3">
          {features.map((feat) => (
            <motion.div key={feat.title} variants={staggerItem} className="feature-card-wrap">
              <GlassCard className="feature-card" tilt={true}>
                <div className="feature-icon">{feat.icon}</div>
                <h3 className="feature-title">{feat.title}</h3>
                <p className="feature-desc">{feat.description}</p>
              </GlassCard>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

const HowItWorksSection = () => {
  const steps = [{ step: '01', title: 'Search Your Route', desc: 'Enter your source and destination to find available buses.' }, { step: '02', title: 'View Live Availability', desc: 'See real-time seat counts and estimated arrival times.' }, { step: '03', title: 'Book Your Seat', desc: 'Reserve your spot instantly with one-tap booking.' }, { step: '04', title: 'Track & Ride', desc: 'Track your bus live on the map and board seamlessly.' }];
  return (
    <section className="hiw-section section" id="how-it-works">
      <div className="section-container">
        <motion.div variants={fadeInUp} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} className="section-header">
          <span className="section-badge">✦ HOW IT WORKS</span>
          <h2 className="section-title">Get Started in Minutes</h2>
          <p className="section-subtitle">Simple, intuitive, and fast — just how public transport should be.</p>
        </motion.div>
        <motion.div variants={staggerContainer(0.12)} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.1 }} className="hiw-timeline">
          {steps.map((s) => (
            <motion.div key={s.step} variants={staggerItem} className="hiw-step">
              <div className="hiw-step-number">{s.step}</div>
              <GlassCard className="hiw-step-card" tilt={true}>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
              </GlassCard>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

const AchievementsSection = () => {
  const achievements = [{ icon: '🏆', title: 'Top Transport App 2024', desc: 'Recognized by TechCrunch as the most innovative transport solution.' }, { icon: '🌍', title: '12 Cities Covered', desc: 'Expanding rapidly across major metropolitan areas worldwide.' }, { icon: '⚡', title: '99.9% Uptime', desc: 'Our infrastructure ensures reliable service around the clock.' }, { icon: '🎯', title: '< 2s Updates', desc: 'Real-time data refreshes in under 2 seconds for accurate tracking.' }];
  return (
    <section className="achievements-section section">
      <div className="section-container">
        <motion.div variants={fadeInUp} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} className="section-header">
          <span className="section-badge">✦ ACHIEVEMENTS</span>
          <h2 className="section-title">Milestones We're Proud Of</h2>
        </motion.div>
        <motion.div variants={staggerContainer(0.08)} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.1 }} className="achievements-grid grid-4">
          {achievements.map((a) => (
            <motion.div key={a.title} variants={staggerItem}>
              <GlassCard className="achievement-card">
                <div className="achievement-icon">{a.icon}</div>
                <h3>{a.title}</h3>
                <p>{a.desc}</p>
              </GlassCard>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

const TestimonialsSection = () => {
  const testimonials = [{ name: 'Priya Sharma', role: 'Daily Commuter', text: 'SmartBus completely changed my daily commute. I can see exactly when my bus arrives and if there are seats available. No more guessing!', rating: 5 }, { name: 'Rahul Patel', role: 'Bus Conductor', text: 'The conductor dashboard is incredibly easy to use. I can manage seat updates and trip info in real-time. My passengers love it!', rating: 5 }, { name: 'Anita Desai', role: 'Student', text: 'As a student, I rely on buses daily. SmartBus saves me so much time and I love the loyalty rewards for regular riders.', rating: 5 }];
  return (
    <section className="testimonials-section section">
      <div className="section-container">
        <motion.div variants={fadeInUp} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} className="section-header">
          <span className="section-badge">✦ TESTIMONIALS</span>
          <h2 className="section-title">Loved by Thousands of Riders</h2>
          <p className="section-subtitle">Real reviews from real passengers who ride with SmartBus every day.</p>
        </motion.div>
        <motion.div variants={staggerContainer(0.1)} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.1 }} className="testimonials-grid grid-3">
          {testimonials.map((t) => (
            <motion.div key={t.name} variants={staggerItem}>
              <GlassCard className="testimonial-card">
                <div className="testimonial-stars">{'★'.repeat(t.rating)}</div>
                <p className="testimonial-text">"{t.text}"</p>
                <div className="testimonial-author">
                  <div className="testimonial-avatar">{t.name[0]}</div>
                  <div><span className="testimonial-name">{t.name}</span><span className="testimonial-role">{t.role}</span></div>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

const GallerySection = () => {
  const screens = [{ title: 'Passenger Dashboard', desc: 'Track buses, view seats, and manage bookings', image: '/passenger-dash.png', gradient: 'linear-gradient(135deg, #1a1a2e, #16213e)' }, { title: 'Conductor Panel', desc: 'Manage trips, update seats, and track routes', image: '/conductor-dash-actual.png', gradient: 'linear-gradient(135deg, #0f0f1a, #1a0f2e)' }, { title: 'Live Map View', desc: 'Real-time GPS tracking of all active buses', image: '/live-map-dash.png', gradient: 'linear-gradient(135deg, #1a2a1a, #0f2e16)' }];
  return (
    <section className="gallery-section section">
      <div className="section-container">
        <motion.div variants={fadeInUp} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} className="section-header">
          <span className="section-badge">✦ PRODUCT</span>
          <h2 className="section-title">Beautiful Dashboards, Powerful Tools</h2>
        </motion.div>
        <motion.div variants={staggerContainer(0.1)} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.1 }} className="gallery-grid grid-3">
          {screens.map((s) => (
            <motion.div key={s.title} variants={staggerItem}>
              <GlassCard className="gallery-card">
                <div className="gallery-preview" style={{ background: s.gradient }}>
                  <div className="gallery-preview-content" style={{ padding: 0, height: '100%' }}>
                    <img src={s.image} alt={s.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  </div>
                </div>
                <h3 className="gallery-title">{s.title}</h3>
                <p className="gallery-desc">{s.desc}</p>
              </GlassCard>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

const ContactSection = () => {
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [submitted, setSubmitted] = useState(false);
  const [hoveredSocial, setHoveredSocial] = useState(null);
  const handleSubmit = (e) => { e.preventDefault(); setSubmitted(true); setTimeout(() => setSubmitted(false), 3000); setFormData({ name: '', email: '', message: '' }); };
  const socials = [{ name: 'Twitter', url: 'https://twitter.com' }, { name: 'LinkedIn', url: 'https://linkedin.com' }, { name: 'GitHub', url: 'https://github.com' }];
  const liquidPillTransition = { type: 'spring', stiffness: 450, damping: 35, mass: 0.8 };
  return (
    <section className="contact-section section" id="contact">
      <div className="section-container">
        <motion.div variants={fadeInUp} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} className="section-header">
          <span className="section-badge">✦ CONTACT</span>
          <h2 className="section-title">Let's Connect</h2>
          <p className="section-subtitle">Have a question, partnership idea, or feedback? We'd love to hear from you.</p>
        </motion.div>
        <motion.div variants={fadeIn} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.1 }} className="contact-wrapper">
          <GlassCard className="contact-form-card">
            <form onSubmit={handleSubmit} id="contact-form">
              <div className="form-group"><label>Name</label><input type="text" className="form-input" placeholder="Your name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required id="contact-name" /></div>
              <div className="form-group"><label>Email</label><input type="email" className="form-input" placeholder="you@email.com" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} required id="contact-email" /></div>
              <div className="form-group"><label>Message</label><textarea className="form-input" rows="5" placeholder="Tell us what's on your mind..." value={formData.message} onChange={(e) => setFormData({...formData, message: e.target.value})} required id="contact-message" /></div>
              <button type="submit" className="btn-primary contact-submit" id="contact-submit">{submitted ? '✓ Sent!' : 'Send Message'}</button>
            </form>
          </GlassCard>
          <GlassCard className="contact-info-card">
            <h3>Get in Touch</h3>
            <div className="contact-detail"><span className="contact-detail-icon">📧</span><div><p className="contact-detail-label">Email</p><p className="contact-detail-value">hello@smartbus.io</p></div></div>
            <div className="contact-detail"><span className="contact-detail-icon">📱</span><div><p className="contact-detail-label">Phone</p><p className="contact-detail-value">+91 98765 43210</p></div></div>
            <div className="contact-detail"><span className="contact-detail-icon">📍</span><div><p className="contact-detail-label">Office</p><p className="contact-detail-value">Bangalore, India</p></div></div>
            <div className="contact-socials" onMouseLeave={() => setHoveredSocial(null)}>
              {socials.map((s) => (
                <a key={s.name} href={s.url} className="contact-social" onMouseEnter={() => setHoveredSocial(s.name)}>
                  <span className="social-text">{s.name}</span>
                  {hoveredSocial === s.name && <motion.div layoutId="contact-pill" className="contact-liquid-bg" transition={liquidPillTransition} />}
                </a>
              ))}
            </div>
          </GlassCard>
        </motion.div>
      </div>
    </section>
  );
};

const Landing = ({ isProfileOpen }) => {
  useEffect(() => {
    const sections = ['hero', 'features', 'how-it-works', 'contact'];
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.id;
          if (id) {
            window.history.replaceState(null, null, `#${id}`);
            window.dispatchEvent(new HashChangeEvent('hashchange'));
          }
        }
      });
    }, { threshold: 0.35, rootMargin: '-80px 0px 0px 0px' });
    sections.forEach(id => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="landing-page">
      <HeroSection isProfileOpen={isProfileOpen} />
      <StatsSection />
      <FeaturesSection />
      <HowItWorksSection />
      <AchievementsSection />
      <TestimonialsSection />
      <GallerySection />
      <ContactSection />
    </div>
  );
};

export default Landing;
