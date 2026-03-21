const Bus = require('../models/Bus');

// @desc    Get all buses
// @route   GET /api/buses
const getAllBuses = async (req, res) => {
  try {
    const { source, destination, isActive, mine } = req.query;
    const filter = {};

    if (source) filter.source = new RegExp(source, 'i');
    if (destination) filter.destination = new RegExp(destination, 'i');
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    
    // Conductor visibility logic - Strictly enforce data isolation
    if (req.user && req.user.role === 'conductor') {
      filter.conductorId = req.user._id;
      if (mine === 'true') delete filter.isActive;
    } else if (mine === 'true') {
      if (req.user && req.user.role === 'admin') {
        delete filter.isActive;
      } else {
        filter._id = null;
      }
    }

    // Temporary file-based logging for debugging
    const fs = require('fs');
    const logMsg = `[${new Date().toISOString()}] User: ${req.user?._id}, Role: ${req.user?.role}, Mine: ${mine}, Filter: ${JSON.stringify(filter)}\n`;
    try { fs.appendFileSync('c:/Users/HI/Desktop/buspro/server/debug.log', logMsg); } catch(e) {}

    console.log(`[DEBUG] Executing Bus.find with filter:`, JSON.stringify(filter));
    const buses = await Bus.find(filter)
      .populate('conductorId', 'name email')
      .sort({ updatedAt: -1 });

    res.json(buses);
  } catch (error) {
    console.error('Get buses error:', error);
    res.status(500).json({ message: 'Server error fetching buses' });
  }
};

// @desc    Get single bus by ID
// @route   GET /api/buses/:id
const getBusById = async (req, res) => {
  try {
    const bus = await Bus.findById(req.params.id).populate('conductorId', 'name email');
    if (!bus) {
      return res.status(404).json({ message: 'Bus not found' });
    }
    res.json(bus);
  } catch (error) {
    console.error('Get bus error:', error);
    res.status(500).json({ message: 'Server error fetching bus' });
  }
};

// @desc    Create a new bus
// @route   POST /api/buses
const createBus = async (req, res) => {
  try {
    const { busNumber, source, destination, totalSeats, route } = req.body;

    const existingBus = await Bus.findOne({ busNumber });
    if (existingBus) {
      return res.status(400).json({ message: 'Bus with this number already exists' });
    }

    const bus = await Bus.create({
      busNumber,
      source,
      destination,
      totalSeats,
      availableSeats: totalSeats,
      fare: 0, // Hardcoded to 0/handled by km-rate
      isActive: true, // Make active by default so it shows up immediately
      route: route || '',
      conductorId: req.user.role === 'conductor' ? req.user._id : null,
    });

    res.status(201).json(bus);

    const io = req.app.get('io');
    if (io) io.emit('busUpdate', bus);
  } catch (error) {
    console.error('Create bus error:', error);
    res.status(500).json({ message: 'Server error creating bus' });
  }
};

// @desc    Update seat count
// @route   POST /api/buses/updateSeats
const updateSeats = async (req, res) => {
  try {
    const { busId, availableSeats } = req.body;

    const bus = await Bus.findById(busId);
    if (!bus) {
      return res.status(404).json({ message: 'Bus not found' });
    }

    const isOwner = bus.conductorId && bus.conductorId.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    const noConductor = !bus.conductorId;

    if (!isOwner && !isAdmin && !noConductor) {
      return res.status(403).json({ message: 'Not authorized to manage this bus' });
    }

    if (noConductor) {
      bus.conductorId = req.user._id;
    }

    if (availableSeats < 0 || availableSeats > bus.totalSeats) {
      return res.status(400).json({
        message: `Available seats must be between 0 and ${bus.totalSeats}`,
      });
    }

    bus.availableSeats = availableSeats;
    await bus.save();

    // Emit socket event for real-time update
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

    res.json(bus);
  } catch (error) {
    console.error('Update seats error:', error);
    res.status(500).json({ message: 'Server error updating seats' });
  }
};

// @desc    Update bus location
// @route   POST /api/buses/updateLocation
const updateLocation = async (req, res) => {
  try {
    const { busId, latitude, longitude } = req.body;

    const bus = await Bus.findById(busId);
    if (!bus) {
      return res.status(404).json({ message: 'Bus not found' });
    }

    const isOwner = bus.conductorId && bus.conductorId.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    const noConductor = !bus.conductorId;

    if (!isOwner && !isAdmin && !noConductor) {
      return res.status(403).json({ message: 'Not authorized to manage this bus' });
    }

    if (noConductor) {
      bus.conductorId = req.user._id;
    }

    bus.location = { latitude, longitude };
    await bus.save();

    // Emit socket events
    const io = req.app.get('io');
    if (io) {
      io.emit('locationUpdate', {
        busId: bus._id,
        busNumber: bus.busNumber,
        location: bus.location,
      });
      io.emit('busUpdate', bus);
    }

    res.json(bus);
  } catch (error) {
    console.error('Update location error:', error);
    res.status(500).json({ message: 'Server error updating location' });
  }
};

