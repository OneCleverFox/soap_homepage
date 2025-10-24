const fs = require('fs');
const path = require('path');

/**
 * Bereinigt alte temporäre Upload-Dateien
 * Löscht Dateien die älter als 1 Stunde sind
 */
const cleanupUploads = () => {
  const uploadsDir = path.join(__dirname, '../uploads/products');
  
  if (!fs.existsSync(uploadsDir)) {
    console.log('📁 Upload-Verzeichnis existiert nicht:', uploadsDir);
    return;
  }

  const files = fs.readdirSync(uploadsDir);
  const now = Date.now();
  const oneHour = 60 * 60 * 1000; // 1 Stunde in ms
  let cleaned = 0;

  files.forEach(file => {
    const filePath = path.join(uploadsDir, file);
    
    try {
      const stats = fs.statSync(filePath);
      const age = now - stats.mtime.getTime();
      
      if (age > oneHour) {
        fs.unlinkSync(filePath);
        cleaned++;
        console.log('🗑️ Alte Datei gelöscht:', file);
      }
    } catch (error) {
      console.warn('⚠️ Fehler beim Bereinigen von:', file, error.message);
    }
  });

  if (cleaned > 0) {
    console.log(`✅ ${cleaned} alte Upload-Dateien bereinigt`);
  } else {
    console.log('✨ Keine alten Upload-Dateien gefunden');
  }
};

// Cleanup alle 30 Minuten ausführen
setInterval(cleanupUploads, 30 * 60 * 1000);

// Initial cleanup beim Start
setTimeout(cleanupUploads, 5000);

module.exports = cleanupUploads;