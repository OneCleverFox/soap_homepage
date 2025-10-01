const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Benutzername ist erforderlich'],
    trim: true,
    minlength: [3, 'Benutzername muss mindestens 3 Zeichen lang sein'],
    maxlength: [30, 'Benutzername darf maximal 30 Zeichen lang sein']
  },
  email: {
    type: String,
    required: [true, 'E-Mail ist erforderlich'],
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Bitte geben Sie eine gültige E-Mail-Adresse ein']
  },
  password: {
    type: String,
    required: [true, 'Passwort ist erforderlich'],
    minlength: [6, 'Passwort muss mindestens 6 Zeichen lang sein']
  },
  firstName: {
    type: String,
    required: [true, 'Vorname ist erforderlich'],
    trim: true
  },
  lastName: {
    type: String,
    required: [true, 'Nachname ist erforderlich'],
    trim: true
  },
  role: {
    type: String,
    enum: {
      values: ['admin', 'manager', 'employee'],
      message: 'Ungültige Benutzerrolle'
    },
    default: 'employee'
  },
  permissions: [{
    type: String,
    enum: [
      'products.read',
      'products.write',
      'products.delete',
      'orders.read',
      'orders.write',
      'orders.delete',
      'inventory.read',
      'inventory.write',
      'users.read',
      'users.write',
      'users.delete',
      'analytics.read',
      'settings.write'
    ]
  }],
  profile: {
    avatar: String,
    phone: String,
    department: String,
    position: String
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: Date,
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  twoFactorAuth: {
    enabled: {
      type: Boolean,
      default: false
    },
    secret: String,
    backupCodes: [String]
  }
}, {
  timestamps: true
});

// Unique Indexes
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ username: 1 }, { unique: true });

// Virtual für Vollständiger Name
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual für Account gesperrt
userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Passwort hashen vor dem Speichern
userSchema.pre('save', async function(next) {
  // Nur hashen wenn Passwort geändert wurde
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Standard-Berechtigungen basierend auf Rolle setzen
userSchema.pre('save', function(next) {
  if (this.isModified('role')) {
    switch (this.role) {
      case 'admin':
        this.permissions = [
          'products.read', 'products.write', 'products.delete',
          'orders.read', 'orders.write', 'orders.delete',
          'inventory.read', 'inventory.write',
          'users.read', 'users.write', 'users.delete',
          'analytics.read', 'settings.write'
        ];
        break;
      case 'manager':
        this.permissions = [
          'products.read', 'products.write',
          'orders.read', 'orders.write',
          'inventory.read', 'inventory.write',
          'analytics.read'
        ];
        break;
      case 'employee':
        this.permissions = [
          'products.read',
          'orders.read', 'orders.write',
          'inventory.read'
        ];
        break;
    }
  }
  next();
});

// Passwort vergleichen
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Login-Versuche erhöhen
userSchema.methods.incLoginAttempts = function() {
  // Wenn bereits gesperrt und Sperrzeit abgelaufen
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 }
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  
  // Sperre Account nach 5 fehlgeschlagenen Versuchen für 2 Stunden
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 }; // 2 Stunden
  }
  
  return this.updateOne(updates);
};

// Login erfolgreich - Reset der Versuche
userSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $unset: { loginAttempts: 1, lockUntil: 1 },
    $set: { lastLogin: new Date() }
  });
};

// Berechtigung prüfen
userSchema.methods.hasPermission = function(permission) {
  return this.permissions.includes(permission) || this.role === 'admin';
};

// Passwort-Reset Token generieren
userSchema.methods.createPasswordResetToken = function() {
  const resetToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  
  this.passwordResetToken = require('crypto')
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 Minuten
  
  return resetToken;
};

module.exports = mongoose.model('User', userSchema);