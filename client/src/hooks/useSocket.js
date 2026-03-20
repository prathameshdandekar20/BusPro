import { useState, useEffect, useCallback } from 'react';
import { socketService } from '../services/socketService';

export const useSocket = () => {
  const [connected, setConnected] = useState(false);
  const [seatUpdates, setSeatUpdates] = useState(null);
  const [locationUpdates, setLocationUpdates] = useState(null);

  useEffect(() => {
    const socket = socketService.connect();

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socketService.onSeatUpdate((data) => {
      setSeatUpdates(data);
    });

    socketService.onLocationUpdate((data) => {
      setLocationUpdates(data);
    });

    return () => {
      socketService.removeAllListeners();
    };
  }, []);

  const joinBusRoom = useCallback((busId) => {
    socketService.joinBusRoom(busId);
  }, []);

  const leaveBusRoom = useCallback((busId) => {
    socketService.leaveBusRoom(busId);
  }, []);

  return {
    connected,
    seatUpdates,
    locationUpdates,
    joinBusRoom,
    leaveBusRoom,
  };
};
