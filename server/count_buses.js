const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const Bus = require('./models/Bus');

const countBuses = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const count = await Bus.countDocuments({});
    const buses = await Bus.find({});
    console.log(`Total buses in DB: ${count}`);
    console.log('Buses:', JSON.stringify(buses, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

countBuses();
