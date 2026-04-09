import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiChevronLeft, FiShield, FiFileText } from 'react-icons/fi';

const MobileLegalScreen = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const type = location.pathname.includes('privacy') ? 'privacy' : 
               location.pathname.includes('terms') ? 'terms' : 'legal';

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [type]);

  const getContent = () => {
    if (type === 'privacy') {
      return {
        title: 'Privacy Policy',
        icon: <FiShield />,
        content: (
          <div className="m-flex m-flex-col m-gap-16">
            <div>
              <div className="m-subheading m-mb-4">1. Data We Collect</div>
              <div className="m-text-sm m-text-muted" style={{ lineHeight: 1.6 }}>We collect information you provide directly, such as when you create an account, update your profile, or make a booking. This includes name, email, and optionally, your profile picture.</div>
            </div>
            <div>
              <div className="m-subheading m-mb-4">2. Location Data</div>
              <div className="m-text-sm m-text-muted" style={{ lineHeight: 1.6 }}>To provide real-time bus tracking, we may collect precise location data from your device. This data is only used during active sessions and to improve service accuracy.</div>
            </div>
            <div>
              <div className="m-subheading m-mb-4">3. How We Use Data</div>
              <div className="m-text-sm m-text-muted" style={{ lineHeight: 1.6 }}>Your data is used to provide, maintain, and improve SmartBus services, process transactions, and communicate with you about your rides.</div>
            </div>
          </div>
        )
      };
    }
    return {
      title: 'Terms of Service',
      icon: <FiFileText />,
      content: (
        <div className="m-flex m-flex-col m-gap-16">
          <div>
            <div className="m-subheading m-mb-4">1. Acceptance</div>
            <div className="m-text-sm m-text-muted" style={{ lineHeight: 1.6 }}>By using SmartBus, you agree to these Terms of Service. If you disagree with any part of the terms, you may not access the service.</div>
          </div>
          <div>
            <div className="m-subheading m-mb-4">2. User Accounts</div>
            <div className="m-text-sm m-text-muted" style={{ lineHeight: 1.6 }}>You must provide accurate and complete information when creating an account. You are responsible for all activity that occurs under your account.</div>
          </div>
          <div>
            <div className="m-subheading m-mb-4">3. Fair Use</div>
            <div className="m-text-sm m-text-muted" style={{ lineHeight: 1.6 }}>Users agree not to misuse the service or help anyone else do so. This includes any attempt to scrape data or disrupt the real-time tracking network.</div>
          </div>
        </div>
      )
    };
  };

  const { title, icon, content } = getContent();

  return (
    <div className="mobile-screen" style={{ paddingBottom: '20px' }}>
      <div className="m-flex m-items-center m-gap-12 m-mb-24">
        <button className="m-btn-icon" onClick={() => navigate(-1)}>
          <FiChevronLeft size={24} />
        </button>
        <h1 className="m-heading" style={{ fontSize: 22, margin: 0 }}>{title}</h1>
      </div>

      <motion.div className="m-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ padding: 20 }}>
        <div className="m-flex m-items-center m-gap-12 m-mb-16">
          <div className={`m-stat-icon ${type === 'privacy' ? 'm-stat-icon-mint' : 'm-stat-icon-sky'}`} style={{ width: 44, height: 44, fontSize: 20 }}>
            {icon}
          </div>
          <span className="m-subheading" style={{ fontSize: 16 }}>{title}</span>
        </div>
        
        <div className="m-divider m-mb-16" />
        
        {content}
        
        <div className="m-divider m-mt-24 m-mb-12" />
        <div className="m-text-sm m-text-muted m-text-center">Last updated: March 2024</div>
      </motion.div>
    </div>
  );
};

export default MobileLegalScreen;
