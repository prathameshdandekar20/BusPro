import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import GlassCard from '../components/GlassCard';
import { GoogleLogin } from '@react-oauth/google';
import { fadeInUp, staggerContainer, staggerItem } from '../animations/variants';
import './Auth.css';

const Login = ({ onLogin, onGoogleLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await onLogin({ email, password });
      if (user.role === 'conductor') {
        navigate('/conductor');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      setLoading(true);
      const payload = JSON.parse(atob(credentialResponse.credential.split('.')[1]));
      const user = await onGoogleLogin({
        email: payload.email,
        name: payload.name,
        googleId: payload.sub,
        avatar: payload.picture
      });
      
      if (user.role === 'conductor') {
        navigate('/conductor');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError('Google login failed. Please try again.');
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
          <GlassCard className="auth-card" tilt={false}>
            <div className="auth-header">
              <Link to="/" className="auth-logo">
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                  <rect x="3" y="6" width="22" height="14" rx="4" stroke="#D4AF37" strokeWidth="2"/>
                  <circle cx="9" cy="22" r="2.5" stroke="#D4AF37" strokeWidth="1.5"/>
                  <circle cx="19" cy="22" r="2.5" stroke="#D4AF37" strokeWidth="1.5"/>
                </svg>
                <span>SmartBus</span>
              </Link>
              <h1>Welcome Back</h1>
              <p>Sign in to your SmartBus account</p>
            </div>

            {error && (
              <motion.div className="auth-error" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                {error}
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="auth-form" id="login-form">
              <div className="form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="you@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  id="login-email"
                />
              </div>

              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  id="login-password"
                />
              </div>

              <button
                type="submit"
                className="btn-primary auth-submit"
                disabled={loading}
                id="login-submit"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            <div className="auth-divider">
              <span>or</span>
            </div>

            <div className="google-auth-container">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setError('Google login failed')}
                theme="filled_black"
                text="continue_with"
                shape="pill"
                width="100%"
              />
            </div>

            <p className="auth-footer-text">
              Don't have an account? <Link to="/signup">Sign Up</Link>
            </p>
          </GlassCard>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Login;