// @desc    Start a trip (conductor)
// @route   POST /api/buses/startTrip
const startTrip = async (req, res) => {
  try {
    const { busId } = req.body;

    const bus = await Bus.findById(busId);
    if (!bus) {
      return res.status(404).json({ message: 'Bus not found' });
    }

    // Ownership check: allow if user is the conductor OR an admin OR if bus has no conductor yet
    const isOwner = bus.conductorId && bus.conductorId.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    const noConductor = !bus.conductorId;

    if (!isOwner && !isAdmin && !noConductor) {
      return res.status(403).json({ message: 'Not authorized to start this trip' });
    }

    bus.isActive = true;
    // If bus had no conductor, assign the current user
    if (!bus.conductorId) bus.conductorId = req.user._id;
    bus.availableSeats = bus.totalSeats;
    await bus.save();

    const io = req.app.get('io');
    if (io) {
      io.emit('tripStarted', {
        busId: bus._id,
        busNumber: bus.busNumber,
        source: bus.source,
        destination: bus.destination,
      });
      io.emit('busUpdate', bus);
    }

    res.json({ message: 'Trip started successfully', bus });
  } catch (error) {
    console.error('Start trip error:', error);
    res.status(500).json({ message: 'Server error starting trip' });
  }
};

// @desc    End a trip (conductor)
// @route   POST /api/buses/endTrip
const endTrip = async (req, res) => {
  try {
    const { busId } = req.body;

    const bus = await Bus.findById(busId);
    if (!bus) {
      return res.status(404).json({ message: 'Bus not found' });
    }

    // Ownership check: allow if user is the conductor OR an admin
    const isOwner = bus.conductorId && bus.conductorId.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Not authorized to end this trip' });
    }

    bus.isActive = false;
    await bus.save();

    const io = req.app.get('io');
    if (io) {
      io.emit('tripEnded', {
        busId: bus._id,
        busNumber: bus.busNumber,
      });
      io.emit('busUpdate', bus);
    }

    res.json({ message: 'Trip ended successfully', bus });
  } catch (error) {
    console.error('End trip error:', error);
    res.status(500).json({ message: 'Server error ending trip' });
  }
};

// @desc    Update bus route points
// @route   POST /api/buses/updateRoute
const updateBusRoute = async (req, res) => {
  try {
    const { busId, routePoints } = req.body;

    const bus = await Bus.findById(busId);
    if (!bus) {
      return res.status(404).json({ message: 'Bus not found' });
    }

    const isOwner = bus.conductorId && bus.conductorId.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    const noConductor = !bus.conductorId;

    if (!isOwner && !isAdmin && !noConductor) {
      return res.status(403).json({ message: 'Not authorized to update this route' });
    }

    if (noConductor) {
      bus.conductorId = req.user._id;
    }

    bus.routePoints = routePoints;
    await bus.save();

    const io = req.app.get('io');
    if (io) io.emit('busUpdate', bus);

    res.json({ message: 'Route updated successfully', bus });
  } catch (error) {
    console.error('Update route error:', error);
    res.status(500).json({ message: 'Server error updating route' });
  }
};

// @desc    Update bus image
// @route   POST /api/buses/updateImage
const updateImage = async (req, res) => {
  try {
    const { busId, image } = req.body;

    const bus = await Bus.findById(busId);
    if (!bus) {
      return res.status(404).json({ message: 'Bus not found' });
    }

    const isOwner = bus.conductorId && bus.conductorId.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    const noConductor = !bus.conductorId;

    if (!isOwner && !isAdmin && !noConductor) {
      return res.status(403).json({ message: 'Not authorized to update this bus' });
    }

    if (noConductor) {
      bus.conductorId = req.user._id;
    }

    if (!bus.images) bus.images = [];
    bus.images.push(image);
    await bus.save();

    const io = req.app.get('io');
    if (io) io.emit('busUpdate', bus);

    res.json({ message: 'Image added successfully', images: bus.images });
  } catch (error) {
    console.error('Update image error:', error);
    res.status(500).json({ message: 'Server error updating image' });
  }
};

