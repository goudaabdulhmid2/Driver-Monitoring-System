const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const Event = require('./models/Event');
const Alert = require('./models/Alert');

dotenv.config();

mongoose.connect(process.env.MONGO_URI)
    .then(async () => {
        console.log('MongoDB Connected');
        await seedData();
    })
    .catch(err => console.error(err));

const seedData = async () => {
    try {
        let driver = await User.findOne({ email: 'driver@dms.com' });
        if (!driver) {
            console.log('Creating driver...');
            driver = await User.create({
                name: 'John Driver',
                email: 'driver@dms.com',
                password: 'password',
                role: 'DRIVER'
            });
        }

        let supervisor = await User.findOne({ email: 'supervisor@dms.com' });
        if (!supervisor) {
            console.log('Creating supervisor...');
            supervisor = await User.create({
                name: 'Jane Supervisor',
                email: 'supervisor@dms.com',
                password: 'password',
                role: 'SUPERVISOR'
            });
        }

        console.log('Clearing old events/alerts...');
        await Event.deleteMany({});
        await Alert.deleteMany({});

        const events = [
            {
                driverId: driver._id,
                eventType: 'DROWSINESS',
                confidence: 0.95,
                severity: 'HIGH',
                snapshotUrl: 'https://placehold.co/640x480/red/white?text=Drowsy+Snapshot',
                timestamp: new Date(Date.now() - 1000 * 60 * 5) // 5 mins ago
            },
            {
                driverId: driver._id,
                eventType: 'DISTRACTION',
                confidence: 0.88,
                severity: 'MEDIUM',
                snapshotUrl: 'https://placehold.co/640x480/orange/white?text=Distracted+Snapshot',
                timestamp: new Date(Date.now() - 1000 * 60 * 2) // 2 mins ago
            },
            {
                driverId: driver._id,
                eventType: 'PHONE_USAGE',
                confidence: 0.99,
                severity: 'HIGH',
                snapshotUrl: 'https://placehold.co/640x480/black/white?text=Phone+Usage+Snapshot',
                timestamp: new Date(Date.now() - 1000 * 30) // 30 seconds ago
            }
        ];

        console.log('Inserting events...');
        const createdEvents = await Event.insertMany(events);

        const alerts = createdEvents.map(event => ({
            eventId: event._id,
            driverId: driver._id,
            supervisorId: null, // Unassigned initially
            status: 'NEW'
        }));

        console.log('Inserting alerts...');
        await Alert.insertMany(alerts);

        console.log('Dummy data seeded successfully!');
        process.exit();
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};
