import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import GlassCard from '../components/GlassCard';
import BusMap from '../components/BusMap';
import { busService, rideService } from '../services/dataService';
import { useSocket } from '../hooks/useSocket';
import Ticket from '../components/Ticket';
import { staggerContainer, staggerItem, fadeInUp } from '../animations/variants';
import './Dashboard.css';

const Dashboard = ({ user }) => {
  const [buses, setBuses] = useState([]);
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('buses');
  const [hoveredTab, setHoveredTab] = useState(null);
  const [selectedBusDetails, setSelectedBusDetails] = useState(null);
  const [searchSource, setSearchSource] = useState('');
  const [searchDest, setSearchDest] = useState('');
  const [bookingMsg, setBookingMsg] = useState('');
  const [distanceKm, setDistanceKm] = useState(0);
  const [calculatingFare, setCalculatingFare] = useState(false);
  const [stashedBus, setStashedBus] = useState(null); // For auto-restoring modal
  const [reviewInput, setReviewInput] = useState('');
  const [ratingInput, setRatingInput] = useState(0);
  const [selectedImgIdx, setSelectedImgIdx] = useState(0);
  
  // Real-time states
  const [showMap, setShowMap] = useState(false);
  const [selectedBus, setSelectedBus] = useState(null);
  const [bookingBus, setBookingBus] = useState(null);
  const [bookingDetails, setBookingDetails] = useState({
    seats: 1,
    boarding: '',
    dropping: '',
    passengers: [{ name: '', age: '', gender: '', contact: '' }]
  });
  const [showTicket, setShowTicket] = useState(false);
  const [selectedRideForTicket, setSelectedRideForTicket] = useState(null);
  const [pickingMode, setPickingMode] = useState(null); // 'boarding' | 'dropping' | null

  const { seatUpdates, locationUpdates, busUpdates, busDeleted, newBooking } = useSocket();

  useEffect(() => {
    fetchData();
    return () => {
      document.body.style.overflow = ''; // Clean up on unmount
      document.body.classList.remove('modal-active');
    };
  }, []);

  // Reset image index when opening a new bus
  useEffect(() => {
    setSelectedImgIdx(0);
    // Initialize ratingInput/reviewInput from existing rating if present
    if (selectedBusDetails && user) {
       const userRating = selectedBusDetails.ratings?.find(r => (r.userId?._id || r.userId) === user._id);
       setRatingInput(userRating?.rating || 0);
       setReviewInput(userRating?.review || '');
    }
    if (selectedBusDetails?.images?.length > 1) {
      const interval = setInterval(() => {
        setSelectedImgIdx(prev => (prev + 1) % selectedBusDetails.images.length);
      }, 4000); // 4 seconds
      return () => clearInterval(interval);
    }
  }, [selectedBusDetails, user]);

  const handleRateSubmit = async () => {
    if (ratingInput < 1) {
      setBookingMsg('Please select at least 1 star');
      return;
    }
    try {
      const res = await busService.rateBus(selectedBusDetails._id, ratingInput, reviewInput);
      setSelectedBusDetails(prev => ({
        ...prev,
        avgRating: res.avgRating,
        totalRatings: res.totalRatings,
        ratings: [...(prev.ratings || []).filter(r => (r.userId?._id || r.userId) !== user?._id), { userId: user, rating: ratingInput, review: reviewInput, createdAt: new Date() }]
      }));
      setBuses(prev => prev.map(b => b._id === selectedBusDetails._id ? { ...b, avgRating: res.avgRating, totalRatings: res.totalRatings } : b));
      setBookingMsg('⭐ Review submitted!');
      setTimeout(() => setBookingMsg(''), 2000);
    } catch (err) {
      setBookingMsg('Failed to submit review');
      setTimeout(() => setBookingMsg(''), 3000);
    }
  };

  const handleDeleteReview = async (busId, reviewId) => {
    if (!window.confirm('Are you sure you want to delete your review?')) return;
    try {
      const res = await busService.deleteReview(busId, reviewId);
      setSelectedBusDetails(prev => ({
        ...prev,
        avgRating: res.avgRating,
        totalRatings: res.totalRatings,
        ratings: (prev.ratings || []).filter(r => r._id !== reviewId)
      }));
      setBuses(prev => prev.map(b => b._id === busId ? { ...b, avgRating: res.avgRating, totalRatings: res.totalRatings } : b));
      setRatingInput(0);
      setReviewInput('');
      setBookingMsg('Review deleted');
      setTimeout(() => setBookingMsg(''), 2000);
    } catch (err) {
      setBookingMsg('Failed to delete review');
    }
  };

  // Prevent background scrolling when any modal is open
  useEffect(() => {
    if (showMap || bookingBus || showTicket || pickingMode || selectedBusDetails) {
      document.body.style.overflow = 'hidden';
      document.body.classList.add('modal-active');
    } else {
      document.body.style.overflow = '';
      document.body.classList.remove('modal-active');
    }
  }, [showMap, bookingBus, showTicket, pickingMode, selectedBusDetails]);

  // Update buses with live location and seats from socket
  useEffect(() => {
    if (seatUpdates) {
      setBuses(prev => (prev || []).map(b =>
        b._id === seatUpdates.busId
          ? { ...b, availableSeats: seatUpdates.availableSeats }
          : b
      ));
      if (selectedBusDetails?._id === seatUpdates.busId) {
        setSelectedBusDetails(prev => (prev ? { ...prev, ...seatUpdates } : null));
      }
    }
  }, [seatUpdates, selectedBusDetails]);

  useEffect(() => {
    if (locationUpdates) {
      setBuses(prev => (prev || []).map(b =>
        b._id === locationUpdates.busId
          ? { ...b, location: locationUpdates.location }
          : b
      ));
      if (selectedBus?._id === locationUpdates.busId) {
        setSelectedBus(prev => (prev ? { ...prev, location: locationUpdates.location } : null));
      }
      if (selectedBusDetails?._id === locationUpdates.busId) {
        setSelectedBusDetails(prev => (prev ? { ...prev, location: locationUpdates.location } : null));
      }
    }
  }, [locationUpdates, selectedBus, selectedBusDetails]);

  useEffect(() => {
    if (busUpdates) {
      setBuses(prev => {
        if (!prev) return [];
        const index = prev.findIndex(b => b._id === busUpdates._id);
        if (index !== -1) {
          return prev.map((b, i) => i === index ? { ...b, ...busUpdates } : b);
        } else {
          if (busUpdates.isActive) return [busUpdates, ...prev];
          return prev;
        }
      });
      if (selectedBusDetails?._id === busUpdates._id) {
        setSelectedBusDetails(prev => (prev ? { ...prev, ...busUpdates } : null));
      }
      if (bookingBus?._id === busUpdates._id) {
        setBookingBus(prev => (prev ? { ...prev, ...busUpdates } : null));
      }
    }
  }, [busUpdates, selectedBusDetails, bookingBus]);

  useEffect(() => {
    if (busDeleted) {
      setBuses(prev => (prev || []).filter(b => b._id !== busDeleted));
      if (selectedBusDetails?._id === busDeleted) setSelectedBusDetails(null);
      if (bookingBus?._id === busDeleted) setBookingBus(null);
    }
  }, [busDeleted, selectedBusDetails, bookingBus]);

  useEffect(() => {
    if (newBooking) {
      const busId = newBooking.busId?._id || newBooking.busId;
      setBuses(prev => (prev || []).map(b => 
        b._id === busId
          ? { ...b, availableSeats: Math.max(0, b.availableSeats - (newBooking.numberOfSeats || 1)) }
          : b
      ));
    }
  }, [newBooking]);


  const fetchData = async () => {
    try {
      setLoading(true);
      const [busData, rideData] = await Promise.all([
        busService.getAll(),
        rideService.getHistory(),
      ]);
      setBuses(busData);
      setRides(rideData);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelRide = async (rideId) => {
    try {
      await rideService.cancel(rideId);
      setBookingMsg('Ride cancelled');
      fetchData();
      setTimeout(() => setBookingMsg(''), 3000);
    } catch (err) {
      setBookingMsg(err.response?.data?.message || 'Cancel failed');
      setTimeout(() => setBookingMsg(''), 3000);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const fetchDistance = async () => {
      if (!bookingBus || !bookingDetails.boarding || !bookingDetails.dropping) {
         if (isMounted) setDistanceKm(0);
         return;
      }
      if (bookingDetails.boarding === bookingDetails.dropping) {
         if (isMounted) setDistanceKm(0);
         return;
      }
      
      if (isMounted) setCalculatingFare(true);
      try {
        const getCoords = async (placeName) => {
          const match = placeName.match(/\((-?\d+\.\d+),\s*(-?\d+\.\d+)\)/);
          if (match) return { lat: parseFloat(match[1]), lon: parseFloat(match[2]) };

          const point = bookingBus.routePoints?.find(p => p.name === placeName);
          if (point && point.latitude) return { lat: point.latitude, lon: point.longitude };
          
          const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(placeName)}`);
          const data = await res.json();
          if (data && data.length > 0) {
             return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
          }
          return null;
        };
        
        const startC = await getCoords(bookingDetails.boarding);
        const endC = await getCoords(bookingDetails.dropping);
         
         if (startC && endC) {
             let dist = 10;
             try {
                const osrmRes = await fetch(`https://router.project-osrm.org/route/v1/driving/${startC.lon},${startC.lat};${endC.lon},${endC.lat}?overview=false`);
                const osrmData = await osrmRes.json();
                if (osrmData.routes && osrmData.routes.length > 0) {
                   dist = osrmData.routes[0].distance / 1000;
                }
             } catch(e) {
                const R = 6371;
                const dLat = (endC.lat - startC.lat) * Math.PI/180;
                const dLon = (endC.lon - startC.lon) * Math.PI/180;
                const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(startC.lat * Math.PI/180) * Math.cos(endC.lat * Math.PI/180) * Math.sin(dLon/2) * Math.sin(dLon/2);
                dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
             }
             if (isMounted) setDistanceKm(Math.max(1, Math.round(dist)));
         } else {
             const stops = [bookingBus.source, ...(bookingBus.routePoints?.map(p => p.name) || []), bookingBus.destination];
             const startIdx = Math.max(0, stops.indexOf(bookingDetails.boarding));
             const endIdx = Math.max(0, stops.indexOf(bookingDetails.dropping));
             let stopsDiff = Math.abs(endIdx - startIdx);
             if (isMounted) setDistanceKm(stopsDiff === 0 ? 1 : stopsDiff * 10);
         }
      } catch (err) {
         console.error("Distance calculation failed", err);
         if (isMounted) setDistanceKm(10);
      } finally {
         if (isMounted) setCalculatingFare(false);
      }
    };
    
    const timer = setTimeout(fetchDistance, 800);
    return () => { isMounted = false; clearTimeout(timer); };
  }, [bookingBus, bookingDetails.boarding, bookingDetails.dropping]);

  // Map Picker states

  const handleMapClick = useCallback(async (latlng) => {
    if (!pickingMode) return;
    
    try {
      setCalculatingFare(true);
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latlng.lat}&lon=${latlng.lng}`);
      const data = await res.json();
      const name = data.display_name.split(',')[0] + ', ' + data.display_name.split(',')[1];
      
      setBookingDetails(prev => ({
        ...prev,
        [pickingMode]: `${name} (${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)})`
      }));
      
      const currentMode = pickingMode;
      setPickingMode(null);
      
      // Auto-reopen the booking modal with stashed data
      if (stashedBus) {
        setBookingBus(stashedBus);
        setStashedBus(null);
      }

      setBookingMsg(`Selected ${currentMode} point! 📍`);
      setTimeout(() => setBookingMsg(''), 2000);
    } catch (err) {
      console.error("Map picking failed", err);
    } finally {
      setCalculatingFare(false);
    }
  }, [pickingMode, stashedBus]);

  const calculateFare = useCallback(() => {
    if (!bookingBus) return 0;
    const rate = 2; // Flat rate of 2rupee per km as per user request
    return Math.round(distanceKm * rate * bookingDetails.seats);
  }, [bookingBus, distanceKm, bookingDetails.seats]);

  const filteredBuses = useMemo(() => {
    return buses.filter(bus => 
      bus.source.toLowerCase().includes(searchSource.toLowerCase()) &&
      bus.destination.toLowerCase().includes(searchDest.toLowerCase())
    );
  }, [buses, searchSource, searchDest]);

  const handleBookRide = (bus) => {
    setBookingBus(bus);
    setBookingDetails({
      seats: 1,
      boarding: bus.source,
      dropping: bus.destination,
      passengers: [{ 
        name: user?.name || '', 
        age: user?.age || '', 
        gender: user?.gender || '', 
        contact: user?.phone || '' 
      }]
    });
  };

  const confirmBooking = async () => {
    try {
      setLoading(true);
      const totalFare = calculateFare();
      const bookedRide = await rideService.book({
        busId: bookingBus._id,
        numberOfSeats: bookingDetails.seats,
        passengers: bookingDetails.passengers,
        boardingPoint: bookingDetails.boarding,
        droppingPoint: bookingDetails.dropping,
        totalFare
      });
      setBookingMsg('Ride booked successfully! 🎟️');
      setBookingBus(null);
      setSelectedRideForTicket(bookedRide);
      setShowTicket(true);
      fetchData();
      setTimeout(() => setBookingMsg(''), 3000);
    } catch (err) {
      setBookingMsg(err.response?.data?.message || 'Booking failed');
      setTimeout(() => setBookingMsg(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handlePassengerChange = (index, field, value) => {
    const updated = [...bookingDetails.passengers];
    updated[index][field] = value;
    setBookingDetails(prev => ({ ...prev, passengers: updated }));
  };

  const addPassenger = () => {
    if (bookingDetails.seats >= bookingBus.availableSeats) return;
    setBookingDetails(prev => ({
      ...prev,
      seats: prev.seats + 1,
      passengers: [...prev.passengers, { name: '', age: '', gender: '', contact: '' }]
    }));
  };

  const removePassenger = (index) => {
    if (bookingDetails.seats <= 1) return;
    const updated = bookingDetails.passengers.filter((_, i) => i !== index);
    setBookingDetails(prev => ({
      ...prev,
      seats: prev.seats - 1,
      passengers: updated
    }));
  };

  const getSeatColor = (available, total) => {
    const ratio = available / total;
    if (ratio > 0.5) return '#00c853';
    if (ratio > 0.2) return '#ff9100';
    return '#ff4444';
  };

  if (loading) {
    return (
      <div className="page-wrapper">
        <div className="loading-container">
          <div className="spinner" />
          <p className="text-muted">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper dashboard-page gpu-accel performance-container">
      <div className="dashboard-container section-container">
        {/* Header */}
        <motion.div className="dashboard-header" variants={fadeInUp} initial="hidden" animate="visible">
          <div>
            <h1 className="dashboard-title">Welcome, <span className="text-gold">{user?.name || 'Passenger'}</span></h1>
            <p className="text-muted">Track buses, view seats, and manage your rides</p>
          </div>
          <div className="dashboard-status">
            <div className="status-dot" />
            <span>Live Updates Active</span>
          </div>
        </motion.div>

        {/* Quick Stats */}
        <motion.div className="dashboard-stats" variants={staggerContainer()} initial="hidden" animate="visible">
          {[
            { label: 'Active Buses', value: buses.filter(b => b.isActive).length, icon: '🚌' },
            { label: 'Your Rides', value: rides.length, icon: '🎫' },
            { label: 'Active Bookings', value: rides.filter(r => r.status === 'booked' || r.status === 'active').length, icon: '📊' },
            { label: 'Available Now', value: buses.filter(b => b.availableSeats > 0).length, icon: '💺' },
          ].map(s => (
            <motion.div key={s.label} variants={staggerItem}>
                <GlassCard className="dash-stat-card gpu-accel">
                  <span className="dash-stat-icon">{s.icon}</span>
                  <span className="dash-stat-value">{s.value}</span>
                  <span className="dash-stat-label">{s.label}</span>
                </GlassCard>
            </motion.div>
          ))}
        </motion.div>

        {bookingMsg && (
          <motion.div
            className={`booking-toast ${bookingMsg.includes('success') || bookingMsg.includes('Selected') ? 'toast-success' : 'toast-error'}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {bookingMsg}
          </motion.div>
        )}

        {/* Tabs */}
        <div className="dashboard-tabs" onMouseLeave={() => setHoveredTab(null)}>
          <button 
            className={`tab-btn ${activeTab === 'buses' ? 'active' : ''}`} 
            onClick={() => setActiveTab('buses')} 
            onMouseEnter={() => setHoveredTab('buses')}
            id="tab-buses"
          >
            <span className="tab-text">🚌 Available Buses</span>
            {(activeTab === 'buses' || hoveredTab === 'buses') && (
              <motion.div
                layoutId="dash-pill"
                className={`tab-pill-bg ${hoveredTab === 'buses' && activeTab !== 'buses' ? 'hover' : ''}`}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
          </button>
          <button 
            className={`tab-btn ${activeTab === 'rides' ? 'active' : ''}`} 
            onClick={() => setActiveTab('rides')} 
            onMouseEnter={() => setHoveredTab('rides')}
            id="tab-rides"
          >
            <span className="tab-text">🎫 My Rides</span>
            {(activeTab === 'rides' || hoveredTab === 'rides') && (
              <motion.div
                layoutId="dash-pill"
                className={`tab-pill-bg ${hoveredTab === 'rides' && activeTab !== 'rides' ? 'hover' : ''}`}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
          </button>
        </div>

        {/* Available Buses Tab */}
        {activeTab === 'buses' && (
          <motion.div variants={staggerContainer()} initial="hidden" animate="visible">
            <div className="search-bar">
              <input
                type="text"
                className="form-input"
                placeholder="Search source..."
                value={searchSource}
                onChange={(e) => setSearchSource(e.target.value)}
                id="search-source"
              />
              <input
                type="text"
                className="form-input"
                placeholder="Search destination..."
                value={searchDest}
                onChange={(e) => setSearchDest(e.target.value)}
                id="search-dest"
              />
            </div>

            <div className="buses-grid">
              {filteredBuses.length === 0 ? (
                <div className="empty-state">
                  <p>No buses found. Try adjusting your search.</p>
                </div>
              ) : (
                filteredBuses.map((bus) => (
                  <motion.div key={bus._id} variants={staggerItem} className="gpu-accel">
                    <GlassCard className="bus-card gpu-accel" variant="plain">
                      {/* Thumbnail Image Banner */}
                      <div className="bus-card-thumb">
                        {(bus.images && bus.images.length > 0) ? (
                          <img src={bus.images[0]} alt={bus.busNumber} className="bus-card-thumb-img" />
                        ) : bus.image ? (
                          <img src={bus.image} alt={bus.busNumber} className="bus-card-thumb-img" />
                        ) : (
                          <div className="bus-card-thumb-empty">🚌</div>
                        )}
                        <div className="bus-card-thumb-overlay">
                          <div className="bus-number-badge">{bus.busNumber}</div>
                          <div className={`bus-status-tag ${bus.isActive ? 'active' : 'inactive'}`}>
                            {bus.isActive ? '● Active' : '○ Inactive'}
                          </div>
                        </div>
                      </div>

                      <div className="bus-card-body">
                        <div className="bus-route">
                          <span className="route-point">{bus.source}</span>
                          <span className="route-arrow">→</span>
                          <span className="route-point">{bus.destination}</span>
                        </div>

                        <div className="bus-details">
                          <div className="seat-info">
                            <div className="seat-bar">
                              <div className="seat-bar-fill" style={{ width: `${(bus.availableSeats / bus.totalSeats) * 100}%`, background: getSeatColor(bus.availableSeats, bus.totalSeats) }} />
                            </div>
                            <span className="seat-text" style={{ color: getSeatColor(bus.availableSeats, bus.totalSeats) }}>
                              {bus.availableSeats}/{bus.totalSeats} seats
                            </span>
                          </div>
                          {/* Star Rating */}
                          <div className="bus-card-rating">
                            <span className="rating-stars">{'★'.repeat(Math.round(bus.avgRating || 0))}{'☆'.repeat(5 - Math.round(bus.avgRating || 0))}</span>
                            <span className="rating-count">{bus.avgRating ? bus.avgRating.toFixed(1) : '—'}</span>
                          </div>
                        </div>

                        <div className="bus-card-actions">
                          <button
                            className="btn-secondary map-trigger-btn"
                            onClick={() => { setSelectedBus(bus); setShowMap(true); }}
                          >
                            📍 Map
                          </button>
                          <button
                            className="btn-primary bus-book-btn"
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              window.location.href = `/bus/${bus._id}`;
                            }}
                            id={`details-${bus._id}`}
                          >
                            View Details
                          </button>
                        </div>
                      </div>
                    </GlassCard>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        )}

        {/* My Rides Tab */}
        {activeTab === 'rides' && (
          <motion.div variants={staggerContainer()} initial="hidden" animate="visible">
            <div className="rides-list">
              {rides.length === 0 ? (
                <div className="empty-state">
                  <p>No rides yet. Book your first ride from the Available Buses tab!</p>
                </div>
              ) : (
                rides.map((ride) => (
                  <motion.div key={ride._id} variants={staggerItem}>
                    <GlassCard className="ride-card">
                      <div className="ride-info">
                        <div className="ride-bus-num">{ride.busId?.busNumber || 'N/A'}</div>
                        <div className="ride-route">
                          {ride.boardingPoint || 'N/A'} → {ride.droppingPoint || 'N/A'}
                        </div>
                        <div className="ride-meta">
                          <span>{ride.numberOfSeats || 1} {ride.numberOfSeats > 1 ? 'Seats' : 'Seat'}</span>
                          {ride.fare > 0 && <span>₹{ride.fare}</span>}
                          <span>{new Date(ride.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="ride-actions">
                        {(ride.status === 'booked' || ride.status === 'active' || ride.status === 'completed') && (
                          <>
                            <button 
                              className="btn-view-ticket"
                              onClick={() => {
                                setSelectedRideForTicket(ride);
                                setShowTicket(true);
                              }}
                            >
                              <span>🎫</span> View
                            </button>
                            <button 
                              className="btn-view-ticket print-shortcut-btn"
                              onClick={() => {
                                setSelectedRideForTicket(ride);
                                // A slight delay to ensure it's selected before printing if we used a hidden print frame, 
                                // but here we'll just open and trigger print.
                                setShowTicket(true);
                                setTimeout(() => window.print(), 300);
                              }}
                              title="Direct Print"
                            >
                              <span>🖨️</span> Print
                            </button>
                          </>
                        )}
                        <span className={`ride-status ride-status-${ride.status}`}>
                          {ride.status}
                        </span>
                        {(ride.status === 'booked' || ride.status === 'active') && (
                          <button
                            className="btn-cancel"
                            onClick={() => handleCancelRide(ride._id)}
                            id={`cancel-${ride._id}`}
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </GlassCard>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        )}
        {/* Live Map Overlay */}
        {/* Bus Details Modal */}
        <AnimatePresence>
          {selectedBusDetails && (
            <motion.div
              className="booking-modal-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={(e) => { if (e.target.className === 'booking-modal-overlay') setSelectedBusDetails(null); }}
            >
              <motion.div
                className="bus-details-modal"
                initial={{ y: 60, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 60, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 340, damping: 30 }}
              >
                {/* Hero Image slider */}
                <div className="bus-details-hero">
                  {(selectedBusDetails.images && selectedBusDetails.images.length > 0) ? (
                    <div className="bus-details-hero-slider">
                      {selectedBusDetails.images.map((img, idx) => (
                        <motion.img 
                          key={idx} 
                          src={img} 
                          alt="Bus" 
                          className="bus-details-hero-img-slide" 
                          initial={{ opacity: 0 }}
                          animate={{ 
                            opacity: idx === selectedImgIdx ? 1 : 0,
                            x: (idx - selectedImgIdx) * 100 + '%'
                          }}
                          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                          style={{ position: 'absolute', top: 0, left: 0 }}
                        />
                      ))}
                      {selectedBusDetails.images.length > 1 && (
                        <div className="slider-dots">
                          {selectedBusDetails.images.map((_, i) => (
                            <span key={i} className={`dot ${i === selectedImgIdx ? 'active' : ''}`}></span>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : selectedBusDetails.image ? (
                    <img src={selectedBusDetails.image} alt="Bus" className="bus-details-hero-img-slide" />
                  ) : (
                    <div className="bus-details-hero-placeholder">
                      <span style={{ fontSize: '4rem' }}>🚌</span>
                      <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem' }}>No photo uploaded</span>
                    </div>
                  )}
                  <div className="bus-details-hero-overlay">
                    <div className="bus-details-hero-badge">{selectedBusDetails.busNumber}</div>
                    <button className="bus-details-close" onClick={() => setSelectedBusDetails(null)}>✕</button>
                  </div>
                </div>

                <div className="bus-details-content-scroll">
                  {/* Route */}
                  <div className="bus-details-route">
                    <div className="bus-details-city">
                      <span className="bus-details-city-label">FROM</span>
                      <span className="bus-details-city-name">{selectedBusDetails.source}</span>
                    </div>
                    <div className="bus-details-route-arrow">✈</div>
                    <div className="bus-details-city" style={{ textAlign: 'right' }}>
                      <span className="bus-details-city-label">TO</span>
                      <span className="bus-details-city-name">{selectedBusDetails.destination}</span>
                    </div>
                  </div>

                  {/* Status & Seats */}
                  <div className="bus-details-stats">
                    <div className="bus-details-stat">
                      <span className="bus-details-stat-val" style={{ color: getSeatColor(selectedBusDetails.availableSeats, selectedBusDetails.totalSeats) }}>
                        {selectedBusDetails.availableSeats}
                      </span>
                      <span className="bus-details-stat-label">Available</span>
                    </div>
                    <div className="bus-details-stat">
                      <span className="bus-details-stat-val">{selectedBusDetails.totalSeats}</span>
                      <span className="bus-details-stat-label">Total Seats</span>
                    </div>
                    <div className="bus-details-stat">
                      <span className="bus-details-stat-val" style={{ color: selectedBusDetails.isActive ? '#00c853' : '#ff6b6b' }}>
                        {selectedBusDetails.isActive ? '● Live' : '○ Off'}
                      </span>
                      <span className="bus-details-stat-label">Status</span>
                    </div>
                  </div>

                  {/* Seat Bar */}
                  <div className="bus-details-seat-bar-wrap">
                    <div className="seat-bar" style={{ height: '8px' }}>
                      <div className="seat-bar-fill" style={{ width: `${(selectedBusDetails.availableSeats / selectedBusDetails.totalSeats) * 100}%`, background: getSeatColor(selectedBusDetails.availableSeats, selectedBusDetails.totalSeats) }} />
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginTop: '4px', display: 'block' }}>
                      {Math.round((selectedBusDetails.availableSeats / selectedBusDetails.totalSeats) * 100)}% seats available
                    </span>
                  </div>

                  {/* Route Stops */}
                  {selectedBusDetails.routePoints?.length > 0 && (
                    <div className="bus-details-stops">
                      <span className="bus-details-stops-label">Stops</span>
                      <div className="bus-details-stops-list">
                        {selectedBusDetails.routePoints.map((p, i) => (
                          <span key={i} className="milestone-badge">{p.name}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Conductor */}
                  {selectedBusDetails.conductorId?.name && (
                    <div className="bus-details-conductor">
                      <span>👤</span>
                      <span>Conductor: <strong>{selectedBusDetails.conductorId.name}</strong></span>
                    </div>
                  )}

                  {/* Rating Section */}
                  <div className="bus-details-rating-section">
                    <div className="bus-details-rating-header">
                      <span className="bus-details-stops-label">Rate This Bus</span>
                      {selectedBusDetails.avgRating > 0 && (
                        <span className="bus-details-rating-avg">
                          ★ {selectedBusDetails.avgRating.toFixed(1)} <span className="bus-details-rating-count">({selectedBusDetails.totalRatings} {selectedBusDetails.totalRatings === 1 ? 'vote' : 'votes'})</span>
                        </span>
                      )}
                    </div>
                    <div className="bus-details-stars-interactive">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          className={`star-btn ${ratingInput >= star ? 'active' : ''}`}
                          onClick={() => setRatingInput(star)}
                        >
                          {ratingInput >= star ? '★' : '☆'}
                        </button>
                      ))}
                    </div>
                    <textarea 
                      placeholder="Write a review (optional)..." 
                      className="form-input review-text-input" 
                      value={reviewInput}
                      onChange={(e) => setReviewInput(e.target.value)}
                      rows={2}
                    ></textarea>
                    <button className="btn-primary submit-review-btn" onClick={handleRateSubmit} style={{ width: '100%', marginTop: '10px' }}>
                       Submit Review
                    </button>
                    
                    <div className="bus-reviews-list">
                      <h4 className="reviews-section-title">Passenger Reviews</h4>
                      {selectedBusDetails.ratings && selectedBusDetails.ratings.length > 0 ? (
                        <div className="reviews-scroller">
                          {selectedBusDetails.ratings.map((r, i) => (
                            <div key={i} className="review-card">
                              <div className="review-header-flex" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div className="review-stars-display">{'★'.repeat(r.rating)}{'☆'.repeat(5-r.rating)}</div>
                                {(r.userId?._id === user?._id || r.userId === user?._id) && (
                                  <button className="delete-review-btn" onClick={() => handleDeleteReview(selectedBusDetails._id, r._id)} style={{ background: 'none', border: 'none', color: '#ff4444', cursor: 'pointer', padding: '4px' }}>🗑</button>
                                )}
                              </div>
                              {r.review && <div className="review-text">"{r.review}"</div>}
                              {r.conductorReply && <div className="reply-text">💬 Conductor: <span>{r.conductorReply}</span></div>}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="no-reviews-msg">No reviews yet.</p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="bus-details-actions">
                    <button
                      className="btn-secondary"
                      style={{ padding: '12px 20px', borderRadius: 'var(--radius-md)' }}
                      onClick={() => { setSelectedBus(selectedBusDetails); setShowMap(true); setSelectedBusDetails(null); }}
                    >
                      📍 View on Map
                    </button>
                    {selectedBusDetails.availableSeats > 0 && selectedBusDetails.isActive ? (
                      <button
                        className="btn-primary"
                        style={{ flex: 1, padding: '14px', fontSize: '1rem', fontWeight: 800 }}
                        onClick={() => { handleBookRide(selectedBusDetails); setSelectedBusDetails(null); }}
                      >
                        🎟 Book Seat
                      </button>
                    ) : (
                      <button className="btn-primary" style={{ flex: 1, opacity: 0.4, cursor: 'not-allowed' }} disabled>
                        No Seats Available
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {(showMap || pickingMode) && (
            <motion.div 
              className="map-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={(e) => {
                if (e.target.className === 'map-overlay') {
                  setShowMap(false);
                  setPickingMode(null);
                }
              }}
            >
              <div className="map-modal-container">
                <div className="map-modal-header">
                  <h3>
                    {pickingMode 
                      ? `Select ${pickingMode === 'boarding' ? 'Boarding' : 'Drop'} Point` 
                      : `Live Bus Tracking: ${selectedBus?.busNumber}`}
                  </h3>
                  <button className="btn-close-map" onClick={() => { setShowMap(false); setPickingMode(null); }}>✕</button>
                </div>
                
                {pickingMode && (
                  <div className="map-picker-prompt">
                    📍 Click anywhere on the map along the route to select your point.
                  </div>
                )}

                <BusMap 
                  buses={buses} 
                  selectedBus={selectedBus || bookingBus} 
                  height="500px" 
                  onMapClick={handleMapClick}
                  onMapError={(msg) => {
                    setBookingMsg(msg);
                    setTimeout(() => setBookingMsg(''), 3000);
                  }}
                  boardingPoint={(() => {
                    const match = bookingDetails.boarding.match(/\((-?\d+\.\d+),\s*(-?\d+\.\d+)\)/);
                    return match ? { lat: parseFloat(match[1]), lng: parseFloat(match[2]) } : null;
                  })()}
                  droppingPoint={(() => {
                    const match = bookingDetails.dropping.match(/\((-?\d+\.\d+),\s*(-?\d+\.\d+)\)/);
                    return match ? { lat: parseFloat(match[1]), lng: parseFloat(match[2]) } : null;
                  })()}
                />
                
                <div className="map-modal-footer">
                  <p>Route: {(selectedBus || bookingBus)?.source} → {(selectedBus || bookingBus)?.destination}</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Detailed Booking Modal */}
          {bookingBus && (
            <motion.div 
              className="booking-modal-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={(e) => {
                if (e.target.className === 'booking-modal-overlay') {
                  setBookingBus(null);
                }
              }}
            >
              <GlassCard className="booking-modal-card" isStatic={true} glow={false}>
                <div className="booking-modal-header">
                  <h2>Book Your Seat</h2>
                  <p>{bookingBus.busNumber} | {bookingBus.source} to {bookingBus.destination}</p>
                  <button className="btn-close-modal" onClick={() => setBookingBus(null)}>✕</button>
                </div>

                <div className="booking-form-scrollable">
                  <div className="booking-route-confirm">
                    <div className="form-group">
                      <label>Boarding From</label>
                      <div className="input-with-action">
                        <select 
                          className="form-input" 
                          value={bookingDetails.boarding} 
                          onChange={(e) => setBookingDetails(prev => ({ ...prev, boarding: e.target.value }))}
                        >
                          <option value={bookingBus.source}>{bookingBus.source} (Starting Point)</option>
                          {bookingBus.routePoints?.map((p, idx) => (
                            <option key={`${p.name}-${idx}`} value={p.name}>{p.name}</option>
                          ))}
                          {bookingDetails.boarding.includes('(') && (
                             <option value={bookingDetails.boarding}>📍 {bookingDetails.boarding}</option>
                          )}
                        </select>
                        <button 
                          className="btn-pin-map boarding-trigger" 
                          onClick={() => {
                            setStashedBus(bookingBus);
                            setBookingBus(null);
                            setPickingMode('boarding');
                          }}
                          title="Pick custom boarding point"
                        >
                          📍
                        </button>
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Destination</label>
                      <div className="input-with-action">
                        <select 
                          className="form-input" 
                          value={bookingDetails.dropping}
                          onChange={(e) => setBookingDetails(prev => ({ ...prev, dropping: e.target.value }))}
                        >
                          {bookingBus.routePoints?.map((p, idx) => (
                            <option key={`${p.name}-${idx}`} value={p.name}>{p.name}</option>
                          ))}
                          <option value={bookingBus.destination}>{bookingBus.destination} (Last Stop)</option>
                          {bookingDetails.dropping.includes('(') && (
                             <option value={bookingDetails.dropping}>📍 {bookingDetails.dropping}</option>
                          )}
                        </select>
                        <button 
                          className="btn-pin-map dropping-trigger" 
                          onClick={() => {
                            setStashedBus(bookingBus);
                            setBookingBus(null);
                            setPickingMode('dropping');
                          }}
                          title="Pick custom drop point"
                        >
                          📍
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="passengers-section">
                    <div className="section-header">
                      <h3>Passenger Details</h3>
                      <button className="btn-add-passenger" onClick={addPassenger}>+ Add Person</button>
                    </div>
                    {bookingDetails.passengers.map((p, idx) => (
                      <div key={idx} className="passenger-row">
                        <div className="passenger-header">
                          <span>Passenger #{idx + 1}</span>
                          {idx > 0 && <button onClick={() => removePassenger(idx)}>✕</button>}
                        </div>
                        <div className="passenger-inputs">
                          <input 
                            type="text" 
                            placeholder="Full Name" 
                            value={p.name} 
                            onChange={(e) => handlePassengerChange(idx, 'name', e.target.value)}
                          />
                          <input 
                            type="number" 
                            placeholder="Age" 
                            value={p.age} 
                            onChange={(e) => handlePassengerChange(idx, 'age', e.target.value)}
                          />
                          <select
                            className="form-input gender-select"
                            value={p.gender}
                            onChange={(e) => handlePassengerChange(idx, 'gender', e.target.value)}
                          >
                            <option value="">Select Gender</option>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                            <option value="other">Other</option>
                          </select>
                          <input 
                            type="text" 
                            placeholder="Contact Number" 
                            value={p.contact} 
                            onChange={(e) => handlePassengerChange(idx, 'contact', e.target.value)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="booking-modal-footer">
                  <div className="fare-summary">
                    <span className="fare-label">Total Fare</span>
                    <span className="fare-value" style={{ fontSize: calculatingFare ? '1rem' : '1.5rem', opacity: calculatingFare ? 0.6 : 1 }}>
                        {calculatingFare ? 'Calculating...' : `₹${calculateFare()}`}
                    </span>
                    <small className="fare-note">Real distance: {distanceKm}km • {bookingDetails.seats} Person(s)</small>
                  </div>
                  <button className="btn-primary confirm-btn" onClick={confirmBooking} disabled={calculatingFare}>
                    Confirm Booking
                  </button>
                </div>
              </GlassCard>
            </motion.div>
          )}

          {/* Ticket Modal */}
          {showTicket && (
            <Ticket 
              ride={selectedRideForTicket} 
              user={user} 
              onClose={() => setShowTicket(false)} 
              onPrint={() => window.print()}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Dashboard;
