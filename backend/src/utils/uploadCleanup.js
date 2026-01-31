const fs = require('fs');
const path = require('path');

/**
 * Bereinigt alte temporäre Upload-Dateien
 * Löscht Dateien die älter als 1 Stunde sind
 */
const cleanupUploads = () => {
  const uploadsDir = path.join(__dirname, '../uploads/products');
  
  if (!fs.existsSync(uploadsDir)) {
    return;
  }

  const files = fs.readdirSync(uploadsDir);
  const now = Date.now();
  const oneHour = 60 * 60 * 1000;

  files.forEach(file => {
    const filePath = path.join(uploadsDir, file);
    
    try {
      const stats = fs.statSync(filePath);
      const age = now - stats.mtime.getTime();
      
      if (age > oneHour) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      // Stille Fehlerbehandlung
    }
  });
};

// Cleanup alle 30 Minuten ausführen
setInterval(cleanupUploads, 30 * 60 * 1000);

// Initial cleanup beim Start
setTimeout(cleanupUploads, 5000);

module.exports = cleanupUploads;