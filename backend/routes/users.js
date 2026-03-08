const express = require('express');
const User = require('../models/User');
const DriverProfile = require('../models/DriverProfile');

const router = express.Router();

// @route GET /api/users/drivers
// @desc Get all drivers with their profiles
router.get('/drivers', async (req, res) => {
    try {
        const drivers = await User.find({ role: 'DRIVER' }).select('-password');

        // Fetch profiles for these drivers
        const driversWithProfiles = await Promise.all(drivers.map(async (driver) => {
            const profile = await DriverProfile.findOne({ userId: driver._id });
            return {
                ...driver.toObject(),
                licenseNumber: profile?.licenseNumber || 'N/A',
                vehicleId: profile?.vehicleId || 'N/A',
                status: profile?.status || 'Unknown',
                currentStatus: profile?.currentStatus || 'NORMAL',
                safetyScore: profile?.safetyScore ?? 100,
                lastActiveAt: profile?.lastActiveAt
            };
        }));

        res.json(driversWithProfiles);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
