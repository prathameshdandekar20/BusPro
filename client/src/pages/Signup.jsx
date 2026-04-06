import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import GlassCard from '../components/GlassCard';
import TermsModal from '../components/TermsModal';
import { GoogleLogin } from '@react-oauth/google';
import { staggerContainer, staggerItem } from '../animations/variants';
import './Auth.css';

const Signup = ({ onSignup, onGoogleLogin }) => {
  const [formData, setFormData] = useState({ name: '', email: '', password: '', confirmPassword: '', role: 'passenger' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const navigate = useNavigate();

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      setLoading(true);
      // Decode the JWT or just send it to the backend
      // For simplicity, we'll send it as is. 
      // Most Google Auth libs on backend verify the token.
      const payload = JSON.parse(atob(credentialResponse.credential.split('.')[1]));
      const user = await onGoogleLogin({
        email: payload.email,
        name: payload.name,
        googleId: payload.sub,
        avatar: payload.picture,
        role: formData.role
      });
      
      if (user.role === 'conductor') {
        navigate('/conductor');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError('Google signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!termsAccepted) {
      setError('Please accept the Terms and Conditions');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const user = await onSignup({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role,
      });
      if (user.role === 'conductor') {
        navigate('/conductor');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg-orb auth-orb-1" />
      <div className="auth-bg-orb auth-orb-2" />

      <motion.div
        className="auth-container"
        variants={staggerContainer()}
        initial="hidden"
        animate="visible"
      >
        <div className="auth-back-container">
          <Link to="/" className="btn-back">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            <span>Back to Home</span>
          </Link>
        </div>
        <motion.div variants={staggerItem}>
          <GlassCard className="auth-card" tilt={false} isStatic={true}>
            <div className="auth-header">
              <Link to="/" className="auth-logo">
                <img src="/logo-premium.png" alt="SmartBus Logo" style={{ height: '36px', width: 'auto' }} />
                <span>SmartBus</span>
              </Link>
              <h1>Create Account</h1>
              <p>Join SmartBus and ride smarter today</p>
            </div>

            {error && (
              <motion.div className="auth-error" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                {error}
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="auth-form" id="signup-form">
              <div className="form-group">
                <label>Full Name</label>
                <input type="text" name="name" className="form-input" placeholder="John Doe" value={formData.name} onChange={handleChange} required id="signup-name" />
              </div>

              <div className="form-group">
                <label>Email Address</label>
                <input type="email" name="email" className="form-input" placeholder="you@email.com" value={formData.email} onChange={handleChange} required id="signup-email" />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Password</label>
                  <input type="password" name="password" className="form-input" placeholder="Min 6 characters" value={formData.password} onChange={handleChange} required id="signup-password" />
                </div>
                <div className="form-group">
                  <label>Confirm Password</label>
                  <input type="password" name="confirmPassword" className="form-input" placeholder="Re-enter password" value={formData.confirmPassword} onChange={handleChange} required id="signup-confirm" />
                </div>
              </div>

              <div className="form-group">
                <label>I am a</label>
                <div className="role-selector">
                  <button type="button" className={`role-btn ${formData.role === 'passenger' ? 'active' : ''}`} onClick={() => setFormData({...formData, role: 'passenger'})} id="role-passenger">
                    🧑 Passenger
                  </button>
                  <button type="button" className={`role-btn ${formData.role === 'conductor' ? 'active' : ''}`} onClick={() => setFormData({...formData, role: 'conductor'})} id="role-conductor">
                    🚌 Conductor
                  </button>
                </div>
              </div>

              <div className="form-group checkbox-group">
                <input 
                  type="checkbox" 
                  id="terms" 
                  checked={termsAccepted} 
                  onChange={(e) => setTermsAccepted(e.target.checked)} 
                />
                <label htmlFor="terms">
                  I read and agree to the <button type="button" className="text-link" onClick={() => setShowTerms(true)}>Terms and Conditions</button>
                </label>
              </div>

              <button type="submit" className="btn-primary auth-submit" disabled={loading} id="signup-submit">
                {loading ? 'Creating Account...' : 'Create Account'}
              </button>
            </form>

            <div className="auth-divider">
              <span>or</span>
            </div>

            <div className="google-auth-container">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setError('Google signup failed')}
                theme="filled_black"
                text="continue_with"
                shape="pill"
                width="100%"
              />
            </div>

            <p className="auth-footer-text">
              Already have an account? <Link to="/login">Sign In</Link>
            </p>
          </GlassCard>
        </motion.div>
      </motion.div>

      <TermsModal isOpen={showTerms} onClose={() => setShowTerms(false)} />
    </div>
  );
};

export default Signup;
