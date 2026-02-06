# Driver Monitoring System

A real-time driver monitoring system built with a Node.js/Express backend and a React/Vite frontend. It uses MongoDB for data storage and Socket.IO/WebRTC for real-time communication and streaming.

## Prerequisites

-   [Node.js](https://nodejs.org/) (v16+ recommended)
-   [Docker](https://www.docker.com/) & Docker Compose (for the database)

## Project Structure

-   `backend/`: Node.js + Express API server
-   `frontend/`: React + Vite client application
-   `docker-compose.yml`: MongoDB service configuration

## Setup Instructions

### 1. Database Setup

Start the MongoDB instance using Docker Compose from the root directory:

```bash
docker-compose up -d
```

This will start a MongoDB container listening on port `27017`.

### 2. Backend Setup

Navigate to the `backend` directory, install dependencies, and start the server.

```bash
cd backend
npm install
```

**Environment Variables:**
Ensure a `.env` file exists in the `backend/` directory with the following content (or adjust as needed):

```env
MONGO_URI=mongodb://127.0.0.1:27017/driver_monitoring
PORT=5000
JWT_SECRET=supersecretkey123
```

**Start the Server:**

```bash
npm start
```

The backend API will run on `http://localhost:5000`.

### 3. Frontend Setup

Navigate to the `frontend` directory, install dependencies, and start the development server.

```bash
cd frontend
npm install
npm run dev
```

The frontend application will be available at `http://localhost:5173` (or the port shown in your terminal).

## Features

-   **Real-time Monitoring**: Uses Socket.IO for real-time events.
-   **Video Streaming**: WebRTC implementation for Supervisor <-> Driver communication.
-   **Alerts**: System to track and manage driver alerts.
-   **User Management**: basic authentication and user roles.

## Tech Stack

-   **Backend**: Node.js, Express, Mongoose, Socket.IO, JWT
-   **Frontend**: React, Vite, TailwindCSS (inferred), Socket.IO Client, WebRTC
-   **Database**: MongoDB
