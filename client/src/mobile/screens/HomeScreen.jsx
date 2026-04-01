import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiUser, FiActivity, FiCalendar, FiStar, FiChevronRight, FiRefreshCw } from 'react-icons/fi';
import { busService, rideService } from '../../services/dataService';
import { useSocket } from '../../hooks/useSocket';

const stagger = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.07 } } };
const item = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22,1,0.36,1] } } };

const HomeScreen = ({ user }) => {
  const navigate = useNavigate();
  const [buses, setBuses] = useState([]);
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchFrom, setSearchFrom] = useState('');
  const [searchTo, setSearchTo] = useState('');

  const { seatUpdates, locationUpdates, busUpdates, busDeleted, newBooking } = useSocket();

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch buses (public-ish) and history (private) separately so one failing doesn't stop the other
      const b = await busService.getAll().catch(e => []);
      setBuses(b);
      
      const r = await rideService.getHistory().catch(e => []);
      setRides(r);
    } catch (e) { 
      console.error("Fetch Data Error:", e); 
    } finally { 
      setLoading(false); 
    }
  };

  // Real-time updates
  useEffect(() => { if (seatUpdates) setBuses(p => p.map(b => b._id === seatUpdates.busId ? { ...b, ...seatUpdates } : b)); }, [seatUpdates]);
  useEffect(() => { if (locationUpdates) setBuses(p => p.map(b => b._id === locationUpdates.busId ? { ...b, location: locationUpdates.location } : b)); }, [locationUpdates]);
  useEffect(() => {
    if (busUpdates) setBuses(p => {
      const idx = p.findIndex(b => b._id === busUpdates._id);
      if (idx !== -1) { const u = [...p]; u[idx] = { ...u[idx], ...busUpdates }; return u; }
      return [busUpdates, ...p];
    });
  }, [busUpdates]);
  useEffect(() => { if (busDeleted) setBuses(p => p.filter(b => b._id !== busDeleted)); }, [busDeleted]);
  useEffect(() => {
    if (newBooking) setBuses(p => p.map(b => {
      const id = newBooking.busId?._id || newBooking.busId;
      return b._id === id ? { ...b, availableSeats: Math.max(0, b.availableSeats - (newBooking.numberOfSeats || 1)) } : b;
    }));
  }, [newBooking]);

  const filtered = useMemo(() => buses.filter(b =>
    b.source.toLowerCase().includes(searchFrom.toLowerCase()) &&
    b.destination.toLowerCase().includes(searchTo.toLowerCase())
  ), [buses, searchFrom, searchTo]);

  if (loading) return <div className="m-loading"><div className="m-spinner" /><span className="m-label">Loading buses...</span></div>;

  return (
    <div className="mobile-screen">
      {/* Header */}
      <div className="m-flex m-flex-between m-items-center m-mb-24">
        <div>
          <h1 className="m-heading">Hi, {user?.name?.split(' ')[0] || 'Traveler'}</h1>
          <p className="m-label m-mt-4">Where are we going?</p>
        </div>
        <div className="m-flex m-gap-8 m-items-center">
          <button className="m-btn-icon" onClick={fetchData} title="Refresh">
            <FiRefreshCw className={loading ? "animate-spin" : ""} />
          </button>
          <div className="m-avatar">
            {user?.avatar ? <img src={user.avatar} alt="" /> : <FiUser />}
          </div>
        </div>
      </div>

      {/* Stats */}
      <motion.div className="m-stats-grid m-mb-24" variants={stagger} initial="hidden" animate="visible">
        {[
          { v: buses.filter(b => b.isActive).length, l: 'Active Buses', icon: <FiActivity />, cls: 'm-stat-icon-mint' },
          { v: rides.length, l: 'My Rides', icon: <FiCalendar />, cls: 'm-stat-icon-sky' },
          { v: rides.filter(r => r.status === 'booked').length, l: 'Upcoming', icon: <FiCalendar />, cls: 'm-stat-icon-cream' },
          { v: buses.length > 0 ? (buses.reduce((s, b) => s + (b.avgRating || 0), 0) / buses.length).toFixed(1) : '—', l: 'Avg Rating', icon: <FiStar />, cls: 'm-stat-icon-lemon' },
        ].map((s, i) => (
          <motion.div key={i} variants={item} className="m-stat-card m-gpu">
            <div className={`m-stat-icon ${s.cls}`}>{s.icon}</div>
            <div className="m-stat-value">{s.v}</div>
            <div className="m-stat-label">{s.l}</div>
          </motion.div>
        ))}
      </motion.div>

      {/* Search */}
      <div className="m-card m-mb-24">
        <div className="m-search-card">
          <div className="m-search-row">
            <div className="m-search-dot m-search-dot-from" />
            <input className="m-search-input" placeholder="From..." value={searchFrom} onChange={e => setSearchFrom(e.target.value)} />
          </div>
          <div className="m-search-row">
            <div className="m-search-dot m-search-dot-to" />
            <input className="m-search-input" placeholder="To..." value={searchTo} onChange={e => setSearchTo(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Bus List */}
      <motion.div className="m-flex m-flex-col m-gap-12" variants={stagger} initial="hidden" animate="visible">
        {filtered.length > 0 ? filtered.map(bus => (
          <motion.div key={bus._id} variants={item} className="m-bus-card m-gpu">
            <div className="m-bus-card-body">
              <div className="m-bus-emoji">🚌</div>
              <div className="m-bus-info">
                <div className="m-flex m-flex-between m-items-start">
                  <div className="m-bus-route">{bus.source} → {bus.destination}</div>
                  <span className="m-badge m-badge-mint">{bus.busNumber}</span>
                </div>
                <div className="m-bus-meta m-mt-4">
                  <span className="m-bus-meta-item"><FiUser /> {bus.availableSeats}/{bus.totalSeats}</span>
                  <span className="m-bus-meta-item"><FiStar style={{ color: 'var(--m-lemon-dark)' }} /> {bus.avgRating?.toFixed(1) || 'NEW'}</span>
                  {bus.isActive && <span className="m-badge m-badge-success" style={{ fontSize: 8 }}>LIVE</span>}
                </div>
                <div className="m-bus-actions m-mt-12">
                  <button className="m-btn m-btn-lemon m-btn-small" onClick={() => navigate(`/bus/${bus._id}`)}>
                    Book Seat
                  </button>
                  <button className="m-btn-icon" onClick={() => navigate(`/bus/${bus._id}`)}>
                    <FiChevronRight />
                  </button>
                </div>
              </div>
            </div>
            <div className="m-bus-bar">
              <div className="m-bus-bar-fill" style={{ width: `${(bus.availableSeats / bus.totalSeats) * 100}%` }} />
            </div>
          </motion.div>
        )) : (
          <div className="m-empty">
            <div className="m-empty-emoji">🔍</div>
            <p className="m-text m-text-muted">No buses match your search</p>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default HomeScreen;
