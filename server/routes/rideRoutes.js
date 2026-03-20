const express = require('express');
const router = express.Router();
const { bookRide, getRideHistory, cancelRide } = require('../controllers/rideController');
const { protect } = require('../middleware/authMiddleware');

router.post('/book', protect, bookRide);
router.get('/history', protect, getRideHistory);
router.post('/cancel', protect, cancelRide);

module.exports = router;
