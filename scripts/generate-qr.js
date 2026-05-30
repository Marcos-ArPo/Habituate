#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');

const url = process.argv[2] || process.env.URL || process.env.RENDER_WEB_URL || process.env.RENDER_WEB_URL;
if (!url) {
  console.error('URL not provided. Usage: node scripts/generate-qr.js <URL> or set RENDER_WEB_URL env');
  process.exit(2);
}

const outDir = path.resolve(process.cwd(), 'artifacts');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, 'qr.png');

QRCode.toFile(outFile, url, {
  type: 'png',
  width: 512,
  margin: 2,
  color: {
    dark: '#000000',
    light: '#FFFFFF'
  }
})
  .then(() => {
    console.log('QR generated at', outFile);
    console.log('URL:', url);
  })
  .catch((err) => {
    console.error('Failed to generate QR:', err);
    process.exit(1);
  });
