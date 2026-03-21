const Ride = require('../models/Ride');
const Bus = require('../models/Bus');

// @desc    Book a ride
// @route   POST /api/rides/book
const bookRide = async (req, res) => {
  try {
    const { busId, boardingPoint, droppingPoint, passengers, numberOfSeats, totalFare } = req.body;

    const bus = await Bus.findById(busId);
    if (!bus) {
      return res.status(404).json({ message: 'Bus not found' });
    }

    const seatsToBook = numberOfSeats || 1;

    if (bus.availableSeats < seatsToBook) {
      return res.status(400).json({ message: 'Not enough seats available on this bus' });
    }

    const ride = await Ride.create({
      userId: req.user._id,
      busId,
      status: 'booked',
      numberOfSeats: seatsToBook,
      passengers: passengers || [],
      fare: totalFare || bus.fare,
      boardingPoint: boardingPoint || bus.source,
      droppingPoint: droppingPoint || bus.destination,
    });

    // Decrease available seats
    bus.availableSeats -= seatsToBook;
    await bus.save();

    // Emit real-time updates
    const io = req.app.get('io');
    if (io) {
      io.emit('seatUpdate', {
        busId: bus._id,
        busNumber: bus.busNumber,
        availableSeats: bus.availableSeats,
        totalSeats: bus.totalSeats,
      });
      io.emit('busUpdate', bus); // Broad broadcast for detail modals
    }

    const populatedRide = await Ride.findById(ride._id)
      .populate('busId', 'busNumber source destination fare')
      .populate('userId', 'name email avatar');

    if (io) {
      io.emit('newBooking', populatedRide);
    }

    res.status(201).json(populatedRide);
  } catch (error) {
    console.error('Book ride error:', error);
    res.status(500).json({ message: 'Server error booking ride' });
  }
};

// @desc    Get ride history for user
// @route   GET /api/rides/history
const getRideHistory = async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'conductor') {
      const buses = await Bus.find({ conductorId: req.user._id });
      const busIds = buses.map(b => b._id);
      query = { busId: { $in: busIds } };
    } else {
      query = { userId: req.user._id };
    }

    const rides = await Ride.find(query)
      .populate('busId', 'busNumber source destination fare route')
      .populate('userId', 'name email phone avatar')
      .sort({ createdAt: -1 });

    res.json(rides);
  } catch (error) {
    console.error('Get ride history error:', error);
    res.status(500).json({ message: 'Server error fetching ride history' });
  }
};

// @desc    Cancel a ride
// @route   POST /api/rides/cancel
const cancelRide = async (req, res) => {
  try {
    const { rideId } = req.body;

    const ride = await Ride.findById(rideId);
    if (!ride) {
      return res.status(404).json({ message: 'Ride not found' });
    }

    if (ride.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to cancel this ride' });
    }

    if (ride.status === 'completed' || ride.status === 'cancelled') {
      return res.status(400).json({ message: 'Cannot cancel this ride' });
    }

    ride.status = 'cancelled';
    await ride.save();

    // Restore available seats
    const bus = await Bus.findById(ride.busId);
    if (bus) {
      bus.availableSeats = Math.min(bus.availableSeats + (ride.numberOfSeats || 1), bus.totalSeats);
      await bus.save();

      const io = req.app.get('io');
      if (io) {
        io.emit('seatUpdate', {
          busId: bus._id,
          busNumber: bus.busNumber,
          availableSeats: bus.availableSeats,
          totalSeats: bus.totalSeats,
        });
        io.emit('busUpdate', bus);
      }
    }

    res.json({ message: 'Ride cancelled successfully', ride });
  } catch (error) {
    console.error('Cancel ride error:', error);
    res.status(500).json({ message: 'Server error cancelling ride' });
  }
};

module.exports = { bookRide, getRideHistory, cancelRide };
