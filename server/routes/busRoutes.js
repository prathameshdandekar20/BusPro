const express = require('express');
const router = express.Router();
const {
  getAllBuses,
  getBusById,
  createBus,
  updateSeats,
  updateLocation,
  updateBusRoute,
  startTrip,
  endTrip,
  deleteBus,
} = require('../controllers/busController');
const { protect, softProtect, conductorOnly } = require('../middleware/authMiddleware');

router.get('/', softProtect, getAllBuses);
router.get('/:id', getBusById);
router.post('/', protect, conductorOnly, createBus);
router.delete('/:id', protect, conductorOnly, deleteBus);
router.post('/updateSeats', protect, conductorOnly, updateSeats);
router.post('/updateLocation', protect, conductorOnly, updateLocation);
router.post('/updateRoute', protect, conductorOnly, updateBusRoute);
router.post('/startTrip', protect, conductorOnly, startTrip);
router.post('/endTrip', protect, conductorOnly, endTrip);

module.exports = router;
