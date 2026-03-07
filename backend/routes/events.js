const express = require('express');
const Event = require('../models/Event');
const Alert = require('../models/Alert');
const fs = require('fs');
const path = require('path');

const router = express.Router();

// @route POST /api/events
router.post('/', async (req, res) => {
    const { driverId, eventType, confidence, severity, snapshotUrl } = req.body;

    let finalSnapshotUrl = snapshotUrl;

    // Convert Base64 payload to File System Image
    if (snapshotUrl && snapshotUrl.startsWith('data:image')) {
        const matches = snapshotUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
            const buffer = Buffer.from(matches[2], 'base64');
            const uploadsDir = path.join(__dirname, '..', 'uploads');

            // Ensure uploads directory exists
            if (!fs.existsSync(uploadsDir)) {
                fs.mkdirSync(uploadsDir, { recursive: true });
            }

            // Generate filename based on timestamp
            const fileName = `snapshot_${Date.now()}.jpg`;
            const filePath = path.join(uploadsDir, fileName);

            // Write image to disk
            fs.writeFileSync(filePath, buffer);

            // Save the accessible URL
            finalSnapshotUrl = `/uploads/${fileName}`;
        }
    }

    try {
        const event = await Event.create({
            driverId,
            eventType,
            confidence,
            severity,
            snapshotUrl: finalSnapshotUrl
        });

        // Create Alert if severity is MEDIUM or HIGH
        if (severity === 'MEDIUM' || severity === 'HIGH') {
            const alert = await Alert.create({
                eventId: event._id,
                driverId,
                status: 'NEW'
            });

            // Emit real-time alert to Supervisors
            if (req.io) {
                // Fetch driver details to send with alert
                const detailedAlert = await Alert.findById(alert._id)
                    .populate('driverId', 'name email')
                    .populate('eventId');

                req.io.to('supervisor_room').emit('new_alert', detailedAlert);
            }
        }

        res.status(201).json(event);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route GET /api/events/:driverId
router.get('/:driverId', async (req, res) => {
    try {
        const events = await Event.find({ driverId: req.params.driverId }).sort({ createdAt: -1 });
        res.json(events);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
