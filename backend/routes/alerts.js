const express = require('express');
const Alert = require('../models/Alert');

const router = express.Router();

// @route GET /api/alerts
// @desc Get all alerts for supervisor
router.get('/', async (req, res) => {
    try {
        const alerts = await Alert.find()
            .populate('driverId', 'name email')
            .populate('eventId')
            .sort({ createdAt: -1 }); // Newest first
        res.json(alerts);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route PUT /api/alerts/:id
// @desc Update alert status (ACKNOWLEDGE, RESOLVE, DISMISS)
router.put('/:id', async (req, res) => {
    const { status, notes, supervisorId } = req.body;
    try {
        const updateData = { status };

        if (notes) updateData.notes = notes;

        if (status === 'ACKNOWLEDGED') {
            updateData.acknowledgedBy = supervisorId;
            updateData.acknowledgedAt = Date.now();
        } else if (status === 'RESOLVED' || status === 'DISMISSED') {
            updateData.resolvedAt = Date.now();
        }

        const alert = await Alert.findByIdAndUpdate(req.params.id, updateData, { new: true })
            .populate('driverId', 'name email')
            .populate('eventId');

        if (!alert) {
            return res.status(404).json({ message: 'Alert not found' });
        }

        // Broadcast updated alert to update dashboards in real-time
        if (req.io) {
            req.io.to('supervisor_room').emit('alert_updated', alert);
        }

        res.json(alert);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
