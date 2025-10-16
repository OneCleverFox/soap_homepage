const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Benutzername ist erforderlich'],
    unique: true,
    trim: true,
    minlength: [3, 'Benutzername muss mindestens 3 Zeichen lang sein']
  },
  email: {
    type: String,
    required: [true, 'E-Mail ist erforderlich'],
    unique: true, // Dies erstellt automatisch einen Index - entferne duplicaten schema.index()
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Bitte geben Sie eine gültige E-Mail-Adresse ein']
  },
  password: {
    type: String,
    required: [true, 'Passwort ist erforderlich'],
    minlength: [6, 'Passwort muss mindestens 6 Zeichen lang sein'],
    alias: 'passwort'
  },
  role: {
    type: String,
    enum: ['admin', 'user', 'customer'],
    default: 'customer'
  },
  status: {
    type: String,
    enum: ['active', 'blocked', 'pending'],
    default: 'active'
  },
  firstName: {
    type: String,
    trim: true,
    alias: 'vorname'
  },
  lastName: {
    type: String,
    trim: true,
    alias: 'nachname'
  },
  phone: {
    type: String,
    trim: true,
    alias: 'telefon'
  },
  lastLogin: {
    type: Date
  },
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: {
    type: Date
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Index für schnellere Suche - email index wird automatisch durch unique: true erstellt
userSchema.index({ username: 1 });
userSchema.index({ status: 1 });

// Virtual für vollständigen Namen
userSchema.virtual('fullName').get(function() {
  if (this.firstName && this.lastName) {
    return `${this.firstName} ${this.lastName}`;
  }
  return this.username;
});

// Passwort hashen vor dem Speichern
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Passwort-Vergleichsmethode
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Check ob Account gesperrt ist
userSchema.methods.isLocked = function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
};

// Account-Sperre aufheben
userSchema.methods.unlock = function() {
  this.loginAttempts = 0;
  this.lockUntil = undefined;
};

// Login-Versuch registrieren
userSchema.methods.incLoginAttempts = function() {
  // Wenn Sperre abgelaufen ist, zurücksetzen
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $set: { loginAttempts: 1 },
      $unset: { lockUntil: 1 }
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  const maxAttempts = 5;
  const lockTime = 2 * 60 * 60 * 1000; // 2 Stunden
  
  // Sperre nach 5 Versuchen
  if (this.loginAttempts + 1 >= maxAttempts && !this.isLocked()) {
    updates.$set = { lockUntil: Date.now() + lockTime };
  }
  
  return this.updateOne(updates);
};

// Sensible Daten aus JSON ausblenden
userSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

const User = mongoose.model('User', userSchema, 'kundendaten');

module.exports = User;
