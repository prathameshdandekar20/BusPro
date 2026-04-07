const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const User = require('./models/User');
const Bus = require('./models/Bus');

async function cleanup() {
    try {
        console.log('Connecting to database...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to database.');

        const emailToDelete = 'conductor@gmail.com';
        
        console.log(`Searching for user with email: ${emailToDelete}...`);
        const user = await User.findOne({ email: emailToDelete });
        if (user) {
            console.log(`Found user: ${user.name} (${user.email}). Deleting...`);
            await User.deleteOne({ _id: user._id });
            console.log('User deleted.');
        } else {
            console.log('User not found.');
        }

        console.log('Deleting all buses...');
        const busResult = await Bus.deleteMany({});
        console.log(`Deleted ${busResult.deletedCount} buses.`);

        console.log('Cleanup complete.');
        process.exit(0);
    } catch (error) {
        console.error('Error during cleanup:', error);
        process.exit(1);
    }
}

cleanup();
