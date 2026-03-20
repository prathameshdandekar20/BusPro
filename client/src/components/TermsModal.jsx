import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import GlassCard from './GlassCard';
import './TermsModal.css';

const TermsModal = ({ isOpen, onClose }) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="modal-overlay" onClick={onClose}>
          <motion.div
            className="modal-container"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            <GlassCard className="terms-card" tilt={false}>
              <div className="terms-header">
                <h2>Terms & Conditions</h2>
                <button className="close-btn" onClick={onClose}>&times;</button>
              </div>
              <div className="terms-content">
                <h3>1. Acceptance of Terms</h3>
                <p>By using SmartBus, you agree to comply with and be bound by these terms and conditions. If you do not agree, please do not use the service.</p>
                
                <h3>2. Service Description</h3>
                <p>SmartBus provides real-time bus tracking and booking services. We strive for accuracy but do not guarantee 100% uptime or real-time precision due to external factors like GPS signal and network connectivity.</p>
                
                <h3>3. User Responsibilities</h3>
                <p>Users are responsible for maintaining the confidentiality of their accounts. Any activity under your account is your responsibility.</p>
                
                <h3>4. Data Privacy</h3>
                <p>We value your privacy. Your location data is used solely for providing real-time tracking services and improving route suggestions. We do not sell your personal data to third parties.</p>
                
                <h3>5. Booking & Payments</h3>
                <p>Bookings made through SmartBus are subject to availability. Cancellations must be made within the specified timeframe to be eligible for rewards or refunds (if applicable).</p>
                
                <h3>6. Changes to Terms</h3>
                <p>We reserve the right to modify these terms at any time. Continued use of the service constitutes acceptance of the new terms.</p>
              </div>
              <div className="terms-footer">
                <button className="btn-primary" onClick={onClose}>I Understand</button>
              </div>
            </GlassCard>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};


export default TermsModal;
