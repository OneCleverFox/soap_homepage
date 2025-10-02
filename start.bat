@echo off
REM Railway Deployment Script for Windows

echo Starting Railway deployment for backend...

REM Navigate to backend directory
cd backend

REM Install dependencies
echo Installing dependencies...
npm install --production

REM Start the application
echo Starting application...
npm start