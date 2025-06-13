#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('📦 Packaging NotebookLM Adder for distribution...');

const projectRoot = path.join(__dirname, '..');
const distDir = path.join(projectRoot, 'dist');
const packageName = 'notebooklm-adder.zip';
const packagePath = path.join(projectRoot, packageName);

try {
  // Check if dist directory exists
  if (!fs.existsSync(distDir)) {
    console.log('🔨 Dist directory not found, running build first...');
    execSync('node scripts/build.js', { stdio: 'inherit', cwd: projectRoot });
  }
  
  // Remove existing package if it exists
  if (fs.existsSync(packagePath)) {
    console.log('🗑️ Removing existing package...');
    fs.unlinkSync(packagePath);
  }
  
  // Create the package
  console.log('📦 Creating distribution package...');
  
  // Change to dist directory and create zip
  process.chdir(distDir);
  
  // Use native zip command or cross-platform alternative
  try {
    execSync(`zip -r "${packagePath}" .`, { stdio: 'inherit' });
  } catch (error) {
    // Fallback for systems without zip command - just show error for now
    console.log('⚠️ zip command not found. Please install zip or manually create archive from dist/ folder.');
    process.exit(1);
  }
  
  // Return to project root
  process.chdir(projectRoot);
  
  // Verify package was created
  if (fs.existsSync(packagePath)) {
    const stats = fs.statSync(packagePath);
    const fileSizeInKB = Math.round(stats.size / 1024);
    
    console.log('✅ Package created successfully!');
    console.log(`📁 File: ${packageName}`);
    console.log(`📏 Size: ${fileSizeInKB} KB`);
    
    // Display installation instructions
    console.log('\n🚀 Installation Instructions:');
    console.log('1. Open Chrome and go to chrome://extensions/');
    console.log('2. Enable "Developer mode" (toggle in top right)');
    console.log('3. Click "Load unpacked" and select the dist/ folder');
    console.log('   OR');
    console.log('4. Extract the ZIP file and load the extracted folder');
    
    console.log('\n📋 Package Contents:');
    execSync(`unzip -l "${packagePath}"`, { stdio: 'inherit' });
    
  } else {
    throw new Error('Package file was not created');
  }
  
} catch (error) {
  console.error('❌ Packaging failed:', error.message);
  process.exit(1);
}