/**
 * Check what gift names are actually in the database
 * This will show if old "Gift from xyz" data exists
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// You'll need to add your Supabase credentials here or use .env
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_KEY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkGifts() {
  console.log('🔍 Checking gifts in database...\n');

  const { data, error } = await supabase
    .from('gifts')
    .select('id, name, giver_name, created_at')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  if (!data || data.length === 0) {
    console.log('📭 No gifts found in database');
    return;
  }

  console.log(`📦 Found ${data.length} gifts:\n`);

  data.forEach((gift, i) => {
    const isGenerated = gift.name.startsWith('Gift from');
    const marker = isGenerated ? '❌ GENERIC' : '✅ SPECIFIC';

    console.log(`${marker} #${i + 1}:`);
    console.log(`   Gift Name: "${gift.name}"`);
    console.log(`   Giver: ${gift.giver_name}`);
    console.log(`   Created: ${new Date(gift.created_at).toLocaleString()}`);
    console.log('');
  });

  const genericCount = data.filter(g => g.name.startsWith('Gift from')).length;
  const specificCount = data.length - genericCount;

  console.log('=' .repeat(60));
  console.log(`SUMMARY:`);
  console.log(`  ✅ Specific gift names: ${specificCount}`);
  console.log(`  ❌ Generic "Gift from" names: ${genericCount}`);
  console.log('=' .repeat(60));

  if (genericCount > 0) {
    console.log('\n⚠️  You have OLD data with generic gift names!');
    console.log('   Solution: Delete these gifts and re-import your CSV.');
    console.log('\n   To delete old gifts, run:');
    console.log('   DELETE FROM gifts WHERE name LIKE \'Gift from%\';');
  }
}

checkGifts().catch(console.error);
