#!/bin/bash
# Entwicklungsstart-Script

echo "🚀 Starte Gluecksmomente Development Environment..."

# Backend mit Produktionsdatenbank starten
echo "📊 Starte Backend mit Produktionsdatenbank..."
cd backend
DATABASE_MODE=production npm run dev &
BACKEND_PID=$!

# Frontend starten
echo "💻 Starte Frontend..."
cd ../frontend
npm start &
FRONTEND_PID=$!

echo "✅ Development Environment gestartet!"
echo "📱 Frontend: http://localhost:3001"
echo "🔧 Backend: http://localhost:5000"
echo "🗄️ Datenbank: MongoDB Atlas (Produktion)"

# Warten auf Benutzer-Input zum Beenden
read -p "Drücken Sie Enter zum Beenden..."

# Prozesse beenden
kill $BACKEND_PID $FRONTEND_PID
echo "🛑 Development Environment beendet."