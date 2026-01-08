/**
 * Icon Generator for VocabLoop Extension
 *
 * Run with: node generate-icons.js
 * Requires: npm install canvas
 *
 * Generates PNG icons at 16, 48, and 128 pixel sizes.
 */

const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const sizes = [16, 48, 128];

function generateIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Background - emerald gradient
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, '#10b981');
  gradient.addColorStop(1, '#059669');
  ctx.fillStyle = gradient;

  // Rounded rectangle
  const radius = size * 0.2;
  ctx.beginPath();
  ctx.moveTo(radius, 0);
  ctx.lineTo(size - radius, 0);
  ctx.quadraticCurveTo(size, 0, size, radius);
  ctx.lineTo(size, size - radius);
  ctx.quadraticCurveTo(size, size, size - radius, size);
  ctx.lineTo(radius, size);
  ctx.quadraticCurveTo(0, size, 0, size - radius);
  ctx.lineTo(0, radius);
  ctx.quadraticCurveTo(0, 0, radius, 0);
  ctx.closePath();
  ctx.fill();

  // "V" letter
  ctx.fillStyle = 'white';
  ctx.font = `bold ${size * 0.6}px -apple-system, BlinkMacSystemFont, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('V', size / 2, size / 2 + size * 0.05);

  // Small loop/circle indicator
  ctx.strokeStyle = 'white';
  ctx.lineWidth = size * 0.08;
  ctx.beginPath();
  ctx.arc(size * 0.75, size * 0.25, size * 0.1, 0, Math.PI * 1.5);
  ctx.stroke();

  return canvas;
}

// Generate icons
for (const size of sizes) {
  const canvas = generateIcon(size);
  const buffer = canvas.toBuffer('image/png');
  const filename = path.join(__dirname, `icon${size}.png`);
  fs.writeFileSync(filename, buffer);
  console.log(`Generated: icon${size}.png`);
}

console.log('\\nAll icons generated!');
console.log('\\nNote: For production, consider using a professional icon design.');
