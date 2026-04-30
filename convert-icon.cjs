const sharp = require('sharp');
const fs = require('fs');

async function run() {
  try {
    const input = 'public/icon.png';
    await sharp(input).resize(192, 192).toFile('public/pwa-icon-192.png');
    await sharp(input).resize(512, 512).toFile('public/pwa-icon-512.png');
    await sharp(input).resize(180, 180).toFile('public/apple-touch-icon.png');
    await sharp(input).resize(512, 512).toFile('public/logo.png');
    await sharp(input).resize(512, 512).toFile('src/assets/oprisma-logo.png');
    console.log('Conversion successful!');
  } catch (err) {
    console.error('Error converting:', err.message);
  }
}
run();
