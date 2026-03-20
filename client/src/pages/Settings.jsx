import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import GlassCard from '../components/GlassCard';
import { fadeInUp, staggerContainer, staggerItem } from '../animations/variants';
import { useAuth } from '../hooks/useAuth';
import './Settings.css';

const countries = [
  { name: 'India', code: '+91', iso: 'in', flag: '🇮🇳' },
  { name: 'USA', code: '+1', iso: 'us', flag: '🇺🇸' },
  { name: 'UK', code: '+44', iso: 'gb', flag: '🇬🇧' },
  { name: 'Canada', code: '+1', iso: 'ca', flag: '🇨🇦' },
  { name: 'Australia', code: '+61', iso: 'au', flag: '🇦🇺' },
  { name: 'Germany', code: '+49', iso: 'de', flag: '🇩🇪' },
  { name: 'France', code: '+33', iso: 'fr', flag: '🇫🇷' },
  { name: 'Japan', code: '+81', iso: 'jp', flag: '🇯🇵' },
  { name: 'Brazil', code: '+55', iso: 'br', flag: '🇧🇷' },
];

const Settings = () => {
  const { user, updateUser } = useAuth();
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    age: user?.age || '',
    gender: user?.gender || '',
    bio: user?.bio || '',
    countryCode: user?.countryCode || '+91'
  });

  const [avatarPreview, setAvatarPreview] = useState(user?.avatar || null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showCountryMenu, setShowCountryMenu] = useState(false);
  const countryMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (countryMenuRef.current && !countryMenuRef.current.contains(event.target)) {
        setShowCountryMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    // Numerical restrictions for phone and age
    if (name === 'phone' || name === 'age') {
      const numericValue = value.replace(/\D/g, '');
      setFormData(prev => ({ ...prev, [name]: numericValue }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      await updateUser({
        ...formData,
        avatar: avatarPreview
      });
      setIsSaving(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setIsSaving(false);
      console.error('Failed to save profile');
    }
  };

  const currentCountry = countries.find(c => c.code === formData.countryCode) || countries[0];

  return (
    <div className="page-wrapper settings-page">
      <div className="settings-container section-container">
        <motion.div 
          className="settings-grid"
          variants={staggerContainer()}
          initial="hidden"
          animate="visible"
        >
          {/* Sidebar */}
          <motion.div className="settings-sidebar" variants={staggerItem}>
            <GlassCard>
              <div className="settings-avatar-wrapper">
                <div className="settings-avatar">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Avatar Preview" className="avatar-img" />
                  ) : (
                    user?.name ? user.name[0].toUpperCase() : user?.email?.[0].toUpperCase() || 'U'
                  )}
                </div>
                <label className="avatar-edit-btn" htmlFor="avatar-upload">
                  <input 
                    type="file" 
                    id="avatar-upload" 
                    hidden 
                    accept="image/*"
                    onChange={handleAvatarChange}
                  />
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                    <circle cx="12" cy="13" r="4"></circle>
                  </svg>
                </label>
              </div>
              <div className="settings-user-info">
                <h2>{formData.name || user?.name || 'User'}</h2>
                <span className="settings-user-role">{user?.role || 'Passenger'}</span>
              </div>
            </GlassCard>
          </motion.div>

          {/* Main Form */}
          <motion.div className="settings-main" variants={staggerItem}>
            <GlassCard>
              <h1 className="settings-section-title">
                <span>Account Settings</span>
              </h1>

              <form onSubmit={handleSubmit} className="settings-form">
                <div className="settings-form-grid">
                  <div className="form-group">
                    <label>Full Name</label>
                    <input 
                      type="text" 
                      name="name"
                      className="form-input" 
                      placeholder="Enter your name" 
                      value={formData.name}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="form-group">
                    <label>Email Address</label>
                    <input 
                      type="email" 
                      name="email"
                      className="form-input" 
                      placeholder="Enter your email" 
                      value={formData.email}
                      disabled
                    />
                  </div>
                  
                  <div className="form-group phone-input-group">
                    <label>Phone Number</label>
                    <div className="phone-input-wrapper">
                      <div className="country-selector" ref={countryMenuRef}>
                        <button 
                          type="button" 
                          className="country-trigger"
                          onClick={() => setShowCountryMenu(!showCountryMenu)}
                        >
                          <img 
                            src={`https://flagcdn.com/w40/${currentCountry.iso}.png`} 
                            className="country-flag-img" 
                            alt={currentCountry.name} 
                          />
                          <span className="country-code">{currentCountry.code}</span>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <path d="M6 9l6 6 6-6" />
                          </svg>
                        </button>
                        
                        <AnimatePresence>
                          {showCountryMenu && (
                            <motion.div 
                              className="country-dropdown"
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 10 }}
                            >
                              {countries.map(c => (
                                <button
                                  key={c.name}
                                  type="button"
                                  className="country-option"
                                  onClick={() => {
                                    setFormData(prev => ({ ...prev, countryCode: c.code }));
                                    setShowCountryMenu(false);
                                  }}
                                >
                                  <img 
                                    src={`https://flagcdn.com/w40/${c.iso}.png`} 
                                    className="option-flag-img" 
                                    alt={c.name} 
                                  />
                                  <span className="name">{c.name}</span>
                                  <span className="code">{c.code}</span>
                                </button>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                      <input 
                        type="tel" 
                        name="phone"
                        className="form-input phone-field" 
                        placeholder="91234 56789" 
                        value={formData.phone}
                        onChange={handleChange}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Age</label>
                    <input 
                      type="text" 
                      name="age"
                      className="form-input" 
                      placeholder="How old are you?" 
                      value={formData.age}
                      onChange={handleChange}
                    />
                  </div>
                  
                  <div className="form-group full-width">
                    <label>Gender</label>
                    <div className="gender-selection">
                      {['Male', 'Female', 'Other'].map(option => (
                        <label key={option} className="gender-option">
                          <input 
                            type="radio" 
                            name="gender" 
                            value={option.toLowerCase()} 
                            checked={formData.gender === option.toLowerCase()}
                            onChange={handleChange}
                          />
                          <span className="gender-label">
                            {option === 'Male' && '👨'}
                            {option === 'Female' && '👩'}
                            {option === 'Other' && '👤'}
                            {' '}{option}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="form-group full-width">
                    <label>Bio (Short Description)</label>
                    <textarea 
                      name="bio"
                      className="form-input" 
                      rows="3" 
                      placeholder="Tell us something about yourself..." 
                      value={formData.bio}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="settings-actions">
                  <button type="button" className="btn-cancel-settings">
                    Reset
                  </button>
                  <button type="submit" className="btn-primary btn-save-settings" disabled={isSaving}>
                    {isSaving ? 'Saving...' : saveSuccess ? '✓ Saved' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </GlassCard>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default Settings;
