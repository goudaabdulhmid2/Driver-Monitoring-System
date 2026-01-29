const mongoose = require('mongoose');

const liveSessionSchema = new mongoose.Schema({
    driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    supervisorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['REQUESTED', 'ACTIVE', 'ENDED'], default: 'REQUESTED' },
    startedAt: { type: Date },
    endedAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('LiveSession', liveSessionSchema);
