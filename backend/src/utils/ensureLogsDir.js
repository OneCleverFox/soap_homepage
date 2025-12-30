const fs = require('fs');
const path = require('path');

// Erstelle logs Verzeichnis falls es nicht existiert
const logsDir = path.join(__dirname, '../../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}