const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    default: '',
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    minlength: 6,
  },
  googleId: {
    type: String,
    default: null,
  },
  avatar: {
    type: String,
    default: '',
  },
  role: {
    type: String,
    enum: ['passenger', 'conductor', 'admin'],
    default: 'passenger',
  },
  isGoogleUser: {
    type: Boolean,
    default: false,
  },
  phone: {
    type: String,
    default: '',
  },
  age: {
    type: Number,
    default: null,
  },
  gender: {
    type: String,
    default: '',
  },
  bio: {
    type: String,
    default: '',
  },
  countryCode: {
    type: String,
    default: '+91',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('User', userSchema);
