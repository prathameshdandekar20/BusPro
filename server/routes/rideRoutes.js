const express = require('express');
const router = express.Router();
const { bookRide, getRideHistory, cancelRide, getTicketById } = require('../controllers/rideController');
const { protect } = require('../middleware/authMiddleware');

router.post('/book', protect, bookRide);
router.get('/history', protect, getRideHistory);
router.post('/cancel', protect, cancelRide);
router.get('/ticket/:id', getTicketById);

module.exports = router;
