const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI is not defined in environment variables');
    }

    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000, // 10 seconds timeout
    });
    
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB Connection Error Details:`);
    console.error(`Message: ${error.message}`);
    if (error.reason) console.error(`Reason: ${JSON.stringify(error.reason)}`);
    process.exit(1);
  }
};

module.exports = connectDB;
