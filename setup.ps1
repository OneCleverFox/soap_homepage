# Entwicklungsumgebung Setup Script für Gluecksmomente
# Dieses Script automatisiert das Setup der Entwicklungsumgebung

Write-Host "🚀 Gluecksmomente MERN Stack Setup wird gestartet..." -ForegroundColor Green

# Überprüfen ob Node.js installiert ist
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js gefunden: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js ist nicht installiert. Bitte installieren Sie Node.js von https://nodejs.org/" -ForegroundColor Red
    exit 1
}

# Überprüfen ob npm installiert ist
try {
    $npmVersion = npm --version
    Write-Host "✅ npm gefunden: v$npmVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ npm ist nicht installiert." -ForegroundColor Red
    exit 1
}

# Hauptverzeichnis Dependencies installieren
Write-Host "📦 Installiere Hauptverzeichnis Dependencies..." -ForegroundColor Yellow
npm install

# Backend Dependencies installieren
Write-Host "📦 Installiere Backend Dependencies..." -ForegroundColor Yellow
Set-Location backend
npm install

# Backend .env Datei überprüfen
if (-not (Test-Path ".env")) {
    Write-Host "⚠️  .env Datei im Backend nicht gefunden. Bitte konfigurieren Sie die Umgebungsvariablen." -ForegroundColor Yellow
    Write-Host "Beispiel .env wurde bereits erstellt. Bitte anpassen:" -ForegroundColor Yellow
    Write-Host "- MONGODB_URI" -ForegroundColor Cyan
    Write-Host "- JWT_SECRET" -ForegroundColor Cyan
} else {
    Write-Host "✅ Backend .env Datei gefunden" -ForegroundColor Green
}

# Zurück zum Hauptverzeichnis
Set-Location ..

# Frontend Dependencies installieren
Write-Host "📦 Installiere Frontend Dependencies..." -ForegroundColor Yellow
Set-Location frontend
npm install

# Zurück zum Hauptverzeichnis
Set-Location ..

Write-Host "🎉 Setup abgeschlossen!" -ForegroundColor Green
Write-Host ""
Write-Host "Nächste Schritte:" -ForegroundColor Yellow
Write-Host "1. MongoDB starten (falls lokal installiert)" -ForegroundColor White
Write-Host "2. Backend .env Datei konfigurieren" -ForegroundColor White
Write-Host "3. Entwicklungsserver starten mit: npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "URLs nach dem Start:" -ForegroundColor Yellow
Write-Host "- Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host "- Backend API: http://localhost:5000" -ForegroundColor Cyan
Write-Host ""
Write-Host "Verfügbare Commands:" -ForegroundColor Yellow
Write-Host "- npm run dev          # Startet Frontend + Backend" -ForegroundColor Cyan
Write-Host "- npm run frontend     # Nur Frontend" -ForegroundColor Cyan
Write-Host "- npm run backend      # Nur Backend" -ForegroundColor Cyan
Write-Host "- npm run build        # Produktions-Build" -ForegroundColor Cyan