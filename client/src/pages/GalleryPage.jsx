import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { busService } from '../services/dataService';
import './Dashboard.css';

const GalleryPage = ({ user }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [bus, setBus] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Try to parse the index from the url params. e.g. /bus/:id/gallery?img=1
  const queryImgIndex = new URLSearchParams(location.search).get('img');
  const [currentImgIdx, setCurrentImgIdx] = useState(queryImgIndex ? parseInt(queryImgIndex, 10) : 0);

  useEffect(() => {
    const fetchBus = async () => {
      try {
        const data = await busService.getById(id);
        setBus(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchBus();
  }, [id]);

  if (loading) {
    return (
      <div className="page-wrapper" style={{ background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  if (!bus || !bus.images || bus.images.length === 0) {
    let singleImg = bus?.image;
    if (!singleImg) {
      return (
        <div className="page-wrapper" style={{ background: '#000', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <p>No images found for this bus.</p>
          <button className="btn-secondary" onClick={() => navigate(`/bus/${id}`)}>Go Back</button>
        </div>
      );
    }
    // Handle single legacy image
    return (
      <div className="page-wrapper" style={{ background: '#050505', minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
        <div className="page-header-sleek" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', zIndex: 10 }}>
          <button 
            onClick={() => navigate(`/bus/${id}`)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', cursor: 'pointer', backdropFilter: 'blur(10px)' }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </button>
          <h1 style={{ margin: 0, fontSize: '1.2rem', color: 'white', fontWeight: 600 }}>{bus.busNumber}</h1>
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <img src={singleImg} alt="Bus" style={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain', borderRadius: '8px' }} />
        </div>
      </div>
    )
  }

  const nextImg = () => setCurrentImgIdx((prev) => (prev + 1) % bus.images.length);
  const prevImg = () => setCurrentImgIdx((prev) => (prev - 1 + bus.images.length) % bus.images.length);

  return (
    <div className="page-wrapper gpu-accel" style={{ background: '#050505', minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      
      <div className="page-header-sleek" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', zIndex: 10 }}>
        <button 
          onClick={() => navigate(`/bus/${id}`)}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', cursor: 'pointer', backdropFilter: 'blur(10px)' }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        </button>
        <div style={{ color: 'white' }}>
          <h1 style={{ margin: '0 0 4px 0', fontSize: '1.2rem', fontWeight: 600 }}>{bus.busNumber}</h1>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)' }}>
            Photo {currentImgIdx + 1} of {bus.images.length}
          </p>
        </div>
      </div>

      <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        {bus.images.map((img, idx) => (
          <motion.img
            key={idx}
            src={img}
            alt="Bus Photo"
            initial={{ opacity: 0 }}
            animate={{ 
              opacity: idx === currentImgIdx ? 1 : 0,
              x: (idx - currentImgIdx) * 100 + '%'
            }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            style={{ position: 'absolute', maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain', borderRadius: '8px', zIndex: idx === currentImgIdx ? 2 : 1 }}
          />
        ))}

        {/* Navigation Arrows */}
        {bus.images.length > 1 && (
          <>
            <button 
              onClick={prevImg}
              style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', zIndex: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
            <button 
              onClick={nextImg}
              style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', zIndex: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
            </button>
          </>
        )}
      </div>

      <div style={{ padding: '20px', display: 'flex', justifyContent: 'center', gap: '8px' }}>
        {bus.images.length > 1 && bus.images.map((_, i) => (
          <div 
            key={i} 
            onClick={() => setCurrentImgIdx(i)}
            style={{ width: '8px', height: '8px', borderRadius: '50%', background: i === currentImgIdx ? 'var(--gold)' : 'rgba(255,255,255,0.3)', cursor: 'pointer', transition: 'background 0.3s ease' }}
          />
        ))}
      </div>
      
    </div>
  );
};

export default GalleryPage;
