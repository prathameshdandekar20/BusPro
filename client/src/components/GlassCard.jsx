import { useState, useRef, useCallback, useEffect } from 'react';
import './GlassCard.css';

const GlassCard = ({ 
  children, 
  className = '', 
  onClick, 
  tilt = false, 
  glow = true, 
  isStatic = false,
  variant = 'gold',
  style = {} 
}) => {
  const ref = useRef(null);
  const [hovering, setHovering] = useState(false);
  const [tiltStyle, setTiltStyle] = useState({ rotateX: 0, rotateY: 0 });
  const [isVisible, setIsVisible] = useState(false);

  // Intersection Observer for mobile scroll animations
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (!ref.current || isStatic) return;
    
    const rect = ref.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    ref.current.style.setProperty('--mouse-x', `${x}px`);
    ref.current.style.setProperty('--mouse-y', `${y}px`);

    if (tilt) {
      const rx = (y / rect.height - 0.5) * -10;
      const ry = (x / rect.width - 0.5) * 10;
      setTiltStyle({ rotateX: rx, rotateY: ry });
    }
  }, [tilt, isStatic]);

  const handleMouseLeave = useCallback(() => {
    setHovering(false);
    setTiltStyle({ rotateX: 0, rotateY: 0 });
    
    if (ref.current) {
      ref.current.style.setProperty('--mouse-x', `50%`);
      ref.current.style.setProperty('--mouse-y', `50%`);
    }
  }, []);

  const handleMouseEnter = useCallback(() => {
    setHovering(true);
    if (ref.current) {
      ref.current.style.setProperty('--mouse-x', `50%`);
      ref.current.style.setProperty('--mouse-y', `50%`);
    }
  }, []);

  return (
    <div
      ref={ref}
      className={`glass-card ${className} glass-card-variant-${variant} ${hovering && !isStatic ? 'glass-card-hover' : ''} ${isStatic ? 'glass-card-static' : ''} ${isVisible ? 'glass-card-visible' : 'glass-card-hidden'}`}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchMove={(e) => {
        if (isStatic) return;
        const touch = e.touches[0];
        handleMouseMove({ clientX: touch.clientX, clientY: touch.clientY });
      }}
      onTouchStart={isStatic ? null : handleMouseEnter}
      onTouchEnd={isStatic ? null : handleMouseLeave}
      onClick={onClick}
      style={{
        transform: 'scale3d(1, 1, 1)',
        zIndex: 1,
        ...style
      }}
    >
      {glow && variant === 'gold' && <div className="glass-card-border-glow" />}
      {variant === 'gold' && <div className="glass-card-flare" />}
      <div className="glass-card-content">
        {children}
      </div>
      {variant === 'gold' && <div className="glass-card-spotlight" />}
    </div>
  );
};


export default GlassCard;
