const express = require('express');
const Event = require('../models/Event');
const Alert = require('../models/Alert');
const fs = require('fs');
const path = require('path');

const router = express.Router();

// @route POST /api/events
router.post('/', async (req, res) => {
    let { driverId, eventType, confidence, severity, snapshotUrl, source } = req.body;

    // Auto-map AI detections to the registered user without needing manual .env ID syncing
    const DriverProfile = require('../models/DriverProfile');
    const User = require('../models/User');
    
    let defaultProfile = await DriverProfile.findOne();
    
    // Auto-heal: If no driver profile exists at all (legacy account), create one for the first driver user
    if (!defaultProfile) {
        const firstUser = await User.findOne({ role: 'DRIVER' }) || await User.findOne();
        if (firstUser) {
            defaultProfile = await DriverProfile.create({
                userId: firstUser._id,
                licenseNumber: "AUTO-GEN-" + Math.floor(Math.random() * 10000),
                vehicleId: "AUTO-VEH-" + Math.floor(Math.random() * 10000)
            });
        }
    }

    if (defaultProfile) {
        driverId = defaultProfile.userId;
    }

    let finalSnapshotUrl = snapshotUrl;

    // Convert Base64 payload to File System Image
    if (snapshotUrl && snapshotUrl.startsWith('data:image')) {
        const matches = snapshotUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
            const buffer = Buffer.from(matches[2], 'base64');
            const uploadsDir = path.join(__dirname, '..', 'uploads');

            if (!fs.existsSync(uploadsDir)) {
                fs.mkdirSync(uploadsDir, { recursive: true });
            }

            const fileName = `snapshot_${Date.now()}.jpg`;
            const filePath = path.join(uploadsDir, fileName);

            fs.writeFileSync(filePath, buffer);
            finalSnapshotUrl = `/uploads/${fileName}`;
        }
    }

    // Auto-map severity if missing/incorrect, or just enforce rule
    let finalSeverity = severity;
    let scoreDeduction = 0;

    switch (eventType) {
        case 'DROWSINESS': finalSeverity = 'CRITICAL'; scoreDeduction = 10; break;
        case 'PHONE_USAGE': finalSeverity = 'MEDIUM'; scoreDeduction = 5; break;
        case 'DISTRACTION': finalSeverity = 'MEDIUM'; scoreDeduction = 4; break;
        case 'NO_SEATBELT': finalSeverity = 'MEDIUM'; scoreDeduction = 3; break;
        default: finalSeverity = 'LOW'; scoreDeduction = 0; break;
    }

    try {
        const event = await Event.create({
            driverId,
            eventType,
            confidence,
            severity: finalSeverity,
            snapshotUrl: finalSnapshotUrl,
            source: source || 'SYSTEM'
        });

        // Update Driver's real-time state and safety score
        const profile = await DriverProfile.findOneAndUpdate(
            { userId: driverId },
            {
                $inc: { safetyScore: -scoreDeduction },
                $set: { currentStatus: eventType } // Simplified current status tracking
            },
            { new: true }
        );

        // Normalize score to floor of 0
        if (profile && profile.safetyScore < 0) {
            profile.safetyScore = 0;
            await profile.save();
        }

        // Broadcast Driver Profile Update
        if (req.io && profile) {
            req.io.emit('driver_status_update', profile);
        }

        // Create Alert if severity is stringer than LOW
        if (finalSeverity === 'MEDIUM' || finalSeverity === 'HIGH' || finalSeverity === 'CRITICAL') {
            const alert = await Alert.create({
                eventId: event._id,
                driverId,
                status: 'ACTIVE'
            });

            if (req.io) {
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
