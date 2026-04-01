import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiPlus, FiCheck, FiX, FiMapPin, FiTrash2, FiUpload, FiNavigation } from 'react-icons/fi';
import { busService } from '../../services/dataService';
import { socketService } from '../../services/socketService';

const item = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22,1,0.36,1] } } };

const ConductorScreen = ({ user }) => {
  const [buses, setBuses] = useState([]);
  const [selectedBus, setSelectedBus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ busNumber: '', source: '', destination: '', totalSeats: '' });
  const [liveTracking, setLiveTracking] = useState({});
  const watchRefs = useRef({});

  useEffect(() => {
    fetchBuses();
    socketService.connect();
    socketService.onBusUpdate(data => {
      setBuses(p => {
        const idx = p.findIndex(b => b._id === data._id);
        if (idx !== -1) return p.map((b, i) => i === idx ? { ...b, ...data } : b);
        const myId = user?._id;
        if ((data.conductorId?._id || data.conductorId) === myId) return [data, ...p];
        return p;
      });
    });
    return () => socketService.removeAllListeners();
  }, []);

  const fetchBuses = async () => {
    try {
      setLoading(true);
      const data = await busService.getAll();
      // Use prop user ID or fallback to localStorage (matches original app logic)
      const storageUser = JSON.parse(localStorage.getItem('smartbus_user') || '{}');
      const myId = user?._id || storageUser._id;
      
      const mine = data.filter(b => (b.conductorId?._id || b.conductorId) === myId);
      setBuses(mine);
      if (mine.length > 0) setSelectedBus(mine[0]);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(''), 2500); };

  const handleCreate = async () => {
    try {
      await busService.create({ ...createForm, totalSeats: Number(createForm.totalSeats) });
      flash('Bus created! 🚌');
      setShowCreate(false);
      setCreateForm({ busNumber: '', source: '', destination: '', totalSeats: '' });
      fetchBuses();
    } catch (e) { flash(e.response?.data?.message || 'Create failed'); }
  };

  const toggleTrip = async () => {
    if (!selectedBus) return;
    try {
      const updated = selectedBus.isActive
        ? await busService.endTrip(selectedBus._id)
        : await busService.startTrip(selectedBus._id);
      setSelectedBus(prev => ({ ...prev, ...updated }));
      setBuses(p => p.map(b => b._id === updated._id ? { ...b, ...updated } : b));
      flash(updated.isActive ? 'Trip started! 🟢' : 'Trip ended 🔴');
    } catch (e) { flash('Toggle failed'); }
  };

  const startTracking = (busId) => {
    if (watchRefs.current[busId]) return;
    setLiveTracking(p => ({ ...p, [busId]: true }));
    watchRefs.current[busId] = navigator.geolocation.watchPosition(
      pos => busService.updateLocation(busId, pos.coords.latitude, pos.coords.longitude).catch(() => {}),
      () => {}, { enableHighAccuracy: true, maximumAge: 3000 }
    );
    flash('GPS tracking active 📡');
  };

  const stopTracking = (busId) => {
    if (watchRefs.current[busId]) {
      navigator.geolocation.clearWatch(watchRefs.current[busId]);
      delete watchRefs.current[busId];
    }
    setLiveTracking(p => ({ ...p, [busId]: false }));
    flash('GPS tracking stopped');
  };

  const updateSeats = async (delta) => {
    if (!selectedBus) return;
    const newVal = Math.max(0, Math.min(selectedBus.totalSeats, selectedBus.availableSeats + delta));
    try {
      await busService.updateSeats(selectedBus._id, newVal);
      setSelectedBus(p => ({ ...p, availableSeats: newVal }));
    } catch (e) { flash('Seat update failed'); }
  };

  const deleteBus = async (busId) => {
    try {
      await busService.delete(busId);
      setBuses(p => p.filter(b => b._id !== busId));
      if (selectedBus?._id === busId) setSelectedBus(null);
      flash('Bus deleted');
    } catch (e) { flash('Delete failed'); }
  };

  if (loading) return <div className="m-loading"><div className="m-spinner" /><span className="m-label">Loading fleet...</span></div>;

  return (
    <div className="mobile-screen">
      <div className="m-conductor-header">
        <div>
          <h1 className="m-heading">Fleet</h1>
          <p className="m-label m-mt-4">{user?.name}</p>
        </div>
        <button className="m-btn-icon" onClick={() => setShowCreate(true)}><FiPlus /></button>
      </div>

      {/* Bus selector chips */}
      <div className="m-conductor-bus-select m-mb-16 m-no-scroll">
        {buses.map(bus => (
          <div key={bus._id}
            className={`m-conductor-bus-chip ${selectedBus?._id === bus._id ? 'active' : ''}`}
            onClick={() => setSelectedBus(bus)}>
            {bus.busNumber}
          </div>
        ))}
      </div>

      {/* Selected Bus Control Panel */}
      {selectedBus && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="m-card m-mb-16">
          <div className="m-flex m-flex-between m-items-start m-mb-16">
            <div>
              <div className="m-label">Current Vehicle</div>
              <div className="m-heading m-mt-4" style={{ fontSize: 20 }}>{selectedBus.busNumber}</div>
              <div className="m-text-sm m-text-muted m-mt-4">{selectedBus.source} → {selectedBus.destination}</div>
            </div>
            <span className={`m-badge ${selectedBus.isActive ? 'm-badge-success' : 'm-badge-danger'}`}>
              {selectedBus.isActive ? 'ACTIVE' : 'OFFLINE'}
            </span>
          </div>

          {/* Seat Controls */}
          <div className="m-flex m-gap-8 m-mb-16">
            <div className="m-card-flat" style={{ flex: 1, textAlign: 'center' }}>
              <div className="m-label">Available</div>
              <div className="m-stat-value m-mt-4">{selectedBus.availableSeats}</div>
            </div>
            <div className="m-card-flat" style={{ flex: 1, textAlign: 'center' }}>
              <div className="m-label">Total</div>
              <div className="m-stat-value m-mt-4">{selectedBus.totalSeats}</div>
            </div>
          </div>

          <div className="m-flex m-gap-8 m-mb-12">
            <button className="m-btn m-btn-ghost m-btn-small" onClick={() => updateSeats(-1)}>− Seat</button>
            <button className="m-btn m-btn-ghost m-btn-small" onClick={() => updateSeats(1)}>+ Seat</button>
          </div>

          {/* Actions */}
          <div className="m-flex m-flex-col m-gap-8">
            <button className={`m-btn ${selectedBus.isActive ? 'm-btn-dark' : 'm-btn-lemon'}`} onClick={toggleTrip}>
              {selectedBus.isActive ? <><FiX /> End Trip</> : <><FiCheck /> Start Trip</>}
            </button>
            <div className="m-flex m-gap-8">
              <button className="m-btn m-btn-ghost m-btn-small" style={{ flex: 1 }}
                onClick={() => liveTracking[selectedBus._id] ? stopTracking(selectedBus._id) : startTracking(selectedBus._id)}>
                <FiNavigation /> {liveTracking[selectedBus._id] ? 'Stop GPS' : 'Start GPS'}
              </button>
              <button className="m-btn m-btn-ghost m-btn-small" onClick={() => deleteBus(selectedBus._id)}
                style={{ color: '#DC2626', borderColor: 'rgba(220,38,38,0.2)' }}>
                <FiTrash2 />
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {buses.length === 0 && !showCreate && (
        <div className="m-empty m-mt-24">
          <div className="m-empty-emoji">🚌</div>
          <p className="m-text m-text-muted m-mt-8">No buses yet. Add your first vehicle!</p>
          <button className="m-btn m-btn-lemon m-mt-16" onClick={() => setShowCreate(true)}>
            <FiPlus /> Add Bus
          </button>
        </div>
      )}

      {/* Toast */}
      <AnimatePresence>
        {msg && (
          <motion.div className="m-toast" initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}>
            {msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Bus Sheet */}
      <AnimatePresence>
        {showCreate && (
          <div className="m-overlay" onClick={() => setShowCreate(false)}>
            <motion.div className="m-sheet" onClick={e => e.stopPropagation()}
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}>
              <div className="m-sheet-handle" />
              <h2 className="m-heading m-mb-4" style={{ fontSize: 22 }}>Add Vehicle</h2>
              <p className="m-label m-mb-24">Enter your bus details</p>
              <div className="m-flex m-flex-col m-gap-12">
                <input className="m-input" placeholder="Bus Number (e.g. MH12AB1234)" value={createForm.busNumber}
                  onChange={e => setCreateForm(p => ({ ...p, busNumber: e.target.value }))} />
                <input className="m-input" placeholder="Source City" value={createForm.source}
                  onChange={e => setCreateForm(p => ({ ...p, source: e.target.value }))} />
                <input className="m-input" placeholder="Destination City" value={createForm.destination}
                  onChange={e => setCreateForm(p => ({ ...p, destination: e.target.value }))} />
                <input className="m-input" placeholder="Total Seats" type="number" value={createForm.totalSeats}
                  onChange={e => setCreateForm(p => ({ ...p, totalSeats: e.target.value }))} />
                <button className="m-btn m-btn-lemon m-mt-8" onClick={handleCreate}>Create Bus</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ConductorScreen;
