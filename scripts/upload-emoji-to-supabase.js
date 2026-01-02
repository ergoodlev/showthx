/**
 * Upload Fluent Emoji 3D PNGs to Supabase Storage
 * Run with: node scripts/upload-emoji-to-supabase.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Supabase config - SERVICE KEY REMOVED AFTER USE
const SUPABASE_URL = 'https://lufpjgmvkccrmefdykki.supabase.co';
const SUPABASE_SERVICE_KEY = 'YOUR_SERVICE_KEY_HERE'; // REMOVED - was used once for upload

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const emojiDir = path.join(__dirname, '../assets/fluent-emoji-3d');
const bucketName = 'stickers';

async function uploadEmoji() {
  console.log('Uploading Fluent Emoji 3D to Supabase...\n');

  // Get all PNG files
  const files = fs.readdirSync(emojiDir).filter(f => f.endsWith('.png'));
  console.log(`Found ${files.length} emoji to upload\n`);

  let uploaded = 0;
  let failed = 0;

  for (const file of files) {
    const filePath = path.join(emojiDir, file);
    const fileBuffer = fs.readFileSync(filePath);

    // Upload as fluent-{name}.png
    const storagePath = `fluent-${file}`;

    try {
      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(storagePath, fileBuffer, {
          contentType: 'image/png',
          upsert: true, // Overwrite if exists
        });

      if (error) {
        console.log(`  ✗ ${file}: ${error.message}`);
        failed++;
      } else {
        console.log(`  ✓ ${file} -> ${storagePath}`);
        uploaded++;
      }
    } catch (err) {
      console.log(`  ✗ ${file}: ${err.message}`);
      failed++;
    }
  }

  console.log(`\n✅ Uploaded: ${uploaded}`);
  console.log(`❌ Failed: ${failed}`);

  // Generate the public URL base
  const publicUrlBase = `${SUPABASE_URL}/storage/v1/object/public/${bucketName}`;
  console.log(`\nPublic URL pattern:`);
  console.log(`${publicUrlBase}/fluent-{emoji-id}.png`);

  // Generate sticker definitions for decorationService.js
  console.log('\n--- Copy this to decorationService.js ---\n');

  const stickers = files.map(f => {
    const id = f.replace('.png', '');
    return `  '${id}': { pngFile: 'fluent-${f}' },`;
  });

  console.log('const FLUENT_STICKERS = {');
  console.log(stickers.join('\n'));
  console.log('};');
}

uploadEmoji().catch(console.error);
