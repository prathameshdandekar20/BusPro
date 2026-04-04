import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { GoogleLogin } from '@react-oauth/google';
import { FiMail, FiLock, FiUser, FiArrowRight, FiTruck } from 'react-icons/fi';

const LoginScreen = ({ login, signup, googleLogin }) => {
  const [isSignup, setIsSignup] = useState(false);
  const [loginMode, setLoginMode] = useState('passenger'); // passenger | conductor
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = isSignup ? await signup(form) : await login({ email: form.email, password: form.password });
      navigate(user.role === 'conductor' ? '/conductor' : '/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || (isSignup ? 'Signup failed' : 'Login failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async (credentialResponse) => {
    try {
      setLoading(true);
      const payload = JSON.parse(atob(credentialResponse.credential.split('.')[1]));
      const user = await googleLogin({
        email: payload.email, name: payload.name,
        googleId: payload.sub, avatar: payload.picture,
      });
      navigate(user.role === 'conductor' ? '/conductor' : '/dashboard');
    } catch { setError('Google login failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="mobile-screen-auth">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* App Branding */}
        <div className="m-mb-24" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🚌</div>
          <h1 className="m-heading-xl" style={{ textAlign: 'center' }}>{isSignup ? 'Create\nAccount' : 'Welcome\nBack'}</h1>
          <p className="m-subheading m-mt-12">{isSignup ? 'Join SmartBus today' : 'Sign in to SmartBus'}</p>
        </div>

        {/* Login Mode Toggle — Passenger / Conductor */}
        {!isSignup && (
          <div className="m-tabs m-mb-24">
            <button
              className={`m-tab ${loginMode === 'passenger' ? 'active' : ''}`}
              onClick={() => { setLoginMode('passenger'); setError(''); }}
            >
              <FiUser size={12} style={{ marginRight: 4 }} /> Passenger
            </button>
            <button
              className={`m-tab ${loginMode === 'conductor' ? 'active' : ''}`}
              onClick={() => { setLoginMode('conductor'); setError(''); }}
            >
              <FiTruck size={12} style={{ marginRight: 4 }} /> Conductor
            </button>
          </div>
        )}

        {/* Conductor Info Card */}
        {loginMode === 'conductor' && !isSignup && (
          <motion.div
            className="m-card-flat m-mb-16"
            style={{ background: 'rgba(234,243,74,0.1)', borderColor: 'rgba(234,243,74,0.3)' }}
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          >
            <div className="m-flex m-items-center m-gap-8">
              <FiTruck style={{ color: 'var(--m-lemon-dark)', flexShrink: 0 }} />
              <span className="m-text-sm" style={{ color: 'var(--m-dark)' }}>
                Log in with your conductor credentials to manage your fleet, trips, and bookings.
              </span>
            </div>
          </motion.div>
        )}

        {error && (
          <motion.div
            className="m-card-flat m-mb-16"
            style={{ background: 'rgba(248,113,113,0.1)', borderColor: 'rgba(248,113,113,0.3)' }}
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          >
            <span className="m-text-sm" style={{ color: '#DC2626' }}>{error}</span>
          </motion.div>
        )}

        <div className="m-card m-mb-24">
          <form onSubmit={handleSubmit} className="m-flex m-flex-col m-gap-16">
            {isSignup && (
              <div className="m-search-row">
                <FiUser className="m-input-icon" />
                <input name="name" type="text" className="m-input m-input-with-icon" placeholder="Full Name"
                  value={form.name} onChange={handleChange} required />
              </div>
            )}
            <div className="m-search-row">
              <FiMail className="m-input-icon" />
              <input name="email" type="email" className="m-input m-input-with-icon"
                placeholder={loginMode === 'conductor' ? 'Conductor Email' : 'Email'}
                value={form.email} onChange={handleChange} required />
            </div>
            <div className="m-search-row">
              <FiLock className="m-input-icon" />
              <input name="password" type="password" className="m-input m-input-with-icon" placeholder="Password"
                value={form.password} onChange={handleChange} required />
            </div>
            <button type="submit" className="m-btn m-btn-lemon m-mt-8" disabled={loading}>
              {loading ? 'Please wait...' : (isSignup ? 'Sign Up' : (loginMode === 'conductor' ? 'Conductor Sign In' : 'Sign In'))}
              {!loading && <FiArrowRight />}
            </button>
          </form>

          <div className="m-flex m-items-center m-gap-12 m-mt-24 m-mb-16">
            <div style={{ flex: 1, height: 1, background: 'rgba(0,0,0,0.08)' }} />
            <span className="m-label">or</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(0,0,0,0.08)' }} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <GoogleLogin
              onSuccess={handleGoogle}
              onError={() => setError('Google auth failed')}
              theme="filled_black" shape="pill"
            />
          </div>
        </div>

        <p className="m-text-sm m-text-muted m-text-center">
          {isSignup ? 'Already have an account? ' : "Don't have an account? "}
          <span onClick={() => { setIsSignup(prev => !prev); setError(''); }}
            style={{ color: 'var(--m-dark)', fontWeight: 800, cursor: 'pointer', borderBottom: '2px solid var(--m-lemon)' }}>
            {isSignup ? 'Sign In' : 'Sign Up'}
          </span>
        </p>
      </motion.div>
    </div>
  );
};

export default LoginScreen;
