import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiArrowLeft, FiPlus, FiTrash2, FiMapPin, FiNavigation, FiUser } from 'react-icons/fi';
import { busService, rideService } from '../../services/dataService';
import { useSocket } from '../../hooks/useSocket';
import BusMap from '../../components/BusMap';
import Ticket from '../../components/Ticket';

const BookingScreen = ({ user }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [bus, setBus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  
  const [bookingDetails, setBookingDetails] = useState({
    boarding: '',
    dropping: '',
    passengers: [{ name: user?.name || '', age: user?.age || '', gender: user?.gender || '', contact: user?.phone || '' }]
  });

  const [distanceKm, setDistanceKm] = useState(0);
  const [calculatingFare, setCalculatingFare] = useState(false);
  const [pickingMode, setPickingMode] = useState(null); 
  const [showTicket, setShowTicket] = useState(false);
  const [bookedRide, setBookedRide] = useState(null);

  const { busUpdates, newBooking } = useSocket();

  useEffect(() => {
    busService.getById(id).then(data => {
      setBus(data);
      setBookingDetails(prev => ({
        ...prev,
        boarding: data.source,
        dropping: data.destination
      }));
    }).catch(console.error).finally(() => setLoading(false));
  }, [id]);

  // Real-time bus updates
  useEffect(() => {
    if (busUpdates && bus?._id === busUpdates._id) {
      setBus(prev => prev ? { ...prev, ...busUpdates } : null);
    }
  }, [busUpdates, bus]);

  useEffect(() => {
    if (newBooking) {
      const busId = newBooking.busId?._id || newBooking.busId;
      if (bus?._id === busId) {
        setBus(prev => prev ? { ...prev, availableSeats: Math.max(0, prev.availableSeats - (newBooking.numberOfSeats || 1)) } : null);
      }
    }
  }, [newBooking, bus]);

  useEffect(() => {
    let isMounted = true;
    const fetchDistance = async () => {
      if (!bus || !bookingDetails.boarding || !bookingDetails.dropping) {
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

          const point = bus.routePoints?.find(p => p.name === placeName);
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
             const stops = [bus.source, ...(bus.routePoints?.map(p => p.name) || []), bus.destination];
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
  }, [bus, bookingDetails.boarding, bookingDetails.dropping]);

  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(''), 3000); };

  const handleMapClick = useCallback(async (latlng) => {
    if (!pickingMode) return;
    try {
      setCalculatingFare(true);
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latlng.lat}&lon=${latlng.lng}`);
      const data = await res.json();
      const addr = data.display_name.split(',');
      const name = (addr[0] || 'Unknown') + ', ' + (addr[1] || '');
      
      setBookingDetails(prev => ({
        ...prev,
        [pickingMode]: `${name} (${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)})`
      }));
      
      setPickingMode(null);
      flash(`Selected ${pickingMode} point! 📍`);
    } catch (err) {
      console.error("Map picking failed", err);
    } finally {
      setCalculatingFare(false);
    }
  }, [pickingMode]);

  const calculateFare = () => {
    if (!bus) return 0;
    const rate = 2; 
    return Math.round(distanceKm * rate * bookingDetails.passengers.length);
  };

  const confirmBooking = async () => {
    if (bookingDetails.passengers.some(p => !p.name)) return flash('Please enter passenger names');
    try {
      setLoading(true);
      const res = await rideService.book({
        busId: bus._id,
        numberOfSeats: bookingDetails.passengers.length,
        passengers: bookingDetails.passengers,
        boardingPoint: bookingDetails.boarding,
        droppingPoint: bookingDetails.dropping,
        totalFare: calculateFare()
      });
      setBookedRide(res);
      setShowTicket(true);
      flash('Ticket Generated! 🎟️');
    } catch (err) {
      flash(err.response?.data?.message || 'Booking failed');
    } finally {
      setLoading(false);
    }
  };

  const handlePassengerChange = (idx, field, val) => {
    const updated = [...bookingDetails.passengers];
    updated[idx][field] = val;
    setBookingDetails(prev => ({ ...prev, passengers: updated }));
  };

  const addPassenger = () => {
    if (bookingDetails.passengers.length >= bus.availableSeats) return flash('No more seats available');
    setBookingDetails(prev => ({
      ...prev,
      passengers: [...prev.passengers, { name: '', age: '', gender: '', contact: '' }]
    }));
  };

  const removePassenger = (idx) => {
    if (bookingDetails.passengers.length <= 1) return;
    setBookingDetails(prev => ({
      ...prev,
      passengers: prev.passengers.filter((_, i) => i !== idx)
    }));
  };

  if (loading && !bus) return <div className="m-loading"><div className="m-spinner" /><span className="m-label">Fetching Details...</span></div>;
  if (!bus) return <div className="mobile-screen"><p className="m-text m-text-center">Bus not found</p></div>;

  return (
    <div className="mobile-screen m-booking-screen">
      {/* Header */}
      <div className="m-flex m-items-center m-gap-16 m-mb-24">
        <button className="m-btn-icon" onClick={() => navigate(-1)}><FiArrowLeft /></button>
        <div style={{ flex: 1 }}>
          <div className="m-heading" style={{ fontSize: 20 }}>Book Tickets</div>
          <div className="m-label">{bus.busNumber} • {bus.source} → {bus.destination}</div>
        </div>
        <div className="m-flex m-flex-col m-items-center" style={{ textAlign: 'center' }}>
          <span className={`m-badge ${bus.isActive ? 'm-badge-success' : 'm-badge-danger'}`} style={{ fontSize: 8 }}>
            {bus.isActive ? 'LIVE' : 'OFFLINE'}
          </span>
          <span className="m-text-sm m-text-muted m-mt-4">
            <FiUser size={10} /> {bus.availableSeats}/{bus.totalSeats}
          </span>
        </div>
      </div>

      {/* Route Map Preview */}
      <div className="m-card m-mb-20" style={{ padding: 0, height: 140, borderRadius: 'var(--m-radius)', overflow: 'hidden' }}>
        <BusMap buses={[bus]} interactive={false} height="100%" />
      </div>

      {/* Boarding/Dropping Selection */}
      <div className="m-card m-mb-20">
        <label className="m-label m-mb-8">Boarding From</label>
        <div className="m-flex m-gap-8 m-mb-16">
          <select 
            className="m-input" 
            style={{ flex: 1 }}
            value={bookingDetails.boarding} 
            onChange={(e) => setBookingDetails(prev => ({ ...prev, boarding: e.target.value }))}
          >
            <option value={bus.source}>{bus.source} (Start)</option>
            {bus.routePoints?.map((p, i) => <option key={i} value={p.name}>{p.name}</option>)}
            {bookingDetails.boarding.includes('(') && <option value={bookingDetails.boarding}>📍 Custom Point</option>}
          </select>
          <button className="m-btn-icon" onClick={() => setPickingMode('boarding')}
            style={{ background: pickingMode === 'boarding' ? 'var(--m-lemon)' : undefined }}>
            <FiMapPin />
          </button>
        </div>

        <label className="m-label m-mb-8">Dropping At</label>
        <div className="m-flex m-gap-8">
          <select 
            className="m-input" 
            style={{ flex: 1 }}
            value={bookingDetails.dropping} 
            onChange={(e) => setBookingDetails(prev => ({ ...prev, dropping: e.target.value }))}
          >
            {bus.routePoints?.map((p, i) => <option key={i} value={p.name}>{p.name}</option>)}
            <option value={bus.destination}>{bus.destination} (End)</option>
            {bookingDetails.dropping.includes('(') && <option value={bookingDetails.dropping}>📍 Custom Point</option>}
          </select>
          <button className="m-btn-icon" onClick={() => setPickingMode('dropping')}
            style={{ background: pickingMode === 'dropping' ? 'var(--m-lemon)' : undefined }}>
            <FiMapPin />
          </button>
        </div>
      </div>

      {/* Fare Summary Card */}
      <div className="m-card m-mb-20">
        <div className="m-flex m-flex-between m-items-center">
          <div>
            <div className="m-label">Estimated Fare</div>
            <div className="m-stat-value m-mt-4" style={{ color: 'var(--m-dark)' }}>
              {calculatingFare ? 'Calculating...' : `₹${calculateFare()}`}
            </div>
          </div>
          <div className="m-flex m-flex-col m-items-center" style={{ textAlign: 'right' }}>
            <span className="m-text-sm m-text-muted">{distanceKm} km</span>
            <span className="m-text-sm m-text-muted">{bookingDetails.passengers.length} Person(s)</span>
            <span className="m-text-sm m-text-muted">₹2/km rate</span>
          </div>
        </div>
      </div>

      {/* Passengers */}
      <div className="m-flex m-flex-between m-items-center m-mb-12">
        <div className="m-subheading">Passenger Details</div>
        <button className="m-btn m-btn-small m-btn-lemon" style={{ width: 'auto' }} onClick={addPassenger}><FiPlus /> Add</button>
      </div>

      {bookingDetails.passengers.map((p, idx) => (
        <div key={idx} className="m-card-flat m-mb-12">
          <div className="m-flex m-flex-between m-items-center m-mb-12">
            <span className="m-label">Passenger #{idx + 1}</span>
            {idx > 0 && <button style={{ background: 'none', border: 'none', color: 'var(--m-danger)', fontSize: 18 }} onClick={() => removePassenger(idx)}><FiTrash2 /></button>}
          </div>
          <div className="m-flex m-flex-col m-gap-8">
            <input className="m-input" placeholder="Full Name" value={p.name} onChange={(e) => handlePassengerChange(idx, 'name', e.target.value)} />
            <div className="m-flex m-gap-8">
              <input className="m-input" type="number" placeholder="Age" style={{ flex: 1 }} value={p.age} onChange={(e) => handlePassengerChange(idx, 'age', e.target.value)} />
              <select className="m-input" style={{ flex: 1 }} value={p.gender} onChange={(e) => handlePassengerChange(idx, 'gender', e.target.value)}>
                <option value="">Gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <input className="m-input" placeholder="Contact Number" value={p.contact} onChange={(e) => handlePassengerChange(idx, 'contact', e.target.value)} />
          </div>
        </div>
      ))}

      {/* Confirm Button — Fixed at bottom but not overlapping nav */}
      <div className="m-booking-footer">
        <div className="m-flex m-flex-between m-items-center" style={{ width: '100%' }}>
          <div>
            <div className="m-label">Total Fare</div>
            <div className="m-stat-value" style={{ color: 'var(--m-dark)', fontSize: 20 }}>
              {calculatingFare ? '...' : `₹${calculateFare()}`}
            </div>
          </div>
          <div className="m-text-sm m-text-muted">
            {distanceKm}km • {bookingDetails.passengers.length} Person(s)
          </div>
        </div>
        <button className="m-btn m-btn-lemon" onClick={confirmBooking} disabled={loading || calculatingFare}>
          {loading ? 'Processing...' : 'Confirm & Pay'}
        </button>
      </div>

      {/* Map Overlay for Selecting Points */}
      <AnimatePresence>
        {pickingMode && (
          <motion.div className="m-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="m-sheet" onClick={e => e.stopPropagation()}
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}>
              <div className="m-sheet-handle" />
              <div className="m-flex m-flex-between m-items-center m-mb-16">
                <div className="m-heading" style={{ fontSize: 18 }}>Select {pickingMode === 'boarding' ? 'Boarding' : 'Drop'} Point</div>
                <button className="m-btn-icon" onClick={() => setPickingMode(null)}>✕</button>
              </div>
              <p className="m-text-sm m-text-muted m-mb-16">📍 Tap anywhere along the route on the map</p>
              <div style={{ height: 350, borderRadius: 20, overflow: 'hidden' }}>
                <BusMap 
                  buses={[bus]} 
                  selectedBus={bus} 
                  height="100%" 
                  onMapClick={handleMapClick}
                  onMapError={flash}
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
              <button className="m-btn m-btn-dark m-mt-16" onClick={() => setPickingMode(null)}>Cancel</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ticket Result */}
      {showTicket && bookedRide && (
        <Ticket ride={bookedRide} user={user} onClose={() => { setShowTicket(false); navigate('/activity'); }} />
      )}

      {/* Toast */}
      <AnimatePresence>
        {msg && (
          <motion.div className="m-toast" initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}>
            {msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default BookingScreen;
