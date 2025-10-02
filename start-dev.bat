@echo off
echo 🚀 Starte Gluecksmomente Development Environment...

echo 📊 Starte Backend mit Produktionsdatenbank...
cd backend
start /B cmd /c "set DATABASE_MODE=production && npm run dev"

echo 💻 Starte Frontend...
cd ..\frontend
start /B cmd /c "npm start"

echo ✅ Development Environment gestartet!
echo 📱 Frontend: http://localhost:3001
echo 🔧 Backend: http://localhost:5000  
echo 🗄️ Datenbank: MongoDB Atlas (Produktion)

pause