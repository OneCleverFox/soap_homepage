/**
 * Script zur Erstellung eines Default InvoiceTemplate mit korrekten Unternehmensdaten
 * Dieses Script sorgt dafür, dass das Impressum die richtigen Daten anzeigt
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Verbinde mit MongoDB
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB verbunden');
  } catch (error) {
    console.error('❌ MongoDB Verbindungsfehler:', error);
    process.exit(1);
  }
}

// InvoiceTemplate Schema definieren
const invoiceTemplateSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  isDefault: { type: Boolean, default: false },
  companyInfo: {
    name: { type: String, default: 'Glücksmomente Manufaktur' },
    address: {
      street: { type: String, default: 'Wasserwerkstrasse 15' },
      postalCode: { type: String, default: '68642' },
      city: { type: String, default: 'Bürstadt' },
      country: { type: String, default: 'Deutschland' }
    },
    contact: {
      phone: { type: String, default: '+49 123 456789' },
      email: { type: String, default: 'info@gluecksmomente-manufaktur.de' },
      website: { type: String, default: 'www.gluecksmomente-manufaktur.de' }
    },
    taxInfo: {
      taxNumber: { type: String, default: 'DE123456789' },
      vatId: { type: String, default: 'USt-IdNr.: DE123456789' },
      ceo: { type: String, default: '' },
      legalForm: { type: String, default: '' },
      taxOffice: { type: String, default: '' },
      registrationCourt: { type: String, default: '' }
    }
  }
}, { timestamps: true });

const InvoiceTemplate = mongoose.model('InvoiceTemplate', invoiceTemplateSchema);

// Default Template erstellen
async function createDefaultTemplate() {
  try {
    // Prüfe ob bereits ein Default Template existiert
    const existingTemplate = await InvoiceTemplate.findOne({ isDefault: true });
    
    if (existingTemplate) {
      console.log('✅ Default InvoiceTemplate bereits vorhanden:', existingTemplate.name);
      
      // Aktualisiere mit korrekten Daten für Glücksmomente Manufaktur
      await InvoiceTemplate.updateOne(
        { _id: existingTemplate._id },
        {
          $set: {
            'companyInfo.name': 'Glücksmomente Manufaktur',
            'companyInfo.address.street': '',  // Wird vom User ausgefüllt
            'companyInfo.address.postalCode': '68642',
            'companyInfo.address.city': 'Bürstadt',
            'companyInfo.address.country': 'Deutschland',
            'companyInfo.contact.email': 'info@gluecksmomente-manufaktur.de',
            'companyInfo.contact.phone': '',  // Wird vom User ausgefüllt
            'companyInfo.contact.website': 'www.gluecksmomente-manufaktur.de',
            'companyInfo.taxInfo.ceo': 'Ralf Jacob',
            'companyInfo.taxInfo.vatId': '',  // Muss vom User eingegeben werden
            'companyInfo.taxInfo.taxNumber': '',  // Muss vom User eingegeben werden
            'companyInfo.taxInfo.legalForm': 'Einzelunternehmen',
            'companyInfo.taxInfo.registrationCourt': 'Lampertheim'
          }
        }
      );
      
      console.log('✅ Default Template mit Glücksmomente Daten aktualisiert');
      return existingTemplate;
    }

    // Erstelle neues Default Template
    const defaultTemplate = new InvoiceTemplate({
      name: 'Glücksmomente Manufaktur - Standard',
      isDefault: true,
      companyInfo: {
        name: 'Glücksmomente Manufaktur',
        address: {
          street: '',  // Wird vom User ausgefüllt
          postalCode: '68642',
          city: 'Bürstadt',
          country: 'Deutschland'
        },
        contact: {
          phone: '',  // Wird vom User ausgefüllt  
          email: 'info@gluecksmomente-manufaktur.de',
          website: 'www.gluecksmomente-manufaktur.de'
        },
        taxInfo: {
          taxNumber: '',  // Muss vom User eingegeben werden
          vatId: '',  // Muss vom User eingegeben werden
          ceo: 'Ralf Jacob',
          legalForm: 'Einzelunternehmen',
          taxOffice: '',
          registrationCourt: ''
        }
      }
    });

    await defaultTemplate.save();
    console.log('✅ Default InvoiceTemplate erstellt');
    return defaultTemplate;
    
  } catch (error) {
    console.error('❌ Fehler beim Erstellen des Default Templates:', error);
    throw error;
  }
}

// Main Funktion
async function main() {
  console.log('🚀 Erstelle Default InvoiceTemplate für Glücksmomente Manufaktur...');
  
  await connectDB();
  const template = await createDefaultTemplate();
  
  console.log('\n📋 Erstelltes/Aktualisiertes Template:');
  console.log('Name:', template.companyInfo.name);
  console.log('Adresse:', `${template.companyInfo.address.postalCode} ${template.companyInfo.address.city}`);
  console.log('Email:', template.companyInfo.contact.email);
  console.log('CEO:', template.companyInfo.taxInfo.ceo);
  console.log('Rechtsform:', template.companyInfo.taxInfo.legalForm);
  console.log('\n⚠️  WICHTIG: Bitte in der Admin-Rechnungskonfiguration ergänzen:');
  console.log('- Straße und Hausnummer');
  console.log('- Telefonnummer');
  console.log('- USt-IdNr. (falls vorhanden)');
  console.log('- Steuernummer');
  
  await mongoose.disconnect();
  console.log('\n✅ Script abgeschlossen');
}

// Script ausführen
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { createDefaultTemplate };