#!/usr/bin/env node

/**
 * Production Startup Script
 * Handles Railway-specific deployment issues
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 Starting production setup...');

// 1. Ensure upload directories exist
const ensureDirectories = () => {
  const dirs = [
    path.join(__dirname, 'uploads'),
    path.join(__dirname, 'uploads/products'),
    path.join(__dirname, 'logs')
  ];

  dirs.forEach(dir => {
    try {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`✅ Created directory: ${dir}`);
      }
    } catch (error) {
      console.warn(`⚠️ Could not create directory ${dir}:`, error.message);
    }
  });
};

// 2. Test Sharp installation
const testSharp = () => {
  try {
    const sharp = require('sharp');
    console.log('📸 Sharp successfully loaded - Image optimization available');
    return true;
  } catch (error) {
    console.warn('⚠️ Sharp not available - Images will be served without optimization');
    console.warn('   Error:', error.message);
    return false;
  }
};

// 3. Test MongoDB connection string format
const testMongoConfig = () => {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('❌ MONGODB_URI environment variable not set');
    return false;
  }
  
  if (!mongoUri.startsWith('mongodb://') && !mongoUri.startsWith('mongodb+srv://')) {
    console.error('❌ Invalid MongoDB URI format');
    return false;
  }
  
  console.log('✅ MongoDB URI format valid');
  return true;
};

// 4. Check critical environment variables
const checkEnvVars = () => {
  const required = ['JWT_SECRET', 'MONGODB_URI'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:', missing.join(', '));
    return false;
  }
  
  console.log('✅ All required environment variables present');
  return true;
};

// Run all checks
console.log('🔧 Running production checks...');
ensureDirectories();
testSharp();

if (!testMongoConfig() || !checkEnvVars()) {
  console.error('💥 Production setup failed');
  process.exit(1);
}

console.log('✅ Production setup complete - Starting server...');

// Start the actual server
require('./server.js');