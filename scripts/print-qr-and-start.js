#!/usr/bin/env node
const { spawn } = require('child_process');
const QRCode = require('qrcode');

const url = process.env.RENDER_WEB_URL || process.argv[2];

async function printQr(u) {
  try {
    const str = await QRCode.toString(u, { type: 'terminal', small: true });
    console.log('\nPersistent public URL QR (scan this to open hosted app):\n');
    console.log(str);
    console.log(u + '\n');
  } catch (err) {
    console.error('Could not generate QR:', err.message);
  }
}

(async () => {
  if (url) {
    await printQr(url);
  } else {
    console.log('No RENDER_WEB_URL provided — skipping persistent QR.\nTo show a persistent QR set env RENDER_WEB_URL or pass it as first arg.');
  }

  // Start expo
  const args = ['expo', 'start', ...(process.argv.slice(2) || [])];
  const child = spawn('npx', args, { stdio: 'inherit', shell: true });

  child.on('exit', (code) => process.exit(code));
})();
