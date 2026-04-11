import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiUser, FiSearch, FiClock, FiChevronRight, FiRefreshCw, FiMapPin, FiStar, FiNavigation, FiX, FiArrowRight } from 'react-icons/fi';
import { busService, rideService } from '../../services/dataService';
import { useSocket } from '../../hooks/useSocket';
import BusMap from '../../components/BusMap';

const stagger = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.07 } } };
const item = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22,1,0.36,1] } } };

/* ── Nominatim Autocomplete Hook ── */
const useLocationAutocomplete = (query, userLocation) => {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        // Build Nominatim query with viewbox bias for nearby results
        let url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=8&addressdetails=1&countrycodes=in`;

        // If we have user location, add viewbox for nearby bias
        if (userLocation) {
          const delta = 0.3; // ~30km radius
          const vb = `${userLocation.lng - delta},${userLocation.lat + delta},${userLocation.lng + delta},${userLocation.lat - delta}`;
          url += `&viewbox=${vb}&bounded=0`;
        }

        const res = await fetch(url, {
          headers: { 'Accept-Language': 'en' }
        });
        const data = await res.json();

        const mapped = data.map(place => {
          const parts = place.display_name.split(',').map(s => s.trim());
          const name = parts[0] + (parts[1] ? ', ' + parts[1] : '');
          const address = parts.slice(1, 4).join(', ');

          return {
            id: place.place_id,
            name,
            fullName: place.display_name,
            address,
            lat: parseFloat(place.lat),
            lng: parseFloat(place.lon),
            type: place.type,
            category: place.class,
          };
        });

        setSuggestions(mapped);
      } catch (err) {
        console.error('Autocomplete error:', err);
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 400); // 400ms debounce

    return () => clearTimeout(timerRef.current);
  }, [query, userLocation]);

  return { suggestions, loading };
};

/* ── Haversine distance (km) ── */
const haversineKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const HomeScreen = ({ user }) => {
  const navigate = useNavigate();
  const [buses, setBuses] = useState([]);
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchPanel, setShowSearchPanel] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const searchInputRef = useRef(null);

  const { seatUpdates, locationUpdates, busUpdates, busDeleted, newBooking } = useSocket();
  const { suggestions, loading: autoLoading } = useLocationAutocomplete(searchQuery, currentLocation);

  useEffect(() => { fetchData(); getLocation(); }, []);

  const getLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setCurrentLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setCurrentLocation({ lat: 21.2514, lng: 81.6296 }),
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

  // Recent destinations from ride history
  const recentDestinations = useMemo(() => {
    const seen = new Set();
    return rides.filter(r => {
      const dest = r.busId?.destination || r.droppingPoint;
      if (!dest || seen.has(dest)) return false;
      seen.add(dest); return true;
    }).slice(0, 5).map(r => ({
      destination: r.busId?.destination || r.droppingPoint || 'Unknown',
      source: r.busId?.source || r.boardingPoint || 'Unknown',
      busNumber: r.busId?.busNumber || '',
      date: r.createdAt,
      busId: r.busId?._id || r.busId,
    }));
  }, [rides]);

  // Find buses near/matching a selected place
  const matchingBuses = useMemo(() => {
    if (!selectedPlace) return [];

    return buses.map(bus => {
      // Text match on source/destination
      const q = selectedPlace.name.toLowerCase();
      const fullQ = selectedPlace.fullName.toLowerCase();
      const srcMatch = bus.source.toLowerCase().includes(q) || fullQ.includes(bus.source.toLowerCase());
      const destMatch = bus.destination.toLowerCase().includes(q) || fullQ.includes(bus.destination.toLowerCase());

      // Geo proximity — check route points, source coords, destination coords
      let minDistance = Infinity;
      if (bus.location?.coordinates) {
        const [lng, lat] = bus.location.coordinates;
        minDistance = Math.min(minDistance, haversineKm(selectedPlace.lat, selectedPlace.lng, lat, lng));
      }
      bus.routePoints?.forEach(p => {
        if (p.latitude && p.longitude) {
          minDistance = Math.min(minDistance, haversineKm(selectedPlace.lat, selectedPlace.lng, p.latitude, p.longitude));
        }
      });

      const isNearby = minDistance < 50; // Within 50km
      const isTextMatch = srcMatch || destMatch;

      if (!isNearby && !isTextMatch) return null;

      return { ...bus, distance: minDistance, isTextMatch, matchType: isTextMatch ? (destMatch ? 'destination' : 'source') : 'nearby' };
    }).filter(Boolean).sort((a, b) => {
      // Sort: text matches first, then by distance
      if (a.isTextMatch && !b.isTextMatch) return -1;
      if (!a.isTextMatch && b.isTextMatch) return 1;
      return a.distance - b.distance;
    });
  }, [buses, selectedPlace]);

  // Simple text search (fallback when no place selected)
  const textSearchResults = useMemo(() => {
    if (!searchQuery.trim() || selectedPlace) return [];
    const q = searchQuery.toLowerCase();
    return buses.filter(b =>
      b.destination.toLowerCase().includes(q) ||
      b.source.toLowerCase().includes(q) ||
      b.busNumber.toLowerCase().includes(q)
    );
  }, [buses, searchQuery, selectedPlace]);

  const handleSelectPlace = (place) => {
    setSelectedPlace(place);
    setSearchQuery(place.name);
    setShowSearchPanel(false);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSelectedPlace(null);
    setShowSearchPanel(false);
  };

  if (loading) return <div className="m-loading"><div className="m-spinner" /><span className="m-label">Loading...</span></div>;

  return (
    <div className="mobile-screen" style={{ padding: 0, paddingBottom: 'calc(80px + var(--m-safe-bottom))' }}>

      {/* 1 — Map Section */}
      <div className="m-home-map-section">
        <div className="m-home-map-container">
          <BusMap
            buses={buses.filter(b => b.isActive)}
            interactive={false}
            height="100%"
            center={currentLocation}
          />
        </div>

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

      {/* 2 — Search Destination Bar (Google Maps style) */}
      <div className="m-home-search-section">
        <div className="m-home-search-bar">
          <FiSearch size={18} style={{ color: 'var(--m-muted)', flexShrink: 0 }} />
          <input
            ref={searchInputRef}
            className="m-home-search-input"
            placeholder="Where are you going?"
            value={searchQuery}
            onChange={e => {
              setSearchQuery(e.target.value);
              setSelectedPlace(null);
              setShowSearchPanel(true);
            }}
            onFocus={() => setShowSearchPanel(true)}
          />
          {searchQuery && (
            <button onClick={clearSearch} style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer', color: 'var(--m-muted)' }}>
              <FiX size={18} />
            </button>
          )}
        </div>
      </div>

      {/* 3 — Autocomplete Suggestions (Google Maps style) */}
      <AnimatePresence>
        {showSearchPanel && searchQuery.trim().length >= 2 && !selectedPlace && (
          <motion.div className="m-home-search-results"
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>

            {autoLoading && (
              <div className="m-autocomplete-loading">
                <div className="m-spinner" style={{ width: 20, height: 20, margin: '0 auto 8px', borderWidth: 2 }} />
                Searching nearby places...
              </div>
            )}

            {/* Location suggestions from Nominatim */}
            {suggestions.length > 0 && (
              <>
                <div style={{ padding: '10px 20px 6px', fontSize: 10, fontWeight: 800, color: 'var(--m-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>
                  📍 Locations
                </div>
                {suggestions.map(place => (
                  <div key={place.id} className="m-home-search-result-item" onClick={() => handleSelectPlace(place)}>
                    <div className="m-home-result-icon"><FiMapPin /></div>
                    <div className="m-home-result-info">
                      <div className="m-home-result-title">{place.name}</div>
                      <div className="m-home-result-subtitle">{place.address}</div>
                    </div>
                    <FiChevronRight style={{ color: 'var(--m-light-muted)', flexShrink: 0 }} />
                  </div>
                ))}
              </>
            )}

            {/* Direct bus text matches */}
            {textSearchResults.length > 0 && (
              <>
                <div style={{ padding: '10px 20px 6px', fontSize: 10, fontWeight: 800, color: 'var(--m-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>
                  🚌 Matching Buses
                </div>
                {textSearchResults.slice(0, 4).map(bus => (
                  <div key={bus._id} className="m-home-search-result-item" onClick={() => { navigate(`/bus/${bus._id}`); clearSearch(); }}>
                    <div className="m-home-result-icon" style={{ background: 'rgba(52,211,153,0.1)' }}>🚌</div>
                    <div className="m-home-result-info">
                      <div className="m-home-result-title">{bus.source} → {bus.destination}</div>
                      <div className="m-home-result-meta">{bus.busNumber} • {bus.availableSeats} seats • {bus.isActive ? '🟢 Live' : '⚪ Scheduled'}</div>
                    </div>
                    <FiChevronRight style={{ color: 'var(--m-light-muted)' }} />
                  </div>
                ))}
              </>
            )}

            {!autoLoading && suggestions.length === 0 && textSearchResults.length === 0 && (
              <div className="m-home-search-result-item" style={{ justifyContent: 'center', opacity: 0.5 }}>
                <span className="m-text-sm m-text-muted">No results for "{searchQuery}"</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4 — Selected Place Results: Buses near/matching that location */}
      <AnimatePresence>
        {selectedPlace && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ padding: '0 20px' }}
          >
            <div className="m-home-section" style={{ marginTop: 20 }}>
              <div className="m-card" style={{ padding: '14px 18px', marginBottom: 16 }}>
                <div className="m-flex m-items-center m-gap-12">
                  <div className="m-home-result-icon" style={{ width: 44, height: 44, borderRadius: 14 }}>
                    <FiMapPin size={18} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="m-text" style={{ fontWeight: 800, fontSize: 16 }}>{selectedPlace.name}</div>
                    <div className="m-text-sm m-text-muted m-mt-4">{selectedPlace.address}</div>
                  </div>
                  <button onClick={clearSearch} className="m-btn-icon" style={{ width: 36, height: 36, minWidth: 36, fontSize: 14 }}>
                    <FiX />
                  </button>
                </div>
              </div>

              {matchingBuses.length > 0 ? (
                <>
                  <div className="m-home-section-title">
                    <span>🚌 Buses {matchingBuses[0]?.isTextMatch ? 'to' : 'near'} this location</span>
                    <span className="m-home-section-count">{matchingBuses.length}</span>
                  </div>
                  <motion.div className="m-flex m-flex-col m-gap-12" variants={stagger} initial="hidden" animate="visible">
                    {matchingBuses.map(bus => (
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
                            {bus.distance < Infinity && (
                              <div className="m-text-sm m-text-muted m-mt-4" style={{ fontSize: 11 }}>
                                📍 ~{Math.round(bus.distance)} km from {selectedPlace.name.split(',')[0]}
                              </div>
                            )}
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
                    ))}
                  </motion.div>
                </>
              ) : (
                <div className="m-card" style={{ textAlign: 'center', padding: 32 }}>
                  <div style={{ fontSize: 36, marginBottom: 12 }}>🔍</div>
                  <p className="m-text" style={{ fontWeight: 800 }}>No buses found near this location</p>
                  <p className="m-text-sm m-text-muted m-mt-8">Try searching for a different destination or check available buses below</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content area below */}
      <div style={{ padding: '0 20px' }}>

        {/* 5 — Recent Destinations */}
        {!selectedPlace && recentDestinations.length > 0 && (
          <div className="m-home-section">
            <div className="m-home-section-title"><span>Recent Destinations</span></div>
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

        {/* 6 — Quick Stats */}
        {!selectedPlace && (
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
        )}

        {/* 7 — All Available Buses */}
        {!selectedPlace && (
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
        )}
      </div>
    </div>
  );
};

export default HomeScreen;
