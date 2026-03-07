const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
    driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    eventType: {
        type: String,
        enum: ['DROWSINESS', 'DISTRACTION', 'PHONE_USAGE', 'NO_FACE', 'NO_SEATBELT'],
        required: true
    },
    confidence: { type: Number, required: true },
    severity: {
        type: String,
        enum: ['LOW', 'MEDIUM', 'HIGH'],
        required: true
    },
    snapshotUrl: { type: String }, // Optional, only for privacy-approved violations
    timestamp: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Event', eventSchema);
