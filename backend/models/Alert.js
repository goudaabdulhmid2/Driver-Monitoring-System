const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    supervisorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Assigned supervisor
    status: { type: String, enum: ['ACTIVE', 'ACKNOWLEDGED', 'RESOLVED', 'DISMISSED'], default: 'ACTIVE' },
    acknowledgedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    acknowledgedAt: { type: Date },
    resolvedAt: { type: Date },
    notes: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Alert', alertSchema);
