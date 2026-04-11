import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiUser, FiMail, FiPhone, FiLogOut, FiChevronRight, FiSettings, FiShield, FiFileText } from 'react-icons/fi';

const ProfileScreen = ({ user, logout }) => {
  const navigate = useNavigate();
  const [showPhoneEdit, setShowPhoneEdit] = useState(false);

  return (
    <div className="mobile-screen">
      <h1 className="m-heading m-mb-24">Profile</h1>

      {/* User Info */}
      <motion.div className="m-card m-mb-24 m-flex m-items-center m-gap-16"
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="m-avatar" style={{ width: 64, height: 64, fontSize: 26 }}>
          {user?.avatar ? <img src={user.avatar} alt="" /> : <FiUser />}
        </div>
        <div>
          <div className="m-text" style={{ fontSize: 18, fontWeight: 900 }}>{user?.name || 'User'}</div>
          <div className="m-label m-mt-4">{user?.role?.toUpperCase() || 'PASSENGER'}</div>
        </div>
      </motion.div>

      {/* Details Cards */}
      <div className="m-flex m-flex-col m-gap-12 m-mb-24">
        {/* Email Card */}
        <div className="m-card m-flex m-items-center m-gap-12" style={{ padding: 16 }}>
          <div className="m-stat-icon m-stat-icon-sky"><FiMail /></div>
          <div style={{ flex: 1 }}>
            <div className="m-label">Email</div>
            <div className="m-text m-mt-4">{user?.email || '—'}</div>
          </div>
        </div>
        
        {/* Phone Card - Clickable, navigates to settings */}
        <div className="m-card m-flex m-items-center m-gap-12" 
          style={{ padding: 16, cursor: 'pointer' }}
          onClick={() => navigate('/settings')}
        >
          <div className="m-stat-icon m-stat-icon-sky"><FiPhone /></div>
          <div style={{ flex: 1 }}>
            <div className="m-label">Phone</div>
            <div className="m-text m-mt-4">{user?.phone || 'Not set'}</div>
          </div>
          <FiChevronRight style={{ color: 'var(--m-light-muted)' }} />
        </div>
      </div>

      {/* Quick Links - App Theme Styled */}
      <div className="m-flex m-flex-col m-gap-8 m-mb-24">
        <button className="m-profile-link-btn" onClick={() => navigate('/settings')}>
          <span className="m-flex m-items-center m-gap-12">
            <span className="m-profile-link-icon icon-settings"><FiSettings /></span>
            <span className="m-profile-link-text">Settings</span>
          </span>
          <FiChevronRight className="m-profile-link-arrow" />
        </button>

        <button className="m-profile-link-btn" onClick={() => navigate('/privacy-policy')}>
          <span className="m-flex m-items-center m-gap-12">
            <span className="m-profile-link-icon icon-privacy"><FiShield /></span>
            <span className="m-profile-link-text">Privacy Policy</span>
          </span>
          <FiChevronRight className="m-profile-link-arrow" />
        </button>

        <button className="m-profile-link-btn" onClick={() => navigate('/terms')}>
          <span className="m-flex m-items-center m-gap-12">
            <span className="m-profile-link-icon icon-terms"><FiFileText /></span>
            <span className="m-profile-link-text">Terms of Service</span>
          </span>
          <FiChevronRight className="m-profile-link-arrow" />
        </button>
      </div>

      {/* Logout */}
      <button className="m-btn m-btn-dark" onClick={logout}>
        <FiLogOut /> Sign Out
      </button>

      {/* App Version */}
      <div className="m-text-sm m-text-muted m-text-center m-mt-24" style={{ opacity: 0.6 }}>
        SmartBus v1.0.13
      </div>
    </div>
  );
};

export default ProfileScreen;
