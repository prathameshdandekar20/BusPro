import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import Bus from './models/Bus.js';

dotenv.config();

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const userRes = await User.deleteMany({ role: 'conductor' });
        const busRes = await Bus.deleteMany({});
        console.log(`Deleted ${userRes.deletedCount} conductors and ${busRes.deletedCount} buses.`);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};
run();
