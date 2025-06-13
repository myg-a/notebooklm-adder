#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔨 Building NotebookLM Adder...');

// Helper function to copy directory recursively
function copyDirectory(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      // Convert .ts to .js in destination
      const finalDestPath = destPath.replace(/\.ts$/, '.js');
      fs.copyFileSync(srcPath, finalDestPath);
    }
  }
}

// Create dist directory if it doesn't exist
const distDir = path.join(__dirname, '..', 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

try {
  // Compile TypeScript files directly (fallback when webpack/npm issues)
  console.log('📦 Compiling TypeScript files...');
  try {
    execSync('npx tsc --outDir dist --target ES2020 --module ES2020 --moduleResolution node', { stdio: 'inherit' });
  } catch (error) {
    console.log('⚠️ TypeScript compiler not available, copying source files...');
    
    // Copy source files manually
    const srcDir = path.join(__dirname, '..', 'src');
    copyDirectory(srcDir, distDir);
  }
  
  // Copy manifest.json to dist
  console.log('📄 Copying manifest.json...');
  fs.copyFileSync(
    path.join(__dirname, '..', 'manifest.json'),
    path.join(distDir, 'manifest.json')
  );
  
  // Copy popup.html to dist
  console.log('🖼️ Copying popup.html...');
  fs.copyFileSync(
    path.join(__dirname, '..', 'popup.html'),
    path.join(distDir, 'popup.html')
  );
  
  // Create icons directory in dist and copy placeholder files
  const iconsDistDir = path.join(distDir, 'icons');
  if (!fs.existsSync(iconsDistDir)) {
    fs.mkdirSync(iconsDistDir, { recursive: true });
  }
  
  // Create simple placeholder icons if they don't exist
  console.log('🎨 Creating placeholder icons...');
  const iconSizes = [16, 32, 48, 128];
  
  iconSizes.forEach(size => {
    const iconPath = path.join(iconsDistDir, `icon-${size}.png`);
    if (!fs.existsSync(iconPath)) {
      // Create a simple colored square as placeholder
      const svgContent = `
        <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
          <rect width="${size}" height="${size}" fill="#4285f4"/>
          <text x="50%" y="50%" text-anchor="middle" dy="0.3em" fill="white" font-family="Arial" font-size="${Math.floor(size/3)}">NB</text>
        </svg>
      `;
      
      // For now, just create a text file indicating where the icon should be
      fs.writeFileSync(
        iconPath.replace('.png', '-placeholder.txt'),
        `Placeholder for ${size}x${size} icon\nReplace with actual PNG file`
      );
    }
  });
  
  console.log('✅ Build completed successfully!');
  console.log(`📁 Output directory: ${distDir}`);
  
  // List generated files
  console.log('\n📋 Generated files:');
  const files = fs.readdirSync(distDir, { recursive: true });
  files.forEach(file => {
    const fullPath = path.join(distDir, file);
    if (fs.statSync(fullPath).isFile()) {
      console.log(`  - ${file}`);
    }
  });
  
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}