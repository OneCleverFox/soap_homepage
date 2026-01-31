/**
 * Startup Logger - Saubere Checklisten-Ausgabe beim Server-Start
 */

class StartupLogger {
  constructor() {
    this.checks = [];
    this.startTime = Date.now();
  }

  addCheck(name, status, details = null) {
    this.checks.push({ name, status, details });
  }

  printHeader() {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║           🧼 Glücksmomente Backend Server                  ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
  }

  printChecklist() {
    console.log('📋 SYSTEM CHECK:');
    console.log('─'.repeat(60));
    
    for (const check of this.checks) {
      const icon = check.status === 'ok' ? '✅' : 
                   check.status === 'warning' ? '⚠️' : '❌';
      const status = check.status === 'ok' ? 'OK' :
                     check.status === 'warning' ? 'WARN' : 'FAIL';
      
      console.log(`${icon} ${check.name.padEnd(40)} [${status}]`);
      
      if (check.details && check.status !== 'ok') {
        console.log(`   ↳ ${check.details}`);
      }
    }
    
    console.log('─'.repeat(60));
  }

  printSummary(port) {
    const elapsed = Date.now() - this.startTime;
    const oks = this.checks.filter(c => c.status === 'ok').length;
    const warnings = this.checks.filter(c => c.status === 'warning').length;
    const errors = this.checks.filter(c => c.status === 'error').length;
    
    console.log('\n📊 SUMMARY:');
    console.log(`   ✅ Passed: ${oks}  ⚠️  Warnings: ${warnings}  ❌ Errors: ${errors}`);
    console.log(`   ⏱️  Startup time: ${elapsed}ms\n`);
    
    if (errors === 0) {
      console.log('╔═══════════════════════════════════════════════════════════╗');
      console.log(`║  🚀 Server läuft auf Port ${port.toString().padEnd(32)}║`);
      console.log(`║  🌐 API: http://localhost:${port}/api${' '.repeat(24)}║`);
      console.log(`║  ❤️  Health: http://localhost:${port}/api/health${' '.repeat(14)}║`);
      console.log('╚═══════════════════════════════════════════════════════════╝\n');
    } else {
      console.log('⛔ SERVER START FAILED - Bitte Fehler beheben\n');
    }
  }

  // Quick access methods
  ok(name, details) {
    this.addCheck(name, 'ok', details);
  }

  warn(name, details) {
    this.addCheck(name, 'warning', details);
  }

  error(name, details) {
    this.addCheck(name, 'error', details);
  }

  // Special formatted checks
  env(name, value, required = false) {
    if (value) {
      this.ok(`ENV: ${name}`, value === true ? 'SET' : value);
    } else if (required) {
      this.error(`ENV: ${name}`, 'NOT SET (REQUIRED)');
    } else {
      this.warn(`ENV: ${name}`, 'NOT SET');
    }
  }

  service(name, enabled, details = null) {
    if (enabled) {
      this.ok(name, details);
    } else {
      this.warn(name, details || 'Disabled');
    }
  }
}

module.exports = new StartupLogger();
