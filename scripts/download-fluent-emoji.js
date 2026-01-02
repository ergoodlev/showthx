/**
 * Download Microsoft Fluent Emoji 3D PNGs
 * Curated set of ~45 emoji for a kids' thank-you video app
 * These will replace the flat Twemoji in Supabase for consistent 3D look
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Curated emoji set for ShowThx - kid-friendly thank-you themed
// ~45 total across 6 categories
const FLUENT_EMOJI_MAP = {
  // ========== PARTY (10) ==========
  'balloon': { folder: 'Balloon', file: 'balloon_3d.png' },
  'confetti': { folder: 'Confetti ball', file: 'confetti_ball_3d.png' },
  'gift': { folder: 'Wrapped gift', file: 'wrapped_gift_3d.png' },
  'cake': { folder: 'Birthday cake', file: 'birthday_cake_3d.png' },
  'party-popper': { folder: 'Party popper', file: 'party_popper_3d.png' },
  'pinata': { folder: 'Pinata', file: 'pinata_3d.png' },
  'cupcake': { folder: 'Cupcake', file: 'cupcake_3d.png' },
  'candy': { folder: 'Candy', file: 'candy_3d.png' },
  'lollipop': { folder: 'Lollipop', file: 'lollipop_3d.png' },
  'ribbon': { folder: 'Ribbon', file: 'ribbon_3d.png' },

  // ========== HAPPY FACES (8) ==========
  'smile': { folder: 'Smiling face with smiling eyes', file: 'smiling_face_with_smiling_eyes_3d.png' },
  'heart-eyes': { folder: 'Smiling face with heart-eyes', file: 'smiling_face_with_heart-eyes_3d.png' },
  'star-eyes': { folder: 'Star-struck', file: 'star-struck_3d.png' },
  'grin': { folder: 'Grinning face', file: 'grinning_face_3d.png' },
  'hug': { folder: 'Smiling face with open hands', file: 'smiling_face_with_open_hands_3d.png' },
  'joy': { folder: 'Face with tears of joy', file: 'face_with_tears_of_joy_3d.png' },
  'blush': { folder: 'Smiling face', file: 'smiling_face_3d.png' },
  'wink': { folder: 'Winking face', file: 'winking_face_3d.png' },

  // ========== HEARTS & LOVE (8) ==========
  'red-heart': { folder: 'Red heart', file: 'red_heart_3d.png' },
  'sparkling-heart': { folder: 'Sparkling heart', file: 'sparkling_heart_3d.png' },
  'heart-ribbon': { folder: 'Heart with ribbon', file: 'heart_with_ribbon_3d.png' },
  'growing-heart': { folder: 'Growing heart', file: 'growing_heart_3d.png' },
  'two-hearts': { folder: 'Two hearts', file: 'two_hearts_3d.png' },
  'heart-decoration': { folder: 'Heart decoration', file: 'heart_decoration_3d.png' },
  'pink-heart': { folder: 'Pink heart', file: 'pink_heart_3d.png' },
  'orange-heart': { folder: 'Orange heart', file: 'orange_heart_3d.png' },

  // ========== STARS & SPARKLES (6) ==========
  'glowing-star': { folder: 'Glowing star', file: 'glowing_star_3d.png' },
  'star': { folder: 'Star', file: 'star_3d.png' },
  'sparkles': { folder: 'Sparkles', file: 'sparkles_3d.png' },
  'dizzy': { folder: 'Dizzy', file: 'dizzy_3d.png' }, // Stars symbol
  'collision': { folder: 'Collision', file: 'collision_3d.png' }, // Boom!
  'fire': { folder: 'Fire', file: 'fire_3d.png' },

  // ========== NATURE & FUN (8) ==========
  'rainbow': { folder: 'Rainbow', file: 'rainbow_3d.png' },
  'sun': { folder: 'Sun with face', file: 'sun_with_face_3d.png' },
  'sunflower': { folder: 'Sunflower', file: 'sunflower_3d.png' },
  'tulip': { folder: 'Tulip', file: 'tulip_3d.png' },
  'four-leaf-clover': { folder: 'Four leaf clover', file: 'four_leaf_clover_3d.png' },
  'butterfly': { folder: 'Butterfly', file: 'butterfly_3d.png' },
  'unicorn': { folder: 'Unicorn', file: 'unicorn_3d.png' },
  'crown': { folder: 'Crown', file: 'crown_3d.png' },

  // ========== ANIMALS (5) ==========
  'cat-heart': { folder: 'Smiling cat with heart-eyes', file: 'smiling_cat_with_heart-eyes_3d.png' },
  'dog': { folder: 'Dog face', file: 'dog_face_3d.png' },
  'bear': { folder: 'Bear', file: 'bear_3d.png' },
  'bunny': { folder: 'Rabbit face', file: 'rabbit_face_3d.png' },
  'panda': { folder: 'Panda', file: 'panda_3d.png' },
};

// Create output directory
const outputDir = path.join(__dirname, '../assets/fluent-emoji-3d');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Download a single file
function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    https.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        // Follow redirect
        https.get(response.headers.location, (redirectResponse) => {
          redirectResponse.pipe(file);
          file.on('finish', () => {
            file.close();
            resolve();
          });
        }).on('error', reject);
      } else if (response.statusCode === 200) {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve();
        });
      } else {
        reject(new Error(`HTTP ${response.statusCode}`));
      }
    }).on('error', reject);
  });
}

async function downloadAllEmoji() {
  console.log('Downloading Microsoft Fluent Emoji 3D PNGs...\n');

  const baseUrl = 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets';

  for (const [id, emoji] of Object.entries(FLUENT_EMOJI_MAP)) {
    const url = `${baseUrl}/${encodeURIComponent(emoji.folder)}/3D/${emoji.file}`;
    const destPath = path.join(outputDir, `${id}.png`);

    try {
      console.log(`Downloading ${id}...`);
      await downloadFile(url, destPath);
      console.log(`  ✓ Saved to ${destPath}`);
    } catch (error) {
      console.error(`  ✗ Failed: ${error.message}`);
      console.log(`  URL: ${url}`);
    }
  }

  console.log('\nDone! Files saved to:', outputDir);

  // Generate manifest for updating decorationService.js
  const manifest = Object.entries(FLUENT_EMOJI_MAP).map(([id, emoji]) => ({
    id,
    pngFile: `fluent-${id}.png`,
    fluentFolder: emoji.folder,
  }));

  const manifestPath = path.join(outputDir, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log('\nManifest saved to:', manifestPath);

  console.log('\nNext steps:');
  console.log('1. Upload PNGs to Supabase: npx supabase storage cp ./assets/fluent-emoji-3d/*.png gs://stickers/');
  console.log('2. Or use the Supabase dashboard to upload manually');
  console.log('3. Update decorationService.js with new stickers');
}

downloadAllEmoji();
