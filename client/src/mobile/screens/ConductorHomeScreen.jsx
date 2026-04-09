import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiTruck, FiNavigation, FiUsers, FiStar, FiChevronRight, FiMapPin, FiRefreshCw } from 'react-icons/fi';
import { busService, rideService } from '../../services/dataService';

const stagger = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22,1,0.36,1] } } };

const ConductorHomeScreen = ({ user }) => {
  const navigate = useNavigate();
  const [buses, setBuses] = useState([]);
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const storageUser = JSON.parse(localStorage.getItem('smartbus_user') || '{}');
      const myId = user?._id || storageUser._id;

      const [busData, rideData] = await Promise.all([
        busService.getAll().catch(() => []),
        rideService.getHistory().catch(() => [])
      ]);

      const mine = busData.filter(b => (b.conductorId?._id || b.conductorId) === myId);
      setBuses(mine);
      setRides(rideData);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const activeBuses = buses.filter(b => b.isActive);
  const totalSeats = buses.reduce((s, b) => s + (b.totalSeats || 0), 0);
  const bookedSeats = buses.reduce((s, b) => s + ((b.totalSeats || 0) - (b.availableSeats || 0)), 0);
  const avgRating = buses.length > 0 
    ? (buses.reduce((s, b) => s + (b.avgRating || 0), 0) / buses.length).toFixed(1) 
    : '—';
  const todayRides = rides.filter(r => {
    const d = new Date(r.createdAt);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  });
  const totalEarnings = rides.reduce((s, r) => s + (r.fare || r.totalFare || 0), 0);

  if (loading) return <div className="m-loading"><div className="m-spinner" /><span className="m-label">Loading dashboard...</span></div>;

  return (
    <div className="mobile-screen">
      {/* Header */}
      <div className="m-flex m-flex-between m-items-center m-mb-24">
        <div>
          <h1 className="m-heading" style={{ fontSize: 24 }}>Dashboard</h1>
          <p className="m-label m-mt-4">Welcome, {user?.name || 'Conductor'}</p>
        </div>
        <button className="m-btn-icon" onClick={fetchData}>
          <FiRefreshCw size={16} />
        </button>
      </div>

      {/* Stats Grid */}
      <motion.div className="m-conductor-dash-stats" variants={stagger} initial="hidden" animate="visible">
        {[
          { emoji: '🚌', value: buses.length, label: 'My Buses' },
          { emoji: '🟢', value: activeBuses.length, label: 'Active Now' },
          { emoji: '🎟️', value: todayRides.length, label: "Today's Rides" },
          { emoji: '⭐', value: avgRating, label: 'Avg Rating' },
          { emoji: '💺', value: `${bookedSeats}/${totalSeats}`, label: 'Seats Booked' },
          { emoji: '💰', value: `₹${totalEarnings}`, label: 'Total Revenue' },
        ].map((s, i) => (
          <motion.div key={i} variants={item} className="m-conductor-dash-stat">
            <span className="stat-emoji">{s.emoji}</span>
            <span className="stat-value">{s.value}</span>
            <span className="stat-label">{s.label}</span>
          </motion.div>
        ))}
      </motion.div>

      {/* Active Buses */}
      {activeBuses.length > 0 && (
        <div className="m-mb-24">
          <div className="m-flex m-flex-between m-items-center m-mb-12">
            <span className="m-subheading">Active Buses</span>
            <span className="m-badge m-badge-success">{activeBuses.length} LIVE</span>
          </div>
          <div className="m-flex m-flex-col m-gap-10">
            {activeBuses.map(bus => (
              <div key={bus._id} className="m-card" style={{ padding: 14, cursor: 'pointer' }}
                onClick={() => navigate('/conductor')}
              >
                <div className="m-flex m-flex-between m-items-center">
                  <div>
                    <div className="m-text" style={{ fontWeight: 800 }}>{bus.busNumber}</div>
                    <div className="m-text-sm m-text-muted m-mt-4">
                      {bus.source} → {bus.destination}
                    </div>
                  </div>
                  <div className="m-flex m-flex-col m-items-center" style={{ textAlign: 'right' }}>
                    <span className="m-badge m-badge-success" style={{ fontSize: 8 }}>🟢 LIVE</span>
                    <span className="m-text-sm m-text-muted m-mt-4">
                      {bus.availableSeats}/{bus.totalSeats} seats
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="m-mb-24">
        <div className="m-subheading m-mb-12">Quick Actions</div>
        <div className="m-conductor-quick-actions">
          {[
            { icon: '🚌', title: 'Manage Fleet', desc: `${buses.length} vehicle${buses.length !== 1 ? 's' : ''} registered`, action: () => navigate('/conductor'), cls: 'act-fleet' },
            { icon: '📍', title: 'Start Tracking', desc: 'Share your live GPS location', action: () => navigate('/conductor'), cls: 'act-track' },
            { icon: '📋', title: 'View Bookings', desc: `${rides.length} total booking${rides.length !== 1 ? 's' : ''}`, action: () => navigate('/conductor'), cls: 'act-bookings' },
            { icon: '⭐', title: 'Reviews & Feedback', desc: 'Read and reply to passengers', action: () => navigate('/conductor'), cls: 'act-reviews' },
          ].map((a, i) => (
            <button key={i} className="m-quick-action-btn" onClick={a.action}>
              <div className={`m-quick-action-icon ${a.cls}`}>{a.icon}</div>
              <div className="m-quick-action-info">
                <div className="m-quick-action-title">{a.title}</div>
                <div className="m-quick-action-desc">{a.desc}</div>
              </div>
              <FiChevronRight style={{ color: 'var(--m-light-muted)', flexShrink: 0 }} />
            </button>
          ))}
        </div>
      </div>

      {/* Recent Bookings */}
      {todayRides.length > 0 && (
        <div>
          <div className="m-subheading m-mb-12">Today's Bookings</div>
          <div className="m-flex m-flex-col m-gap-8">
            {todayRides.slice(0, 5).map(ride => (
              <div key={ride._id} className="m-card" style={{ padding: 12 }}>
                <div className="m-flex m-flex-between m-items-center">
                  <div>
                    <span className="m-badge m-badge-mint">{ride.busId?.busNumber || '—'}</span>
                    <div className="m-text-sm m-mt-4" style={{ fontWeight: 700 }}>
                      {ride.boardingPoint || ride.busId?.source} → {ride.droppingPoint || ride.busId?.destination}
                    </div>
                  </div>
                  <div className="m-text-sm m-text-muted">
                    {ride.numberOfSeats} seat{ride.numberOfSeats > 1 ? 's' : ''} • ₹{ride.fare || ride.totalFare || 0}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ConductorHomeScreen;
