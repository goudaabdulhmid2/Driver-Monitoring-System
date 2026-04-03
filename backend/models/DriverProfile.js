const mongoose = require('mongoose');

const driverProfileSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    licenseNumber: { type: String, required: true },
    vehicleId: { type: String, required: true },
    status: { type: String, enum: ['ONLINE', 'OFFLINE'], default: 'OFFLINE' },
    currentStatus: { type: String, enum: ['NORMAL', 'DROWSINESS', 'DISTRACTION', 'PHONE_USAGE', 'NO_FACE', 'NO_SEATBELT'], default: 'NORMAL' },
    safetyScore: { type: Number, default: 100 },
    lastActiveAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('DriverProfile', driverProfileSchema);
