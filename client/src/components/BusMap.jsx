import { MapContainer, TileLayer, useMap, useMapEvents, Marker } from 'react-leaflet';
import L from 'leaflet';
import { useState, useEffect, useRef } from 'react';
import './BusMap.css';

// Fix for default marker icons in Leaflet + React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const busIcon = L.divIcon({
  className: 'bus-marker-icon',
  html: `<div class="bus-icon-inner">🚌<div class="bus-pulse"></div></div>`,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

const milestoneIcon = L.divIcon({
  className: 'milestone-marker-icon',
  html: `<div class="milestone-dot"></div>`,
  iconSize: [12, 12],
  iconAnchor: [6, 6],
});

const userIcon = L.divIcon({
  className: 'user-marker-icon',
  html: `<div class="user-dot"><div class="user-pulse"></div></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

// Component to auto-center map when location updates
const RecenterMap = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] !== 0) {
      map.flyTo(center, map.getZoom(), {
        animate: true,
        duration: 2.5
      });
    }
  }, [center, map]);
  return null;
};

const MapClickHandler = ({ onMapClick, routePoints, snappedTarget, onMapError }) => {
  const map = useMap();
  
  useMapEvents({
    click: (e) => {
      if (!onMapClick) return;

      if (!routePoints || routePoints.length < 2) {
        onMapClick(e.latlng);
        return;
      }

      if (snappedTarget) {
        onMapClick(snappedTarget);
      } else {
        // User clicked too far from the route
        if (onMapError) {
          onMapError("Please click closer to the blue bus route (within 100m).");
        }
      }
    },
  });
  return null;
};

const SnappedCursorIndicator = ({ routePoints, onSnapUpdate }) => {
  const map = useMap();
  const [ghostPos, setGhostPos] = useState(null);

  useMapEvents({
    mousemove: (e) => {
      if (!routePoints || routePoints.length < 2) {
        setGhostPos(null);
        onSnapUpdate(null);
        return;
      }

      let minDest = Infinity;
      let snappedPoint = null;

      for (let i = 0; i < routePoints.length - 1; i++) {
        const p1 = L.latLng(routePoints[i][1], routePoints[i][0]);
        const p2 = L.latLng(routePoints[i+1][1], routePoints[i+1][0]);
        
        const closest = L.LineUtil.closestPointOnSegment(
          map.latLngToLayerPoint(e.latlng),
          map.latLngToLayerPoint(p1),
          map.latLngToLayerPoint(p2)
        );
        
        const closestLatLng = map.layerPointToLatLng(closest);
        const dist = e.latlng.distanceTo(closestLatLng);

        if (dist < minDest) {
          minDest = dist;
          snappedPoint = closestLatLng;
        }
      }

      // Strict Snap threshold: 100m as per user request
      if (minDest < 100) {
        setGhostPos(snappedPoint);
        onSnapUpdate(snappedPoint);
      } else {
        setGhostPos(null);
        onSnapUpdate(null);
      }
    },
    mouseleave: () => {
      setGhostPos(null);
      onSnapUpdate(null);
    }
  });

  if (!ghostPos) return null;

  const ghostIcon = L.divIcon({
    className: 'ghost-snap-marker',
    html: `<div class="ghost-dot"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8]
  });

  return <Marker position={ghostPos} icon={ghostIcon} interactive={false} />;
};

// Requirement 2, 3: Bus marker smooth update
const DynamicBusMarkers = ({ buses }) => {
  const map = useMap();
  const markersRef = useRef({});

  useEffect(() => {
    const activeIds = new Set();
    
    buses.forEach(bus => {
      if (!bus.isActive || bus.location?.latitude === 0) return;
      
      activeIds.add(bus._id?.toString());
      const latlng = [bus.location.latitude, bus.location.longitude];

      if (markersRef.current[bus._id]) {
        // Requirement 3: Smoothly update position using setLatLng()
        markersRef.current[bus._id].setLatLng(latlng);
      } else {
        const marker = L.marker(latlng, { icon: busIcon }).addTo(map);
        marker.bindPopup(`
          <div class="popup-content">
            <strong>${bus.busNumber || 'Bus'}</strong>
            <p>${bus.source || ''} &rarr; ${bus.destination || ''}</p>
            <span class="status">Live Tracking Active</span>
          </div>
        `, { className: 'bus-popup' });
        markersRef.current[bus._id] = marker;
      }
    });

    // Clean up disconnected buses
    Object.keys(markersRef.current).forEach(id => {
      if (!activeIds.has(id)) {
        map.removeLayer(markersRef.current[id]);
        delete markersRef.current[id];
      }
    });
  }, [buses, map]);

  return null;
};

// Requirement 4: Milestones added as separate markers
const DynamicMilestones = ({ routePoints }) => {
  const map = useMap();
  const layersRef = useRef([]);

  useEffect(() => {
    // Clean old milestone layers
    layersRef.current.forEach(layer => map.removeLayer(layer));
    layersRef.current = [];

    // Filter valid points
    const validPoints = (routePoints || []).filter(p => 
      p && typeof p.latitude === 'number' && typeof p.longitude === 'number' && 
      !isNaN(p.latitude) && !isNaN(p.longitude)
    );

    if (validPoints.length === 0) return;

    // Add milestone markers
    validPoints.forEach(p => {
      const milestone = L.marker([p.latitude, p.longitude], { icon: milestoneIcon }).addTo(map);
      milestone.bindPopup(p.name || 'Milestone');
      layersRef.current.push(milestone);
    });

    if (validPoints.length < 2) return;

    fetchRoute();
    
    return () => {
      layersRef.current.forEach(layer => map.removeLayer(layer));
      layersRef.current = [];
    };
  }, [routePoints, map]);

  return null;
};

