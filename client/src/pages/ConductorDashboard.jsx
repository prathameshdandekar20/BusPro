import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import GlassCard from '../components/GlassCard';
import BusMap from '../components/BusMap';
import { busService, rideService } from '../services/dataService';
import { socketService } from '../services/socketService';
import { staggerContainer, staggerItem, fadeInUp } from '../animations/variants';
import './Dashboard.css';
import './Conductor.css';

const ConductorDashboard = ({ user }) => {
  const [buses, setBuses] = useState([]);
  const [rides, setRides] = useState([]); // Added to track bookings
  const [loading, setLoading] = useState(true);
  const [selectedBus, setSelectedBus] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState({
    busNumber: '', source: '', destination: '', totalSeats: '', route: '',
  });
  const [message, setMessage] = useState('');
  const [liveTracking, setLiveTracking] = useState({});
  const [routeInput, setRouteInput] = useState({}); // busId -> string
  const [mapSelectorBus, setMapSelectorBus] = useState(null); // Bus being mapped
  const watchRefs = useRef({});

  useEffect(() => {
    fetchBuses();
    socketService.connect();
    return () => {
      socketService.removeAllListeners();
      Object.values(watchRefs.current).forEach(id => navigator.geolocation.clearWatch(id));
      document.body.style.overflow = ''; // Clean up on unmount
    };
  }, []);

  // Prevent background scrolling when map modal is open
  useEffect(() => {
    if (mapSelectorBus) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }, [mapSelectorBus]);

  const fetchBuses = async () => {
    try {
      setLoading(true);
      const [busData, rideData] = await Promise.all([
        busService.getAll({ mine: 'true' }),
        rideService.getHistory() // Will fetch bookings for these buses on server
      ]);
      setBuses(busData);
      setRides(rideData);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const showMsg = (text) => {
    setMessage(text);
    setTimeout(() => setMessage(''), 3000);
  };

  const startLiveTracking = (busId) => {
    if (!navigator.geolocation) {
      showMsg('Geolocation not supported');
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          await busService.updateLocation(busId, latitude, longitude);
          socketService.getSocket()?.emit('conductorLocationUpdate', { busId, latitude, longitude });
        } catch (err) {
          console.error('Live update failed:', err);
        }
      },
      (err) => showMsg('Location access denied'),
      { enableHighAccuracy: true, distanceFilter: 10 }
    );

    watchRefs.current[busId] = watchId;
    setLiveTracking(prev => ({ ...prev, [busId]: watchId }));
    showMsg('Real-time location sharing ACTIVE! 🛰️');
  };

  const stopLiveTracking = (busId) => {
    if (watchRefs.current[busId]) {
      navigator.geolocation.clearWatch(watchRefs.current[busId]);
      delete watchRefs.current[busId];
      setLiveTracking(prev => {
        const newState = { ...prev };
        delete newState[busId];
        return newState;
      });
      showMsg('Location sharing stopped');
    }
  };

  const handleAddRoutePoint = async (busId) => {
    const pointName = routeInput[busId];
    if (!pointName) return;

    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const { latitude, longitude } = pos.coords;
        const bus = buses.find(b => b._id === busId);
        const newPoints = [...(bus.routePoints || []), { name: pointName, latitude, longitude }];
        await busService.updateRoute(busId, newPoints);
        showMsg(`📍 Added ${pointName} to route!`);
        setRouteInput(prev => ({ ...prev, [busId]: '' }));
        fetchBuses();
      } catch (err) {
        showMsg('Failed to add route point');
      }
    });
  };

  const handleCreateBus = async (e) => {
    e.preventDefault();
    try {
      const newBus = await busService.create({
        ...createForm,
        totalSeats: parseInt(createForm.totalSeats),
      });
      console.log('Bus creation success:', newBus);
      showMsg('Bus created successfully!');
      setShowCreateForm(false);
      setCreateForm({ busNumber: '', source: '', destination: '', totalSeats: '', route: '' });
      fetchBuses();
    } catch (err) {
      console.error('Bus creation error:', err);
      showMsg(err.response?.data?.message || 'Failed to create bus');
    }
  };

  const handleMapPointClick = async (latlng) => {
    if (!mapSelectorBus) return;
    
    const pointName = prompt("Enter name for this milestone:", "Milestone");
    if (!pointName) return;

    try {
      const newPoints = [...(mapSelectorBus.routePoints || []), { 
        name: pointName, 
        latitude: latlng.lat, 
        longitude: latlng.lng 
      }];
      await busService.updateRoute(mapSelectorBus._id, newPoints);
      showMsg(`📍 Point ${pointName} added!`);
      // Update local state to show point immediately
      setMapSelectorBus(prev => ({ ...prev, routePoints: newPoints }));
      fetchBuses();
    } catch (err) {
      showMsg(err.response?.data?.message || 'Failed to update route');
    }
  };

  const handleStartTrip = async (busId) => {
    try {
      await busService.startTrip(busId);
      showMsg('Trip started!');
      fetchBuses();
    } catch (err) {
      showMsg(err.response?.data?.message || 'Failed to start trip');
    }
  };

  const handleEndTrip = async (busId) => {
    try {
      await busService.endTrip(busId);
      showMsg('Trip ended!');
      fetchBuses();
    } catch (err) {
      showMsg(err.response?.data?.message || 'Failed to end trip');
    }
  };

  const handleUpdateSeats = async (busId, newSeats) => {
    try {
      await busService.updateSeats(busId, newSeats);
      socketService.getSocket()?.emit('conductorSeatUpdate', {
        busId,
        availableSeats: newSeats,
      });
      fetchBuses();
    } catch (err) {
      showMsg(err.response?.data?.message || 'Failed to update seats');
    }
  };

  const handleUpdateLocation = async (busId) => {
    if (!navigator.geolocation) {
      showMsg('Geolocation is not supported');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          await busService.updateLocation(busId, position.coords.latitude, position.coords.longitude);
          showMsg('Location updated!');
          fetchBuses();
        } catch (err) {
          showMsg('Failed to update location');
        }
      },
      () => showMsg('Unable to get location. Please enable GPS.'),
    );
  };

  const handleDeleteBus = async (busId) => {
    if (!window.confirm('Are you sure you want to delete this bus?')) return;
    try {
      await busService.delete(busId);
      showMsg('Bus deleted successfully!');
      fetchBuses();
    } catch (err) {
      showMsg('Failed to delete bus');
    }
  };

  if (loading) {
    return (
      <div className="page-wrapper">
        <div className="loading-container">
          <div className="spinner" />
          <p className="text-muted">Loading conductor dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper dashboard-page">
      <div className="dashboard-container section-container">
        <motion.div className="dashboard-header" variants={fadeInUp} initial="hidden" animate="visible">
          <div>
            <h1 className="dashboard-title">Conductor <span className="text-gold">Dashboard</span></h1>
            <p className="text-muted">Manage your buses, trips, and passenger flow</p>
          </div>
          <button className="btn-primary" onClick={() => setShowCreateForm(!showCreateForm)} id="toggle-create-bus">
            {showCreateForm ? '✕ Close' : '+ Add Bus'}
          </button>
        </motion.div>

        {message && (
          <motion.div
            className={`booking-toast ${message.includes('success') || message.includes('started') || message.includes('ended') || message.includes('updated') || message.includes('created') ? 'toast-success' : 'toast-error'}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {message}
          </motion.div>
        )}

        {/* Create Bus Form */}
        {showCreateForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="conductor-create-section">
            <GlassCard className="create-bus-card" tilt={false}>
              <h2 className="create-title">Register New Bus</h2>
              <form onSubmit={handleCreateBus} className="create-form" id="create-bus-form">
                <div className="create-grid">
                  <div className="form-group">
                    <label>Bus Number</label>
                    <input type="text" className="form-input" placeholder="e.g. BUS-42A" value={createForm.busNumber} onChange={(e) => setCreateForm({...createForm, busNumber: e.target.value})} required id="create-bus-number" />
                  </div>
                  <div className="form-group">
                    <label>Total Seats</label>
                    <input type="number" className="form-input" placeholder="e.g. 40" value={createForm.totalSeats} onChange={(e) => setCreateForm({...createForm, totalSeats: e.target.value})} required id="create-total-seats" />
                  </div>
                  <div className="form-group">
                    <label>Source</label>
                    <input type="text" className="form-input" placeholder="Starting point" value={createForm.source} onChange={(e) => setCreateForm({...createForm, source: e.target.value})} required id="create-source" />
                  </div>
                  <div className="form-group">
                    <label>Destination</label>
                    <input type="text" className="form-input" placeholder="Ending point" value={createForm.destination} onChange={(e) => setCreateForm({...createForm, destination: e.target.value})} required id="create-destination" />
                  </div>
                  <div className="form-group">
                    <label>Route</label>
                    <input type="text" className="form-input" placeholder="Via route name" value={createForm.route} onChange={(e) => setCreateForm({...createForm, route: e.target.value})} id="create-route" />
                  </div>
                </div>
                <button type="submit" className="btn-primary" id="submit-create-bus">Create Bus</button>
              </form>
            </GlassCard>
          </motion.div>
        )}

        {/* Bus Management Cards */}
        <motion.div className="conductor-buses-grid" variants={staggerContainer()} initial="hidden" animate="visible">
          {buses.length === 0 ? (
            <div className="empty-state">
              <p>No buses registered yet. Click "Add Bus" to get started!</p>
            </div>
          ) : (
            buses.map((bus) => (
              <motion.div key={bus._id} variants={staggerItem}>
                <GlassCard className="conductor-bus-card" variant="plain">
                  <div className="bus-card-header">
                    <div className="bus-number-badge">{bus.busNumber}</div>
                    <div className="header-right">
                      <div className={`bus-status-tag ${bus.isActive ? 'active' : 'inactive'}`}>
                        {bus.isActive ? '● Live' : '○ Stopped'}
                      </div>
                      <button className="btn-delete-icon" onClick={() => handleDeleteBus(bus._id)}>✕</button>
                    </div>
                  </div>

                  <div className="bus-route">
                    <span className="route-point">{bus.source}</span>
                    <span className="route-arrow">→</span>
                    <span className="route-point">{bus.destination}</span>
                  </div>

                  <div className="conductor-seats-control">
                    <label>Available Seats: <span className="text-gold">{bus.availableSeats}</span> / {bus.totalSeats}</label>
                    <div className="seats-buttons">
                      <button
                        className="seat-btn minus"
                        onClick={() => handleUpdateSeats(bus._id, Math.max(0, bus.availableSeats - 1))}
                        disabled={bus.availableSeats <= 0}
                        id={`dec-seat-${bus._id}`}
                      >−</button>
                      <span className="seat-count">{bus.availableSeats}</span>
                      <button
                        className="seat-btn plus"
                        onClick={() => handleUpdateSeats(bus._id, Math.min(bus.totalSeats, bus.availableSeats + 1))}
                        disabled={bus.availableSeats >= bus.totalSeats}
                        id={`inc-seat-${bus._id}`}
                      >+</button>
                    </div>
                  </div>

                  <div className="conductor-actions">
                    {!bus.isActive ? (
                      <button className="btn-start" onClick={() => handleStartTrip(bus._id)} id={`start-${bus._id}`}>
                        ▶ Start Trip
                      </button>
                    ) : (
                      <button className="btn-end" onClick={() => handleEndTrip(bus._id)} id={`end-${bus._id}`}>
                        ⏹ End Trip
                      </button>
                    )}
                    
                    <button 
                      className={`btn-location ${liveTracking[bus._id] ? 'active-pulse' : ''}`} 
                      onClick={() => liveTracking[bus._id] ? stopLiveTracking(bus._id) : startLiveTracking(bus._id)}
                      id={`location-${bus._id}`}
                    >
                      {liveTracking[bus._id] ? '🛰 Stop Sharing' : '🛰 Share Live Location'}
                    </button>
                  </div>

                  <div className="conductor-route-management">
                    <label className="text-muted small">Route Milestones (Colonies/Squares)</label>
                    <div className="route-input-group">
                      <input 
                        type="text" 
                        className="form-input small" 
                        placeholder="e.g. MG Road Square"
                        value={routeInput[bus._id] || ''}
                        onChange={(e) => setRouteInput(prev => ({ ...prev, [bus._id]: e.target.value }))}
                      />
                      <button className="btn-add-point" onClick={() => handleAddRoutePoint(bus._id)}>Add</button>
                    </div>
                    <button 
                      className="btn-mark-map" 
                      onClick={() => setMapSelectorBus(bus)}
                    >
                      🗺️ Mark Via Map
                    </button>
                    {bus.routePoints?.length > 0 && (
                      <div className="route-milestones">
                        {bus.routePoints.map((p, idx) => (
                          <span key={idx} className="milestone-badge">{p.name}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </GlassCard>
              </motion.div>
            ))
          )}
        </motion.div>
        
        {/* Bookings Section */}
        <motion.div className="conductor-bookings-section" variants={fadeInUp} initial="hidden" animate="visible">
          <GlassCard className="bookings-card">
            <h2 className="section-title">Passenger Bookings</h2>
            <div className="bookings-table-wrapper">
              <table className="bookings-table">
                <thead>
                  <tr>
                    <th>Bus</th>
                    <th>Passenger(s)</th>
                    <th>Points</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rides.length === 0 ? (
                    <tr><td colSpan="4" className="text-center">No bookings yet</td></tr>
                  ) : (
                    rides.map(ride => (
                      <tr key={ride._id}>
                        <td>{ride.busId?.busNumber}</td>
                        <td>
                          {ride.passengers?.map((p, i) => (
                            <div key={i} className="p-mini-box">
                              {p.name} ({p.gender?.charAt(0).toUpperCase()})
                            </div>
                          ))}
                        </td>
                        <td>{ride.boardingPoint} ➜ {ride.droppingPoint}</td>
                        <td><span className={`status-${ride.status}`}>{ride.status}</span></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </motion.div>

        {/* Route Marking Overlay */}
        <AnimatePresence>
          {mapSelectorBus && (
            <motion.div 
              className="map-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMapSelectorBus(null)}
            >
              <div className="map-modal-container" onClick={(e) => e.stopPropagation()}>
                <div className="map-modal-header">
                  <h3>Mark Route: {mapSelectorBus.busNumber}</h3>
                  <button className="btn-close-map" onClick={() => setMapSelectorBus(null)}>✕</button>
                </div>
                <div className="map-instructions">
                  💡 Click anywhere on the map to add a route milestone!
                </div>
                <BusMap 
                  buses={buses} 
                  selectedBus={mapSelectorBus} 
                  height="500px" 
                  onMapClick={handleMapPointClick}
                />
                <div className="map-modal-footer">
                  <p>Milestones: {mapSelectorBus.routePoints?.length || 0}</p>
                  <button className="btn-primary" onClick={() => setMapSelectorBus(null)}>Done</button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ConductorDashboard;
