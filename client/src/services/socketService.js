import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

let socket = null;

export const socketService = {
  connect: () => {
    if (!socket) {
      socket = io(SOCKET_URL, {
        transports: ['polling', 'websocket'],
        autoConnect: true,
      });

      socket.on('connect', () => {
        console.log('🔌 Socket connected:', socket.id);
      });

      socket.on('disconnect', () => {
        console.log('❌ Socket disconnected');
      });

      socket.on('connect_error', (err) => {
        console.error('Socket connection error:', err.message);
      });
    }
    return socket;
  },

  disconnect: () => {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
  },

  getSocket: () => socket,

  joinBusRoom: (busId) => {
    if (socket) socket.emit('joinBusRoom', busId);
  },

  leaveBusRoom: (busId) => {
    if (socket) socket.emit('leaveBusRoom', busId);
  },

  onSeatUpdate: (callback) => {
    if (socket) socket.on('seatUpdate', callback);
  },

  onLocationUpdate: (callback) => {
    if (socket) socket.on('locationUpdate', callback);
  },

  onTripStarted: (callback) => {
    if (socket) socket.on('tripStarted', callback);
  },

  onTripEnded: (callback) => {
    if (socket) socket.on('tripEnded', callback);
  },

  onBusUpdate: (callback) => {
    if (socket) socket.on('busUpdate', callback);
  },

  onBusDeleted: (callback) => {
    if (socket) socket.on('busDeleted', callback);
  },

  onNewBooking: (callback) => {
    if (socket) socket.on('newBooking', callback);
  },

  emitSeatUpdate: (data) => {
    if (socket) socket.emit('conductorSeatUpdate', data);
  },

  emitLocationUpdate: (data) => {
    if (socket) socket.emit('conductorLocationUpdate', data);
  },

  removeAllListeners: () => {
    if (socket) {
      socket.off('seatUpdate');
      socket.off('locationUpdate');
      socket.off('tripStarted');
      socket.off('tripEnded');
      socket.off('newBooking');
      socket.off('busUpdate');
      socket.off('busDeleted');
    }
  },
};
