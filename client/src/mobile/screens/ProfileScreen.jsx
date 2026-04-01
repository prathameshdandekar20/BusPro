import { useState } from 'react';
import { motion } from 'framer-motion';
import { FiUser, FiMail, FiPhone, FiLogOut, FiChevronRight } from 'react-icons/fi';

const ProfileScreen = ({ user, logout }) => {
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
        {[
          { icon: <FiMail />, label: 'Email', value: user?.email || '—' },
          { icon: <FiPhone />, label: 'Phone', value: user?.phone || 'Not set' },
        ].map((item, i) => (
          <div key={i} className="m-card m-flex m-items-center m-gap-12" style={{ padding: 16 }}>
            <div className="m-stat-icon m-stat-icon-sky">{item.icon}</div>
            <div style={{ flex: 1 }}>
              <div className="m-label">{item.label}</div>
              <div className="m-text m-mt-4">{item.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Links */}
      <div className="m-flex m-flex-col m-gap-8 m-mb-24">
        {[
          { label: 'Settings', action: () => {} },
          { label: 'Privacy Policy', action: () => {} },
          { label: 'Terms of Service', action: () => {} },
        ].map((link, i) => (
          <button key={i} onClick={link.action}
            className="m-card-flat m-flex m-flex-between m-items-center m-w-full"
            style={{ border: 'none', cursor: 'pointer', fontFamily: 'var(--m-font)' }}>
            <span className="m-text">{link.label}</span>
            <FiChevronRight style={{ color: 'var(--m-muted)' }} />
          </button>
        ))}
      </div>

      {/* Logout */}
      <button className="m-btn m-btn-dark" onClick={logout}>
        <FiLogOut /> Sign Out
      </button>
    </div>
  );
};

export default ProfileScreen;
