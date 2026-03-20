const mongoose = require('mongoose');

const busSchema = new mongoose.Schema({
  busNumber: {
    type: String,
    required: [true, 'Bus number is required'],
    unique: true,
    trim: true,
  },
  source: {
    type: String,
    required: [true, 'Source is required'],
    trim: true,
  },
  destination: {
    type: String,
    required: [true, 'Destination is required'],
    trim: true,
  },
  totalSeats: {
    type: Number,
    required: [true, 'Total seats is required'],
    min: 1,
  },
  availableSeats: {
    type: Number,
    required: true,
    min: 0,
  },
  location: {
    latitude: {
      type: Number,
      default: 0,
    },
    longitude: {
      type: Number,
      default: 0,
    },
  },
  conductorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  isActive: {
    type: Boolean,
    default: false,
  },
  route: {
    type: String,
    default: '',
  },
  routePoints: [
    {
      name: String,
      latitude: Number,
      longitude: Number,
    }
  ],
  estimatedTime: {
    type: String,
    default: '',
  },
  fare: {
    type: Number,
    default: 0,
  },
  farePerKm: {
    type: Number,
    default: 1,
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

busSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Bus', busSchema);
