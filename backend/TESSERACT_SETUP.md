# 📄 Tesseract.js OCR Integration

## Overview
This backend uses **Tesseract.js** for offline Optical Character Recognition (OCR) to automatically extract invoice data from uploaded images.

### Key Benefits:
✅ **Kostenlos** - No API fees or external dependencies  
✅ **Offline** - Runs entirely on your server  
✅ **Sicher** - No data sent to third parties  
✅ **Mehrsprachig** - Deutsch + Englisch support  

---

## Installation

Already installed via `npm install tesseract.js`

## How It Works

### Workflow:
```
1. User uploads receipt/invoice image (Frontend)
   ↓
2. POST /guv-rechnung/analyze-image
   ↓
3. Tesseract.js performs OCR (Deutsch + Englisch)
   ↓
4. Regex patterns extract structured data
   ↓
5. Preview dialog shows extracted values
   ↓
6. User confirms and saves entry
```

## Extracted Data Fields

### 1. **Datum** (Date)
Supported formats:
- `12.12.2024` (DD.MM.YYYY)
- `12-12-2024` (DD-MM-YYYY)
- `2024-12-12` (YYYY-MM-DD)
- `Dezember 12, 2024`

### 2. **Betrag** (Amount)
Recognized patterns:
- `100,50€`
- `€100.50`
- `Betrag: 100,00`
- `Gesamt: 99,99 EUR`

### 3. **Referenznummer** (Reference)
Extracts:
- `Rechnung: RG-2024-001`
- `Bestellnummer: PO-123`
- `Ref: INV-456`

### 4. **Typ** (Type) - Auto-detected
Based on keywords:
- **material** - "Material", "Rohstoff", "Komponente"
- **arbeit** - "Arbeit", "Lohn", "Service", "Stunden"
- **einkauf** - "Einkauf", "Bestellung", "Lieferung"
- **sonstiges** - "Transport", "Miete", "Gebühren"

### 5. **Beschreibung** (Description)
- First 200 characters of OCR text
- Or auto-generated fallback

---

## Testing OCR

### Quick Test:
```bash
# Test if Tesseract.js loads
node -e "const T = require('tesseract.js'); console.log('✅ Loaded');"
```

### Manual Test:
```bash
# Start server
npm start

# In another terminal, test with cURL:
curl -X POST http://localhost:5000/api/guv-rechnung/analyze-image \
  -F "image=@/path/to/receipt.jpg" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Performance

| Metric | Time |
|--------|------|
| First run (WASM loading) | ~3-5s |
| Subsequent runs | ~2-3s |
| OCR per image | Depends on quality/size |
| Memory usage | ~150-200MB |

### Optimization Tips:
- Compress images before upload (< 2MB recommended)
- Ensure good image quality (text clearly readable)
- Crop to invoice area (faster processing)

---

## Error Handling

If OCR fails or extraction incomplete:
```javascript
{
  datum: "2026-06-12",           // Today's date (fallback)
  beschreibung: "Hochgeladene Rechnung",
  betrag: 0,                     // User can edit
  referenznummer: "",            // Empty if not found
  typ: "einkauf"                 // Default type
}
```

---

## Improving Accuracy

### For Better Results:
1. **Image Quality** - High contrast, clear text
2. **Invoice Format** - Standard receipts/invoices work best
3. **Lighting** - Avoid shadows/glare
4. **Language** - German/English text clearly printed

### Adding More Patterns:
Edit `extractDataFromOCRText()` in `guvController.js`:
```javascript
// Add new date formats
/pattern/

// Add new amount patterns
/betrag\s*=\s*(\d+)/i

// Add new type keywords
'custom': ['keyword1', 'keyword2']
```

---

## Troubleshooting

### Issue: OCR Times Out
**Solution:** Reduce image size or check network

### Issue: Wrong Data Extracted
**Solution:** 
- Check image quality
- Add custom regex patterns
- Manually edit in preview dialog

### Issue: Memory Usage High
**Solution:** 
- Restart backend periodically
- Use smaller images
- Consider running on server with more RAM

---

## Future Enhancements

### Possible Improvements:
- [ ] Add confidence scores for each extraction
- [ ] Support more languages
- [ ] Custom training for specific invoice formats
- [ ] Cloud storage for images (S3/Azure)
- [ ] Batch processing for multiple receipts
- [ ] Handwritten text recognition

---

## API Reference

### POST /guv-rechnung/analyze-image

**Request:**
```
POST /api/guv-rechnung/analyze-image
Content-Type: multipart/form-data
Authorization: Bearer {token}

Body: form data with 'image' file
```

**Response:**
```json
{
  "success": true,
  "message": "Bildanalyse erfolgreich abgeschlossen",
  "data": {
    "datum": "2024-12-15",
    "beschreibung": "Rechnung für Materialien...",
    "betrag": 149.99,
    "referenznummer": "RG-2024-001",
    "typ": "material",
    "image_url": "data:image/jpeg;base64,..."
  }
}
```

---

## Security Notes

- ✅ Image files validated (only image/* MIME types)
- ✅ File size limited to 10MB
- ✅ Requires authentication (Admin only)
- ✅ No data sent externally
- ⚠️ Data URLs stored in MongoDB (consider cloud storage for production)

---

**Last Updated:** 2026-06-12
**Status:** ✅ Production Ready
