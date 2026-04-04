import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiHome, FiClock, FiUser, FiTruck } from 'react-icons/fi';

const BottomNav = ({ isConductor }) => {
  const location = useLocation();

  const passengerTabs = [
    { path: '/dashboard', icon: <FiHome />, label: 'Home' },
    { path: '/activity', icon: <FiClock />, label: 'Rides' },
    { path: '/profile', icon: <FiUser />, label: 'Profile' },
  ];

  const conductorTabs = [
    { path: '/conductor', icon: <FiTruck />, label: 'My Fleet' },
    { path: '/profile', icon: <FiUser />, label: 'Profile' },
  ];

  const tabs = isConductor ? conductorTabs : passengerTabs;

  return (
    <nav className="m-bottom-nav">
      <div className="m-bottom-nav-inner">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path;
          return (
            <Link key={tab.path} to={tab.path} className={`m-nav-item ${isActive ? 'active' : ''}`}>
              <motion.div className="m-nav-icon m-gpu" whileTap={{ scale: 0.75 }}>
                {tab.icon}
              </motion.div>
              <span className="m-nav-label">{tab.label}</span>
              {isActive && <motion.div className="m-nav-dot" layoutId="navDot" />}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
