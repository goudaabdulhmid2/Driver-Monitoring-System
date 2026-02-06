# Driver Monitoring System

A real-time driver monitoring system built with a Node.js/Express backend and a React/Vite frontend. It uses MongoDB for data storage and Socket.IO/WebRTC for real-time communication and streaming.

## Prerequisites

-   [Docker](https://www.docker.com/) & Docker Compose (Recommended)
-   [Node.js](https://nodejs.org/) (Only required for manual setup)

## Project Structure

-   `backend/`: Node.js + Express API server
-   `frontend/`: React + Vite client application
-   `docker-compose.yml`: MongoDB service configuration

## Quick Start (Docker)

The easiest way to run the project is using Docker Compose.

1.  **Clone the repository**.
2.  **Start the application**:
    ```bash
    docker-compose up --build
    ```

The services will be available at:
-   **Frontend**: [http://localhost:5173](http://localhost:5173)
-   **Backend**: [http://localhost:5000](http://localhost:5000)
-   **MongoDB**: `localhost:27017`

## Manual Setup (Alternative)

If you prefer to run locally without Docker:

### 1. Database
Start MongoDB locally or use a cloud instance.

### 2. Backend
```bash
cd backend
npm install
# Create .env file with MONGO_URI, PORT, JWT_SECRET
npm start
```

### 3. Frontend
```bash
cd frontend
npm install
npm run dev
```

## Features

-   **Real-time Monitoring**: Uses Socket.IO for real-time events.
-   **Video Streaming**: WebRTC implementation for Supervisor <-> Driver communication.
-   **Alerts**: System to track and manage driver alerts.
-   **User Management**: basic authentication and user roles.

## Tech Stack

-   **Backend**: Node.js, Express, Mongoose, Socket.IO, JWT
-   **Frontend**: React, Vite, TailwindCSS (inferred), Socket.IO Client, WebRTC
-   **Database**: MongoDB
