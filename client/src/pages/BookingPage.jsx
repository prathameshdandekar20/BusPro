import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import GlassCard from '../components/GlassCard';
import BusMap from '../components/BusMap';
import { busService, rideService } from '../services/dataService';
import { useSocket } from '../hooks/useSocket';
import Ticket from '../components/Ticket';
import './Dashboard.css'; // Reusing global app CSS classes

const BookingPage = ({ user }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [bookingBus, setBookingBus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bookingMsg, setBookingMsg] = useState('');

  const [bookingDetails, setBookingDetails] = useState({
    seats: 1,
    boarding: '',
    dropping: '',
    passengers: [{ name: user?.name || '', age: user?.age || '', gender: user?.gender || '', contact: user?.phone || '' }]
  });

  const [distanceKm, setDistanceKm] = useState(0);
  const [calculatingFare, setCalculatingFare] = useState(false);
  const [stashedBus, setStashedBus] = useState(null); 
  const [pickingMode, setPickingMode] = useState(null); 

  const [showTicket, setShowTicket] = useState(false);
  const [selectedRideForTicket, setSelectedRideForTicket] = useState(null);

  const { busUpdates, newBooking } = useSocket();

  useEffect(() => {
    fetchBus();
  }, [id]);

  const fetchBus = async () => {
    try {
      setLoading(true);
      const busData = await busService.getById(id);
      setBookingBus(busData);
      // Initialize boarding/dropping
      setBookingDetails(prev => ({
        ...prev,
        boarding: busData.source,
        dropping: busData.destination
      }));
    } catch (err) {
      console.error('Error fetching bus data:', err);
      setBookingMsg('Bus not found');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (busUpdates && bookingBus?._id === busUpdates._id) {
      setBookingBus(prev => (prev ? { ...prev, ...busUpdates } : null));
    }
  }, [busUpdates, bookingBus]);

  useEffect(() => {
    if (newBooking) {
      const busId = newBooking.busId?._id || newBooking.busId;
      if (bookingBus?._id === busId) {
          setBookingBus(prev => prev ? { ...prev, availableSeats: Math.max(0, prev.availableSeats - (newBooking.numberOfSeats || 1)) } : null);
      }
    }
  }, [newBooking, bookingBus]);

  useEffect(() => {
    if (pickingMode || showTicket) {
      document.body.style.overflow = 'hidden';
      document.body.classList.add('modal-active');
    } else {
      document.body.style.overflow = '';
      document.body.classList.remove('modal-active');
    }
  }, [pickingMode, showTicket]);

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
      setSelectedRideForTicket(bookedRide);
      setShowTicket(true);
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

  if (loading && !bookingBus) {
    return (
      <div className="page-wrapper">
        <div className="loading-container">
          <div className="spinner" />
          <p className="text-muted">Loading booking data...</p>
        </div>
      </div>
    );
  }

  if (!bookingBus) {
    return (
      <div className="page-wrapper">
        <div className="empty-state">
          <p>Bus no longer available.</p>
          <button className="btn-secondary" onClick={() => navigate('/dashboard')}>Back to Dashboard</button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper dashboard-page gpu-accel">
      <div className="dashboard-container" style={{ maxWidth: '800px', margin: '0 auto', paddingTop: '20px', paddingBottom: '40px' }}>
        
        {/* Navigation Header */}
        <div className="page-header-sleek" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <button 
              onClick={() => navigate(`/bus/${bookingBus._id}`)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--white)', cursor: 'pointer', backdropFilter: 'blur(10px)', flexShrink: 0 }}
              aria-label="Go Back"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            </button>
            <h1 className="dashboard-title" style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700, letterSpacing: '0.5px' }}>Book Seat</h1>
          </div>
          <button 
            onClick={() => navigate('/dashboard')} 
            style={{ background: 'transparent', border: 'none', color: '#ff6b6b', fontSize: '0.9rem', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', padding: '8px' }}
          >
            ✕ Cancel
          </button>
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

        <div style={{ width: '100%', background: 'rgba(10,10,10,0.8)', border: '1px solid rgba(212,175,55,0.2)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div className="booking-modal-header" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '20px 24px', background: 'rgba(255,255,255,0.02)' }}>
            <h2 style={{ margin: '0 0 5px 0', fontSize: '1.2rem', color: 'var(--white)' }}>{bookingBus.busNumber}</h2>
            <p style={{ margin: 0, color: 'var(--gold)', fontSize: '0.9rem' }}>{bookingBus.source} to {bookingBus.destination}</p>
          </div>

          <div style={{ padding: '24px' }}>
            <div className="booking-route-confirm">
              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--white-muted)', fontSize: '0.85rem', fontWeight: 'bold', textTransform: 'uppercase' }}>Boarding From</label>
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
                      setPickingMode('boarding');
                    }}
                    title="Pick custom boarding point"
                  >
                    📍
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--white-muted)', fontSize: '0.85rem', fontWeight: 'bold', textTransform: 'uppercase' }}>Destination</label>
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
                      setPickingMode('dropping');
                    }}
                    title="Pick custom drop point"
                  >
                    📍
                  </button>
                </div>
              </div>
            </div>

            <div className="passengers-section" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '24px' }}>
              <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', alignItems: 'center' }}>
                <h3 style={{ margin: 0, color: 'var(--gold)' }}>Passenger Details</h3>
                <button className="btn-add-passenger" onClick={addPassenger}>+ Add Person</button>
              </div>
              {bookingDetails.passengers.map((p, idx) => (
                <div key={idx} className="passenger-row" style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '8px', marginBottom: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div className="passenger-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '0.8rem', color: 'var(--white-muted)', textTransform: 'uppercase', fontWeight: 'bold' }}>
                    <span>Passenger #{idx + 1}</span>
                    {idx > 0 && <button style={{ background: 'none', border: 'none', color: '#ff6b6b', cursor: 'pointer' }} onClick={() => removePassenger(idx)}>✕ Remove</button>}
                  </div>
                  <div className="passenger-inputs" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
                    <input 
                      type="text" 
                      placeholder="Full Name" 
                      className="form-input"
                      value={p.name} 
                      onChange={(e) => handlePassengerChange(idx, 'name', e.target.value)}
                    />
                    <input 
                      type="number" 
                      placeholder="Age"
                      className="form-input"
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
                      className="form-input"
                      value={p.contact} 
                      onChange={(e) => handlePassengerChange(idx, 'contact', e.target.value)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="booking-modal-footer" style={{ borderTop: '1px solid rgba(212,175,55,0.2)', padding: '20px 24px', background: 'rgba(212,175,55,0.03)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="fare-summary" style={{ display: 'flex', flexDirection: 'column' }}>
              <span className="fare-label" style={{ fontSize: '0.8rem', color: 'var(--white-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Total Fare</span>
              <span className="fare-value" style={{ fontSize: calculatingFare ? '1.2rem' : '1.8rem', color: 'var(--gold)', fontWeight: 900, opacity: calculatingFare ? 0.6 : 1 }}>
                  {calculatingFare ? 'Calculating...' : `₹${calculateFare()}`}
              </span>
              <small className="fare-note" style={{ fontSize: '0.75rem', color: 'var(--white-faint)', marginTop: '4px' }}>
                Distance: {distanceKm}km • {bookingDetails.seats} Person(s)
              </small>
            </div>
            <button className="btn-primary confirm-btn" style={{ padding: '14px 28px', fontSize: '1.1rem' }} onClick={confirmBooking} disabled={calculatingFare}>
              Confirm Booking
            </button>
          </div>
        </div>

        {/* Map Modal for Picking Point */}
        <AnimatePresence>
          {(pickingMode) && (
            <motion.div 
              className="map-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={(e) => {
                if (e.target.className === 'map-overlay') setPickingMode(null);
              }}
            >
              <div className="map-modal-container">
                <div className="map-modal-header">
                  <h3>
                    {pickingMode === 'boarding' ? 'Select Boarding Point' : 'Select Drop Point'}
                  </h3>
                  <button className="btn-close-map" onClick={() => setPickingMode(null)}>✕</button>
                </div>
                <div className="map-picker-prompt">
                  📍 Click anywhere on the map along the route to select your point.
                </div>
                <BusMap 
                  buses={[bookingBus]} 
                  selectedBus={bookingBus} 
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
              </div>
            </motion.div>
          )}

          {/* Ticket Modal displayed after successful booking */}
          {showTicket && (
            <Ticket 
              ride={selectedRideForTicket} 
              user={user} 
              onClose={() => {
                setShowTicket(false);
                navigate('/dashboard'); // Once view ends, send to rides dashboard
              }} 
              onPrint={() => window.print()}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default BookingPage;
