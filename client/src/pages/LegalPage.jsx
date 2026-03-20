import { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import GlassCard from '../components/GlassCard';
import { pageTransition, fadeInUp } from '../animations/variants';
import './Legal.css';

const LegalPage = () => {
  const { type } = useParams();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [type]);

  const getContent = () => {
    switch (type) {
      case 'privacy':
        return {
          title: 'Privacy Policy',
          content: (
            <>
              <h3>1. Data We Collect</h3>
              <p>We collect information you provide directly, such as when you create an account, update your profile, or make a booking. This includes name, email, and optionally, your profile picture.</p>
              <h3>2. Location Data</h3>
              <p>To provide real-time bus tracking, we may collect precise location data from your device. This data is only used during active sessions and to improve service accuracy.</p>
              <h3>3. How We Use Data</h3>
              <p>Your data is used to provide, maintain, and improve SmartBus services, process transactions, and communicate with you about your rides.</p>
            </>
          ),
        };
      case 'terms':
        return {
          title: 'Terms of Service',
          content: (
            <>
              <h3>1. Acceptance</h3>
              <p>By using SmartBus, you agree to these Terms of Service. If you disagree with any part of the terms, you may not access the service.</p>
              <h3>2. User Accounts</h3>
              <p>You must provide accurate and complete information when creating an account. You are responsible for all activity that occurs under your account.</p>
              <h3>3. Fair Use</h3>
              <p>Users agree not to misuse the service or help anyone else do so. This includes any attempt to scrape data or disrupt the real-time tracking network.</p>
            </>
          ),
        };
      case 'cookies':
        return {
          title: 'Cookie Policy',
          content: (
            <>
              <h3>1. What are Cookies?</h3>
              <p>Cookies are small text files stored on your device to help websites remember your preferences and provide a better experience.</p>
              <h3>2. How We Use Cookies</h3>
              <p>We use essential cookies for authentication and performance. These cookies ensure that your session remains secure and that the map loads efficiently.</p>
              <h3>3. Managing Cookies</h3>
              <p>Most browsers allow you to control cookies through their settings. However, disabling essential cookies may impact the functionality of SmartBus.</p>
            </>
          ),
        };
      case 'gdpr':
        return {
          title: 'GDPR Compliance',
          content: (
            <>
              <h3>1. Your Rights</h3>
              <p>Under GDPR, you have the right to access, rectify, or erase your personal data held by SmartBus. You also have the right to data portability.</p>
              <h3>2. Data Protection</h3>
              <p>We implement strict security measures to protect your personal information and ensure it is processed lawfully, fairly, and in a transparent manner.</p>
              <h3>3. Contact Us</h3>
              <p>For any privacy-related inquiries or to exercise your rights, please contact our Data Protection Officer at privacy@smartbus.io.</p>
            </>
          ),
        };
      case 'careers':
        return {
          title: 'Careers @ SmartBus',
          content: (
            <>
              <h3>Join the Revolution</h3>
              <p>We're looking for passionate individuals to help us build the future of public transportation. Check out our open roles below:</p>
              <div className="career-roles">
                <div className="career-item">
                  <h4>Fullstack Engineer</h4>
                  <p>Bangalore, India • Remote Friendly</p>
                </div>
                <div className="career-item">
                  <h4>Product Designer (UI/UX)</h4>
                  <p>Bangalore, India • On-site</p>
                </div>
                <div className="career-item">
                  <h4>Mobile Developer (React Native)</h4>
                  <p>Remote • Contract</p>
                </div>
              </div>
              <h3>Why SmartBus?</h3>
              <p>Work on high-impact problems, enjoy competitive compensation, and be part of a mission-driven team dedicated to making cities more breathable.</p>
            </>
          ),
        };
      case 'news':
        return {
          title: 'News & Updates',
          content: (
            <>
              <div className="news-feed">
                <div className="news-item">
                  <span className="news-date">March 14, 2024</span>
                  <h3>SmartBus reaches 25,000 riders!</h3>
                  <p>Today we celebrated a major milestone in our journey to modernize public transport. A huge thank you to our amazing community.</p>
                </div>
                <div className="news-item">
                  <span className="news-date">Feb 20, 2024</span>
                  <h3>Expansion to Mumbai & Delhi</h3>
                  <p>We are officially launching in two of India's biggest metropolitan hubs. Real-time tracking is now live for all major routes.</p>
                </div>
              </div>
            </>
          ),
        };
      default:
        return { title: 'Legal Information', content: <p>Please select a relevant document from the footer.</p> };
    }
  };

  const { title, content } = getContent();

  return (
    <motion.div 
      className="page-wrapper legal-page"
      variants={pageTransition}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <div className="section-container">
        <div className="auth-back-container">
          <Link to="/" className="btn-back">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            <span>Back to Home</span>
          </Link>
        </div>

        <motion.div variants={fadeInUp} initial="hidden" animate="visible">
          <GlassCard className="legal-card" tilt={false}>
            <h1 className="legal-title text-gold">{title}</h1>
            <div className="legal-content">
              {content}
            </div>
            <div className="legal-footer">
              <p className="text-muted">Last updated: March 2024</p>
            </div>
          </GlassCard>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default LegalPage;
