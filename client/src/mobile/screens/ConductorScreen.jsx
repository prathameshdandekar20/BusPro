import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiPlus, FiCheck, FiX, FiMapPin, FiTrash2, FiUpload, FiNavigation, FiCamera, FiStar, FiMessageSquare, FiUsers, FiChevronDown } from 'react-icons/fi';
import { busService, rideService } from '../../services/dataService';
import { socketService } from '../../services/socketService';
import BusMap from '../../components/BusMap';

const item = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22,1,0.36,1] } } };

const ConductorScreen = ({ user }) => {
  const [buses, setBuses] = useState([]);
  const [rides, setRides] = useState([]);
  const [selectedBus, setSelectedBus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ busNumber: '', source: '', destination: '', totalSeats: '', route: '' });
  const [liveTracking, setLiveTracking] = useState({});
  const [activeTab, setActiveTab] = useState('fleet'); // fleet | bookings | reviews
  const [routeInput, setRouteInput] = useState({});
  const [showMapSelector, setShowMapSelector] = useState(null); // bus object
  const [uploadProgress, setUploadProgress] = useState({});
  const [replyInput, setReplyInput] = useState({});
  const [expandedBus, setExpandedBus] = useState(null);
  const watchRefs = useRef({});
  const fileInputRefs = useRef({});

  useEffect(() => {
    fetchData();
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
    socketService.onNewBooking((ride) => {
      const busId = ride.busId?._id || ride.busId;
      setRides(prev => [ride, ...(prev || [])]);
      flash('🎉 New booking received!');
      setBuses(prev => prev.map(b => b._id === busId
        ? { ...b, availableSeats: Math.max(0, b.availableSeats - (ride.numberOfSeats || 1)) }
        : b
      ));
    });
    return () => {
      socketService.removeAllListeners();
      Object.values(watchRefs.current).forEach(id => navigator.geolocation.clearWatch(id));
    };
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const storageUser = JSON.parse(localStorage.getItem('smartbus_user') || '{}');
      const myId = user?._id || storageUser._id;

      const [busData, rideData] = await Promise.all([
        busService.getAll().catch(() => []),
        rideService.getHistory().catch(() => [])
      ]);

      const mine = busData.filter(b => (b.conductorId?._id || b.conductorId) === myId);
      setBuses(mine);
      setRides(rideData);
      // Keep selectedBus in sync with fresh data
      if (mine.length > 0) {
        setSelectedBus(prev => {
          if (!prev) return mine[0];
          const refreshed = mine.find(b => b._id === prev._id);
          return refreshed || mine[0];
        });
      } else {
        setSelectedBus(null);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(''), 3000); };

  // ── Create Bus ──
  const handleCreate = async () => {
    try {
      await busService.create({ ...createForm, totalSeats: Number(createForm.totalSeats) });
      flash('Bus created! 🚌');
      setShowCreate(false);
      setCreateForm({ busNumber: '', source: '', destination: '', totalSeats: '', route: '' });
      fetchData();
    } catch (e) { flash(e.response?.data?.message || 'Create failed'); }
  };

  // ── Trip Controls ──
  const toggleTrip = async () => {
    if (!selectedBus) return;
    try {
      const response = selectedBus.isActive
        ? await busService.endTrip(selectedBus._id)
        : await busService.startTrip(selectedBus._id);
      // API returns { message, bus } — extract the bus object
      const updated = response.bus || response;
      setSelectedBus(prev => ({ ...prev, ...updated }));
      setBuses(p => p.map(b => b._id === (updated._id || selectedBus._id) ? { ...b, ...updated } : b));
      flash(updated.isActive ? 'Trip started! 🟢' : 'Trip ended 🔴');
    } catch (e) { flash('Toggle failed'); }
  };

  // ── GPS Tracking ──
  const startTracking = (busId) => {
    if (watchRefs.current[busId]) return;
    setLiveTracking(p => ({ ...p, [busId]: true }));
    watchRefs.current[busId] = navigator.geolocation.watchPosition(
      pos => {
        busService.updateLocation(busId, pos.coords.latitude, pos.coords.longitude).catch(() => {});
        socketService.getSocket()?.emit('conductorLocationUpdate', { busId, latitude: pos.coords.latitude, longitude: pos.coords.longitude });
      },
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

  // ── Seat Management ──
  const updateSeats = async (delta) => {
    if (!selectedBus) return;
    const newVal = Math.max(0, Math.min(selectedBus.totalSeats, selectedBus.availableSeats + delta));
    try {
      await busService.updateSeats(selectedBus._id, newVal);
      socketService.getSocket()?.emit('conductorSeatUpdate', { busId: selectedBus._id, availableSeats: newVal });
      setSelectedBus(p => ({ ...p, availableSeats: newVal }));
      setBuses(p => p.map(b => b._id === selectedBus._id ? { ...b, availableSeats: newVal } : b));
    } catch (e) { flash('Seat update failed'); }
  };

  // ── Delete Bus ──
  const deleteBus = async (busId) => {
    try {
      await busService.delete(busId);
      setBuses(p => p.filter(b => b._id !== busId));
      if (selectedBus?._id === busId) setSelectedBus(null);
      flash('Bus deleted');
    } catch (e) { flash('Delete failed'); }
  };

  // ── Image Upload ──
  const processFile = async (file, busId) => {
    if (!file || !file.type.startsWith('image/')) { flash('Please select an image'); return; }
    if (file.size > 10 * 1024 * 1024) { flash('Image must be < 10MB'); return; }
    setUploadProgress(prev => ({ ...prev, [busId]: 0 }));

    const reader = new FileReader();
    reader.onload = () => {
      const img = document.createElement('img');
      img.onload = async () => {
        let finalData = reader.result;
        try {
          const MAX = 1200;
          let w = img.naturalWidth, h = img.naturalHeight;
          if (w > MAX || h > MAX) {
            const ratio = Math.min(MAX / w, MAX / h);
            w = Math.round(w * ratio); h = Math.round(h * ratio);
          }
          const canvas = document.createElement('canvas');
          canvas.width = w; canvas.height = h;
          canvas.getContext('2d').drawImage(img, 0, 0, w, h);
          finalData = canvas.toDataURL('image/jpeg', 0.75);
        } catch (e) { /* use original */ }
        try {
          await busService.updateImage(busId, finalData, (e) => {
            setUploadProgress(prev => ({ ...prev, [busId]: Math.round((e.loaded * 100) / e.total) }));
          });
          flash('Photo uploaded! 📷');
          fetchData();
        } catch (e) { flash('Upload failed'); }
        finally { setTimeout(() => setUploadProgress(p => { const c = { ...p }; delete c[busId]; return c; }), 1500); }
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  };

  const handleImageUpload = (e, busId) => processFile(e.target.files[0], busId);

  const handleDeleteImage = async (busId, index) => {
    try {
      await busService.deleteImage(busId, index);
      flash('Photo deleted');
      fetchData();
    } catch (e) { flash('Failed to delete photo'); }
  };

  // ── Route Management ──
  const handleAddRoutePoint = async (busId) => {
    const pointName = routeInput[busId];
    if (!pointName) return;
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const bus = buses.find(b => b._id === busId);
        const newPoints = [...(bus.routePoints || []), { name: pointName, latitude: pos.coords.latitude, longitude: pos.coords.longitude }];
        await busService.updateRoute(busId, newPoints);
        flash(`📍 Added ${pointName}`);
        setRouteInput(prev => ({ ...prev, [busId]: '' }));
        fetchData();
      } catch (e) { flash('Failed to add route point'); }
    });
  };

  const handleMapPointClick = async (latlng) => {
    if (!showMapSelector) return;
    const pointName = prompt('Enter name for this milestone:', 'Milestone');
    if (!pointName) return;
    try {
      const newPoints = [...(showMapSelector.routePoints || []), { name: pointName, latitude: latlng.lat, longitude: latlng.lng }];
      await busService.updateRoute(showMapSelector._id, newPoints);
      flash(`📍 Point ${pointName} added!`);
      setShowMapSelector(prev => ({ ...prev, routePoints: newPoints }));
      fetchData();
    } catch (e) { flash('Failed'); }
  };

  // ── Update Location (one-time) ──
  const handleUpdateLocation = async (busId) => {
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          await busService.updateLocation(busId, pos.coords.latitude, pos.coords.longitude);
          flash('Location updated!');
          fetchData();
        } catch (e) { flash('Failed'); }
      },
      () => flash('Location access denied')
    );
  };

  // ── Reviews ──
  const handleReplySubmit = async (busId, reviewId) => {
    const text = replyInput[reviewId];
    if (!text) return;
    try {
      await busService.replyToReview(busId, reviewId, text);
      flash('Reply posted!');
      setReplyInput(prev => ({ ...prev, [reviewId]: '' }));
      fetchData();
    } catch (e) { flash('Failed to reply'); }
  };

  const handleDeleteReview = async (busId, reviewId) => {
    try {
      await busService.deleteReview(busId, reviewId);
      flash('Review deleted');
      fetchData();
    } catch (e) { flash('Failed'); }
  };

  if (loading) return <div className="m-loading"><div className="m-spinner" /><span className="m-label">Loading fleet...</span></div>;

  return (
    <div className="mobile-screen">
      {/* Header */}
      <div className="m-conductor-header">
        <div>
          <h1 className="m-heading">Conductor</h1>
          <p className="m-label m-mt-4">{user?.name} • {buses.length} vehicle{buses.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="m-btn-icon" onClick={() => setShowCreate(true)}><FiPlus /></button>
      </div>

      {/* Tab Switcher */}
      <div className="m-tabs m-mb-16">
        {[
          { key: 'fleet', label: 'Fleet', icon: <FiNavigation size={12} /> },
          { key: 'bookings', label: 'Bookings', icon: <FiUsers size={12} /> },
          { key: 'reviews', label: 'Reviews', icon: <FiStar size={12} /> },
        ].map(t => (
          <button key={t.key} className={`m-tab ${activeTab === t.key ? 'active' : ''}`}
            onClick={() => setActiveTab(t.key)}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ═══════════ FLEET TAB ═══════════ */}
      {activeTab === 'fleet' && (
        <>
          {/* Bus selector chips */}
          <div className="m-conductor-bus-select m-mb-16 m-no-scroll">
            {buses.map(bus => (
              <div key={bus._id}
                className={`m-conductor-bus-chip ${selectedBus?._id === bus._id ? 'active' : ''}`}
                onClick={() => { setSelectedBus(bus); setExpandedBus(null); }}>
                {bus.isActive && <span style={{ marginRight: 4 }}>🟢</span>}
                {bus.busNumber}
              </div>
            ))}
          </div>

          {/* Selected Bus Control Panel */}
          {selectedBus && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              {/* Main Info Card */}
              <div className="m-card m-mb-16">
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
                    <button className="m-btn m-btn-ghost m-btn-small"
                      onClick={() => handleUpdateLocation(selectedBus._id)}>
                      <FiMapPin /> Update
                    </button>
                    <button className="m-btn m-btn-ghost m-btn-small"
                      onClick={() => deleteBus(selectedBus._id)}
                      style={{ color: '#DC2626', borderColor: 'rgba(220,38,38,0.2)' }}>
                      <FiTrash2 />
                    </button>
                  </div>
                </div>
              </div>

              {/* Photo Gallery */}
              <div className="m-card m-mb-16">
                <div className="m-flex m-flex-between m-items-center m-mb-12">
                  <div className="m-label">Bus Photos</div>
                  <button className="m-btn m-btn-ghost m-btn-small" style={{ width: 'auto' }}
                    onClick={() => fileInputRefs.current[selectedBus._id]?.click()}>
                    <FiCamera /> Add
                  </button>
                </div>
                <input type="file" accept="image/*" ref={el => fileInputRefs.current[selectedBus._id] = el}
                  style={{ display: 'none' }} onChange={(e) => handleImageUpload(e, selectedBus._id)} />

                {uploadProgress[selectedBus._id] !== undefined && (
                  <div className="m-card-flat m-mb-12">
                    <div style={{ height: 4, background: 'rgba(0,0,0,0.05)', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ width: `${uploadProgress[selectedBus._id]}%`, height: '100%', background: 'var(--m-lemon)', transition: 'width 0.3s' }} />
                    </div>
                    <div className="m-text-sm m-text-muted m-mt-4" style={{ textAlign: 'center' }}>
                      Uploading... {uploadProgress[selectedBus._id]}%
                    </div>
                  </div>
                )}

                {selectedBus.images?.length > 0 ? (
                  <div className="m-flex m-gap-8 m-no-scroll" style={{ overflowX: 'auto' }}>
                    {selectedBus.images.map((img, i) => (
                      <div key={i} style={{ position: 'relative', flexShrink: 0 }}>
                        <img src={img} alt="" style={{ width: 100, height: 70, objectFit: 'cover', borderRadius: 10 }} />
                        <button onClick={() => handleDeleteImage(selectedBus._id, i)}
                          style={{ position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: '50%', background: '#DC2626', color: '#fff', border: 'none', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="m-card-flat m-text-center" style={{ padding: 24 }}
                    onClick={() => fileInputRefs.current[selectedBus._id]?.click()}>
                    <div style={{ fontSize: 28, marginBottom: 8 }}>📸</div>
                    <div className="m-text-sm m-text-muted">Tap to upload bus photos</div>
                  </div>
                )}
              </div>

              {/* Route Management */}
              <div className="m-card m-mb-16">
                <div className="m-label m-mb-12">Route Milestones</div>
                <div className="m-flex m-gap-8 m-mb-12">
                  <input className="m-input" style={{ flex: 1 }} placeholder="e.g. MG Road Square"
                    value={routeInput[selectedBus._id] || ''}
                    onChange={e => setRouteInput(prev => ({ ...prev, [selectedBus._id]: e.target.value }))} />
                  <button className="m-btn m-btn-lemon m-btn-small" style={{ width: 'auto' }}
                    onClick={() => handleAddRoutePoint(selectedBus._id)}>Add</button>
                </div>
                <button className="m-btn m-btn-ghost m-btn-small m-mb-12"
                  onClick={() => setShowMapSelector(selectedBus)}>
                  🗺️ Mark Via Map
                </button>
                {selectedBus.routePoints?.length > 0 && (
                  <div className="m-flex m-gap-4" style={{ flexWrap: 'wrap' }}>
                    {selectedBus.routePoints.map((p, idx) => (
                      <span key={idx} className="m-badge m-badge-sky">{p.name}</span>
                    ))}
                  </div>
                )}
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
        </>
      )}

      {/* ═══════════ BOOKINGS TAB ═══════════ */}
      {activeTab === 'bookings' && (
        <div className="m-flex m-flex-col m-gap-12">
          <div className="m-label m-mb-4">Passenger Bookings ({rides.length})</div>
          {rides.length === 0 ? (
            <div className="m-empty">
              <div className="m-empty-emoji">📋</div>
              <p className="m-text m-text-muted m-mt-8">No bookings yet</p>
            </div>
          ) : (
            rides.map(ride => (
              <div key={ride._id} className="m-card" style={{ padding: 14 }}>
                <div className="m-flex m-flex-between m-items-center m-mb-8">
                  <span className="m-badge m-badge-mint">{ride.busId?.busNumber || '—'}</span>
                  <span className={`m-badge ${ride.status === 'booked' ? 'm-badge-lemon' : ride.status === 'cancelled' ? 'm-badge-danger' : 'm-badge-success'}`}>
                    {ride.status}
                  </span>
                </div>
                <div className="m-text-sm" style={{ fontWeight: 700 }}>
                  {ride.boardingPoint || ride.busId?.source} → {ride.droppingPoint || ride.busId?.destination}
                </div>
                <div className="m-text-sm m-text-muted m-mt-4">
                  {ride.numberOfSeats} seat{ride.numberOfSeats > 1 ? 's' : ''} • ₹{ride.fare || ride.totalFare || 0} • {new Date(ride.createdAt).toLocaleDateString()}
                </div>
                {ride.passengers?.length > 0 && (
                  <div className="m-mt-8 m-flex m-gap-4" style={{ flexWrap: 'wrap' }}>
                    {ride.passengers.map((p, i) => (
                      <span key={i} className="m-badge m-badge-sky">
                        {p.name} {p.gender ? `(${p.gender.charAt(0).toUpperCase()})` : ''}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* ═══════════ REVIEWS TAB ═══════════ */}
      {activeTab === 'reviews' && (
        <div className="m-flex m-flex-col m-gap-12">
          <div className="m-label m-mb-4">Passenger Reviews & Feedback</div>
          {buses.every(bus => !bus.ratings || bus.ratings.length === 0) ? (
            <div className="m-empty">
              <div className="m-empty-emoji">⭐</div>
              <p className="m-text m-text-muted m-mt-8">No reviews received yet</p>
            </div>
          ) : (
            buses.map(bus =>
              bus.ratings?.map(rating => (
                <div key={rating._id} className="m-card" style={{ padding: 14 }}>
                  <div className="m-flex m-flex-between m-items-center m-mb-8">
                    <span className="m-text-sm" style={{ fontWeight: 800 }}>{bus.busNumber}</span>
                    <div className="m-flex m-items-center m-gap-8">
                      <span className="m-text-sm">{'⭐'.repeat(rating.rating)}{'☆'.repeat(5 - rating.rating)}</span>
                      <button onClick={() => handleDeleteReview(bus._id, rating._id)}
                        style={{ background: 'none', border: 'none', color: '#DC2626', fontSize: 14, padding: 2 }}>🗑</button>
                    </div>
                  </div>
                  {rating.review ? (
                    <div className="m-text-sm m-text-muted m-mb-8">"{rating.review}"</div>
                  ) : (
                    <div className="m-text-sm m-text-muted m-mb-8" style={{ fontStyle: 'italic' }}>No text provided.</div>
                  )}
                  <div className="m-text-sm m-text-muted m-mb-8">{new Date(rating.createdAt).toLocaleDateString()}</div>

                  {rating.conductorReply ? (
                    <div className="m-card-flat" style={{ padding: 10 }}>
                      <div className="m-text-sm" style={{ fontWeight: 700 }}>Your Reply:</div>
                      <div className="m-text-sm m-text-muted m-mt-4">{rating.conductorReply}</div>
                    </div>
                  ) : (
                    <div className="m-flex m-gap-8">
                      <input className="m-input" style={{ flex: 1, padding: 10, fontSize: 12 }}
                        placeholder="Reply to this review..."
                        value={replyInput[rating._id] || ''}
                        onChange={e => setReplyInput(prev => ({ ...prev, [rating._id]: e.target.value }))} />
                      <button className="m-btn m-btn-lemon m-btn-small" style={{ width: 'auto' }}
                        onClick={() => handleReplySubmit(bus._id, rating._id)}>
                        Reply
                      </button>
                    </div>
                  )}
                </div>
              ))
            )
          )}
        </div>
      )}

      {/* ═══════════ MODALS ═══════════ */}

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
                <input className="m-input" placeholder="Via Route (optional)" value={createForm.route}
                  onChange={e => setCreateForm(p => ({ ...p, route: e.target.value }))} />
                <button className="m-btn m-btn-lemon m-mt-8" onClick={handleCreate}>Create Bus</button>
                <div style={{ height: 100 }} />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Map Selector Sheet */}
      <AnimatePresence>
        {showMapSelector && (
          <div className="m-overlay" onClick={() => setShowMapSelector(null)}>
            <motion.div className="m-sheet" onClick={e => e.stopPropagation()}
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}>
              <div className="m-sheet-handle" />
              <div className="m-flex m-flex-between m-items-center m-mb-16">
                <div className="m-heading" style={{ fontSize: 18 }}>Mark Route: {showMapSelector.busNumber}</div>
                <button className="m-btn-icon" onClick={() => setShowMapSelector(null)}>✕</button>
              </div>
              <p className="m-text-sm m-text-muted m-mb-16">📍 Tap anywhere on the map to add a milestone</p>
              <div style={{ height: 350, borderRadius: 20, overflow: 'hidden' }}>
                <BusMap
                  buses={[showMapSelector]}
                  selectedBus={showMapSelector}
                  height="100%"
                  onMapClick={handleMapPointClick}
                />
              </div>
              <div className="m-flex m-flex-between m-items-center m-mt-16">
                <span className="m-text-sm m-text-muted">Milestones: {showMapSelector.routePoints?.length || 0}</span>
                <button className="m-btn m-btn-dark m-btn-small" style={{ width: 'auto' }}
                  onClick={() => setShowMapSelector(null)}>Done</button>
              </div>
              <div style={{ height: 100 }} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ConductorScreen;
