#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');

// Determine port and URL to encode in QR: prefer env VARs, otherwise localhost dev server
const port = process.env.EXPO_PORT || process.env.PORT || '19006';
const url = process.env.URL || process.env.RENDER_WEB_URL || `http://localhost:${port}`;

// Generate QR (using the existing script)
const child = spawn(process.execPath, [path.join(__dirname, 'generate-qr.js'), url], { stdio: 'inherit' });
child.on('exit', (code) => {
  if (code !== 0) {
    process.exit(code);
  }

  // After QR generation, start Expo dev server via npx so global expo isn't required
  // Pass the same port so the dev server and QR use a consistent address.
  const start = spawn('npx', ['expo', 'start', '--port', String(port)], { stdio: 'inherit', shell: true });
  start.on('exit', (c) => process.exit(c));
});
