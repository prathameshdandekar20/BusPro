const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const Bus = require('./models/Bus');

dotenv.config();

const clearImages = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const count = await Bus.countDocuments();
    console.log(`📊 Found ${count} buses.`);

    const result = await Bus.updateMany({}, { 
      $set: { 
        images: []
      },
      $unset: { image: "" }
    });

    console.log(`✅ Success! Cleared images for ${result.modifiedCount} buses.`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
};

clearImages();
