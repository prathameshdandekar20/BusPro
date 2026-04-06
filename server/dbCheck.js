const mongoose = require('mongoose');
mongoose.connect('mongodb+srv://bus:bus123@bus.54syw4m.mongodb.net/smartbus?retryWrites=true&w=majority&appName=BUS').then(async () => {
    try {
        const Bus = require('./models/Bus');
        const User = require('./models/User');
        const buses = await Bus.find().lean();
        const users = await User.find().lean();
        
        console.log('--- BUSES ---');
        buses.forEach(b => console.log(`Bus: ${b.busNumber}, Conductor ID: ${b.conductorId}`));
        
        console.log('--- USERS ---');
        users.forEach(u => console.log(`User: ${u.email}, Role: ${u.role}, ID: ${u._id}`));
        
        process.exit(0);
    } catch(e) {
        console.error(e);
        process.exit(1);
    }
});
