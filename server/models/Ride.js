const mongoose = require('mongoose');

const rideSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
  },
  busId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bus',
    required: [true, 'Bus ID is required'],
  },
  status: {
    type: String,
    enum: ['booked', 'active', 'completed', 'cancelled'],
    default: 'booked',
  },
  seatNumber: {
    type: Number,
    default: null,
  },
  numberOfSeats: {
    type: Number,
    default: 1,
  },
  passengers: [
    {
      name: String,
      age: Number,
      gender: String,
      contact: String,
    }
  ],
  fare: {
    type: Number,
    default: 0,
  },
  boardingPoint: {
    type: String,
    default: '',
  },
  droppingPoint: {
    type: String,
    default: '',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

rideSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Ride', rideSchema);
