const socketIO = require('socket.io');

const initializeSocket = (server) => {
  const io = socketIO(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    console.log(`🔌 New client connected: ${socket.id}`);

    // Join a specific bus room for targeted updates
    socket.on('joinBusRoom', (busId) => {
      socket.join(`bus_${busId}`);
      console.log(`📡 Client ${socket.id} joined bus room: bus_${busId}`);
    });

    // Leave a bus room
    socket.on('leaveBusRoom', (busId) => {
      socket.leave(`bus_${busId}`);
      console.log(`📡 Client ${socket.id} left bus room: bus_${busId}`);
    });

    // Conductor updates seat availability
    socket.on('conductorSeatUpdate', (data) => {
      console.log(`💺 Seat update for bus ${data.busId}:`, data);
      io.emit('seatUpdate', data);
      io.to(`bus_${data.busId}`).emit('busSeatUpdate', data);
    });

    // Conductor updates bus location
    socket.on('conductorLocationUpdate', (data) => {
      console.log(`📍 Location update for bus ${data.busId}:`, data);
      io.emit('locationUpdate', data);
      io.to(`bus_${data.busId}`).emit('busLocationUpdate', data);
    });

    // Conductor starts a trip
    socket.on('conductorStartTrip', (data) => {
      console.log(`🚌 Trip started for bus ${data.busId}`);
      io.emit('tripStarted', data);
    });

    // Conductor ends a trip
    socket.on('conductorEndTrip', (data) => {
      console.log(`🛑 Trip ended for bus ${data.busId}`);
      io.emit('tripEnded', data);
    });

    // Passenger booking notification
    socket.on('passengerBooked', (data) => {
      console.log(`🎫 New booking on bus ${data.busId}`);
      io.emit('newBooking', data);
    });

    // Disconnect
    socket.on('disconnect', () => {
      console.log(`❌ Client disconnected: ${socket.id}`);
    });
  });

  return io;
};

module.exports = initializeSocket;
