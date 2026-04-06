import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiClock, FiMapPin } from 'react-icons/fi';
import { rideService } from '../../services/dataService';
import Ticket from '../../components/Ticket';

const item = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22,1,0.36,1] } } };

const ActivityScreen = ({ user }) => {
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRide, setSelectedRide] = useState(null);

  useEffect(() => {
    rideService.getHistory().then(setRides).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="m-loading"><div className="m-spinner" /><span className="m-label">Loading rides...</span></div>;

  return (
    <div className="mobile-screen">
      <h1 className="m-heading m-mb-8">My Rides</h1>
      <p className="m-label m-mb-24">Your booking history</p>

      {rides.length === 0 ? (
        <div className="m-empty">
          <div className="m-empty-emoji">🎟️</div>
          <p className="m-text m-text-muted m-mt-8">No rides yet. Book your first trip!</p>
        </div>
      ) : (
        <motion.div className="m-flex m-flex-col m-gap-12" initial="hidden" animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.06 } } }}>
          {rides.map(ride => (
            <motion.div key={ride._id} variants={item} className="m-card m-gpu" style={{ padding: 0 }}
              onClick={() => setSelectedRide(ride)}>
              <div className="m-ride-card">
                <div className="m-ride-left">
                  <div className="m-ride-icon">🎟️</div>
                  <div style={{ minWidth: 0 }}>
                    <div className="m-text m-truncate" style={{ fontWeight: 800 }}>
                      {ride.busId?.source || '??'} → {ride.busId?.destination || '??'}
                    </div>
                    <div className="m-label m-mt-4">
                      {new Date(ride.createdAt).toLocaleDateString()} • ₹{ride.fare || 0} • {ride.numberOfSeats} seat{ride.numberOfSeats > 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
                <span className={`m-badge ${ride.status === 'booked' ? 'm-badge-lemon' : ride.status === 'cancelled' ? 'm-badge-danger' : 'm-badge-success'}`}>
                  {ride.status}
                </span>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {selectedRide && (
        <Ticket ride={selectedRide} user={user} onClose={() => setSelectedRide(null)} />
      )}
    </div>
  );
};

export default ActivityScreen;
