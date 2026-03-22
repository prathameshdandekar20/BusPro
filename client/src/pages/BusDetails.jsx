import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import GlassCard from '../components/GlassCard';
import BusMap from '../components/BusMap';
import { busService, rideService } from '../services/dataService';
import { useSocket } from '../hooks/useSocket';
import Ticket from '../components/Ticket';
import { staggerContainer, staggerItem, fadeInUp } from '../animations/variants';
import './Dashboard.css';

const BusDetails = ({ user }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [selectedBusDetails, setSelectedBusDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bookingMsg, setBookingMsg] = useState('');
  
  const [distanceKm, setDistanceKm] = useState(0);
  const [calculatingFare, setCalculatingFare] = useState(false);
  const [stashedBus, setStashedBus] = useState(null); 
  const [reviewInput, setReviewInput] = useState('');
  const [ratingInput, setRatingInput] = useState(0);
  const [selectedImgIdx, setSelectedImgIdx] = useState(0);
  const [fullScreenImage, setFullScreenImage] = useState(null); // Added state for fullscreen image
  
  // Real-time states
  const [showMap, setShowMap] = useState(false);
  const [bookingBus, setBookingBus] = useState(null);
  const [bookingDetails, setBookingDetails] = useState({
    seats: 1,
    boarding: '',
    dropping: '',
    passengers: [{ name: '', age: '', gender: '', contact: '' }]
  });
  const [showTicket, setShowTicket] = useState(false);
  const [selectedRideForTicket, setSelectedRideForTicket] = useState(null);
  const [pickingMode, setPickingMode] = useState(null); 

  const { seatUpdates, locationUpdates, busUpdates, busDeleted, newBooking } = useSocket();

  useEffect(() => {
    fetchData();
    return () => {
      document.body.style.overflow = ''; 
      document.body.classList.remove('modal-active');
    };
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const busData = await busService.getById(id);
      setSelectedBusDetails(busData);
    } catch (err) {
      console.error('Error fetching bus data:', err);
      setBookingMsg('Bus not found');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setSelectedImgIdx(0);
    if (selectedBusDetails && user) {
       const userRating = selectedBusDetails.ratings?.find(r => (r.userId?._id || r.userId) === user._id);
       setRatingInput(userRating?.rating || 0);
       setReviewInput(userRating?.review || '');
    }
    if (selectedBusDetails?.images?.length > 1) {
      const interval = setInterval(() => {
        setSelectedImgIdx(prev => (prev + 1) % selectedBusDetails.images.length);
      }, 4000);
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
      setRatingInput(0);
      setReviewInput('');
      setBookingMsg('Review deleted');
      setTimeout(() => setBookingMsg(''), 2000);
    } catch (err) {
      setBookingMsg('Failed to delete review');
    }
  };

  useEffect(() => {
    if (showMap || bookingBus || showTicket || pickingMode || fullScreenImage) {
      document.body.style.overflow = 'hidden';
      document.body.classList.add('modal-active');
    } else {
      document.body.style.overflow = '';
      document.body.classList.remove('modal-active');
    }
  }, [showMap, bookingBus, showTicket, pickingMode, fullScreenImage]);

  useEffect(() => {
    if (seatUpdates && selectedBusDetails?._id === seatUpdates.busId) {
      setSelectedBusDetails(prev => (prev ? { ...prev, ...seatUpdates } : null));
    }
  }, [seatUpdates, selectedBusDetails]);

  useEffect(() => {
    if (locationUpdates && selectedBusDetails?._id === locationUpdates.busId) {
      setSelectedBusDetails(prev => (prev ? { ...prev, location: locationUpdates.location } : null));
    }
  }, [locationUpdates, selectedBusDetails]);

  useEffect(() => {
    if (busUpdates && selectedBusDetails?._id === busUpdates._id) {
      setSelectedBusDetails(prev => (prev ? { ...prev, ...busUpdates } : null));
      if (bookingBus?._id === busUpdates._id) setBookingBus(prev => (prev ? { ...prev, ...busUpdates } : null));
    }
  }, [busUpdates, selectedBusDetails, bookingBus]);

  useEffect(() => {
    if (busDeleted && selectedBusDetails?._id === busDeleted) {
        navigate('/dashboard');
    }
  }, [busDeleted, selectedBusDetails, navigate]);

  useEffect(() => {
    if (newBooking) {
      const busId = newBooking.busId?._id || newBooking.busId;
      if (selectedBusDetails?._id === busId) {
          setSelectedBusDetails(prev => prev ? { ...prev, availableSeats: Math.max(0, prev.availableSeats - (newBooking.numberOfSeats || 1)) } : null);
      }
    }
  }, [newBooking, selectedBusDetails]);

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
    const rate = 2; 
    return Math.round(distanceKm * rate * bookingDetails.seats);
  }, [bookingBus, distanceKm, bookingDetails.seats]);

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

  if (loading && !selectedBusDetails) {
    return (
      <div className="page-wrapper">
        <div className="loading-container">
          <div className="spinner" />
          <p className="text-muted">Loading details...</p>
        </div>
      </div>
    );
  }

  if (!selectedBusDetails) {
    return (
      <div className="page-wrapper">
        <div className="empty-state">
          <p>Bus not found.</p>
          <button className="btn-secondary" onClick={() => navigate('/dashboard')}>Back to Dashboard</button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper dashboard-page gpu-accel">
      <div className="dashboard-container" style={{ maxWidth: '800px', margin: '0 auto', paddingTop: '20px' }}>
        
        {/* Slick Navigation Header */}
        <div className="page-header-sleek" style={{ display: 'flex', alignItems: 'center', marginBottom: '24px', gap: '16px' }}>
          <button 
            onClick={() => navigate('/dashboard')}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--white)', cursor: 'pointer', backdropFilter: 'blur(10px)', flexShrink: 0 }}
            aria-label="Go Back"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </button>
          <h1 className="dashboard-title" style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700, letterSpacing: '0.5px' }}>Bus Details</h1>
        </div>

        {bookingMsg && (
          <motion.div
            className={`booking-toast ${bookingMsg.includes('success') || bookingMsg.includes('Selected') ? 'toast-success' : 'toast-error'}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {bookingMsg}
          </motion.div>
        )}

        <GlassCard isStatic={true} tilt={false} style={{ width: '100%', maxWidth: '100%', maxHeight: 'none', margin: '0 0 40px 0', border: '1px solid rgba(212,175,55,0.2)' }}>
          <div className="bus-details-hero" style={{ borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0', overflow: 'hidden', position: 'relative' }}>
            
            {/* Click-Catcher Overlay (sits above gradients) */}
            <div 
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10, cursor: 'zoom-in' }} 
              onClick={() => navigate(`/bus/${selectedBusDetails._id}/gallery?img=${selectedImgIdx}`)}
              title="View Image Fullscreen"
            />

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
                  <div className="slider-dots" style={{ zIndex: 20, pointerEvents: 'none' }}>
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
            <div className="bus-details-hero-overlay" style={{ zIndex: 11, pointerEvents: 'none' }}>
              <div className="bus-details-hero-badge">{selectedBusDetails.busNumber}</div>
            </div>
          </div>

          <div className="bus-details-content-scroll" style={{ padding: '24px' }}>
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

            <div className="bus-details-seat-bar-wrap">
              <div className="seat-bar" style={{ height: '8px' }}>
                <div className="seat-bar-fill" style={{ width: `${(selectedBusDetails.availableSeats / selectedBusDetails.totalSeats) * 100}%`, background: getSeatColor(selectedBusDetails.availableSeats, selectedBusDetails.totalSeats) }} />
              </div>
              <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginTop: '4px', display: 'block' }}>
                {Math.round((selectedBusDetails.availableSeats / selectedBusDetails.totalSeats) * 100)}% seats available
              </span>
            </div>

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

            {selectedBusDetails.conductorId?.name && (
              <div className="bus-details-conductor">
                <span>👤</span>
                <span>Conductor: <strong>{selectedBusDetails.conductorId.name}</strong></span>
              </div>
            )}

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

            <div className="bus-details-actions" style={{ marginTop: '20px' }}>
              <button
                className="btn-secondary"
                style={{ padding: '12px 20px', borderRadius: 'var(--radius-md)' }}
                onClick={() => setShowMap(true)}
              >
                📍 View on Map
              </button>
              {selectedBusDetails.availableSeats > 0 && selectedBusDetails.isActive ? (
                <button
                  className="btn-primary"
                  style={{ flex: 1, padding: '14px', fontSize: '1rem', fontWeight: 800 }}
                  onClick={() => window.location.href = `/book/${selectedBusDetails._id}`}
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
        </GlassCard>

        {/* Map Modal */}
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
                      : `Live Bus Tracking: ${selectedBusDetails?.busNumber}`}
                  </h3>
                  <button className="btn-close-map" onClick={() => { setShowMap(false); setPickingMode(null); }}>✕</button>
                </div>
                
                {pickingMode && (
                  <div className="map-picker-prompt">
                    📍 Click anywhere on the map along the route to select your point.
                  </div>
                )}

                <BusMap 
                  buses={[selectedBusDetails]} 
                  selectedBus={selectedBusDetails || bookingBus} 
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
                  <p>Route: {(selectedBusDetails || bookingBus)?.source} → {(selectedBusDetails || bookingBus)?.destination}</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Booking Modal */}
          {bookingBus && (
            <motion.div 
              className="booking-modal-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={(e) => {
                if (e.target.className === 'booking-modal-overlay') setBookingBus(null);
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
              onClose={() => {
                setShowTicket(false);
                navigate('/dashboard'); // Go to dashboard so they see their rides
              }} 
              onPrint={() => window.print()}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default BusDetails;
