const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    supervisorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Assigned supervisor
    status: { type: String, enum: ['NEW', 'ACKNOWLEDGED', 'RESOLVED'], default: 'NEW' }
}, { timestamps: true });

module.exports = mongoose.model('Alert', alertSchema);
