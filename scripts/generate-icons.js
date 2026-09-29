/**
 * Generate PWA Icons
 * This script generates placeholder icons for the PWA manifest.
 * In production, replace these with actual branded icons.
 */

const fs = require('fs');
const path = require('path');

// Create simple SVG icons that can be converted to PNG
const svgIcon = `
<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" fill="#6366f1"/>
  <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" 
        font-family="Arial, sans-serif" font-size="200" fill="white">D</text>
</svg>
`;

const publicDir = path.join(__dirname, '..', 'public');

// Write SVG placeholder
fs.writeFileSync(path.join(publicDir, 'icon-placeholder.svg'), svgIcon.trim());

console.log('Icon placeholder generated. For production:');
console.log('1. Replace icon-placeholder.svg with your actual icon');
console.log('2. Convert to PNG: icon-192x192.png and icon-512x512.png');
console.log('3. Tools: https://convertio.co/svg-png/ or similar');
