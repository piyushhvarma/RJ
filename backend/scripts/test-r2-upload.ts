import 'dotenv/config';
import { ConfigService } from '@nestjs/config';
import { StorageService } from '../src/common/storage/storage.service.js';
import sharp from 'sharp';

async function testR2() {
  console.log('Testing Cloudflare R2 connection...');
  const config = new ConfigService();
  const storage = new StorageService(config);

  // Generate a test 100x100 SVG converted to PNG buffer
  const sampleSvg = Buffer.from(
    '<svg width="100" height="100"><rect width="100" height="100" fill="#f59e0b"/><text x="50" y="55" font-family="Arial" font-size="14" fill="#ffffff" text-anchor="middle">R2 TEST</text></svg>'
  );
  const samplePng = await sharp(sampleSvg).png().toBuffer();

  console.log('Sample image generated. Uploading to R2...');
  const url = await storage.saveFile(samplePng, 'jewellery', 'test.png');
  console.log(`\nSUCCESS! File uploaded to Cloudflare R2:\n${url}\n`);

  // Verify fetch of public URL
  console.log('Testing public fetch from R2.dev URL...');
  const res = await fetch(url);
  console.log(`Public fetch HTTP Status: ${res.status} ${res.statusText}`);
  console.log(`Content-Type: ${res.headers.get('content-type')}`);
  console.log(`Content-Length: ${res.headers.get('content-length')} bytes`);

  if (res.ok) {
    console.log('\n🎉 CLOUDFLARE R2 IS 100% OPERATIONAL!');
  } else {
    console.error('\n❌ Could not fetch file from public URL. Check public access settings.');
  }
}

testR2().catch((err) => {
  console.error('R2 Test Error:', err);
  process.exit(1);
});
