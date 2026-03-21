import { useState, useEffect, useCallback } from 'react';
import { socketService } from '../services/socketService';

export const useSocket = () => {
  const [connected, setConnected] = useState(false);
  const [seatUpdates, setSeatUpdates] = useState(null);
  const [locationUpdates, setLocationUpdates] = useState(null);
  const [busUpdates, setBusUpdates] = useState(null);
  const [busDeleted, setBusDeleted] = useState(null);
  const [newBooking, setNewBooking] = useState(null);

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

    socketService.onBusUpdate((data) => {
      setBusUpdates(data);
    });

    socketService.onBusDeleted((id) => {
      setBusDeleted(id);
    });

    socketService.onNewBooking((data) => {
      setNewBooking(data);
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
    busUpdates,
    busDeleted,
    newBooking,
    joinBusRoom,
    leaveBusRoom,
  };
};
