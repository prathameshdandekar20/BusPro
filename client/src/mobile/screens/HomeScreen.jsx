import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiUser, FiSearch, FiClock, FiChevronRight, FiRefreshCw, FiMapPin, FiStar, FiNavigation } from 'react-icons/fi';
import { busService, rideService } from '../../services/dataService';
import { useSocket } from '../../hooks/useSocket';
import BusMap from '../../components/BusMap';

const stagger = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.07 } } };
const item = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22,1,0.36,1] } } };

const HomeScreen = ({ user }) => {
  const navigate = useNavigate();
  const [buses, setBuses] = useState([]);
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);

  const { seatUpdates, locationUpdates, busUpdates, busDeleted, newBooking } = useSocket();

  useEffect(() => { fetchData(); getLocation(); }, []);

  const getLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setCurrentLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setCurrentLocation({ lat: 21.2514, lng: 81.6296 }), // Bilaspur fallback
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const b = await busService.getAll().catch(() => []);
      setBuses(b);
      const r = await rideService.getHistory().catch(() => []);
      setRides(r);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
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

  // Get recent/unique destinations from ride history
  const recentDestinations = useMemo(() => {
    const seen = new Set();
    return rides
      .filter(r => {
        const dest = r.busId?.destination || r.droppingPoint;
        if (!dest || seen.has(dest)) return false;
        seen.add(dest);
        return true;
      })
      .slice(0, 5)
      .map(r => ({
        destination: r.busId?.destination || r.droppingPoint || 'Unknown',
        source: r.busId?.source || r.boardingPoint || 'Unknown',
        busNumber: r.busId?.busNumber || '',
        date: r.createdAt,
        busId: r.busId?._id || r.busId,
      }));
  }, [rides]);

  // Search results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return buses.filter(b =>
      b.destination.toLowerCase().includes(q) ||
      b.source.toLowerCase().includes(q) ||
      b.busNumber.toLowerCase().includes(q)
    );
  }, [buses, searchQuery]);

  if (loading) return <div className="m-loading"><div className="m-spinner" /><span className="m-label">Loading...</span></div>;

  return (
    <div className="mobile-screen" style={{ padding: 0, paddingBottom: 'calc(80px + var(--m-safe-bottom))' }}>

      {/* 1 — Map Section with Current Location */}
      <div className="m-home-map-section">
        <div className="m-home-map-container">
          <BusMap
            buses={buses.filter(b => b.isActive)}
            interactive={false}
            height="100%"
            center={currentLocation}
          />
        </div>

        {/* Top bar overlay */}
        <div className="m-home-top-bar">
          <button className="m-home-menu-btn" onClick={() => navigate('/profile')}>
            {user?.avatar ? <img src={user.avatar} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : <FiUser />}
          </button>
          <div className="m-home-location-badge">
            <FiNavigation size={12} />
            <span>{currentLocation ? 'Current Location' : 'Locating...'}</span>
          </div>
          <button className="m-home-menu-btn" onClick={fetchData}>
            <FiRefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* 2 — Search Destination Bar */}
      <div className="m-home-search-section">
        <div className="m-home-search-bar" onClick={() => setShowSearchResults(true)}>
          <FiSearch size={18} style={{ color: 'var(--m-muted)', flexShrink: 0 }} />
          <input
            className="m-home-search-input"
            placeholder="Where are you going?"
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setShowSearchResults(true); }}
            onFocus={() => setShowSearchResults(true)}
          />
        </div>
      </div>

      {/* 3 — Search Results Dropdown */}
      <AnimatePresence>
        {showSearchResults && searchQuery.trim() && (
          <motion.div className="m-home-search-results"
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            {searchResults.length > 0 ? searchResults.map(bus => (
              <div key={bus._id} className="m-home-search-result-item" onClick={() => { navigate(`/bus/${bus._id}`); setShowSearchResults(false); setSearchQuery(''); }}>
                <div className="m-home-result-icon"><FiMapPin /></div>
                <div className="m-home-result-info">
                  <div className="m-home-result-title">{bus.source} → {bus.destination}</div>
                  <div className="m-home-result-meta">{bus.busNumber} • {bus.availableSeats} seats • {bus.isActive ? '🟢 Live' : '⚪ Scheduled'}</div>
                </div>
                <FiChevronRight style={{ color: 'var(--m-muted)' }} />
              </div>
            )) : (
              <div className="m-home-search-result-item" style={{ justifyContent: 'center', opacity: 0.5 }}>
                <span className="m-text-sm m-text-muted">No buses found for "{searchQuery}"</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content area below */}
      <div style={{ padding: '0 20px' }}>

        {/* 4 — Recent Destinations */}
        {recentDestinations.length > 0 && (
          <div className="m-home-section">
            <div className="m-home-section-title">
              <span>Recent Destinations</span>
            </div>
            <div className="m-home-recent-list">
              {recentDestinations.map((item, i) => (
                <div key={i} className="m-home-recent-item" onClick={() => item.busId && navigate(`/bus/${item.busId}`)}>
                  <div className="m-home-recent-icon"><FiClock /></div>
                  <div className="m-home-recent-info">
                    <div className="m-home-recent-dest">{item.source} → {item.destination}</div>
                    <div className="m-home-recent-meta">{item.busNumber} • {new Date(item.date).toLocaleDateString()}</div>
                  </div>
                  <FiChevronRight style={{ color: 'var(--m-light-muted)', flexShrink: 0 }} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 5 — Quick Stats */}
        <div className="m-home-section">
          <motion.div className="m-home-quick-stats" variants={stagger} initial="hidden" animate="visible">
            {[
              { emoji: '🚌', value: buses.filter(b => b.isActive).length, label: 'Live Buses', color: '#34D399' },
              { emoji: '🎟️', value: rides.length, label: 'My Rides', color: '#60A5FA' },
              { emoji: '⭐', value: buses.length > 0 ? (buses.reduce((s, b) => s + (b.avgRating || 0), 0) / buses.length).toFixed(1) : '—', label: 'Avg Rating', color: '#FBBF24' },
              { emoji: '💺', value: rides.filter(r => r.status === 'booked').length, label: 'Upcoming', color: '#A78BFA' },
            ].map((s, i) => (
              <motion.div key={i} variants={item} className="m-home-stat-chip">
                <span className="m-home-stat-emoji">{s.emoji}</span>
                <span className="m-home-stat-value">{s.value}</span>
                <span className="m-home-stat-label">{s.label}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* 6 — Available Buses */}
        <div className="m-home-section">
          <div className="m-home-section-title">
            <span>Available Buses</span>
            <span className="m-home-section-count">{buses.length}</span>
          </div>
          <motion.div className="m-flex m-flex-col m-gap-12" variants={stagger} initial="hidden" animate="visible">
            {buses.length > 0 ? buses.map(bus => (
              <motion.div key={bus._id} variants={item} className="m-bus-card m-gpu" onClick={() => navigate(`/bus/${bus._id}`)}>
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
                      <button className="m-btn m-btn-lemon m-btn-small" onClick={(e) => { e.stopPropagation(); navigate(`/book/${bus._id}`); }}>
                        Book Seat
                      </button>
                      <button className="m-btn-icon" onClick={(e) => { e.stopPropagation(); navigate(`/bus/${bus._id}`); }}>
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
                <p className="m-text m-text-muted">No buses available right now</p>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default HomeScreen;