// Internal Route Container to expose geometry for snapping
const RouteManager = ({ routePoints, setRouteGeometry }) => {
  const map = useMap();
  const layersRef = useRef([]);

  useEffect(() => {
    layersRef.current.forEach(layer => map.removeLayer(layer));
    layersRef.current = [];

    const validPoints = (routePoints || []).filter(p => 
      p && typeof p.latitude === 'number' && typeof p.longitude === 'number'
    );

    if (validPoints.length === 0) {
      setRouteGeometry(null);
      return;
    }

    const fetchRoute = async () => {
      try {
        const coords = validPoints.map(p => `${p.longitude},${p.latitude}`).join(';');
        const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`);
        const data = await response.json();

        if (data.code === 'Ok' && data.routes?.length > 0) {
          const routeGeoJSON = data.routes[0].geometry;
          setRouteGeometry(routeGeoJSON.coordinates);
          
          const routeLayer = L.geoJSON(routeGeoJSON, {
            style: { color: '#448aff', weight: 8, opacity: 0.8, lineJoin: 'round' }
          }).addTo(map);
          layersRef.current.push(routeLayer);
        } else {
          // Fallback to direct line
          const positions = validPoints.map(p => [p.latitude, p.longitude]);
          setRouteGeometry(validPoints.map(p => [p.longitude, p.latitude]));
          const polyline = L.polyline(positions, { color: '#448aff', weight: 4, opacity: 0.6, dashArray: '10, 10' }).addTo(map);
          layersRef.current.push(polyline);
        }
      } catch (err) {
        setRouteGeometry(null);
      }
    };

    fetchRoute();
    return () => layersRef.current.forEach(layer => map.removeLayer(layer));
  }, [routePoints, map, setRouteGeometry]);

  return null;
};

const DynamicUserLocation = ({ location }) => {
  const map = useMap();
  const markerRef = useRef(null);

  useEffect(() => {
    if (!location) return;
    
    if (markerRef.current) {
      markerRef.current.setLatLng(location);
    } else {
      markerRef.current = L.marker(location, { icon: userIcon }).addTo(map);
      markerRef.current.bindPopup('You are here');
    }
  }, [location, map]);

  return null;
};

const SelectionMarker = ({ boardingPoint, droppingPoint }) => {
  const map = useMap();
  const boardingRef = useRef(null);
  const droppingRef = useRef(null);

  useEffect(() => {
    // Handle Boarding Pin (Red/Gold)
    if (boardingPoint) {
      const icon = L.divIcon({
        className: 'selection-marker-icon boarding',
        html: `<div class="selection-pin boarding-pin">📍</div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 30],
      });
      if (boardingRef.current) {
        boardingRef.current.setLatLng(boardingPoint);
      } else {
        boardingRef.current = L.marker(boardingPoint, { icon }).addTo(map).bindPopup('Boarding Point');
      }
    } else if (boardingRef.current) {
      map.removeLayer(boardingRef.current);
      boardingRef.current = null;
    }

    // Handle Dropping Pin (Green)
    if (droppingPoint) {
      const icon = L.divIcon({
        className: 'selection-marker-icon dropping',
        html: `<div class="selection-pin dropping-pin">📍</div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 30],
      });
      if (droppingRef.current) {
        droppingRef.current.setLatLng(droppingPoint);
      } else {
        droppingRef.current = L.marker(droppingPoint, { icon }).addTo(map).bindPopup('Destination Point');
      }
    } else if (droppingRef.current) {
      map.removeLayer(droppingRef.current);
      droppingRef.current = null;
    }
  }, [boardingPoint, droppingPoint, map]);

  return null;
};

const BusMap = ({ 
  buses = [], 
  selectedBus = null, 
  height = "400px", 
  onMapClick = null,
  onMapError = null,
  boardingPoint = null,
  droppingPoint = null 
}) => {
  const [userLocation, setUserLocation] = useState([22.7196, 75.8577]); // Default fallback

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation([pos.coords.latitude, pos.coords.longitude]);
        },
        (err) => console.log("User location denied"),
        { enableHighAccuracy: true }
      );
    }
  }, []);

  const mapCenter = selectedBus?.location?.latitude 
    ? [selectedBus.location.latitude, selectedBus.location.longitude] 
    : userLocation;

  const [routeGeometry, setRouteGeometry] = useState(null);
  const [currentSnapPoint, setCurrentSnapPoint] = useState(null);

  return (
    <div className="bus-map-wrapper" style={{ height }}>
      <MapContainer 
        center={mapCenter} 
        zoom={14} 
        scrollWheelZoom={true}
        className="leaflet-container"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <SnappedCursorIndicator 
          routePoints={routeGeometry} 
          onSnapUpdate={setCurrentSnapPoint} 
        />

        <MapClickHandler 
          onMapClick={onMapClick} 
          routePoints={routeGeometry} 
          snappedTarget={currentSnapPoint}
          onMapError={onMapError}
        />
        
        <DynamicUserLocation location={userLocation} />
        <DynamicBusMarkers buses={buses} />
        <SelectionMarker boardingPoint={boardingPoint} droppingPoint={droppingPoint} />
        
        {(selectedBus || buses.length > 0) && (
          <RouteManager 
            routePoints={(selectedBus || buses[0])?.routePoints} 
            setRouteGeometry={setRouteGeometry} 
          />
        )}

        <RecenterMap center={mapCenter} />
      </MapContainer>
    </div>
  );
};

export default BusMap;
