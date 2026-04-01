import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiArrowLeft, FiStar, FiUser, FiMapPin, FiCheck } from 'react-icons/fi';
import { busService, rideService } from '../../services/dataService';
import BusMap from '../../components/BusMap';
import Ticket from '../../components/Ticket';

const BusDetailScreen = ({ user }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [bus, setBus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [seats, setSeats] = useState(1);
  const [booking, setBooking] = useState(false);
  const [msg, setMsg] = useState('');
  const [bookedRide, setBookedRide] = useState(null);
  const [showTicket, setShowTicket] = useState(false);
  const [ratingInput, setRatingInput] = useState(0);
  const [reviewInput, setReviewInput] = useState('');

  useEffect(() => {
    busService.getById(id).then(setBus).catch(console.error).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (bus && user) {
      const existing = bus.ratings?.find(r => (r.userId?._id || r.userId) === user._id);
      if (existing) { setRatingInput(existing.rating); setReviewInput(existing.review || ''); }
    }
  }, [bus, user]);

  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(''), 3000); };

  const handleBook = async () => {
    try {
      setBooking(true);
      const fare = 50 * seats;
      const res = await rideService.book({
        busId: bus._id, numberOfSeats: seats,
        boardingPoint: bus.source, droppingPoint: bus.destination, totalFare: fare,
      });
      setBookedRide(res);
      setShowTicket(true);
      flash('Booked! 🎟️');
    } catch (e) { flash(e.response?.data?.message || 'Booking failed'); }
    finally { setBooking(false); }
  };

  const handleRate = async () => {
    if (ratingInput < 1) return flash('Select at least 1 star');
    try {
      const res = await busService.rateBus(bus._id, ratingInput, reviewInput);
      setBus(prev => ({ ...prev, ratings: res.ratings, avgRating: res.avgRating }));
      flash('Review submitted! ⭐');
    } catch (e) { flash('Review failed'); }
  };

  if (loading) return <div className="m-loading"><div className="m-spinner" /><span className="m-label">Loading...</span></div>;
  if (!bus) return <div className="mobile-screen"><p className="m-text m-text-muted m-text-center">Bus not found</p></div>;

  return (
    <div className="mobile-screen" style={{ paddingBottom: 24 }}>
      <button className="m-btn-icon m-mb-16" onClick={() => navigate(-1)}><FiArrowLeft /></button>

      {/* Route Header */}
      <div className="m-mb-8">
        <div className="m-flex m-flex-between m-items-start">
          <div>
            <div className="m-heading" style={{ fontSize: 26 }}>{bus.source}</div>
            <div className="m-text-sm m-text-muted m-mt-4">→</div>
            <div className="m-heading" style={{ fontSize: 26 }}>{bus.destination}</div>
          </div>
          <span className="m-badge m-badge-lemon">{bus.busNumber}</span>
        </div>
        <div className="m-flex m-gap-12 m-mt-12">
          <span className="m-bus-meta-item"><FiStar style={{ color: 'var(--m-lemon-dark)' }} /> {bus.avgRating?.toFixed(1) || 'NEW'}</span>
          <span className="m-bus-meta-item"><FiUser /> {bus.availableSeats}/{bus.totalSeats} seats</span>
          {bus.isActive && <span className="m-badge m-badge-success" style={{ fontSize: 8 }}>LIVE</span>}
        </div>
      </div>

      {/* Map */}
      <div className="m-card m-mb-16" style={{ padding: 0, height: 180, borderRadius: 'var(--m-radius)', overflow: 'hidden' }}>
        <BusMap buses={[bus]} interactive={false} />
      </div>

      {/* Bus Images */}
      {bus.images?.length > 0 && (
        <div className="m-flex m-gap-8 m-mb-16 m-no-scroll" style={{ overflowX: 'auto' }}>
          {bus.images.map((img, i) => (
            <img key={i} src={img} alt="" style={{ width: 120, height: 80, objectFit: 'cover', borderRadius: 12, flexShrink: 0 }} />
          ))}
        </div>
      )}

      {/* Quick Stats */}
      <div className="m-stats-grid m-mb-16">
        <div className="m-card-flat m-text-center">
          <div className="m-label">Type</div>
          <div className="m-text m-mt-4" style={{ fontWeight: 800 }}>{bus.type || 'Standard'}</div>
        </div>
        <div className="m-card-flat m-text-center">
          <div className="m-label">Departure</div>
          <div className="m-text m-mt-4" style={{ fontWeight: 800 }}>{bus.departureTime || 'TBA'}</div>
        </div>
      </div>

      {/* Booking Section */}
      <div className="m-card m-mb-16">
        <div className="m-label m-mb-12">Ride Reservation</div>
        <p className="m-text-sm m-text-muted m-mb-16">Select your boarding point, destination, and add passenger details in the next step.</p>
        <button 
          className="m-btn m-btn-lemon" 
          onClick={() => navigate(`/book/${bus._id}`)} 
          disabled={bus.availableSeats === 0}
        >
          {bus.availableSeats === 0 ? 'Sold Out' : <><FiCheck /> Reserve Your Seat</>}
        </button>
      </div>

      {/* Reviews */}
      <div className="m-card m-mb-16">
        <div className="m-label m-mb-12">Rate This Bus</div>
        <div className="m-flex m-gap-4 m-mb-12">
          {[1,2,3,4,5].map(star => (
            <button key={star} onClick={() => setRatingInput(star)}
              style={{ background: 'none', border: 'none', fontSize: 28, cursor: 'pointer', padding: 2,
                       filter: star <= ratingInput ? 'none' : 'grayscale(1) opacity(0.3)' }}>
              ⭐
            </button>
          ))}
        </div>
        <input className="m-input m-mb-12" placeholder="Write a review (optional)" value={reviewInput}
          onChange={e => setReviewInput(e.target.value)} />
        <button className="m-btn m-btn-dark m-btn-small" onClick={handleRate}>Submit Review</button>
      </div>

      {/* Reviews List */}
      {bus.ratings?.length > 0 && (
        <div className="m-flex m-flex-col m-gap-8">
          <div className="m-label m-mb-4">Reviews ({bus.ratings.length})</div>
          {bus.ratings.slice(0, 5).map((r, i) => (
            <div key={i} className="m-card-flat">
              <div className="m-flex m-flex-between m-items-center m-mb-4">
                <span className="m-text-sm" style={{ fontWeight: 800 }}>{r.userId?.name || 'User'}</span>
                <span className="m-text-sm m-text-muted">{'⭐'.repeat(r.rating)}</span>
              </div>
              {r.review && <p className="m-text-sm m-text-muted">{r.review}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Toast */}
      <AnimatePresence>
        {msg && (
          <motion.div className="m-toast" style={{ bottom: 20 }} initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}>
            {msg}
          </motion.div>
        )}
      </AnimatePresence>

      {showTicket && bookedRide && <Ticket ride={bookedRide} user={user} onClose={() => setShowTicket(false)} />}
    </div>
  );
};

export default BusDetailScreen;
