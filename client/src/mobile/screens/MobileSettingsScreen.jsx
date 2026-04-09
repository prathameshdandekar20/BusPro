import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiChevronLeft, FiUser, FiCheck } from 'react-icons/fi';
import { useAuth } from '../../hooks/useAuth';

const MobileSettingsScreen = () => {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const [formData, setFormData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    age: user?.age || '',
    gender: user?.gender || '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateUser(formData);
      setSaveSuccess(true);
      setTimeout(() => navigate(-1), 1000);
    } catch(e) { console.error('Settings save failed', e); }
    finally { setIsSaving(false); }
  };

  return (
    <div className="mobile-screen" style={{ paddingBottom: '20px' }}>
      <div className="m-flex m-items-center m-gap-12 m-mb-24">
        <button className="m-btn-icon" onClick={() => navigate(-1)} type="button">
          <FiChevronLeft size={24} />
        </button>
        <h1 className="m-heading" style={{ fontSize: 22, margin: 0 }}>Settings</h1>
      </div>

      <motion.form 
        onSubmit={handleSubmit}
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="m-card m-mb-24" style={{ padding: 24 }}>
          <div className="m-flex m-flex-col m-items-center m-mb-24">
            <div className="m-avatar" style={{ width: 80, height: 80, fontSize: 32, marginBottom: 12 }}>
              {user?.avatar ? <img src={user.avatar} alt=""/> : <FiUser />}
            </div>
            <div className="m-text" style={{ fontWeight: 800, fontSize: 18 }}>{user?.name || 'User'}</div>
            <div className="m-text-muted m-text-sm m-mt-4">{user?.email}</div>
          </div>

          <div className="m-divider m-mb-24" />

          <div className="m-flex m-flex-col m-gap-20">
            <div>
              <div className="m-label m-mb-8">Full Name</div>
              <input 
                className="m-input" 
                value={formData.name} 
                onChange={e => setFormData(p => ({...p, name: e.target.value}))} 
              />
            </div>
            <div>
              <div className="m-label m-mb-8">Phone Number</div>
              <input 
                className="m-input" 
                type="tel" 
                value={formData.phone} 
                onChange={e => setFormData(p => ({...p, phone: e.target.value}))} 
                placeholder="e.g. 9876543210" 
              />
            </div>
            <div className="m-flex m-gap-16">
              <div style={{ flex: 1 }}>
                <div className="m-label m-mb-8">Age</div>
                <input 
                  className="m-input" 
                  type="number" 
                  value={formData.age} 
                  onChange={e => setFormData(p => ({...p, age: e.target.value}))} 
                />
              </div>
              <div style={{ flex: 1 }}>
                <div className="m-label m-mb-8">Gender</div>
                <select 
                  className="m-input" 
                  value={formData.gender} 
                  onChange={e => setFormData(p => ({...p, gender: e.target.value}))}
                  style={{ height: '48px' }}
                >
                  <option value="">Select</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <button type="submit" className="m-btn m-btn-lemon" disabled={isSaving}>
          {saveSuccess ? <><FiCheck /> Saved Successfully</> : isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </motion.form>
    </div>
  );
};

export default MobileSettingsScreen;
