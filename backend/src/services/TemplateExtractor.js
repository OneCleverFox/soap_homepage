// Template-Extraktor für das Admin-Interface
const fs = require('fs').promises;
const path = require('path');

class TemplateExtractor {
  constructor() {
    this.emailServicePath = path.join(__dirname, 'emailService.js');
  }

  async extractTemplates() {
    try {
      const emailServiceContent = await fs.readFile(this.emailServicePath, 'utf8');
      
      const templates = {
        'verification': this.extractTemplate(emailServiceContent, 'sendVerificationEmail'),
        'welcome': this.extractTemplate(emailServiceContent, 'sendWelcomeEmail'),  
        'password-reset': this.extractTemplate(emailServiceContent, 'sendPasswordResetEmail'),
        'order-confirmation': this.extractTemplate(emailServiceContent, 'sendOrderConfirmation')
      };

      return templates;
    } catch (error) {
      console.error('❌ Fehler beim Extrahieren der Templates:', error);
      return {};
    }
  }

  extractTemplate(content, methodName) {
    try {
      // Finde die Methode
      const methodStart = content.indexOf(`async ${methodName}(`);
      if (methodStart === -1) {
        return `<p>Template für ${methodName} nicht gefunden</p>`;
      }

      // Finde den htmlContent Template-String
      const htmlContentStart = content.indexOf('const htmlContent = `', methodStart);
      if (htmlContentStart === -1) {
        return `<p>HTML Content für ${methodName} nicht gefunden</p>`;
      }

      // Finde das Ende des Template-Strings
      let templateStart = htmlContentStart + 'const htmlContent = `'.length;
      let braceCount = 1;
      let templateEnd = templateStart;
      
      while (braceCount > 0 && templateEnd < content.length) {
        if (content[templateEnd] === '`' && content[templateEnd - 1] !== '\\') {
          braceCount--;
        }
        templateEnd++;
      }

      const template = content.substring(templateStart, templateEnd - 1);
      return template.trim();
      
    } catch (error) {
      console.error(`❌ Fehler beim Extrahieren von ${methodName}:`, error);
      return `<p>Fehler beim Laden des Templates für ${methodName}</p>`;
    }
  }

  async updateTemplate(methodName, newTemplate) {
    try {
      const content = await fs.readFile(this.emailServicePath, 'utf8');
      
      // Finde die Methode und ersetze das Template
      const methodStart = content.indexOf(`async ${methodName}(`);
      if (methodStart === -1) {
        throw new Error(`Methode ${methodName} nicht gefunden`);
      }

      const htmlContentStart = content.indexOf('const htmlContent = `', methodStart);
      if (htmlContentStart === -1) {
        throw new Error(`HTML Content für ${methodName} nicht gefunden`);
      }

      let templateStart = htmlContentStart + 'const htmlContent = `'.length;
      let braceCount = 1;
      let templateEnd = templateStart;
      
      while (braceCount > 0 && templateEnd < content.length) {
        if (content[templateEnd] === '`' && content[templateEnd - 1] !== '\\') {
          braceCount--;
        }
        templateEnd++;
      }

      const newContent = content.substring(0, templateStart) + 
                        newTemplate + 
                        content.substring(templateEnd - 1);

      await fs.writeFile(this.emailServicePath, newContent, 'utf8');
      return true;
      
    } catch (error) {
      console.error(`❌ Fehler beim Update von ${methodName}:`, error);
      throw error;
    }
  }
}

module.exports = TemplateExtractor;