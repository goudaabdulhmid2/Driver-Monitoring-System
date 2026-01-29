const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const { Server } = require('socket.io');

dotenv.config();

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors());
app.use(express.json());

// Database Connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.error('MongoDB Connection Error:', err));

app.use('/api/auth', require('./routes/auth'));

// Inject Socket.IO into Request
app.use((req, res, next) => {
    req.io = io;
    next();
});

app.use('/api/events', require('./routes/events'));
app.use('/api/alerts', require('./routes/alerts'));
app.use('/api/users', require('./routes/users'));

// Socket.IO Setup
const io = new Server(server, {
    cors: {
        origin: '*', // Allow all origins for MVP. Production should restrict this.
        methods: ['GET', 'POST']
    }
});

io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    socket.on('join_supervisor', () => {
        socket.join('supervisor_room');
        console.log(`Socket ${socket.id} joined supervisor_room`);
    });

    // WebRTC Signaling
    socket.on('join_stream_room', (roomId) => {
        socket.join(roomId);
        console.log(`Socket ${socket.id} joined stream room: ${roomId}`);
        // Notify others in room (Driver) that a viewer joined
        socket.to(roomId).emit('viewer_joined', socket.id);
    });

    socket.on('offer', (payload) => {
        io.to(payload.target).emit('offer', payload);
    });

    socket.on('answer', (payload) => {
        io.to(payload.target).emit('answer', payload);
    });

    socket.on('ice_candidate', (payload) => {
        io.to(payload.target).emit('ice_candidate', payload);
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

// Basic Route
app.get('/', (req, res) => {
    res.send('Driver Monitoring System API is running');
});

// Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

module.exports = { app, io };
