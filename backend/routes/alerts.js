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

module.exports = router;