// @desc    Rate a bus
// @route   POST /api/buses/rate
const rateBus = async (req, res) => {
  try {
    const { busId, rating, review } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    const bus = await Bus.findById(busId);
    if (!bus) {
      return res.status(404).json({ message: 'Bus not found' });
    }

    // Check if user already rated this bus
    const existingIdx = bus.ratings.findIndex(
      (r) => r.userId && r.userId.toString() === req.user._id.toString()
    );

    if (existingIdx >= 0) {
      bus.ratings[existingIdx].rating = rating;
      if (review !== undefined) bus.ratings[existingIdx].review = review;
      bus.ratings[existingIdx].createdAt = new Date();
    } else {
      bus.ratings.push({ userId: req.user._id, rating, review: review || '' });
    }

    // Recalculate average
    const total = bus.ratings.reduce((sum, r) => sum + r.rating, 0);
    bus.avgRating = Math.round((total / bus.ratings.length) * 10) / 10;
    bus.totalRatings = bus.ratings.length;

    await bus.save();
    
    const io = req.app.get('io');
    if (io) io.emit('busUpdate', bus);

    res.json({ message: 'Rating submitted', avgRating: bus.avgRating, totalRatings: bus.totalRatings });
  } catch (error) {
    console.error('Rate bus error:', error);
    res.status(500).json({ message: 'Server error rating bus' });
  }
};
// @desc    Reply to a review (Conductor only)
// @route   POST /api/buses/reply
const replyToReview = async (req, res) => {
  try {
    const { busId, reviewId, replyText } = req.body;
    
    const bus = await Bus.findById(busId);
    if (!bus) return res.status(404).json({ message: 'Bus not found' });

    // Check ownership
    const isOwner = bus.conductorId && bus.conductorId.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Not authorized to reply' });
    }

    const reviewObj = bus.ratings.id(reviewId);
    if (!reviewObj) return res.status(404).json({ message: 'Review not found' });

    reviewObj.conductorReply = replyText;
    await bus.save();

    const io = req.app.get('io');
    if (io) io.emit('busUpdate', bus);

    res.json({ message: 'Reply added successfully', ratings: bus.ratings });
  } catch (error) {
    console.error('Reply to review error:', error);
    res.status(500).json({ message: 'Server error replying to review' });
  }
};

// @desc    Delete a specific image from bus
// @route   POST /api/buses/deleteImage
const deleteImage = async (req, res) => {
  try {
    const { busId, imageIndex } = req.body;
    
    const bus = await Bus.findById(busId);
    if (!bus) return res.status(404).json({ message: 'Bus not found' });

    // Check ownership
    const isOwner = bus.conductorId && bus.conductorId.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (imageIndex >= 0 && imageIndex < bus.images.length) {
      bus.images.splice(imageIndex, 1);
      await bus.save();
    }

    const io = req.app.get('io');
    if (io) io.emit('busUpdate', bus);

    res.json({ message: 'Image deleted', images: bus.images });
  } catch (error) {
    console.error('Delete image error:', error);
    res.status(500).json({ message: 'Server error deleting image' });
  }
};
// @desc    Delete a bus
// @route   DELETE /api/buses/:id
const deleteBus = async (req, res) => {
  try {
    const bus = await Bus.findById(req.params.id);
    if (!bus) {
      return res.status(404).json({ message: 'Bus not found' });
    }

    const isOwner = bus.conductorId && bus.conductorId.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    const noConductor = !bus.conductorId;

    if (!isOwner && !isAdmin && !noConductor) {
      return res.status(403).json({ message: 'Not authorized to delete this bus' });
    }

    const busId = req.params.id;
    await Bus.findByIdAndDelete(busId);
    
    const io = req.app.get('io');
    if (io) io.emit('busDeleted', busId);

    res.json({ message: 'Bus deleted successfully' });
  } catch (error) {
    console.error('Delete bus error:', error);
    res.status(500).json({ message: 'Server error deleting bus' });
  }
};

// @desc    Delete a review / rating
// @route   POST /api/buses/deleteReview
const deleteReview = async (req, res) => {
  try {
    const { busId, reviewId } = req.body;
    
    const bus = await Bus.findById(busId);
    if (!bus) return res.status(404).json({ message: 'Bus not found' });

    const reviewObj = bus.ratings.id(reviewId);
    if (!reviewObj) return res.status(404).json({ message: 'Review not found' });

    // Check authorization: Owner of bus (Conductor), Admin, or the user who wrote the review
    const isBusOwner = bus.conductorId && bus.conductorId.toString() === req.user._id.toString();
    const isReviewOwner = reviewObj.userId && reviewObj.userId.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isBusOwner && !isReviewOwner && !isAdmin) {
      return res.status(403).json({ message: 'Not authorized to delete this review' });
    }

    // Use pull to remove subdocument
    bus.ratings.pull(reviewId);

    // Recalculate average
    if (bus.ratings.length > 0) {
      const total = bus.ratings.reduce((sum, r) => sum + r.rating, 0);
      bus.avgRating = Math.round((total / bus.ratings.length) * 10) / 10;
    } else {
      bus.avgRating = 0;
    }
    bus.totalRatings = bus.ratings.length;

    await bus.save();
    
    const io = req.app.get('io');
    if (io) io.emit('busUpdate', bus);

    res.json({ message: 'Review deleted successfully', avgRating: bus.avgRating, totalRatings: bus.totalRatings, ratings: bus.ratings });
  } catch (error) {
    console.error('Delete review error:', error);
    res.status(500).json({ message: 'Server error deleting review' });
  }
};

module.exports = {
  getAllBuses,
  getBusById,
  createBus,
  updateSeats,
  updateLocation,
  updateBusRoute,
  updateImage,
  deleteImage,
  rateBus,
  replyToReview,
  deleteReview,
  startTrip,
  endTrip,
  deleteBus,
};
