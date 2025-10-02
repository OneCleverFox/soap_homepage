#!/bin/bash
# Railway Deployment Script

echo "Starting Railway deployment for backend..."

# Navigiere zum Backend Verzeichnis
cd backend

# Installiere Dependencies
echo "Installing dependencies..."
npm install --production

# Starte die Anwendung
echo "Starting application..."
npm start